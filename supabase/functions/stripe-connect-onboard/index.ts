import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Non autorisé");

    const { synagogue_id, return_url } = await req.json();
    if (!synagogue_id) throw new Error("synagogue_id requis");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if account already exists
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: existing } = await supabaseAdmin
      .from("synagogue_stripe_accounts")
      .select("stripe_account_id, is_onboarded")
      .eq("synagogue_id", synagogue_id)
      .maybeSingle();

    let stripeAccountId: string;

    if (existing?.stripe_account_id) {
      stripeAccountId = existing.stripe_account_id;
    } else {
      // Get synagogue info for prefilling
      const { data: synaProfile } = await supabaseAdmin
        .from("synagogue_profiles")
        .select("name, email")
        .eq("id", synagogue_id)
        .single();

      // Create Express Connect account
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: synaProfile?.email || user.email || undefined,
        business_type: "non_profit",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: synaProfile?.name || undefined,
        },
      });

      stripeAccountId = account.id;

      // Generate slug from synagogue name
      const slug = synaProfile?.name
        ? synaProfile.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : synagogue_id.slice(0, 8);

      await supabaseAdmin.from("synagogue_stripe_accounts").insert({
        synagogue_id,
        stripe_account_id: stripeAccountId,
        custom_donation_slug: slug,
        is_onboarded: false,
      });
    }

    // Create onboarding link
    const origin = return_url || req.headers.get("origin") || "";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/?tab=president`,
      return_url: `${origin}/?tab=president&stripe_onboard=complete`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("stripe-connect-onboard error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
