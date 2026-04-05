import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function importPrivateKey(base64url: string): Promise<CryptoKey> {
  const pubKeyBase64url = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const pubRaw = base64urlToUint8Array(pubKeyBase64url);
  const x = pubRaw.slice(1, 33);
  const y = pubRaw.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    d: base64url,
  };

  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function createVapidJwt(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(unsignedToken));

  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
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

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0); rawSig.set(s, 32);
  const sigB64 = btoa(String.fromCharCode(...rawSig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${unsignedToken}.${sigB64}`;
}

async function encryptPayload(p256dhBase64: string, authBase64: string, payload: Uint8Array) {
  const userPublicKeyRaw = base64urlToUint8Array(p256dhBase64);
  const authSecret = base64urlToUint8Array(authBase64);
  const userPublicKey = await crypto.subtle.importKey("raw", userPublicKeyRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userPublicKey }, localKeyPair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  async function hkdfExtract(s: Uint8Array, ikm: Uint8Array) {
    const key = await crypto.subtle.importKey("raw", s, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  }
  async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number) {
    const key = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const input = new Uint8Array(info.length + 1); input.set(info); input[info.length] = 1;
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, input)).slice(0, length);
  }
  function concat(...arrays: Uint8Array[]) {
    const r = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0));
    let o = 0; for (const a of arrays) { r.set(a, o); o += a.length; } return r;
  }

  const enc = new TextEncoder();
  const authInfo = concat(enc.encode("WebPush: info\0"), userPublicKeyRaw, localPublicKey);
  const prk = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, authInfo, 32);
  const prkFinal = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prkFinal, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prkFinal, enc.encode("Content-Encoding: nonce\0"), 12);
  const paddedPayload = concat(payload, new Uint8Array([2]));
  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, paddedPayload));

  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = localPublicKey.length; header.set(localPublicKey, 21);
  return { encrypted: concat(header, encrypted) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, p256dh, auth, title, body } = await req.json();

    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: "Missing subscription data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const privateKey = await importPrivateKey(vapidPrivateKey);

    const payload = new TextEncoder().encode(JSON.stringify({ title: title || "Test", body: body || "Test notification" }));
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJwt(audience, "mailto:noreply@calj.app", privateKey);
    const { encrypted } = await encryptPayload(p256dh, auth, payload);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body: encrypted,
    });

    const status = res.status;
    const responseText = await res.text();

    if (status === 201 || status === 200) {
      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ sent: false, status, detail: responseText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("send-push-test error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
