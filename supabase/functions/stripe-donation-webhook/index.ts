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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback: parse without verification (dev mode)
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const synagogueId = session.metadata?.synagogue_id;
      const campaignId = session.metadata?.campaign_id || null;
      const donorName = session.metadata?.donor_name || "";
      const donorEmail = session.metadata?.donor_email || session.customer_email || "";
      const donorAddress = session.metadata?.donor_address || "";
      const amount = session.amount_total || 0;

      if (!synagogueId) {
        console.error("No synagogue_id in session metadata");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } }
      );

      // Store the donation
      const { data: insertedDonation, error: insertError } = await supabaseAdmin
        .from("donations")
        .insert({
          synagogue_id: synagogueId,
          campaign_id: campaignId || null,
          amount,
          donor_email: donorEmail,
          donor_name: donorName,
          donor_address: donorAddress,
          stripe_payment_id: session.payment_intent as string || null,
          stripe_checkout_session_id: session.id,
          cerfa_generated: false,
        })
        .select("id, cerfa_token")
        .single();

      if (insertError) {
        console.error("Error inserting donation:", insertError);
      } else {
        console.log(`Donation recorded: ${amount / 100}€ for synagogue ${synagogueId}`);
        
        // Get synagogue info for CERFA
        const { data: synaInfo } = await supabaseAdmin
          .from("synagogue_profiles")
          .select("name, address, president_first_name, president_last_name, logo_url, signature")
          .eq("id", synagogueId)
          .single();
        
        // Generate CERFA PDF link (accessible via token)
        if (insertedDonation) {
          const cerfaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-cerfa?token=${insertedDonation.cerfa_token}`;
          
          // Update donation with cerfa URL
          await supabaseAdmin
            .from("donations")
            .update({ cerfa_url: cerfaUrl, cerfa_generated: true })
            .eq("id", insertedDonation.id);

          // Send CERFA email via send-cerfa-email function
          try {
            const emailRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-cerfa-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                donor_email: donorEmail,
                donor_name: donorName,
                amount,
                synagogue_name: synaInfo?.name || "la synagogue",
                cerfa_url: cerfaUrl,
              }),
            });
            console.log("CERFA email sent:", emailRes.status);
          } catch (emailErr) {
            console.error("Failed to send CERFA email:", emailErr);
          }
        }
      }
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
