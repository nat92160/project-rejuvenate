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
    const url = new URL(req.url);
    const bodyText = await req.text();
    let body: Record<string, unknown> = {};
    try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }
    const action = url.searchParams.get("action") || (body.action as string) || null;

    const ZOOM_CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID");
    const ZOOM_CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Zoom OAuth credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── ACTION: authorize ──
    // Returns the Zoom OAuth URL the frontend should redirect to
    if (action === "authorize") {
      const { userId, redirectUri } = body;

      if (!userId || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "userId and redirectUri required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // State = userId (encrypted in production you'd use a JWT, here we use base64)
      const state = btoa(JSON.stringify({ userId, ts: Date.now() }));
      
      const authUrl = `https://zoom.us/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${ZOOM_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(state)}`;

      return new Response(
        JSON.stringify({ success: true, authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: callback ──
    // Exchange authorization code for tokens and store them
    if (action === "callback") {
      const { code, state, redirectUri } = body;

      if (!code || !state || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "code, state, and redirectUri required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decode state to get userId
      let userId: string;
      try {
        const stateData = JSON.parse(atob(state));
        userId = stateData.userId;
        // Check state is not too old (15 min max)
        if (Date.now() - stateData.ts > 15 * 60 * 1000) {
          return new Response(
            JSON.stringify({ error: "Authorization expired, please try again" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid state parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      });
      console.log("Token exchange params:", { redirect_uri: redirectUri, code_length: code.length, client_id: ZOOM_CLIENT_ID });
      
      const tokenResp = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams,
      });

      if (!tokenResp.ok) {
        const err = await tokenResp.text();
        console.error("Zoom token exchange failed:", tokenResp.status, err);
        console.error("Used redirect_uri:", redirectUri);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to exchange authorization code", details: err, zoomStatus: tokenResp.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenResp.json();

      // Get Zoom user info
      const userResp = await fetch("https://api.zoom.us/v2/users/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      
      let zoomEmail = null;
      let zoomUserId = null;
      if (userResp.ok) {
        const userData = await userResp.json();
        zoomEmail = userData.email;
        zoomUserId = userData.id;
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Upsert tokens
      const { error: upsertError } = await supabase
        .from("zoom_tokens")
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type || "bearer",
          expires_at: expiresAt,
          scope: tokenData.scope || "",
          zoom_user_id: zoomUserId,
          zoom_email: zoomEmail,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Failed to store tokens:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to store Zoom credentials" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, zoomEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: status ──
    // Check if current user has connected Zoom
    if (action === "status") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("zoom_tokens")
        .select("zoom_email, expires_at, scope")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: true, connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          connected: true,
          zoomEmail: data.zoom_email,
          expired: new Date(data.expires_at) < new Date(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: disconnect ──
    if (action === "disconnect") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("zoom_tokens").delete().eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: refresh ──
    // Refresh an expired access token (internal use)
    if (action === "refresh") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: tokenRow, error: fetchErr } = await supabase
        .from("zoom_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchErr || !tokenRow) {
        return new Response(
          JSON.stringify({ error: "No Zoom connection found for this user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
      const refreshResp = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
        }),
      });

      if (!refreshResp.ok) {
        const err = await refreshResp.text();
        console.error("Token refresh failed:", err);
        // Delete invalid tokens
        await supabase.from("zoom_tokens").delete().eq("user_id", userId);
        return new Response(
          JSON.stringify({ error: "Zoom session expired. Please reconnect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTokens = await refreshResp.json();
      const expiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString();

      await supabase.from("zoom_tokens").update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokenRow.refresh_token,
        expires_at: expiresAt,
        scope: newTokens.scope || tokenRow.scope,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, access_token: newTokens.access_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: create-meeting (per-user) ──
    if (action === "create-meeting") {
      const { userId, title, duration, start_time, timezone, passcode, usePmi } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required. Please connect your Zoom account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's tokens
      const { data: tokenRow, error: fetchErr } = await supabase
        .from("zoom_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchErr || !tokenRow) {
        return new Response(
          JSON.stringify({ error: "Zoom non connecté. Veuillez connecter votre compte Zoom." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refresh if expired
      let accessToken = tokenRow.access_token;
      if (new Date(tokenRow.expires_at) < new Date()) {
        const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
        const refreshResp = await fetch("https://zoom.us/oauth/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokenRow.refresh_token,
          }),
        });

        if (!refreshResp.ok) {
          await supabase.from("zoom_tokens").delete().eq("user_id", userId);
          return new Response(
            JSON.stringify({ error: "Session Zoom expirée. Veuillez reconnecter votre compte." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newTokens = await refreshResp.json();
        accessToken = newTokens.access_token;
        
        await supabase.from("zoom_tokens").update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || tokenRow.refresh_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }

      // Create meeting on USER's account
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

      const meetingResp = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingBody),
      });

      if (!meetingResp.ok) {
        const err = await meetingResp.text();
        return new Response(
          JSON.stringify({ success: false, error: `Zoom API error: ${meetingResp.status} ${err}` }),
          { status: meetingResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const meeting = await meetingResp.json();
      return new Response(
        JSON.stringify({
          success: true,
          joinUrl: meeting.join_url,
          startUrl: meeting.start_url,
          meetingId: meeting.id,
          topic: meeting.topic,
          passcode: meeting.password,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: get-pmi (per-user) ──
    if (action === "get-pmi") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: tokenRow } = await supabase
        .from("zoom_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!tokenRow) {
        return new Response(
          JSON.stringify({ success: false, error: "Zoom non connecté" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refresh if needed
      let accessToken = tokenRow.access_token;
      if (new Date(tokenRow.expires_at) < new Date()) {
        const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
        const refreshResp = await fetch("https://zoom.us/oauth/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokenRow.refresh_token,
          }),
        });

        if (!refreshResp.ok) {
          return new Response(
            JSON.stringify({ success: false, error: "Session Zoom expirée" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newTokens = await refreshResp.json();
        accessToken = newTokens.access_token;
        await supabase.from("zoom_tokens").update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || tokenRow.refresh_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }

      const userResp = await fetch("https://api.zoom.us/v2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResp.ok) {
        return new Response(
          JSON.stringify({ success: true, pmi: null, displayName: tokenRow.zoom_email || "" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = await userResp.json();
      return new Response(
        JSON.stringify({
          success: true,
          pmi: user.pmi || null,
          personalMeetingUrl: user.pmi ? `https://zoom.us/j/${user.pmi}` : null,
          displayName: user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Zoom user OAuth error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
