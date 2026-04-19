import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public endpoint: returns the CERFA token for a Stripe checkout session_id.
 *
 * IMPORTANT — only releases the CERFA when Stripe has confirmed the payment:
 *  1. Reads the donation row (created in pending state by create-donation-checkout).
 *  2. If `cerfa_generated = true` → webhook already confirmed → return URL.
 *  3. Otherwise, verify payment status LIVE against Stripe. If `paid`, flip the
 *     flag and return the URL. This guards against missing/late webhooks while
 *     still NEVER delivering a receipt for an unpaid session.
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

    // Poll up to ~5s for the donation row (created by create-donation-checkout)
    let donation: any = null;
    for (let i = 0; i < 5; i++) {
      const { data } = await supabaseAdmin
        .from("donations")
        .select("id, cerfa_token, amount, donor_name, synagogue_id, cerfa_generated")
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
        JSON.stringify({ error: "Don non trouvé. Réessayez dans quelques secondes." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the webhook hasn't flipped the flag yet, verify directly with Stripe.
    if (!donation.cerfa_generated) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return new Response(
          JSON.stringify({ error: "Paiement en cours de validation par Stripe…", pending: true }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
          return new Response(
            JSON.stringify({
              error: "Paiement non confirmé par Stripe — le reçu CERFA ne peut pas encore être délivré.",
              payment_status: session.payment_status,
              pending: true,
            }),
            { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Stripe confirms paid → flip the flag now (webhook fallback)
        await supabaseAdmin
          .from("donations")
          .update({
            cerfa_generated: true,
            stripe_payment_id: (session.payment_intent as string) || null,
          })
          .eq("id", donation.id);
      } catch (stripeErr) {
        console.error("Stripe verification failed:", stripeErr);
        return new Response(
          JSON.stringify({ error: "Vérification du paiement impossible. Réessayez dans un instant.", pending: true }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
