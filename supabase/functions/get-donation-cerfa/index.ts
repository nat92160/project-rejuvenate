import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public endpoint: retrieves CERFA token for a Stripe checkout session_id.
 * Used right after a successful donation (before user logs in) so the donor
 * can immediately download their CERFA receipt.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) throw new Error("session_id requis");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Poll up to 5s in case webhook hasn't fired yet
    let donation: any = null;
    for (let i = 0; i < 5; i++) {
      const { data } = await supabaseAdmin
        .from("donations")
        .select("id, cerfa_token, amount, donor_name, synagogue_id")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      if (data) {
        donation = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!donation) {
      return new Response(
        JSON.stringify({ error: "Don non trouvé (le webhook n'a pas encore traité le paiement). Réessayez dans quelques secondes." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cerfaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-cerfa?token=${donation.cerfa_token}`;

    return new Response(
      JSON.stringify({
        cerfa_url: cerfaUrl,
        donation_id: donation.id,
        amount: donation.amount,
        donor_name: donation.donor_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("get-donation-cerfa error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
