import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"requests" | "users" | "synagogues">("requests");
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
      .select("id, name, verified, president_id, address, created_at")
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
            <button onClick={fetchSynas} disabled={synasLoading}
              className="w-full mb-4 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}>
              {synasLoading ? "⏳ Chargement…" : "🔄 Actualiser"}
            </button>
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
                      <button
                        onClick={() => handleToggleVerify(syna.id, syna.verified)}
                        disabled={synaProcessing === syna.id}
                        className="shrink-0 rounded-xl border-none px-4 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                        style={syna.verified
                          ? { background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 84% 50%)" }
                          : { background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(142 76% 30%))", color: "white", boxShadow: "0 4px 12px hsl(142 76% 36% / 0.3)" }
                        }
                      >
                        {synaProcessing === syna.id ? "⏳" : syna.verified ? "Retirer ✕" : "✅ Vérifier"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
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
