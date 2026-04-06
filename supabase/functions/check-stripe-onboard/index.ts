import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Non autorisé");

    const { synagogue_id } = await req.json();
    if (!synagogue_id) throw new Error("synagogue_id requis");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: sa } = await supabaseAdmin
      .from("synagogue_stripe_accounts")
      .select("stripe_account_id, is_onboarded")
      .eq("synagogue_id", synagogue_id)
      .maybeSingle();

    if (!sa) {
      return new Response(JSON.stringify({ onboarded: false, exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check with Stripe if onboarding is complete
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const account = await stripe.accounts.retrieve(sa.stripe_account_id);
    const isOnboarded = account.charges_enabled && account.payouts_enabled;

    // Update DB if status changed
    if (isOnboarded && !sa.is_onboarded) {
      await supabaseAdmin
        .from("synagogue_stripe_accounts")
        .update({ is_onboarded: true })
        .eq("synagogue_id", synagogue_id);
    }

    return new Response(JSON.stringify({
      onboarded: isOnboarded,
      exists: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("check-stripe-onboard error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
