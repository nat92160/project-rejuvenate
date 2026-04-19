import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_APP_URL = "https://www.chabbat-chalom.com";

const ALLOWED_ORIGINS = [
  DEFAULT_APP_URL,
  "https://chabbat-chalom.com",
  "https://next-level-code.lovable.app",
  "https://id-preview--ccdec38b-a549-4028-bfa6-5617122e8d21.lovable.app",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://127.0.0.1",
  "chabbatchalom://localhost",
];

function buildCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_APP_URL;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

function resolveReturnUrl(origin: string | null, slug: string) {
  const baseUrl = origin && /^https?:\/\//i.test(origin) && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : DEFAULT_APP_URL;

  return {
    successUrl: `${baseUrl}/don/${slug}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/don/${slug}?canceled=true`,
  };
}

const MAX_DONATION_AMOUNT = 5_000_000; // 50 000€ en centimes

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const { slug, amount, donor_name, donor_email, donor_address, campaign_id, donor_type, donor_company_name, donor_siret } = await req.json();
    if (!slug || !amount) throw new Error("slug et amount requis");
    if (typeof amount !== "number" || !Number.isInteger(amount)) throw new Error("Montant invalide");
    if (amount < 100) throw new Error("Montant minimum : 1€");
    if (amount > MAX_DONATION_AMOUNT) throw new Error("Montant maximum : 50 000€");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // CENTRALIZED MODEL: all payments go to the main MN Partners Stripe account.
    // Look up synagogue by donation_slug, or by raw UUID as fallback.
    let synagogueId: string | null = null;
    let synagogueName: string | null = null;

    const { data: synaBySlug } = await supabaseAdmin
      .from("synagogue_profiles")
      .select("id, name")
      .eq("donation_slug", slug)
      .maybeSingle();

    if (synaBySlug?.id) {
      synagogueId = synaBySlug.id;
      synagogueName = synaBySlug.name;
    } else {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      if (!isUuid) throw new Error("Synagogue non trouvée");
      const { data: synaById } = await supabaseAdmin
        .from("synagogue_profiles")
        .select("id, name")
        .eq("id", slug)
        .maybeSingle();
      if (!synaById) throw new Error("Synagogue non trouvée");
      synagogueId = synaById.id;
      synagogueName = synaById.name;
    }

    const synaProfile = { name: synagogueName };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin");
    const { successUrl, cancelUrl } = resolveReturnUrl(origin, slug);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Don à ${synaProfile?.name || "la synagogue"}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          synagogue_id: synagogueId,
          donor_name: donor_name || "",
          donor_email: donor_email || "",
          donor_address: donor_address || "",
          campaign_id: campaign_id || "",
          donor_type: donor_type || "particulier",
          donor_company_name: donor_company_name || "",
          donor_siret: donor_siret || "",
        },
      },
      customer_email: donor_email || undefined,
      metadata: {
        synagogue_id: synagogueId,
        donor_name: donor_name || "",
        donor_email: donor_email || "",
        donor_address: donor_address || "",
        campaign_id: campaign_id || "",
        donor_type: donor_type || "particulier",
        donor_company_name: donor_company_name || "",
        donor_siret: donor_siret || "",
        slug,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Insert PENDING donation row (cerfa_generated = false).
    // The Stripe webhook will flip cerfa_generated = true ONLY when
    // payment_status === "paid". Until then, no CERFA is delivered.
    await supabaseAdmin.from("donations").insert({
      synagogue_id: synagogueId,
      campaign_id: campaign_id || null,
      amount,
      donor_email: donor_email || "",
      donor_name: donor_name || "",
      donor_address: donor_address || "",
      donor_type: donor_type || "particulier",
      donor_company_name: donor_company_name || null,
      donor_siret: donor_siret || null,
      stripe_checkout_session_id: session.id,
      cerfa_generated: false,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("create-donation-checkout error:", msg, { origin: req.headers.get("origin") });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
