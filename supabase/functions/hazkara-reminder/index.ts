import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Accept either service role bearer (manual/admin call) OR anon apikey (pg_cron)
    const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const apikey = req.headers.get("apikey") || "";
    const authorized =
      (auth && (auth === serviceKey || auth === anonKey)) ||
      (apikey && (apikey === serviceKey || apikey === anonKey));
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Compute "tomorrow" in Paris (Hazkara observance day) — alert sent the eve.
    const now = new Date();
    const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const tomorrow = new Date(paris);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const gy = tomorrow.getFullYear();
    const gm = tomorrow.getMonth() + 1;
    const gd = tomorrow.getDate();

    // Convert tomorrow's gregorian date -> hebrew date via Hebcal
    const convRes = await fetch(
      `https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1&strict=1`,
    );
    if (!convRes.ok) {
      const text = await convRes.text();
      throw new Error(`Hebcal failed: ${convRes.status} ${text}`);
    }
    const conv = await convRes.json();
    const tomorrowHebDay: number = conv.hd;
    const tomorrowHebMonth: string = conv.hm; // e.g. "Cheshvan", "Adar1", "Adar2"

    console.log(`[hazkara-reminder] tomorrow=${gy}-${gm}-${gd} → ${tomorrowHebDay} ${tomorrowHebMonth}`);

    // Find all records matching tomorrow's hebrew day+month
    // Adar handling: in non-leap year, Hebcal returns "Adar"; users may have saved
    // "Adar", "Adar1" or "Adar2" — match any Adar variant when tomorrow is "Adar".
    const monthCandidates: string[] = [tomorrowHebMonth];
    if (tomorrowHebMonth === "Adar") monthCandidates.push("Adar1", "Adar2");
    if (tomorrowHebMonth === "Adar2") monthCandidates.push("Adar");

    const { data: records, error } = await supabase
      .from("hazkara_records")
      .select("id, user_id, deceased_name, hebrew_day, hebrew_month")
      .eq("hebrew_day", tomorrowHebDay)
      .in("hebrew_month", monthCandidates);

    if (error) throw error;
    if (!records?.length) {
      return json({ skipped: true, reason: "No hazkara tomorrow", tomorrowHebDay, tomorrowHebMonth });
    }

    // Group by user (avoid duplicate names)
    const byUser = new Map<string, string[]>();
    for (const r of records) {
      const arr = byUser.get(r.user_id) || [];
      if (!arr.includes(r.deceased_name)) arr.push(r.deceased_name);
      byUser.set(r.user_id, arr);
    }

    const dateFr = tomorrow.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
      timeZone: "Europe/Paris",
    });

    let totalSent = 0;
    const errors: any[] = [];

    for (const [userId, names] of byUser) {
      const namesStr = names.join(", ");
      const title = "🕯️ Hazkara demain";
      const body = names.length === 1
        ? `Ce soir : allumez la bougie pour ${namesStr} (sortie des étoiles). 🪦 Demain ${dateFr} : Hazkara et visite au cimetière.`
        : `Ce soir : allumez les bougies pour ${namesStr} (sortie des étoiles). 🪦 Demain ${dateFr} : Hazkara et visite au cimetière.`;

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ title, body, user_ids: [userId] }),
        });
        const data = await res.json().catch(() => ({}));
        totalSent += data.sent || 0;
        if (!res.ok) errors.push({ userId, status: res.status, data });
      } catch (e) {
        console.error("Push error for user", userId, e);
        errors.push({ userId, error: String(e) });
      }
    }

    return json({
      success: true,
      tomorrow: `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`,
      hebrew: `${tomorrowHebDay} ${tomorrowHebMonth}`,
      matched: records.length,
      users: byUser.size,
      sent: totalSent,
      errors,
    });
  } catch (err) {
    console.error("hazkara-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
