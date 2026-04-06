import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Omer reminder — location-aware.
 *
 * This function is designed to be called by a cron job every 5 minutes
 * during the evening window (roughly 17:00–23:00 UTC).
 *
 * For each subscriber with lat/lng, it calculates Tzeit HaKochavim
 * (nightfall, ~8.5° below horizon) and sends the notification only
 * if the current time is within a 10-minute window after Tzeit.
 *
 * Subscribers without location get a fallback at ~20:30 UTC (Paris evening).
 */

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
    const now = new Date();
    const omerDay = getOmerDay(now);

    if (!omerDay) {
      return new Response(
        JSON.stringify({ message: "Not in Omer period", omerDay: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = `🌾 Séfirat HaOmer — Jour ${omerDay}`;
    const body = `C'est l'heure ! Comptez le Omer ce soir — Jour ${omerDay} sur 49.`;

    let sent = 0;
    let skipped = 0;
    let total = 0;

    // Helper: should we send to this subscriber right now?
    const shouldSendNow = (lat: number | null, lng: number | null, tz: string | null): boolean => {
      // If no location, use fallback timezone check
      if (!lat || !lng) {
        const fallbackTz = tz || "Europe/Paris";
        try {
          const localTime = getLocalHourMin(now, fallbackTz);
          // Send at ~21:30 local time (±5 min window handled by cron interval)
          return localTime.hour === 21 && localTime.min >= 25 && localTime.min < 35;
        } catch {
          return false;
        }
      }

      // Calculate Tzeit HaKochavim (8.5° below horizon)
      const tzeitTime = calculateTzeit(now, lat, lng);
      if (!tzeitTime) return false;

      const diffMs = now.getTime() - tzeitTime.getTime();
      // Send if we're within 0 to 10 minutes after Tzeit
      return diffMs >= 0 && diffMs < 10 * 60 * 1000;
    };

    // 1) Send to authenticated subscribers (push_subscriptions table)
    const { data: authSubs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, device_token, push_type, latitude, longitude, timezone");

    if (authSubs?.length) {
      for (const sub of authSubs) {
        total++;
        if (!shouldSendNow(sub.latitude, sub.longitude, sub.timezone)) {
          skipped++;
          continue;
        }
        if (!sub.endpoint && !sub.device_token) continue;
        try {
          const { error: pushError } = await supabase.functions.invoke("send-push", {
            body: {
              subscription: sub.device_token
                ? { deviceToken: sub.device_token, pushType: sub.push_type }
                : { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
      .select("endpoint, p256dh, auth, latitude, longitude, timezone");

    if (guestSubs?.length) {
      for (const sub of guestSubs) {
        total++;
        if (!shouldSendNow(sub.latitude, sub.longitude, sub.timezone)) {
          skipped++;
          continue;
        }
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
      JSON.stringify({ message: `Omer reminder processed`, omerDay, sent, skipped, total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ───

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
  const diffDays = Math.floor((todayMidnight.getTime() - omerStart.getTime()) / 86400000);
  if (diffDays < 0 || diffDays > 48) return null;
  return diffDays + 1;
}

function getLocalHour(date: Date, tz: string): number {
  const str = date.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
  return parseInt(str, 10);
}

/**
 * Calculate Tzeit HaKochavim (8.5° below horizon) for a given date and location.
 * Uses a simplified solar position algorithm sufficient for notification timing.
 */
function calculateTzeit(date: Date, lat: number, lng: number): Date | null {
  const TZEIT_DEGREES = 8.5; // degrees below horizon

  const dayOfYear = getDayOfYear(date);
  const year = date.getFullYear();

  // Solar declination (simplified)
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  // Hour angle for sun at -8.5° (tzeit)
  const elevation = -TZEIT_DEGREES;
  const elevRad = elevation * Math.PI / 180;

  const cosH = (Math.sin(elevRad) - Math.sin(latRad) * Math.sin(decRad)) /
               (Math.cos(latRad) * Math.cos(decRad));

  if (cosH > 1 || cosH < -1) return null; // No tzeit at extreme latitudes

  const H = Math.acos(cosH) * 180 / Math.PI; // in degrees

  // Equation of time (simplified)
  const B = (2 * Math.PI / 365) * (dayOfYear - 81);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // minutes

  // Solar noon in UTC minutes
  const solarNoonUTC = 720 - (lng * 4) - EoT;

  // Tzeit = solar noon + hour angle (in minutes)
  const tzeitUTC = solarNoonUTC + (H * 4); // 4 min per degree

  const tzeitDate = new Date(date);
  tzeitDate.setUTCHours(0, 0, 0, 0);
  tzeitDate.setUTCMinutes(Math.round(tzeitUTC));

  return tzeitDate;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}
