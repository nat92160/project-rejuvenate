import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZOOM_ACCOUNT_ID = Deno.env.get("ZOOM_ACCOUNT_ID");
    const ZOOM_CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID");
    const ZOOM_CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET");

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      return new Response(JSON.stringify({ success: false, error: "Zoom credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json() : {};
    const action = url.searchParams.get("action") || body.action;

    const getAccessToken = async () => {
      const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;
      const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
      const resp = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Zoom token error: ${resp.status} ${err}`);
      }
      const data = await resp.json();
      return data.access_token;
    };

    if (action === "create-meeting") {
      const accessToken = await getAccessToken();
      const { title, duration, start_time, timezone, passcode } = body;
      const tz = timezone || "Europe/Paris";

      const meetingBody: Record<string, unknown> = {
        topic: title || "Cours en ligne",
        type: start_time ? 2 : 1,
        duration: duration || 60,
        timezone: tz,
        settings: {
          join_before_host: true,
          waiting_room: false,
          mute_upon_entry: true,
        },
      };

      if (start_time) {
        let formattedTime = start_time;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formattedTime)) {
          formattedTime += ":00";
        }
        meetingBody.start_time = formattedTime;
      }
      if (passcode) {
        (meetingBody.settings as Record<string, unknown>).passcode = passcode;
      }

      const resp = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingBody),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ success: false, error: `Zoom API error: ${resp.status} ${err}` }), {
          status: resp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const meeting = await resp.json();
      return new Response(JSON.stringify({
        success: true,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        meetingId: meeting.id,
        topic: meeting.topic,
        passcode: meeting.password,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-live") {
      const accessToken = await getAccessToken();
      const resp = await fetch("https://api.zoom.us/v2/users/me/meetings?type=live", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!resp.ok) {
        return new Response(JSON.stringify({ success: true, isLive: false, meetings: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const liveMeetings = (data.meetings || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        topic: m.topic,
        join_url: m.join_url,
      }));

      return new Response(JSON.stringify({
        success: true,
        isLive: liveMeetings.length > 0,
        meetings: liveMeetings,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-pmi") {
      const accessToken = await getAccessToken();
      const resp = await fetch("https://api.zoom.us/v2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("Zoom get-pmi error:", resp.status, errBody);
        return new Response(JSON.stringify({ success: false, error: `Zoom API error ${resp.status}: ${errBody}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await resp.json();
      const pmi = user.pmi;
      const personalMeetingUrl = pmi ? `https://zoom.us/j/${pmi}` : null;

      return new Response(JSON.stringify({
        success: true,
        pmi,
        personalMeetingUrl,
        displayName: user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      try {
        await getAccessToken();
        return new Response(JSON.stringify({ success: true, connected: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ success: true, connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Zoom proxy error:", error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
