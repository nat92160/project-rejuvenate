import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MinyanSession {
  id: string;
  office_type: string;
  office_date: string;
  office_time: string;
  target_count: number;
  creator_id: string;
}

interface Registration {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string;
}

const OFFICE_LABELS: Record<string, string> = {
  shacharit: "🌅 Cha'harit",
  minha: "☀️ Min'ha",
  arvit: "🌙 Arvit",
};

const MinyanLiveWidget = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MinyanSession[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, Registration[]>>({});
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch today's sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("minyan_sessions")
        .select("*")
        .gte("office_date", today)
        .order("office_date")
        .order("office_time");

      if (data && data.length > 0) {
        setSessions(data);
        setSelectedSession(data[0].id);
        // Fetch registrations for all sessions
        const { data: regs } = await supabase
          .from("minyan_registrations")
          .select("*")
          .in("session_id", data.map((s) => s.id));

        const grouped: Record<string, Registration[]> = {};
        (regs || []).forEach((r) => {
          if (!grouped[r.session_id]) grouped[r.session_id] = [];
          grouped[r.session_id].push(r);
        });
        setRegistrations(grouped);
      }
      setLoading(false);
    };

    fetchSessions();
  }, []);

  // Realtime subscription for registrations
  useEffect(() => {
    const channel = supabase
      .channel("minyan-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "minyan_registrations" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const reg = payload.new as Registration;
            setRegistrations((prev) => ({
              ...prev,
              [reg.session_id]: [...(prev[reg.session_id] || []), reg],
            }));
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string; session_id: string };
            setRegistrations((prev) => ({
              ...prev,
              [old.session_id]: (prev[old.session_id] || []).filter((r) => r.id !== old.id),
            }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const currentSession = sessions.find((s) => s.id === selectedSession);
  const currentRegs = selectedSession ? registrations[selectedSession] || [] : [];
  const count = currentRegs.length;
  const target = currentSession?.target_count || 10;
  const needed = Math.max(0, target - count);
  const isFull = count >= target;
  const isRegistered = user && currentRegs.some((r) => r.user_id === user.id);

  const handleRegister = async () => {
    if (!user || !selectedSession) return;
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Anonyme";
    await supabase.from("minyan_registrations").insert({
      session_id: selectedSession,
      user_id: user.id,
      display_name: displayName,
    });
  };

  const handleUnregister = async () => {
    if (!user || !selectedSession) return;
    await supabase
      .from("minyan_registrations")
      .delete()
      .eq("session_id", selectedSession)
      .eq("user_id", user.id);
  };

  // Share via WhatsApp with text (image generation handled separately)
  const handleShareWhatsApp = () => {
    if (!currentSession) return;
    const label = OFFICE_LABELS[currentSession.office_type] || currentSession.office_type;
    const text = `🕍 Minyan ${label}\n📅 ${currentSession.office_date}\n🕐 ${currentSession.office_time}\n👥 ${count}/${target} inscrits\n${isFull ? "✅ Minyan atteint !" : `Encore ${needed} personne(s) nécessaire(s)`}\n\nRejoignez-nous sur Chabbat Chalom !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center border border-border">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="rounded-2xl p-8 mb-4 border text-center bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="font-display text-base font-bold text-foreground flex items-center justify-center gap-2 mb-4">
            👥 Minyan Live
          </h3>
          <p className="text-sm text-muted-foreground mb-2">Aucune session de Minyan programmée.</p>
          <p className="text-xs text-muted-foreground/60 italic">
            Le Président peut créer des sessions depuis l'espace Président.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border cursor-pointer transition-all ${
                selectedSession === s.id
                  ? "border-primary/30 text-foreground"
                  : "border-border text-muted-foreground bg-card"
              }`}
              style={selectedSession === s.id ? { background: "hsl(var(--gold) / 0.1)" } : {}}
            >
              {OFFICE_LABELS[s.office_type] || s.office_type} — {s.office_time?.slice(0, 5)}
            </button>
          ))}
        </div>
      )}

      {/* Main counter */}
      <div
        className="rounded-2xl p-8 mb-4 border text-center"
        style={{
          background: isFull
            ? "linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.02))"
            : "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
          borderColor: isFull ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.15)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h3 className="font-display text-base font-bold text-foreground flex items-center justify-center gap-2 mb-2">
          👥 Minyan Live
        </h3>
        {currentSession && (
          <p className="text-xs text-muted-foreground mb-6">
            {OFFICE_LABELS[currentSession.office_type]} — {currentSession.office_date} à {currentSession.office_time?.slice(0, 5)}
          </p>
        )}

        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke={isFull ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(count / target, 1) * 327} 327`}
              initial={{ strokeDasharray: "0 327" }}
              animate={{ strokeDasharray: `${Math.min(count / target, 1) * 327} 327` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold font-display text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">/ {target}</span>
          </div>
        </div>

        {isFull ? (
          <div className="text-sm font-bold text-green-600 dark:text-green-400">✅ Minyan atteint !</div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Encore <span className="font-bold text-foreground">{needed}</span> personne{needed > 1 ? "s" : ""} nécessaire{needed > 1 ? "s" : ""}
          </div>
        )}

        {/* Person icons */}
        <div className="flex justify-center gap-1.5 mt-5 flex-wrap max-w-[200px] mx-auto">
          {Array.from({ length: target }).map((_, i) => (
            <motion.div
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{
                background: i < count
                  ? isFull ? "hsl(142 76% 36% / 0.15)" : "hsl(var(--gold) / 0.15)"
                  : "hsl(var(--muted))",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {i < count ? "🧑" : "⬜"}
            </motion.div>
          ))}
        </div>

        {/* Registered names */}
        {currentRegs.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            <p className="font-bold mb-1">Inscrits :</p>
            <p>{currentRegs.map((r) => r.display_name).join(", ")}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {user ? (
        <div className="grid grid-cols-2 gap-3">
          {isRegistered ? (
            <>
              <div className="py-3.5 rounded-xl font-bold text-sm text-center bg-green-500/10 text-green-600 border border-green-500/20">
                ✅ Vous êtes inscrit
              </div>
              <button
                onClick={handleUnregister}
                className="py-3.5 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                ➖ Je pars
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRegister}
                className="py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
              >
                ➕ Je suis là
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="py-3.5 rounded-xl font-bold text-sm bg-green-600 text-white border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                📲 WhatsApp
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Connectez-vous pour vous inscrire au Minyan</p>
        </div>
      )}
    </motion.div>
  );
};

export default MinyanLiveWidget;
