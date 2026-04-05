import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if admin has disabled this notification
    const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "notif_omer").maybeSingle();
    if (setting && (setting.value === false || setting.value === "false")) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Disabled by admin" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate today's Omer day
    const today = new Date();
    const omerDay = getOmerDay(today);

    if (!omerDay) {
      return new Response(
        JSON.stringify({ message: "Not in Omer period", omerDay: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = `🌾 Séfirat HaOmer — Jour ${omerDay}`;
    const body = `N'oubliez pas de compter le Omer ce soir ! Jour ${omerDay} sur 49.`;

    // Send push to all subscribers
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        const pushPayload = JSON.stringify({ title, body, url: "/" });

        // Use the send-push function to send notifications
        const { error: pushError } = await supabase.functions.invoke("send-push", {
          body: {
            subscription: {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            title,
            body,
          },
        });

        if (!pushError) sent++;
      } catch {
        // Skip failed pushes
      }
    }

    return new Response(
      JSON.stringify({ message: `Omer reminder sent`, omerDay, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simple Omer day calculation
function getOmerDay(date: Date): number | null {
  // Pesach 2026: April 2 (15 Nissan 5786)
  // Omer starts evening of April 2 (16 Nissan) through May 21 (Erev Shavuot)
  // We compute: which day of the Omer is today?
  const year = date.getFullYear();
  
  // Known Pesach dates (first seder evening)
  const pesachDates: Record<number, string> = {
    2025: "2025-04-12",
    2026: "2026-04-01",
    2027: "2027-04-21",
    2028: "2028-04-10",
    2029: "2029-03-30",
    2030: "2030-04-17",
  };

  const pesachStr = pesachDates[year];
  if (!pesachStr) return null;

  // Omer starts the evening after the first seder (2nd night)
  // Day 1 = 16 Nissan = day after first seder  
  const pesach = new Date(pesachStr + "T00:00:00");
  const omerStart = new Date(pesach);
  omerStart.setDate(omerStart.getDate() + 1); // 16 Nissan

  const todayMidnight = new Date(date);
  todayMidnight.setHours(0, 0, 0, 0);

  const diffMs = todayMidnight.getTime() - omerStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  // Omer is days 0-48 (= day 1-49)
  if (diffDays < 0 || diffDays > 48) return null;
  return diffDays + 1;
}
