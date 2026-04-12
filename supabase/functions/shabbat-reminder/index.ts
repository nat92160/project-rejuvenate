import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if admin has disabled this notification
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notif_chabbat")
      .maybeSingle();
    if (setting && (setting.value === false || setting.value === "false")) {
      return json({ skipped: true, reason: "Disabled by admin" });
    }

    // Check if today is Friday (UTC - cron runs on Friday)
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const dayOfWeek = parisTime.getDay();

    if (dayOfWeek !== 5) {
      return json({ skipped: true, reason: "Not Friday" });
    }

    const todayStr = parisTime.toISOString().slice(0, 10);

    // Get ALL push subscriptions with their synagogue info
    const { data: allSubs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, device_token, push_type, synagogue_id, latitude, longitude");

    if (subsError || !allSubs?.length) {
      return json({ skipped: true, reason: "No subscribers", error: subsError });
    }

    // Get all synagogue locations
    const synaIds = [...new Set(allSubs.map((s: any) => s.synagogue_id).filter(Boolean))];
    let synaLocations = new Map<string, { lat: number; lng: number }>();
    if (synaIds.length > 0) {
      const { data: synas } = await supabase
        .from("synagogue_profiles")
        .select("id, latitude, longitude")
        .in("id", synaIds);
      for (const s of synas || []) {
        if (s.latitude && s.longitude) {
          synaLocations.set(s.id, { lat: s.latitude, lng: s.longitude });
        }
      }
    }

    // Get user profile locations for fallback
    const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];
    const profileLocations = new Map<string, { lat: number; lng: number }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, latitude, longitude")
        .in("user_id", userIds);
      for (const p of profiles || []) {
        if (p.latitude && p.longitude) {
          profileLocations.set(p.user_id, { lat: p.latitude, lng: p.longitude });
        }
      }
    }

    // Get users who already received notification today
    const { data: alreadySent } = await supabase
      .from("shabbat_notification_log")
      .select("user_id")
      .eq("shabbat_date", todayStr);

    const alreadySentUsers = new Set((alreadySent || []).map((r: any) => r.user_id));

    // For each subscriber, check if we're in the 18-minute window
    // based on their synagogue's location
    const eligibleUserIds = new Set<string>();
    const eligibleSubs: any[] = [];

    for (const sub of allSubs) {
      if (alreadySentUsers.has(sub.user_id)) continue;
      if (eligibleUserIds.has(sub.user_id)) {
        // Already marked eligible via another subscription
        eligibleSubs.push(sub);
        continue;
      }

      const coords = getSubCoords(sub, synaLocations, profileLocations);
      const sunset = calculateSunset(now, coords.lat, coords.lng);
      if (!sunset) continue;

      // Candle lighting = sunset - 18 minutes
      const candleLighting = new Date(sunset.getTime() - 18 * 60 * 1000);
      const diffMinutes = (candleLighting.getTime() - now.getTime()) / 60000;

      // Send if we're within ±5 minutes of the 18-minute-before mark
      // i.e., between 23 and 13 minutes before sunset
      if (diffMinutes >= -5 && diffMinutes <= 5) {
        eligibleUserIds.add(sub.user_id);
        eligibleSubs.push(sub);
      }
    }

    if (!eligibleSubs.length) {
      return json({
        skipped: true,
        reason: "No subscribers in candle lighting window",
        totalSubs: allSubs.length,
        alreadySent: alreadySentUsers.size,
      });
    }

    // Deduplicate
    const seenEndpoints = new Set<string>();
    const seenTokens = new Set<string>();
    const dedupedSubs: any[] = [];

    for (const sub of eligibleSubs) {
      if (sub.push_type === "native" && sub.device_token) {
        if (!seenTokens.has(sub.device_token)) {
          seenTokens.add(sub.device_token);
          dedupedSubs.push(sub);
        }
      } else if (sub.endpoint) {
        if (!seenEndpoints.has(sub.endpoint)) {
          seenEndpoints.add(sub.endpoint);
          dedupedSubs.push(sub);
        }
      }
    }

    // Get a representative candle time for the notification body
    // Use the first eligible sub's location
    const repCoords = getSubCoords(eligibleSubs[0], synaLocations);
    const repSunset = calculateSunset(now, repCoords.lat, repCoords.lng)!;
    const repCandle = new Date(repSunset.getTime() - 18 * 60 * 1000);
    const candleTimeStr = repCandle.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });

    // Send push per synagogue group
    const synagogueGroups = new Map<string, any[]>();
    for (const sub of dedupedSubs) {
      const key = sub.synagogue_id || "__global__";
      if (!synagogueGroups.has(key)) synagogueGroups.set(key, []);
      synagogueGroups.get(key)!.push(sub);
    }

    let totalSent = 0;
    const title = "🕯️ Chabbat Chalom !";
    const body = `Allumage des bougies dans 18 minutes (${candleTimeStr}). Bon Chabbat !`;

    for (const [synaId, _subs] of synagogueGroups) {
      try {
        const pushBody: any = { title, body };
        if (synaId !== "__global__") pushBody.synagogue_id = synaId;

        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(pushBody),
        });

        const pushData = await pushRes.json();
        totalSent += pushData.sent || 0;
      } catch (e) {
        console.error(`Push error for synagogue ${synaId}:`, e);
      }
    }

    // Log sent notifications
    const logEntries = [...eligibleUserIds].map(uid => ({
      user_id: uid,
      shabbat_date: todayStr,
    }));

    if (logEntries.length > 0) {
      await supabase.from("shabbat_notification_log").insert(logEntries);
    }

    // Also update the legacy shabbat_push_log
    await supabase.from("shabbat_push_log").insert({
      sent_date: todayStr,
      recipients_count: totalSent,
    });

    return json({
      success: true,
      sent: totalSent,
      candle_time: candleTimeStr,
      eligible_users: eligibleUserIds.size,
      deduped_subs: dedupedSubs.length,
    });
  } catch (e) {
    console.error("shabbat-reminder error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ───

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSubCoords(
  sub: any,
  synaLocations: Map<string, { lat: number; lng: number }>,
  profileLocations: Map<string, { lat: number; lng: number }>
): { lat: number; lng: number } {
  // 1. Push subscription GPS
  if (sub.latitude && sub.longitude) return { lat: sub.latitude, lng: sub.longitude };
  // 2. Synagogue GPS
  if (sub.synagogue_id && synaLocations.has(sub.synagogue_id)) return synaLocations.get(sub.synagogue_id)!;
  // 3. User profile GPS
  if (sub.user_id && profileLocations.has(sub.user_id)) return profileLocations.get(sub.user_id)!;
  // 4. Fallback Paris
  return { lat: PARIS_LAT, lng: PARIS_LNG };
}

/**
 * Calculate sunset time for a given date and location.
 * Uses standard astronomical formula.
 */
function calculateSunset(date: Date, lat: number, lng: number): Date | null {
  const dayOfYear = getDayOfYear(date);
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const declination = 23.45 * Math.sin(B);
  const decRad = (declination * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Sunset = sun center at -0.833° (accounting for refraction + sun radius)
  const elevRad = (-0.833 * Math.PI) / 180;

  const cosH =
    (Math.sin(elevRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  if (cosH > 1 || cosH < -1) return null;

  const H = (Math.acos(cosH) * 180) / Math.PI;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const solarNoonUTC = 720 - lng * 4 - EoT;
  const sunsetUTC = solarNoonUTC + H * 4;

  const sunsetDate = new Date(date);
  sunsetDate.setUTCHours(0, 0, 0, 0);
  sunsetDate.setUTCMinutes(Math.round(sunsetUTC));

  return sunsetDate;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}
