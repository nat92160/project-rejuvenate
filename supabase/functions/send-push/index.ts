import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Base64url decode helper
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Import ECDSA key from raw private key bytes
async function importPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlToUint8Array(base64url);
  const pubKeyBase64url = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const pubRaw = base64urlToUint8Array(pubKeyBase64url);
  const x = pubRaw.slice(1, 33);
  const y = pubRaw.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: btoa(String.fromCharCode(...x))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...y))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    d: base64url,
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

// Create a signed JWT for VAPID
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    r = sigBytes.slice(offset, offset + rLen);
    offset += rLen;
    const sLen = sigBytes[offset + 1];
    offset += 2;
    s = sigBytes.slice(offset, offset + sLen);

    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${sigB64}`;
}

// Encrypt payload using Web Push (RFC 8291)
async function encryptPayload(
  p256dhBase64: string,
  authBase64: string,
  payload: Uint8Array
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const userPublicKeyRaw = base64urlToUint8Array(p256dhBase64);
  const authSecret = base64urlToUint8Array(authBase64);

  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  }

  async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const input = new Uint8Array(info.length + 1);
    input.set(info);
    input[info.length] = 1;
    const output = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
    return output.slice(0, length);
  }

  function concatUint8(...arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
      result.set(a, offset);
      offset += a.length;
    }
    return result;
  }

  const encoder = new TextEncoder();
  const authInfo = concatUint8(
    encoder.encode("WebPush: info\0"),
    userPublicKeyRaw,
    localPublicKey
  );
  const prk = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, authInfo, 32);

  const prkFinal = await hkdfExtract(salt, ikm);
  const cekInfo = concatUint8(encoder.encode("Content-Encoding: aes128gcm\0"));
  const nonceInfo = concatUint8(encoder.encode("Content-Encoding: nonce\0"));
  const cek = await hkdfExpand(prkFinal, cekInfo, 16);
  const nonce = await hkdfExpand(prkFinal, nonceInfo, 12);

  const paddedPayload = concatUint8(payload, new Uint8Array([2]));

  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    encKey,
    paddedPayload
  );

  const encrypted = new Uint8Array(encryptedBuf);
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  return {
    encrypted: concatUint8(header, encrypted),
    salt,
    localPublicKey,
  };
}

// ─── APNs JWT for native push ─────────────────────────────
async function createApnsJwt(): Promise<string | null> {
  const keyId = Deno.env.get("APNS_KEY_ID") || Deno.env.get("ID_CLÉ_APNS");
  const teamId = Deno.env.get("APNS_TEAM_ID") || Deno.env.get("ID_ÉQUIPE_APNS");
  const authKeyBase64 = Deno.env.get("APNS_AUTH_KEY_BASE64");

  console.log("[APNs] keyId found:", !!keyId, "teamId found:", !!teamId, "authKey found:", !!authKeyBase64);
  if (!keyId || !teamId || !authKeyBase64) {
    console.error("[APNs] Missing credentials - keyId:", !!keyId, "teamId:", !!teamId, "authKeyBase64:", !!authKeyBase64);
    return null;
  }

  // Decode the .p8 key from base64
  const pemContent = atob(authKeyBase64);
  const pemLines = pemContent.split("\n").filter(
    (l) => !l.startsWith("-----") && l.trim() !== ""
  );
  const keyBase64 = pemLines.join("");
  const keyData = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { alg: "ES256", kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: teamId, iat: now };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(claims)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    r = sigBytes.slice(offset, offset + rLen);
    offset += rLen;
    const sLen = sigBytes[offset + 1];
    offset += 2;
    s = sigBytes.slice(offset, offset + sLen);

    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${sigB64}`;
}

async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  apnsJwt: string
): Promise<{ success: boolean; error?: { status: number; body: string; host: string } }> {
  const bundleId = Deno.env.get("APNS_BUNDLE_ID") || Deno.env.get("ID_DE_LOT_APNS") || "com.chabbatchalom.15app";
  const isProduction = Deno.env.get("APNS_PRODUCTION") !== "false";
  const host = isProduction
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  const apnsPayload = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
  };

  try {
    const res = await fetch(`${host}/3/device/${deviceToken}`, {
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

    if (res.status === 200) return { success: true };
    
    const errText = await res.text();
    console.error(`APNs error for ${deviceToken}: ${res.status} ${errText}`);
    return { success: false, error: { status: res.status, body: errText, host } };
  } catch (e) {
    console.error(`APNs fetch error for ${deviceToken}:`, e);
    return { success: false, error: { status: 0, body: String(e), host } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { synagogue_id, title, body, sender_id } = await req.json();

    if (!body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Get push subscriptions — filter by synagogue_id if provided, otherwise get ALL (broadcast mode)
    let query = supabase
      .from("push_subscriptions")
      .select("*");

    if (synagogue_id) {
      query = query.eq("synagogue_id", synagogue_id);
    }

    if (sender_id) {
      query = query.neq("user_id", sender_id);
    }

    const { data: subs, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Separate web and native subscriptions
    const webSubs = subs.filter((s: any) => s.push_type !== "native");
    const nativeSubs = subs.filter((s: any) => s.push_type === "native" && s.device_token);

    const privateKey = await importPrivateKey(vapidPrivateKey);
    const pushTitle = title || "Nouveau message";
    const pushBody = body.slice(0, 200);
    const payload = new TextEncoder().encode(
      JSON.stringify({ title: pushTitle, body: pushBody })
    );

    let sent = 0;
    const staleIds: string[] = [];
    let apnsJwtCreated = false;
    const apnsErrors: { status: number; body: string; host: string }[] = [];

    // --- Send Web Push ---
    for (const sub of webSubs) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
      try {
        const url = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await createVapidJwt(audience, "mailto:noreply@calj.app", privateKey);

        const { encrypted } = await encryptPayload(sub.p256dh, sub.auth, payload);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
          },
          body: encrypted,
        });

        if (res.status === 201 || res.status === 200) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          staleIds.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.id}: ${res.status} ${await res.text()}`);
        }
      } catch (e) {
        console.error(`Push error for ${sub.id}:`, e);
      }
    }

    // --- Send Native Push (APNs) ---
    if (nativeSubs.length > 0) {
      const apnsJwt = await createApnsJwt();
      apnsJwtCreated = !!apnsJwt;
      if (apnsJwt) {
        for (const sub of nativeSubs) {
          const result = await sendApnsPush(
            sub.device_token!,
            pushTitle,
            pushBody,
            apnsJwt
          );
          if (result.success) {
            sent++;
          } else if (result.error) {
            apnsErrors.push(result.error);
          }
        }
      } else {
        console.warn("APNs credentials not configured — skipping native push");
      }
    }

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(JSON.stringify({ sent, cleaned: staleIds.length, debug: { totalSubs: subs.length, webSubs: webSubs.length, nativeSubs: nativeSubs.length, apnsJwtCreated, apnsErrors } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
