import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;
const MAX_REMINDERS_PER_EVENING = 6;
const TZEIT_DEGREES = 8.5;

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
      return json({ skipped: true, reason: "Not in Omer period" });
    }

    const omerYear = now.getFullYear();

    // Get all users who have already counted today
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

    // Get reminder log for tonight to enforce max 6 reminders
    const { data: reminderLogs } = await supabase
      .from("omer_reminder_log")
      .select("user_id")
      .eq("omer_day", omerDay)
      .eq("omer_year", omerYear);

    // Count reminders per user
    const reminderCounts = new Map<string, number>();
    for (const log of reminderLogs || []) {
      reminderCounts.set(log.user_id, (reminderCounts.get(log.user_id) || 0) + 1);
    }

    // Get ALL push subscriptions with location data
    const { data: allSubs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, device_token, push_type, latitude, longitude, timezone, synagogue_id");

    if (!allSubs?.length) {
      return json({ skipped: true, reason: "No subscribers" });
    }

    // Get synagogue locations for fallback coordinates
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

    // Filter eligible subscribers
    const eligibleSubs = allSubs.filter((s: any) => {
      if (countedUserIds.has(s.user_id)) return false;
      if (disabledUserIds.has(s.user_id)) return false;
      if ((reminderCounts.get(s.user_id) || 0) >= MAX_REMINDERS_PER_EVENING) return false;
      return true;
    });

    if (!eligibleSubs.length) {
      return json({
        skipped: true,
        reason: "No eligible subscribers",
        totalSubs: allSubs.length,
        counted: countedUserIds.size,
        disabled: disabledUserIds.size,
        maxedOut: [...reminderCounts.entries()].filter(([, c]) => c >= MAX_REMINDERS_PER_EVENING).length,
      });
    }

    // Filter by Tzeit HaKochavim
    const readySubs = eligibleSubs.filter((s: any) => {
      const coords = getSubCoords(s, synaLocations, profileLocations);
      return isAfterTzeit(now, coords.lat, coords.lng);
    });

    if (!readySubs.length) {
      return json({
        skipped: true,
        reason: "No subscribers past Tzeit yet",
        eligible: eligibleSubs.length,
      });
    }

    // Deduplicate by user_id + device
    const seenEndpoints = new Set<string>();
    const seenTokens = new Set<string>();
    const uniqueUserSubs: any[] = [];

    for (const sub of readySubs) {
      if (sub.push_type === "native" && sub.device_token) {
        if (!seenTokens.has(sub.device_token)) {
          seenTokens.add(sub.device_token);
          uniqueUserSubs.push(sub);
        }
      } else if (sub.endpoint) {
        if (!seenEndpoints.has(sub.endpoint)) {
          seenEndpoints.add(sub.endpoint);
          uniqueUserSubs.push(sub);
        }
      }
    }

    // Determine which users are getting first vs subsequent reminder
    const uniqueUserIds = [...new Set(uniqueUserSubs.map((s: any) => s.user_id))];
    const firstTimers = new Set(uniqueUserIds.filter(uid => !reminderCounts.has(uid)));

    const titleText = `🌾 Séfirat HaOmer — Jour ${omerDay}`;

    // Send push per synagogue group (send-push handles dedup internally)
    const synagogueIds = [...new Set(readySubs.map((s: any) => s.synagogue_id).filter(Boolean))];
    let totalSent = 0;

    // Send broadcast for users without synagogue
    const hasNullSyna = readySubs.some((s: any) => !s.synagogue_id);
    
    // We need to send individually per-user to customize the body
    // But send-push doesn't support per-user bodies, so we use two bodies:
    const bodyFirst = `C'est l'heure ! Comptez le Omer ce soir — Jour ${omerDay} sur 49.`;
    const bodyReminder = `Rappel : vous n'avez pas encore compté le Omer — Jour ${omerDay} sur 49.`;

    // Determine which body to use based on majority
    const body = firstTimers.size >= uniqueUserIds.length / 2 ? bodyFirst : bodyReminder;

    // Send via send-push (broadcast mode)
    try {
      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ title: titleText, body }),
      });
      const pushData = await pushRes.json();
      totalSent += pushData.sent || 0;
    } catch (e) {
      console.error("Push broadcast error:", e);
    }

    // Log reminders for each unique user
    const logEntries = uniqueUserIds.map(uid => ({
      user_id: uid,
      omer_day: omerDay,
      omer_year: omerYear,
    }));

    if (logEntries.length > 0) {
      await supabase.from("omer_reminder_log").insert(logEntries);
    }

    // Also handle guest Omer subscribers
    const { data: guestSubs } = await supabase
      .from("omer_push_subscriptions")
      .select("endpoint, p256dh, auth, latitude, longitude, timezone");

    let guestSent = 0;
    if (guestSubs?.length) {
      const readyGuests = guestSubs.filter((s: any) => {
        const lat = s.latitude || PARIS_LAT;
        const lng = s.longitude || PARIS_LNG;
        return isAfterTzeit(now, lat, lng);
      });

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
            body: JSON.stringify({ title: titleText, body }),
          });
          if (gRes.ok) guestSent++;
          await gRes.text();
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
      sent: totalSent,
      guestSent,
      logged: logEntries.length,
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

  const pesach = new Date(pesachStr + "T00:00:00Z");
  const omerStart = new Date(pesach);
  omerStart.setUTCDate(omerStart.getUTCDate() + 1);

  const todayMidnight = new Date(date);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (todayMidnight.getTime() - omerStart.getTime()) / 86400000
  );

  if (diffDays < 0 || diffDays > 48) return null;
  return diffDays + 1;
}

/**
 * Precise Tzeit HaKochavim calculation (8.5° below horizon).
 * Uses proper astronomical formula with equation of time.
 */
function isAfterTzeit(now: Date, lat: number, lng: number): boolean {
  const tzeit = calculateTzeit(now, lat, lng);
  if (!tzeit) return false;
  return now.getTime() >= tzeit.getTime();
}

function calculateTzeit(date: Date, lat: number, lng: number): Date | null {
  const dayOfYear = getDayOfYear(date);

  // Solar declination (more precise formula)
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const declination = 23.45 * Math.sin(B);
  const decRad = (declination * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Elevation angle for Tzeit: -8.5°
  const elevRad = (-TZEIT_DEGREES * Math.PI) / 180;

  const cosH =
    (Math.sin(elevRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  if (cosH > 1 || cosH < -1) return null;

  const H = (Math.acos(cosH) * 180) / Math.PI;

  // Equation of time
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Solar noon in UTC minutes
  const solarNoonUTC = 720 - lng * 4 - EoT;

  // Tzeit = solar noon + hour angle (in minutes)
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
