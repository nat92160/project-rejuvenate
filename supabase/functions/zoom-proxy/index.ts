import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const inferMeetingNumberFromUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  const match = value.match(/\/(?:j|s)\/(\d+)/i);
  return match ? match[1] : null;
};

const getZoomJson = async (accessToken: string, path: string) => {
  const resp = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await resp.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { resp, data, text };
};

const getPmiFromScheduledMeetings = async (accessToken: string) => {
  const { resp: meetingsResp, data: meetingsData } = await getZoomJson(
    accessToken,
    "/users/me/meetings?type=scheduled&page_size=30",
  );

  if (!meetingsResp.ok || !meetingsData || typeof meetingsData !== "object") {
    return null;
  }

  const meetings = Array.isArray((meetingsData as { meetings?: unknown[] }).meetings)
    ? ((meetingsData as { meetings?: unknown[] }).meetings as Array<Record<string, unknown>>)
    : [];

  const candidates = new Map<string, { count: number; joinUrl: string | null; hostEmail: string | null }>();

  for (const meeting of meetings) {
    const meetingId = meeting.id;
    if (!meetingId) continue;

    const { resp: detailResp, data: detailData } = await getZoomJson(accessToken, `/meetings/${meetingId}`);
    if (!detailResp.ok || !detailData || typeof detailData !== "object") continue;

    const detail = detailData as Record<string, unknown>;
    const settings = (detail.settings as Record<string, unknown> | undefined) || {};
    if (!settings.use_pmi) continue;

    const inferredMeetingNumber =
      inferMeetingNumberFromUrl(detail.join_url) ||
      inferMeetingNumberFromUrl(detail.start_url);

    if (!inferredMeetingNumber) continue;

    const current = candidates.get(inferredMeetingNumber);
    candidates.set(inferredMeetingNumber, {
      count: (current?.count || 0) + 1,
      joinUrl:
        typeof detail.join_url === "string"
          ? detail.join_url
          : current?.joinUrl || `https://zoom.us/j/${inferredMeetingNumber}`,
      hostEmail:
        typeof detail.host_email === "string"
          ? detail.host_email
          : current?.hostEmail || null,
    });
  }

  const bestCandidate = [...candidates.entries()]
    .sort((a, b) => b[1].count - a[1].count)[0];

  if (!bestCandidate) return null;

  const [pmi, meta] = bestCandidate;

  return {
    pmi: Number(pmi),
    personalMeetingUrl: meta.joinUrl || `https://zoom.us/j/${pmi}`,
    displayName: meta.hostEmail || "",
    inferredFromMeetings: true,
  };
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
      return await resp.json();
    };

    if (action === "create-meeting") {
      const tokenData = await getAccessToken();
      const accessToken = tokenData.access_token;
      const { title, duration, start_time, timezone, passcode, usePmi } = body;
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
          use_pmi: Boolean(usePmi),
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
      const tokenData = await getAccessToken();
      const accessToken = tokenData.access_token;
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
      const tokenData = await getAccessToken();
      const accessToken = tokenData.access_token;
      const grantedScopes = String(tokenData.scope || "").split(" ").filter(Boolean);
      const { resp, data: userData, text: errBody } = await getZoomJson(accessToken, "/users/me");

      if (!resp.ok) {
        console.error("Zoom get-pmi error:", resp.status, errBody);

        const fallbackPmi = await getPmiFromScheduledMeetings(accessToken);
        if (fallbackPmi) {
          return new Response(JSON.stringify({
            success: true,
            ...fallbackPmi,
            source: "scheduled_meetings",
            message: "Salle perso détectée à partir de vos réunions Zoom existantes.",
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (resp.status === 400 && grantedScopes.includes("user:read:pm_room:admin")) {
          return new Response(JSON.stringify({
            success: true,
            pmi: null,
            personalMeetingUrl: null,
            displayName: "",
            previewUnavailable: true,
            message: "Le token Zoom permet d’utiliser la salle perso lors de la création, mais pas d’en afficher l’aperçu.",
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: false, error: `Zoom API error ${resp.status}: ${errBody}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = (userData || {}) as Record<string, unknown>;
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
        const tokenData = await getAccessToken();
        return new Response(JSON.stringify({ success: true, connected: true, scopes: tokenData.scope || "" }), {
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
