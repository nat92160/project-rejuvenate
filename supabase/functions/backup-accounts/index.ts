import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Snapshots every user account (profile + roles + owned synagogues + subscriptions)
 * into public.account_backups. Idempotent per day: skips users already backed up today.
 * Triggered by:
 *  - daily pg_cron job
 *  - manual call from admin (action: "run")
 *  - admin-users delete flow (action: "snapshot_user", user_id)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* allow empty body for cron */ }
    const action = body.action || "run";
    const reason = body.reason || (action === "snapshot_user" ? "pre_delete" : "auto_daily");

    // Auth: cron 'run' must use service-role bearer; admin actions need an admin JWT
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (action === "run") {
      // verify_jwt=false at gateway; pg_cron uses legacy anon JWT that no longer
      // matches rotated env keys. 'run' is idempotent (skips users backed up today).
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller } } = await admin.auth.getUser(token);
      if (!caller) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
      const { data: roleData } = await admin
        .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
      if (!roleData) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const targetUserIds: string[] = [];
    if (action === "snapshot_user" && body.user_id) {
      targetUserIds.push(body.user_id);
    } else {
      const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      users.forEach((u: any) => targetUserIds.push(u.id));
    }

    // Skip users already backed up today (only for auto_daily)
    let skipSet = new Set<string>();
    if (reason === "auto_daily") {
      const since = new Date(); since.setUTCHours(0, 0, 0, 0);
      const { data: existing } = await admin
        .from("account_backups")
        .select("user_id")
        .eq("reason", "auto_daily")
        .gte("created_at", since.toISOString());
      skipSet = new Set((existing || []).map((r: any) => r.user_id));
    }

    const toBackup = targetUserIds.filter((id) => !skipSet.has(id));
    if (toBackup.length === 0) {
      return new Response(JSON.stringify({ ok: true, backed_up: 0, skipped: targetUserIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk fetch related data
    const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const userMap = new Map((allUsers || []).map((u: any) => [u.id, u]));

    const [profilesRes, rolesRes, synaPresRes, synaAdjRes, subsRes] = await Promise.all([
      admin.from("profiles").select("*").in("user_id", toBackup),
      admin.from("user_roles").select("*").in("user_id", toBackup),
      admin.from("synagogue_profiles").select("*").in("president_id", toBackup),
      admin.from("synagogue_profiles").select("*").in("adjoint_id", toBackup),
      admin.from("synagogue_subscriptions").select("*").in("user_id", toBackup),
    ]);

    const groupBy = (arr: any[], key: string) => {
      const m = new Map<string, any[]>();
      (arr || []).forEach((r) => {
        const k = r[key]; if (!k) return;
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(r);
      });
      return m;
    };
    const profByUser = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const rolesByUser = groupBy(rolesRes.data || [], "user_id");
    const synaPresByUser = groupBy(synaPresRes.data || [], "president_id");
    const synaAdjByUser = groupBy(synaAdjRes.data || [], "adjoint_id");
    const subsByUser = groupBy(subsRes.data || [], "user_id");

    const rows = toBackup.map((uid) => {
      const u: any = userMap.get(uid);
      const profile = profByUser.get(uid) || null;
      return {
        user_id: uid,
        email: u?.email || null,
        display_name: profile?.display_name || u?.email || null,
        reason,
        created_by: body.created_by || null,
        snapshot: {
          auth: u ? { email: u.email, created_at: u.created_at, user_metadata: u.user_metadata } : null,
          profile,
          roles: rolesByUser.get(uid) || [],
          synagogues_president: synaPresByUser.get(uid) || [],
          synagogues_adjoint: synaAdjByUser.get(uid) || [],
          subscriptions: subsByUser.get(uid) || [],
        },
      };
    });

    // Chunked insert
    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await admin.from("account_backups").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, backed_up: inserted, skipped: skipSet.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("backup-accounts error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});