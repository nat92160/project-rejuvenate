import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured — refusing webhook");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");
    const event: Stripe.Event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // CRITICAL: Only release CERFA if Stripe confirms the payment is "paid".
      // checkout.session.completed can fire for unpaid sessions (async methods, etc.)
      const paymentConfirmed = session.payment_status === "paid";
      if (!paymentConfirmed) {
        console.warn(`Session ${session.id} completed but payment_status=${session.payment_status} — CERFA withheld`);
        return new Response(JSON.stringify({ received: true, payment_status: session.payment_status }), { status: 200 });
      }

      // The donation row was already INSERTED by create-donation-checkout (pending).
      const { data: existing } = await supabaseAdmin
        .from("donations")
        .select("id, cerfa_token, donor_email, donor_name, amount, synagogue_id, cerfa_generated")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

      if (!existing) {
        console.warn(`No donation row found for session ${session.id} — webhook arrived before insert?`);
        return new Response(JSON.stringify({ received: true, warning: "no_row" }), { status: 200 });
      }

      // Mark as paid → CERFA becomes available.
      await supabaseAdmin
        .from("donations")
        .update({
          stripe_payment_id: (session.payment_intent as string) || null,
          cerfa_generated: true,
        })
        .eq("id", existing.id);

      // Send CERFA email (best-effort)
      try {
        const cerfaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-cerfa?token=${existing.cerfa_token}`;
        const { data: synaInfo } = await supabaseAdmin
          .from("synagogue_profiles")
          .select("name")
          .eq("id", existing.synagogue_id)
          .single();

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-cerfa-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            donor_email: existing.donor_email,
            donor_name: existing.donor_name,
            amount: existing.amount,
            synagogue_name: synaInfo?.name || "la synagogue",
            cerfa_url: cerfaUrl,
          }),
        });
        console.log(`Donation confirmed: ${existing.amount / 100}€ session=${session.id}`);
      } catch (emailErr) {
        console.error("Failed to send CERFA email:", emailErr);
      }
    }

    // Also handle async payment outcomes
    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      await supabaseAdmin
        .from("donations")
        .update({ cerfa_generated: true, stripe_payment_id: (session.payment_intent as string) || null })
        .eq("stripe_checkout_session_id", session.id);
      console.log(`Async payment succeeded: session=${session.id}`);
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.warn(`Payment NOT completed (${event.type}) for session ${session.id} — CERFA stays withheld`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("stripe-donation-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
