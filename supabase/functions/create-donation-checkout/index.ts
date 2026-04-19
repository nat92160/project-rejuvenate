import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const { slug, amount, donor_name, donor_email, donor_address, campaign_id } = await req.json();
    if (!slug || !amount) throw new Error("slug et amount requis");
    if (amount < 100) throw new Error("Montant minimum : 1€");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Find synagogue by slug (still uses synagogue_stripe_accounts table for slug lookup)
    const { data: stripeAccount, error: saError } = await supabaseAdmin
      .from("synagogue_stripe_accounts")
      .select("synagogue_id")
      .eq("custom_donation_slug", slug)
      .maybeSingle();

    if (saError || !stripeAccount) throw new Error("Synagogue non trouvée");

    // Get synagogue name
    const { data: synaProfile } = await supabaseAdmin
      .from("synagogue_profiles")
      .select("name")
      .eq("id", stripeAccount.synagogue_id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "";

    // PLATFORM MODEL: payment goes directly to platform Stripe account
    // No Connect, no application_fee — full amount received, manual transfer to synagogue later
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
          synagogue_id: stripeAccount.synagogue_id,
          donor_name: donor_name || "",
          donor_email: donor_email || "",
          donor_address: donor_address || "",
          campaign_id: campaign_id || "",
        },
      },
      customer_email: donor_email || undefined,
      metadata: {
        synagogue_id: stripeAccount.synagogue_id,
        donor_name: donor_name || "",
        donor_email: donor_email || "",
        donor_address: donor_address || "",
        campaign_id: campaign_id || "",
        slug,
      },
      success_url: `${origin}/don/${slug}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/don/${slug}?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("create-donation-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
