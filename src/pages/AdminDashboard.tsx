import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useOmerVisibility, toggleOmerMasterSwitch } from "@/hooks/useOmerVisibility";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PrayerTimeSuggestionsAdmin from "@/components/PrayerTimeSuggestionsAdmin";
import ZmanimTravelSimulator from "@/components/admin/ZmanimTravelSimulator";
import SynagogueFormSheet from "@/components/SynagogueFormSheet";

interface PresidentRequest {
  id: string;
  user_id: string;
  synagogue_name: string;
  city: string;
  message: string;
  status: string;
  created_at: string;
  user_email?: string;
}

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  display_name: string;
  first_name: string;
  last_name: string;
  suspended: boolean;
  city: string;
  roles: string[];
}

interface SynaItem {
  id: string;
  name: string;
  verified: boolean;
  president_id: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
  signature: string | null;
  created_at: string;
}

const TestPushButton = () => {
  const [sending, setSending] = useState(false);

  const handleTestPush = async () => {
    setSending(true);
    try {
      // Register SW and get subscription
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Les notifications push ne sont pas supportées sur ce navigateur");
        setSending(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permission de notification refusée");
        setSending(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw-push.js");
      const VAPID_PUBLIC_KEY = "BNYI9Tgykt3mNibxS99dEslhBuB7Ek-69xf0AyPT9iXcSfzA_K_D-amPMuM4F9s3y0lS9g7GDOXF_Va63XcIeIM";
      const padding = "=".repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
      const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const applicationServerKey = Uint8Array.from(rawData, (char) => char.charCodeAt(0));

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey as unknown as BufferSource });
      }

      const key = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      if (!key || !auth) { toast.error("Clés push manquantes"); setSending(false); return; }

      const toBase64url = (buf: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      // Call send-push directly with inline subscription (bypass synagogue filtering)
      const { data, error } = await supabase.functions.invoke("send-push-test", {
        body: {
          endpoint: sub.endpoint,
          p256dh: toBase64url(key),
          auth: toBase64url(auth),
          title: "🧪 Test Push — CalJ",
          body: "Si vous voyez ceci, les notifications fonctionnent ! ✅",
        },
      });

      if (error) throw error;
      toast.success("✅ Notification de test envoyée !");
    } catch (err) {
      console.error("Test push error:", err);
      toast.error("Erreur lors de l'envoi du test");
    }
    setSending(false);
  };

  return (
    <button
      onClick={handleTestPush}
      disabled={sending}
      className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
      style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
    >
      {sending ? "⏳ Envoi en cours…" : "📲 Envoyer une notification test"}
    </button>
  );
};

const NOTIF_SETTINGS = [
  { key: "notif_chabbat", icon: "🕯️", label: "Rappel Chabbat", desc: "Push 18 min avant l'allumage des bougies chaque vendredi" },
  { key: "notif_omer", icon: "🌾", label: "Rappel Omer", desc: "Push quotidien pendant les 49 jours du Omer" },
  { key: "notif_minyan", icon: "🚨", label: "Urgence Minyan", desc: "Push quand un nouveau minyan est créé dans une synagogue" },
  { key: "notif_tehilim", icon: "📖", label: "Chaîne Tehilim", desc: "Push quand une nouvelle chaîne de Tehilim est lancée" },
];

const SettingsTab = () => {
  const { masterEnabled } = useOmerVisibility();
  const [toggling, setToggling] = useState(false);
  const [notifStates, setNotifStates] = useState<Record<string, boolean>>({});
  const [notifLoading, setNotifLoading] = useState<Record<string, boolean>>({});
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load notification settings from app_settings
  useEffect(() => {
    if (initialLoaded) return;
    (async () => {
      const { data } = await supabase.from("app_settings").select("key, value").in("key", NOTIF_SETTINGS.map(n => n.key));
      const states: Record<string, boolean> = {};
      NOTIF_SETTINGS.forEach(n => { states[n.key] = true; }); // default ON
      (data || []).forEach((row: any) => { states[row.key] = row.value === true || row.value === "true"; });
      setNotifStates(states);
      setInitialLoaded(true);
    })();
  }, [initialLoaded]);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    const { error } = await toggleOmerMasterSwitch(checked);
    if (error) toast.error("Erreur de mise à jour");
    else toast.success(checked ? "🌾 Omer activé pour tous !" : "Omer masqué (lien direct toujours actif)");
    setToggling(false);
  };

  const handleNotifToggle = async (key: string, checked: boolean) => {
    setNotifLoading(prev => ({ ...prev, [key]: true }));
    const { error } = await supabase.from("app_settings").upsert({ key, value: checked as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error("Erreur de mise à jour");
    else {
      setNotifStates(prev => ({ ...prev, [key]: checked }));
      toast.success(checked ? "🔔 Notification activée" : "🔕 Notification désactivée");
    }
    setNotifLoading(prev => ({ ...prev, [key]: false }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-bold text-foreground mb-1">🌾 Séfirat HaOmer</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Contrôle la visibilité du widget Omer sur la page d'accueil. Le lien direct <code className="bg-muted px-1 rounded">/omer</code> reste toujours actif.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Activer l'Omer pour tous</span>
          <Switch checked={masterEnabled} onCheckedChange={handleToggle} disabled={toggling} />
        </div>
        {masterEnabled && (
          <p className="text-xs text-primary mt-2">✅ Le widget est visible pour tous les utilisateurs</p>
        )}
        {!masterEnabled && (
          <p className="text-xs text-muted-foreground mt-2">🔒 Visible uniquement via /omer ou pour les admins</p>
        )}
      </div>

      {/* Notification toggles */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-bold text-foreground mb-1">🔔 Notifications Push</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Activez ou désactivez chaque type de notification push pour l'ensemble des utilisateurs.
        </p>
        <div className="space-y-4">
          {NOTIF_SETTINGS.map(n => (
            <div key={n.key} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{n.icon}</span>
                  <span className="text-sm font-bold text-foreground">{n.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-7">{n.desc}</p>
              </div>
              <Switch
                checked={notifStates[n.key] ?? true}
                onCheckedChange={(checked) => handleNotifToggle(n.key, checked)}
                disabled={notifLoading[n.key]}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Test push button */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-bold text-foreground mb-1">🧪 Test Push</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Envoyez-vous une notification push de test pour vérifier que tout fonctionne.
        </p>
        <TestPushButton />
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"requests" | "users" | "synagogues" | "horaires" | "settings">("requests");
  const [requests, setRequests] = useState<PresidentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userProcessing, setUserProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", city: "" });

  // Synagogues state
  const [synas, setSynas] = useState<SynaItem[]>([]);
  const [synasLoading, setSynasLoading] = useState(false);
  const [synaProcessing, setSynaProcessing] = useState<string | null>(null);
  const [showCreateSyna, setShowCreateSyna] = useState(false);
  const [editingSyna, setEditingSyna] = useState<SynaItem | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("president_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const enriched = await Promise.all(
        (data as PresidentRequest[]).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", req.user_id)
            .single();
          return { ...req, user_email: profile?.display_name || req.user_id.slice(0, 8) };
        })
      );
      setRequests(enriched);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });
    if (error) toast.error("Erreur de chargement des utilisateurs");
    else setUsers(data.users || []);
    setUsersLoading(false);
  };

  const fetchSynas = async () => {
    setSynasLoading(true);
    const { data } = await supabase
      .from("synagogue_profiles")
      .select("id, name, verified, president_id, address, phone, email, shacharit_time, minha_time, arvit_time, signature, created_at")
      .neq("name", "")
      .order("created_at", { ascending: false });
    setSynas((data || []) as SynaItem[]);
    setSynasLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchRequests();
  }, [user, isAdmin]);

  useEffect(() => {
    if (tab === "users" && users.length === 0) fetchUsers();
    if (tab === "synagogues" && synas.length === 0) fetchSynas();
  }, [tab]);

  const handleDecision = async (requestId: string, userId: string, decision: "approved" | "rejected") => {
    setProcessing(requestId);
    const { error: updateError } = await supabase
      .from("president_requests")
      .update({ status: decision, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateError) { toast.error("Erreur"); setProcessing(null); return; }

    if (decision === "approved") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "president" as any });
    }

    toast.success(decision === "approved" ? "✅ Président approuvé !" : "❌ Demande refusée");
    await fetchRequests();
    setProcessing(null);
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setUserProcessing(userId);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: suspend ? "suspend" : "unsuspend", user_id: userId },
    });
    if (error) toast.error("Erreur");
    else { toast.success(suspend ? "⏸️ Compte suspendu" : "▶️ Compte réactivé"); await fetchUsers(); }
    setUserProcessing(null);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Supprimer définitivement le compte de ${email} ? Cette action est irréversible.`)) return;
    setUserProcessing(userId);
    const { error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: userId } });
    if (error) toast.error("Erreur de suppression");
    else { toast.success("🗑️ Compte supprimé"); await fetchUsers(); }
    setUserProcessing(null);
  };

  const openEditDialog = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setProfileForm({ first_name: managedUser.first_name || "", last_name: managedUser.last_name || "", city: managedUser.city || "" });
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;
    setUserProcessing(editingUser.id);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "update_profile", user_id: editingUser.id, first_name: profileForm.first_name.trim(), last_name: profileForm.last_name.trim(), city: profileForm.city.trim() },
    });
    if (error) toast.error("Erreur de mise à jour du profil");
    else { toast.success("✅ Profil mis à jour"); await fetchUsers(); setEditingUser(null); }
    setUserProcessing(null);
  };

  const handleSetRole = async (userId: string, role: string) => {
    setUserProcessing(userId);
    const { error } = await supabase.functions.invoke("admin-users", { body: { action: "set_role", user_id: userId, role } });
    if (error) toast.error("Erreur de changement de rôle");
    else { toast.success(`Rôle mis à jour : ${role}`); await fetchUsers(); }
    setUserProcessing(null);
  };

  const handleToggleVerify = async (synaId: string, currentlyVerified: boolean) => {
    setSynaProcessing(synaId);
    const { error } = await supabase
      .from("synagogue_profiles")
      .update({ verified: !currentlyVerified } as any)
      .eq("id", synaId);
    if (error) toast.error("Erreur");
    else { toast.success(!currentlyVerified ? "✅ Synagogue vérifiée !" : "Vérification retirée"); await fetchSynas(); }
    setSynaProcessing(null);
  };

  const handleDeleteSyna = async (synaId: string, synaName: string) => {
    if (!confirm(`Supprimer définitivement la synagogue "${synaName}" ? Cette action est irréversible.`)) return;
    setSynaProcessing(synaId);
    const { error } = await supabase.from("synagogue_profiles").delete().eq("id", synaId);
    if (error) toast.error("Erreur de suppression");
    else { toast.success("🗑️ Synagogue supprimée"); await fetchSynas(); }
    setSynaProcessing(null);
  };

  const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const processed = useMemo(() => requests.filter((r) => r.status !== "pending"), [requests]);
  const filteredUsers = useMemo(
    () => users.filter((u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [users, searchTerm]
  );

  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    president: "bg-primary/10 text-primary",
    fidele: "bg-primary/10 text-primary",
    guest: "bg-muted text-muted-foreground",
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const verifiedCount = synas.filter(s => s.verified).length;
  const unverifiedCount = synas.filter(s => !s.verified).length;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg cursor-pointer hover:bg-muted transition-all">←</button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">🛡️ Administration</h1>
            <p className="text-sm text-muted-foreground">Gestion de l'application</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: "requests" as const, icon: "📋", label: "Demandes", count: pending.length },
            { id: "users" as const, icon: "👥", label: "Utilisateurs", count: users.length },
            { id: "synagogues" as const, icon: "🏛️", label: "Synagogues", count: synas.length },
            { id: "horaires" as const, icon: "🕐", label: "Horaires", count: 0 },
            
            { id: "settings" as const, icon: "⚙️", label: "Réglages", count: 0 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 rounded-xl text-sm font-bold border cursor-pointer transition-all"
              style={tab === t.id
                ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
                : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
              }
            >
              {t.icon} {t.label} {t.count > 0 && `(${t.count})`}
            </button>
          ))}
        </div>

        {/* Requests tab */}
        {tab === "requests" && (
          <>
            <div className="mb-8">
              <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                En attente ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-primary/20 bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground">{req.synagogue_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">📍 {req.city} • 👤 {req.user_email}</p>
                          {req.message && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2">💬 {req.message}</p>}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(req.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleDecision(req.id, req.user_id, "approved")} disabled={processing === req.id}
                          className="flex-1 py-2.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                          style={{ background: "var(--gradient-gold)" }}>
                          {processing === req.id ? "⏳" : "✅ Approuver"}
                        </button>
                        <button onClick={() => handleDecision(req.id, req.user_id, "rejected")} disabled={processing === req.id}
                          className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-destructive/10 text-destructive border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]">
                          {processing === req.id ? "⏳" : "❌ Refuser"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {processed.length > 0 && (
              <div>
                <h2 className="font-bold text-lg text-foreground mb-4">Historique</h2>
                <div className="space-y-2">
                  {processed.map((req) => (
                    <div key={req.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{req.synagogue_name}</p>
                        <p className="text-[10px] text-muted-foreground">{req.user_email} • {req.city}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${req.status === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {req.status === "approved" ? "Approuvé" : "Refusé"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Rechercher un utilisateur..."
                className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={fetchUsers} disabled={usersLoading}
                className="px-4 py-3 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {usersLoading ? "⏳" : "🔄"}
              </button>
            </div>
            {usersLoading ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Chargement des utilisateurs…</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u, i) => (
                  <motion.div
                    key={u.id}
                    className={`rounded-2xl border bg-card p-4 ${u.suspended ? "border-destructive/20 opacity-60" : "border-border"}`}
                    style={{ boxShadow: "var(--shadow-card)" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: u.suspended ? 0.6 : 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground break-all">
                            {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.display_name || "Sans nom"}
                          </p>
                          {u.suspended && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suspendu</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 break-all">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {u.roles.map((r) => (
                            <span key={r} className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${roleColors[r] || roleColors.guest}`}>{r}</span>
                          ))}
                          {u.city && <span className="text-[10px] text-muted-foreground">📍 {u.city}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => openEditDialog(u)} disabled={userProcessing === u.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                          style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
                          ✏️ Modifier
                        </button>
                        {!u.roles.includes("admin") && (
                          <>
                            <button onClick={() => handleSuspend(u.id, !u.suspended)} disabled={userProcessing === u.id}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                              style={u.suspended ? { background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                              {userProcessing === u.id ? "⏳" : u.suspended ? "▶️ Réactiver" : "⏸️ Suspendre"}
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.email || "")} disabled={userProcessing === u.id}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-destructive/10 text-destructive border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95">
                              {userProcessing === u.id ? "⏳" : "🗑️ Supprimer"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="rounded-2xl border border-border bg-card p-8 text-center">
                    <span className="text-4xl">🔍</span>
                    <p className="mt-3 text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Synagogues tab */}
        {tab === "synagogues" && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-sm font-bold text-green-600 mt-1">{verifiedCount}</p>
                <p className="text-[10px] text-muted-foreground">Vérifiées</p>
              </div>
              <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                <span className="text-2xl">⏳</span>
                <p className="text-sm font-bold text-red-500 mt-1">{unverifiedCount}</p>
                <p className="text-[10px] text-muted-foreground">Non vérifiées</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowCreateSyna(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
                ➕ Créer une synagogue
              </button>
              <button onClick={fetchSynas} disabled={synasLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {synasLoading ? "⏳" : "🔄"}
              </button>
            </div>
            <SynagogueFormSheet open={showCreateSyna} onOpenChange={setShowCreateSyna} onCreated={fetchSynas} adminMode />
            <SynagogueFormSheet
              open={!!editingSyna}
              onOpenChange={(open) => !open && setEditingSyna(null)}
              onCreated={fetchSynas}
              adminMode
              editData={editingSyna ? {
                id: editingSyna.id,
                name: editingSyna.name,
                address: editingSyna.address,
                phone: editingSyna.phone,
                email: editingSyna.email,
                shacharit_time: editingSyna.shacharit_time,
                minha_time: editingSyna.minha_time,
                arvit_time: editingSyna.arvit_time,
                signature: editingSyna.signature,
                president_id: editingSyna.president_id,
              } : null}
            />
            {synasLoading ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Chargement…</div>
            ) : synas.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <span className="text-4xl">🏛️</span>
                <p className="mt-3 text-sm text-muted-foreground">Aucune synagogue enregistrée.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {synas.map((syna, i) => (
                  <motion.div
                    key={syna.id}
                    className="rounded-2xl border bg-card p-4"
                    style={{
                      boxShadow: "var(--shadow-card)",
                      borderColor: syna.verified ? "hsl(142 76% 36% / 0.3)" : "hsl(0 84% 60% / 0.2)",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-sm font-bold text-foreground">{syna.name}</h4>
                          {syna.verified ? (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">✅ Vérifiée</span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">❌ Non vérifiée</span>
                          )}
                        </div>
                        {syna.address && <p className="text-[11px] text-muted-foreground mt-0.5">📍 {syna.address}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Créée le {new Date(syna.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleVerify(syna.id, syna.verified)}
                          disabled={synaProcessing === syna.id}
                          className="rounded-xl border-none px-3 py-2 text-[10px] font-bold cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                          style={syna.verified
                            ? { background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 84% 50%)" }
                            : { background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(142 76% 30%))", color: "white", boxShadow: "0 4px 12px hsl(142 76% 36% / 0.3)" }
                          }
                        >
                          {synaProcessing === syna.id ? "⏳" : syna.verified ? "Retirer ✕" : "✅ Vérifier"}
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingSyna(syna)}
                            className="flex-1 rounded-lg py-1.5 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                            style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "none" }}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteSyna(syna.id, syna.name)}
                            disabled={synaProcessing === syna.id}
                            className="flex-1 rounded-lg py-1.5 text-[10px] font-bold bg-destructive/10 text-destructive border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Horaires suggestions tab */}
        {tab === "horaires" && (
          <PrayerTimeSuggestionsAdmin mode="admin" />
        )}


        {/* Settings tab */}
        {tab === "settings" && (
          <SettingsTab />
        )}
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil utilisateur</DialogTitle>
            <DialogDescription>Mettez à jour les informations visibles de ce compte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground">Prénom</label>
                <Input value={profileForm.first_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))} placeholder="Prénom" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground">Nom</label>
                <Input value={profileForm.last_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))} placeholder="Nom" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ville</label>
              <Input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="Paris" />
            </div>
            {editingUser && !editingUser.roles.includes("admin") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Rôle</label>
                <div className="flex gap-2">
                  {(["guest", "fidele", "president"] as const).map((r) => {
                    const currentRole = editingUser.roles.find((role) => role !== "admin") || "guest";
                    const isActive = currentRole === r;
                    return (
                      <button key={r} onClick={() => void handleSetRole(editingUser.id, r)}
                        disabled={isActive || userProcessing === editingUser.id}
                        className="flex-1 rounded-xl border py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:cursor-default"
                        style={isActive
                          ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
                          : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                        }>
                        {r === "guest" ? "👤 Guest" : r === "fidele" ? "🙏 Fidèle" : "🏛️ Président"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg border border-border bg-card text-foreground cursor-pointer">Annuler</button>
            <button onClick={handleSaveProfile} disabled={!editingUser || userProcessing === editingUser.id}
              className="px-4 py-2 rounded-lg border-none text-primary-foreground font-bold cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}>
              {editingUser && userProcessing === editingUser.id ? "Enregistrement..." : "Enregistrer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
