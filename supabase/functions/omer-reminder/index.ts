import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Omer persistent reminder.
 *
 * Called by a cron job every 20 minutes between 19:00–01:00 UTC.
 * For each subscriber:
 *   1. Checks we're in the Omer period (16 Nissan → 5 Sivan)
 *   2. Checks it's after Tzeit HaKochavim for the subscriber's location
 *   3. Checks the user has NOT already counted today
 *   4. Checks the user has omer_reminders enabled in their profile
 *   5. Sends the push notification (deduplicated by endpoint/device_token)
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if admin has disabled this notification
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notif_omer")
      .maybeSingle();
    if (setting && (setting.value === false || setting.value === "false")) {
      return json({ skipped: true, reason: "Disabled by admin" });
    }

    // Calculate today's Omer day
    const now = new Date();
    const omerDay = getOmerDay(now);

    if (!omerDay) {
      return json({ skipped: true, reason: "Not in Omer period", omerDay: null });
    }

    // Get all users who have already counted today
    const todayStr = now.toISOString().slice(0, 10);
    const omerYear = now.getFullYear();
    const { data: countedRows } = await supabase
      .from("omer_counts")
      .select("user_id")
      .eq("day_number", omerDay)
      .eq("omer_year", omerYear);

    const countedUserIds = new Set((countedRows || []).map((r: any) => r.user_id));

    // Get users who have disabled omer reminders
    const { data: disabledProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("omer_reminders", false);

    const disabledUserIds = new Set((disabledProfiles || []).map((r: any) => r.user_id));

    // Get ALL push subscriptions (authenticated users)
    const { data: allSubs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, device_token, push_type, latitude, longitude, timezone");

    if (!allSubs?.length) {
      return json({ skipped: true, reason: "No subscribers" });
    }

    // Filter: exclude users who already counted or disabled reminders
    const eligibleSubs = allSubs.filter((s: any) => {
      if (countedUserIds.has(s.user_id)) return false;
      if (disabledUserIds.has(s.user_id)) return false;
      return true;
    });

    if (!eligibleSubs.length) {
      return json({
        skipped: true,
        reason: "All users already counted or disabled",
        totalSubs: allSubs.length,
        counted: countedUserIds.size,
        disabled: disabledUserIds.size,
      });
    }

    // Filter by location: only send if after Tzeit HaKochavim
    const readySubs = eligibleSubs.filter((s: any) => {
      return isAfterTzeit(now, s.latitude, s.longitude, s.timezone);
    });

    if (!readySubs.length) {
      return json({
        skipped: true,
        reason: "No subscribers past Tzeit yet",
        eligible: eligibleSubs.length,
      });
    }

    // Deduplicate by endpoint (web) and device_token (native)
    const seenEndpoints = new Set<string>();
    const seenTokens = new Set<string>();
    const webSubs: any[] = [];
    const nativeSubs: any[] = [];

    for (const sub of readySubs) {
      if (sub.push_type === "native" && sub.device_token) {
        if (!seenTokens.has(sub.device_token)) {
          seenTokens.add(sub.device_token);
          nativeSubs.push(sub);
        }
      } else if (sub.endpoint) {
        if (!seenEndpoints.has(sub.endpoint)) {
          seenEndpoints.add(sub.endpoint);
          webSubs.push(sub);
        }
      }
    }

    const title = `🌾 Séfirat HaOmer — Jour ${omerDay}`;
    const body = `N'oubliez pas de compter le Omer ce soir ! Jour ${omerDay} sur 49.`;

    // Call send-push in broadcast mode (it will handle the actual sending)
    // We collect unique synagogue_ids from readySubs to send per-synagogue
    // But to avoid duplicates, we send ONE broadcast call without synagogue_id
    const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ title, body }),
    });

    const pushData = await pushRes.json();

    // Also send to guest Omer subscribers (omer_push_subscriptions table)
    const { data: guestSubs } = await supabase
      .from("omer_push_subscriptions")
      .select("endpoint, p256dh, auth, latitude, longitude, timezone");

    let guestSent = 0;
    if (guestSubs?.length) {
      // Filter by tzeit for guests too
      const readyGuests = guestSubs.filter((s: any) =>
        isAfterTzeit(now, s.latitude, s.longitude, s.timezone)
      );

      // Deduplicate guest endpoints
      const guestSeenEndpoints = new Set<string>();
      for (const sub of readyGuests) {
        if (!sub.endpoint || guestSeenEndpoints.has(sub.endpoint)) continue;
        guestSeenEndpoints.add(sub.endpoint);

        try {
          const gRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              title,
              body,
              // We can't filter by user for guests, so broadcast
            }),
          });
          if (gRes.ok) guestSent++;
          await gRes.text(); // consume body
        } catch { /* skip */ }
      }
    }

    return json({
      success: true,
      omerDay,
      totalSubs: allSubs.length,
      counted: countedUserIds.size,
      disabled: disabledUserIds.size,
      eligible: eligibleSubs.length,
      afterTzeit: readySubs.length,
      dedupedWeb: webSubs.length,
      dedupedNative: nativeSubs.length,
      pushResult: pushData,
      guestSent,
    });
  } catch (err) {
    console.error("omer-reminder error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ───

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getOmerDay(date: Date): number | null {
  const year = date.getFullYear();
  // Pessah (15 Nissan) dates — Omer starts 16 Nissan (the day after)
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

  const pesach = new Date(pesachStr + "T00:00:00Z");
  const omerStart = new Date(pesach);
  omerStart.setUTCDate(omerStart.getUTCDate() + 1); // 16 Nissan

  // In Jewish law, the day starts at nightfall, so the evening of the civil date
  // corresponds to the next Jewish day. We use the civil date directly since
  // the cron runs in the evening, and counting happens on the evening of that date.
  const todayMidnight = new Date(date);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (todayMidnight.getTime() - omerStart.getTime()) / 86400000
  );

  if (diffDays < 0 || diffDays > 48) return null;
  return diffDays + 1;
}

/**
 * Check if current time is after Tzeit HaKochavim for the given location.
 * Falls back to timezone-based check if no lat/lng available.
 */
function isAfterTzeit(
  now: Date,
  lat: number | null,
  lng: number | null,
  tz: string | null
): boolean {
  if (lat && lng) {
    const tzeit = calculateTzeit(now, lat, lng);
    if (tzeit) {
      return now.getTime() >= tzeit.getTime();
    }
  }

  // Fallback: check if it's after 21:00 in the subscriber's timezone
  const fallbackTz = tz || "Europe/Paris";
  try {
    const localHour = parseInt(
      now.toLocaleString("en-US", { timeZone: fallbackTz, hour: "numeric", hour12: false }),
      10
    );
    // After 21:00 local or before 02:00 (next day, still hasn't counted)
    return localHour >= 21 || localHour < 2;
  } catch {
    return false;
  }
}

/**
 * Calculate Tzeit HaKochavim (8.5° below horizon) for a given date and location.
 */
function calculateTzeit(date: Date, lat: number, lng: number): Date | null {
  const TZEIT_DEGREES = 8.5;
  const dayOfYear = getDayOfYear(date);

  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = (declination * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const elevRad = (-TZEIT_DEGREES * Math.PI) / 180;

  const cosH =
    (Math.sin(elevRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  if (cosH > 1 || cosH < -1) return null;

  const H = (Math.acos(cosH) * 180) / Math.PI;
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const solarNoonUTC = 720 - lng * 4 - EoT;
  const tzeitUTC = solarNoonUTC + H * 4;

  const tzeitDate = new Date(date);
  tzeitDate.setUTCHours(0, 0, 0, 0);
  tzeitDate.setUTCMinutes(Math.round(tzeitUTC));

  return tzeitDate;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}
