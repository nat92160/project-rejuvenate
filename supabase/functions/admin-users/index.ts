import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const { action, user_id } = body;

    if (action === "list") {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
      if (listError) throw listError;

      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name, first_name, last_name, suspended, city");
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)!.push(r.role);
      });

      const enriched = users.map((u: any) => {
        const p = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          display_name: p?.display_name || "",
          first_name: p?.first_name || "",
          last_name: p?.last_name || "",
          suspended: p?.suspended || false,
          city: p?.city || "",
          roles: roleMap.get(u.id) || ["guest"],
        };
      });

      return new Response(JSON.stringify({ users: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_profile" && user_id) {
      const { first_name, last_name, city } = body;
      const profilePayload: Record<string, string> = {};
      if (typeof first_name === "string") profilePayload.first_name = first_name;
      if (typeof last_name === "string") profilePayload.last_name = last_name;
      if (typeof city === "string") profilePayload.city = city;

      // Build display_name from first/last
      if (first_name !== undefined || last_name !== undefined) {
        profilePayload.display_name = [first_name || "", last_name || ""].map(s => s.trim()).filter(Boolean).join(" ");
      }

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabaseAdmin.from("profiles").update(profilePayload).eq("user_id", user_id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("profiles").insert({ user_id, ...profilePayload });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "set_role" && user_id) {
      const { role } = body;
      const validRoles = ["fidele", "president", "guest"];
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: corsHeaders });
      }

      // Remove existing non-admin roles
      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("id, role")
        .eq("user_id", user_id);

      const toDelete = (existingRoles || []).filter((r: any) => r.role !== "admin");
      for (const r of toDelete) {
        await supabaseAdmin.from("user_roles").delete().eq("id", r.id);
      }

      // Insert new role
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id, role });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "suspend" && user_id) {
      await supabaseAdmin.from("profiles").update({ suspended: true }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "unsuspend" && user_id) {
      await supabaseAdmin.from("profiles").update({ suspended: false }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete" && user_id) {
      // Snapshot account before deletion (best-effort)
      try {
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const u: any = (allUsers || []).find((x: any) => x.id === user_id);
        const [profileRes, rolesRes, synaPresRes, synaAdjRes, subsRes] = await Promise.all([
          supabaseAdmin.from("profiles").select("*").eq("user_id", user_id).maybeSingle(),
          supabaseAdmin.from("user_roles").select("*").eq("user_id", user_id),
          supabaseAdmin.from("synagogue_profiles").select("*").eq("president_id", user_id),
          supabaseAdmin.from("synagogue_profiles").select("*").eq("adjoint_id", user_id),
          supabaseAdmin.from("synagogue_subscriptions").select("*").eq("user_id", user_id),
        ]);
        await supabaseAdmin.from("account_backups").insert({
          user_id,
          email: u?.email || null,
          display_name: profileRes.data?.display_name || u?.email || null,
          reason: "pre_delete",
          created_by: caller.id,
          snapshot: {
            auth: u ? { email: u.email, created_at: u.created_at, user_metadata: u.user_metadata } : null,
            profile: profileRes.data || null,
            roles: rolesRes.data || [],
            synagogues_president: synaPresRes.data || [],
            synagogues_adjoint: synaAdjRes.data || [],
            subscriptions: subsRes.data || [],
          },
        });
      } catch (backupErr) {
        console.error("pre_delete backup failed:", backupErr);
        return new Response(JSON.stringify({ error: "Backup failed, deletion aborted" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (delError) throw delError;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_backups") {
      const { data, error } = await supabaseAdmin
        .from("account_backups")
        .select("id, user_id, email, display_name, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return new Response(JSON.stringify({ backups: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_backup" && body.backup_id) {
      const { data, error } = await supabaseAdmin
        .from("account_backups").select("*").eq("id", body.backup_id).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ backup: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore_backup" && body.backup_id) {
      const { data: backup, error: bErr } = await supabaseAdmin
        .from("account_backups").select("*").eq("id", body.backup_id).maybeSingle();
      if (bErr) throw bErr;
      if (!backup) return new Response(JSON.stringify({ error: "Backup not found" }), { status: 404, headers: corsHeaders });

      const snap = backup.snapshot || {};
      let targetUserId = backup.user_id;

      // Recreate auth user if it no longer exists
      const { data: existing } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (!existing?.user) {
        const email = snap.auth?.email || backup.email;
        if (!email) return new Response(JSON.stringify({ error: "No email to restore" }), { status: 400, headers: corsHeaders });
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: snap.auth?.user_metadata || {},
        });
        if (createErr) throw createErr;
        targetUserId = created.user!.id;
      }

      // Restore profile
      if (snap.profile) {
        const { id: _omit, user_id: _u, ...profileData } = snap.profile;
        await supabaseAdmin.from("profiles")
          .upsert({ ...profileData, user_id: targetUserId }, { onConflict: "user_id" });
      }
      // Restore roles
      for (const r of (snap.roles || [])) {
        await supabaseAdmin.from("user_roles")
          .upsert({ user_id: targetUserId, role: r.role }, { onConflict: "user_id,role" });
      }
      // Restore synagogue ownerships
      for (const sp of (snap.synagogues_president || [])) {
        await supabaseAdmin.from("synagogue_profiles")
          .update({ president_id: targetUserId }).eq("id", sp.id);
      }
      for (const sp of (snap.synagogues_adjoint || [])) {
        await supabaseAdmin.from("synagogue_profiles")
          .update({ adjoint_id: targetUserId }).eq("id", sp.id);
      }
      // Restore subscriptions
      for (const s of (snap.subscriptions || [])) {
        await supabaseAdmin.from("synagogue_subscriptions")
          .upsert({ user_id: targetUserId, synagogue_id: s.synagogue_id }, { onConflict: "user_id,synagogue_id" });
      }

      return new Response(JSON.stringify({ success: true, user_id: targetUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
