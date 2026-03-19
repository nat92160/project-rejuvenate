import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import GuestNamePrompt, { getGuestName } from "@/components/GuestNamePrompt";

interface MinyanSession { id: string; office_type: string; office_date: string; office_time: string; target_count: number; creator_id: string; }
interface Registration { id: string; session_id: string; user_id: string; display_name: string; guest_count?: number; }

const OFFICE_LABELS: Record<string, string> = { shacharit: "🌅 Cha'harit", minha: "☀️ Min'ha", arvit: "🌙 Arvit" };

const generateICS = (session: MinyanSession, label: string): string => {
  const d = session.office_date.replace(/-/g, "");
  const t = (session.office_time || "08:00").replace(":", "") + "00";
  return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${d}T${t}\nSUMMARY:Minyan ${label}\nDESCRIPTION:Minyan communautaire\nEND:VEVENT\nEND:VCALENDAR`;
};

const downloadICS = (session: MinyanSession) => {
  const label = OFFICE_LABELS[session.office_type] || session.office_type;
  const blob = new Blob([generateICS(session, label)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "minyan.ics"; a.click();
  URL.revokeObjectURL(url);
};

const CreateMinyanInline = ({ onCreated }: { onCreated: () => void }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ office_type: "shacharit", office_date: "", office_time: "", target_count: "10" });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.office_date || !form.office_time) { toast.error("Remplissez date et heure"); return; }
    if (!user) { toast.error("Connectez-vous"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("minyan_sessions").insert({ creator_id: user.id, office_type: form.office_type, office_date: form.office_date, office_time: form.office_time, target_count: parseInt(form.target_count) || 10 });
    if (error) toast.error("Erreur: rôle Président requis.");
    else { toast.success("✅ Session créée !"); setForm({ office_type: "shacharit", office_date: "", office_time: "", target_count: "10" }); onCreated(); }
    setSubmitting(false);
  };

  return (
    <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <h4 className="font-display text-sm font-bold text-foreground mb-3">➕ Nouvelle session</h4>
      <div className="space-y-4">
        <select value={form.office_type} onChange={e => setForm({...form, office_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm">
          <option value="shacharit">🌅 Cha'harit</option><option value="minha">☀️ Min'ha</option><option value="arvit">🌙 Arvit</option>
        </select>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">📅 Date de la session</label>
            <input type="date" value={form.office_date} onChange={e => setForm({...form, office_date: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">🕐 Heure de début</label>
            <input type="time" value={form.office_time} onChange={e => setForm({...form, office_time: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={submitting || !form.office_date || !form.office_time} className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50" style={{ background: "var(--gradient-gold)" }}>
          {submitting ? "Création..." : "Créer la session"}
        </button>
      </div>
    </motion.div>
  );
};

const MinyanLiveWidget = () => {
  const { user, dbRole } = useAuth();
  const isPresident = dbRole === "president";
  const [sessions, setSessions] = useState<MinyanSession[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, Registration[]>>({});
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);

  const fetchSessions = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("minyan_sessions").select("*").gte("office_date", today).order("office_date").order("office_time");
    if (data && data.length > 0) {
      setSessions(data);
      setSelectedSession(prev => prev && data.some(s => s.id === prev) ? prev : data[0].id);
      const { data: regs } = await supabase.from("minyan_registrations").select("*").in("session_id", data.map(s => s.id));
      const grouped: Record<string, Registration[]> = {};
      (regs || []).forEach(r => { if (!grouped[r.session_id]) grouped[r.session_id] = []; grouped[r.session_id].push(r); });
      setRegistrations(grouped);
    } else { setSessions([]); }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => {
    const channel = supabase.channel("minyan-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "minyan_registrations" }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentSession = sessions.find(s => s.id === selectedSession);
  const currentRegs = selectedSession ? registrations[selectedSession] || [] : [];
  const count = currentRegs.reduce((sum, r) => sum + (r.guest_count || 1), 0);
  const target = currentSession?.target_count || 10;
  const needed = Math.max(0, target - count);
  const isFull = count >= target;
  const GUEST_UUID = "00000000-0000-0000-0000-000000000000";
  const isRegistered = user ? currentRegs.some(r => r.user_id === user.id) : currentRegs.some(r => (r.user_id === GUEST_UUID || !r.user_id) && r.display_name === getGuestName());

  const doRegister = async (displayName: string) => {
    if (!selectedSession) return;
    const { error } = await supabase.from("minyan_registrations").insert({
      session_id: selectedSession, user_id: user?.id || "00000000-0000-0000-0000-000000000000", display_name: displayName,
    });
    if (error) toast.error("Erreur"); else toast.success("✅ Inscrit au Minyan !");
  };

  const handleRegister = async () => {
    if (user) {
      const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Anonyme";
      doRegister(displayName);
    } else if (getGuestName()) {
      doRegister(getGuestName()!);
    } else {
      setGuestPromptOpen(true);
    }
  };

  const handleUnregister = async () => {
    if (!selectedSession) return;
    if (user) {
      await supabase.from("minyan_registrations").delete().eq("session_id", selectedSession).eq("user_id", user.id);
    } else {
      const guestName = getGuestName();
      if (guestName) {
        await supabase.from("minyan_registrations").delete().eq("session_id", selectedSession).eq("user_id", GUEST_UUID).eq("display_name", guestName);
      }
    }
    toast.success("Inscription annulée"); fetchSessions();
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Supprimer cette session ?")) return;
    await supabase.from("minyan_sessions").delete().eq("id", sessionId);
    toast.success("Session supprimée"); fetchSessions();
  };

  const handleShareWhatsApp = () => {
    if (!currentSession || !selectedSession) return;
    const label = OFFICE_LABELS[currentSession.office_type] || currentSession.office_type;
    const joinUrl = `${window.location.origin}/minyan/${selectedSession}`;
    const dateStr = new Date(currentSession.office_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const text = `🕍 Minyan ${label}\n📅 ${dateStr} à ${currentSession.office_time?.slice(0, 5)}\n👥 ${count}/${target}\n${isFull ? "✅ Minyan atteint !" : `⚠️ Encore ${needed} personne(s)`}\n\n📲 ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) return <div className="rounded-2xl bg-card p-8 text-center border border-border"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-5 mb-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">👥 Minyan Live</h3>
            <p className="text-xs text-muted-foreground mt-1">Inscrivez-vous et complétez le Minyan</p>
          </div>
          {isPresident && (
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
              {showCreateForm ? "✕" : "➕ Créer"}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>{isPresident && showCreateForm && <CreateMinyanInline onCreated={() => { setShowCreateForm(false); fetchSessions(); }} />}</AnimatePresence>

      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-5xl">🕍</span>
          <p className="text-sm text-muted-foreground mt-3">Aucune session programmée.</p>
        </div>
      ) : (
        <>
          {sessions.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {sessions.map(s => (
                <button key={s.id} onClick={() => setSelectedSession(s.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border cursor-pointer transition-all ${selectedSession === s.id ? "border-primary/30 text-foreground" : "border-border text-muted-foreground bg-card"}`}
                  style={selectedSession === s.id ? { background: "hsl(var(--gold) / 0.1)" } : {}}>
                  {OFFICE_LABELS[s.office_type] || s.office_type} — {s.office_time?.slice(0, 5)}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl p-8 mb-4 border text-center" style={{
            background: isFull ? "linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.02))" : "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
            borderColor: isFull ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.15)", boxShadow: "var(--shadow-card)",
          }}>
            {currentSession && <p className="text-xs text-muted-foreground mb-5">{OFFICE_LABELS[currentSession.office_type]} — {new Date(currentSession.office_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {currentSession.office_time?.slice(0, 5)}</p>}

            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="52" fill="none" stroke={isFull ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))"} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(count / target, 1) * 327} 327`} initial={{ strokeDasharray: "0 327" }}
                  animate={{ strokeDasharray: `${Math.min(count / target, 1) * 327} 327` }} transition={{ duration: 1, ease: "easeOut" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold font-display text-foreground">{count}</span>
                <span className="text-xs text-muted-foreground">/ {target}</span>
              </div>
            </div>

            {/* Urgency badge */}
            {!isFull && needed <= 3 && needed > 0 && (
              <div className="mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-full animate-pulse" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.3)" }}>
                <span className="text-sm">🚨</span>
                <span className="text-xs font-bold text-destructive">Plus que {needed} personne{needed > 1 ? "s" : ""} !</span>
              </div>
            )}

            {isFull ? (
              <div className="text-sm font-bold text-green-600">✅ Minyan atteint !</div>
            ) : (
              <div className="text-sm text-muted-foreground">Encore <span className="font-bold text-foreground">{needed}</span> personne{needed > 1 ? "s" : ""}</div>
            )}

            {currentRegs.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground"><p className="font-bold mb-1">Inscrits :</p><p>{currentRegs.map(r => r.display_name).join(", ")}</p></div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isRegistered ? (
              <>
                <div className="py-3.5 rounded-xl font-bold text-sm text-center bg-green-500/10 text-green-600 border border-green-500/20">✅ Inscrit</div>
                <button onClick={handleUnregister} className="py-3.5 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer">➖ Je pars</button>
              </>
            ) : (
              <>
                <button onClick={handleRegister} className="py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>➕ Je suis là</button>
                <button onClick={handleShareWhatsApp} className="py-3.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer" style={{ background: "#25d366" }}>📲 WhatsApp</button>
              </>
            )}
          </div>

          {isRegistered && (
            <button onClick={handleShareWhatsApp} className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-white border-none cursor-pointer" style={{ background: "#25d366" }}>📲 Partager via WhatsApp</button>
          )}

          {/* Calendar .ics button */}
          {currentSession && (
            <button onClick={() => downloadICS(currentSession)} className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold bg-card text-foreground border border-border cursor-pointer hover:bg-muted transition-all">
              📅 Ajouter à mon calendrier
            </button>
          )}

          {isPresident && currentSession && user?.id === currentSession.creator_id && (
            <button onClick={() => handleDelete(currentSession.id)} className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border-none cursor-pointer">🗑️ Supprimer</button>
          )}
        </>
      )}

      <GuestNamePrompt open={guestPromptOpen} onSubmit={(name) => { setGuestPromptOpen(false); doRegister(name); }} onClose={() => setGuestPromptOpen(false)} />
    </motion.div>
  );
};

export default MinyanLiveWidget;
