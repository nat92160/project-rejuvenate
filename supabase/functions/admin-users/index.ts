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

    // Verify the calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { action, user_id } = await req.json();

    if (action === "list") {
      // List all users from auth + profiles + roles
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
      if (listError) throw listError;

      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name, suspended, city");
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)!.push(r.role);
      });

      const enriched = users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        display_name: profileMap.get(u.id)?.display_name || "",
        suspended: profileMap.get(u.id)?.suspended || false,
        city: profileMap.get(u.id)?.city || "",
        roles: roleMap.get(u.id) || ["guest"],
      }));

      return new Response(JSON.stringify({ users: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      // Delete from auth (cascades to profiles, roles, etc.)
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (delError) throw delError;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
