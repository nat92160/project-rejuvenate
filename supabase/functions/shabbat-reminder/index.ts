import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if today is Friday
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const dayOfWeek = parisTime.getDay();

    if (dayOfWeek !== 5) {
      return new Response(JSON.stringify({ skipped: true, reason: "Not Friday" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already sent today
    const todayStr = parisTime.toISOString().slice(0, 10);
    const { data: existingLog } = await supabase
      .from("shabbat_push_log")
      .select("id")
      .eq("sent_date", todayStr)
      .maybeSingle();

    if (existingLog) {
      return new Response(JSON.stringify({ skipped: true, reason: "Already sent today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch candle lighting time for Paris from Hebcal
    const hebcalRes = await fetch(
      "https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&M=on"
    );
    const hebcalData = await hebcalRes.json();
    const candleItem = (hebcalData.items || []).find(
      (item: any) => item.category === "candles"
    );

    if (!candleItem) {
      return new Response(JSON.stringify({ skipped: true, reason: "No candle time found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candleTime = new Date(candleItem.date);
    const diffMs = candleTime.getTime() - now.getTime();
    const diffMinutes = diffMs / 60000;

    // Only send if we're within the 18-minute window (0 to 18 minutes before)
    if (diffMinutes < 0 || diffMinutes > 18) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `Not in 18min window (${Math.round(diffMinutes)} min left)`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ALL push subscriptions
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subsError || !subs?.length) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No subscribers", error: subsError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format candle time for display
    const candleTimeStr = candleTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });

    // Send push via the existing send-push function pattern
    // We'll call each synagogue's subscribers
    const synagogueIds = [...new Set(subs.map((s: any) => s.synagogue_id))];
    let totalSent = 0;

    for (const synaId of synagogueIds) {
      try {
        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            synagogue_id: synaId,
            title: "🕯️ Chabbat dans 18 minutes !",
            body: `Allumage des bougies à ${candleTimeStr}. Chabbat Chalom !`,
          }),
        });

        const pushData = await pushRes.json();
        totalSent += pushData.sent || 0;
      } catch (e) {
        console.error(`Push error for synagogue ${synaId}:`, e);
      }
    }

    // Log that we sent
    await supabase.from("shabbat_push_log").insert({
      sent_date: todayStr,
      recipients_count: totalSent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        candle_time: candleTimeStr,
        synagogues: synagogueIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("shabbat-reminder error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
