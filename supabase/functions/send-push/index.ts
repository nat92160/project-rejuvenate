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

  // Build JWK from raw 32-byte private key
  const pubKeyBase64url = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const pubRaw = base64urlToUint8Array(pubKeyBase64url);
  // pubRaw is 65 bytes uncompressed point (04 || x || y)
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

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // DER format
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    r = sigBytes.slice(offset, offset + rLen);
    offset += rLen;
    const sLen = sigBytes[offset + 1];
    offset += 2;
    s = sigBytes.slice(offset, offset + sLen);

    // Trim leading zeros and pad to 32 bytes
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

  // HKDF helpers
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

  // IKM
  const authInfo = concatUint8(
    encoder.encode("WebPush: info\0"),
    userPublicKeyRaw,
    localPublicKey
  );
  const prk = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, authInfo, 32);

  // Content encryption key and nonce
  const prkFinal = await hkdfExtract(salt, ikm);
  const cekInfo = concatUint8(encoder.encode("Content-Encoding: aes128gcm\0"));
  const nonceInfo = concatUint8(encoder.encode("Content-Encoding: nonce\0"));
  const cek = await hkdfExpand(prkFinal, cekInfo, 16);
  const nonce = await hkdfExpand(prkFinal, nonceInfo, 12);

  // Pad payload (add delimiter byte 0x02)
  const paddedPayload = concatUint8(payload, new Uint8Array([2]));

  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    encKey,
    paddedPayload
  );

  const encrypted = new Uint8Array(encryptedBuf);

  // Build the aes128gcm content coding header + ciphertext
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { synagogue_id, title, body, sender_id } = await req.json();

    if (!synagogue_id || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all push subscriptions for this synagogue, excluding the sender
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("synagogue_id", synagogue_id);

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

    const privateKey = await importPrivateKey(vapidPrivateKey);
    const payload = new TextEncoder().encode(
      JSON.stringify({ title: title || "Nouveau message", body: body.slice(0, 200) })
    );

    let sent = 0;
    const staleIds: string[] = [];

    for (const sub of subs) {
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

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(JSON.stringify({ sent, cleaned: staleIds.length }), {
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
