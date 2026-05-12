import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Compute "tomorrow" in Paris (Hazkara observance date) — we send the
    // reminder the evening before so the user can light the candle at Tzeit.
    const now = new Date();
    const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const tomorrow = new Date(paris);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const target = `${yyyy}-${mm}-${dd}`;

    const { data: reminders, error } = await supabase
      .from("hazkara_reminders")
      .select("id, user_id, deceased_name, observance_date")
      .eq("observance_date", target)
      .eq("sent", false);

    if (error) throw error;
    if (!reminders?.length) {
      return json({ skipped: true, reason: "No reminders for tomorrow", target });
    }

    let totalSent = 0;
    const sentIds: string[] = [];

    // Group by user
    const byUser = new Map<string, typeof reminders>();
    for (const r of reminders) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, [] as any);
      byUser.get(r.user_id)!.push(r);
    }

    for (const [userId, list] of byUser) {
      const names = list.map((r: any) => r.deceased_name).join(", ");
      const title = "🕯️ Hazkara demain";
      const body = list.length === 1
        ? `Pensez à allumer la bougie ce soir à la sortie des étoiles pour ${names}.`
        : `Pensez à allumer les bougies ce soir pour : ${names}.`;

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ title, body, user_ids: [userId] }),
        });
        const data = await res.json();
        totalSent += data.sent || 0;
        for (const r of list) sentIds.push(r.id);
      } catch (e) {
        console.error("Push error for user", userId, e);
      }
    }

    if (sentIds.length) {
      await supabase.from("hazkara_reminders").update({ sent: true }).in("id", sentIds);
    }

    return json({ success: true, target, reminders: reminders.length, sent: totalSent });
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