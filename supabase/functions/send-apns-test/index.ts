import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createApnsJwt(): Promise<{ jwt: string | null; missing: string[] }> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const authKeyBase64 = Deno.env.get("APNS_AUTH_KEY_BASE64");

  const missing: string[] = [];
  if (!keyId) missing.push("APNS_KEY_ID");
  if (!teamId) missing.push("APNS_TEAM_ID");
  if (!authKeyBase64) missing.push("APNS_AUTH_KEY_BASE64");
  if (missing.length) return { jwt: null, missing };

  const pemContent = atob(authKeyBase64!);
  const pemLines = pemContent.split("\n").filter((l) => !l.startsWith("-----") && l.trim() !== "");
  const keyBase64 = pemLines.join("");
  const keyData = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = { alg: "ES256", kid: keyId };
  const claims = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(claims)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32); s = sigBytes.slice(32, 64);
  } else {
    let offset = 2;
    const rLen = sigBytes[offset + 1]; offset += 2;
    r = sigBytes.slice(offset, offset + rLen); offset += rLen;
    const sLen = sigBytes[offset + 1]; offset += 2;
    s = sigBytes.slice(offset, offset + sLen);
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p; }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p; }
  }
  const rawSig = new Uint8Array(64); rawSig.set(r, 0); rawSig.set(s, 32);
  const sigB64 = btoa(String.fromCharCode(...rawSig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { jwt: `${unsignedToken}.${sigB64}`, missing: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { device_token: explicitToken, title, body } = await req.json().catch(() => ({}));

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Récupère TOUS les tokens natifs de l'utilisateur courant (ou un token explicite)
    let tokens: { id: string; device_token: string }[] = [];
    if (explicitToken) {
      tokens = [{ id: "explicit", device_token: explicitToken }];
    } else {
      const { data, error } = await admin
        .from("push_subscriptions")
        .select("id, device_token")
        .eq("user_id", user.id)
        .eq("push_type", "native")
        .not("device_token", "is", null);
      if (error) {
        return new Response(JSON.stringify({ error: "DB error", detail: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tokens = (data ?? []) as { id: string; device_token: string }[];
    }

    if (!tokens.length) {
      return new Response(JSON.stringify({
        error: "no_native_subscription",
        message: "Aucun token natif trouvé pour cet utilisateur. Active les notifications dans l'app iOS d'abord.",
        userId: user.id,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { jwt: apnsJwt, missing } = await createApnsJwt();
    if (!apnsJwt) {
      return new Response(JSON.stringify({
        error: "apns_credentials_missing",
        missing,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bundleId = Deno.env.get("APNS_BUNDLE_ID") || "com.chabbatchalom.15app";
    const isProduction = Deno.env.get("APNS_PRODUCTION") !== "false";
    const host = isProduction ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";

    const apnsPayload = {
      aps: {
        alert: {
          title: title || "🧪 Test APNs",
          body: body || "Si tu vois ceci, les notifications natives marchent !",
        },
        sound: "default",
        badge: 1,
      },
    };

    const results: Array<{
      tokenPrefix: string;
      status: number;
      apnsId: string | null;
      reason?: string;
      body?: string;
      success: boolean;
    }> = [];

    for (const t of tokens) {
      const tokenPrefix = t.device_token.slice(0, 12) + "…";
      try {
        const res = await fetch(`${host}/3/device/${t.device_token}`, {
          method: "POST",
          headers: {
            authorization: `bearer ${apnsJwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
          },
          body: JSON.stringify(apnsPayload),
        });
        const apnsId = res.headers.get("apns-id");
        const status = res.status;
        if (status === 200) {
          console.log(`[send-apns-test] ✅ 200 token=${tokenPrefix} apns-id=${apnsId}`);
          results.push({ tokenPrefix, status, apnsId, success: true });
        } else {
          const text = await res.text();
          let reason: string | undefined;
          try { reason = JSON.parse(text)?.reason; } catch { /* */ }
          console.error(`[send-apns-test] ❌ status=${status} reason=${reason} token=${tokenPrefix} body=${text}`);
          results.push({ tokenPrefix, status, apnsId, reason, body: text, success: false });
        }
      } catch (e) {
        results.push({ tokenPrefix, status: 0, apnsId: null, body: String(e), success: false });
      }
    }

    return new Response(JSON.stringify({
      ok: results.some((r) => r.success),
      host,
      bundleId,
      production: isProduction,
      tokensChecked: tokens.length,
      results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-apns-test error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});