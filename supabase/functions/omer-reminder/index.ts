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

    let sent = 0;
    let total = 0;

    // 1) Send to authenticated subscribers (push_subscriptions table)
    const { data: authSubs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (authSubs?.length) {
      total += authSubs.length;
      for (const sub of authSubs) {
        if (!sub.endpoint) continue;
        try {
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
        } catch { /* skip */ }
      }
    }

    // 2) Send to guest Omer subscribers (omer_push_subscriptions table)
    const { data: guestSubs } = await supabase
      .from("omer_push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (guestSubs?.length) {
      total += guestSubs.length;
      for (const sub of guestSubs) {
        try {
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
        } catch { /* skip */ }
      }
    }

    return new Response(
      JSON.stringify({ message: `Omer reminder sent`, omerDay, sent, total }),
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
  const year = date.getFullYear();
  
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

  const pesach = new Date(pesachStr + "T00:00:00");
  const omerStart = new Date(pesach);
  omerStart.setDate(omerStart.getDate() + 1);

  const todayMidnight = new Date(date);
  todayMidnight.setHours(0, 0, 0, 0);

  const diffMs = todayMidnight.getTime() - omerStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 0 || diffDays > 48) return null;
  return diffDays + 1;
}
