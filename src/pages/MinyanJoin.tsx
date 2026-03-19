import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

const OFFICE_LABELS: Record<string, string> = {
  shacharit: "🌅 Cha'harit",
  minha: "☀️ Min'ha",
  arvit: "🌙 Arvit",
};

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

const MinyanJoinContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<MinyanSession | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("minyan_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSession(data);
      const { data: r } = await supabase
        .from("minyan_registrations")
        .select("*")
        .eq("session_id", id);
      setRegs(r || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`minyan-join-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "minyan_registrations", filter: `session_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setRegs((prev) => [...prev, payload.new as Registration]);
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          setRegs((prev) => prev.filter((r) => r.id !== old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const count = regs.length;
  const target = session?.target_count || 10;
  const needed = Math.max(0, target - count);
  const isFull = count >= target;
  const isRegistered = user && regs.some((r) => r.user_id === user.id);

  const handleRegister = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!id) return;
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Anonyme";
    const { error } = await supabase.from("minyan_registrations").insert({
      session_id: id,
      user_id: user.id,
      display_name: displayName,
    });
    if (error) {
      toast.error("Erreur lors de l'inscription");
    } else {
      toast.success("✅ Vous êtes inscrit au Minyan !");
    }
  };

  const handleUnregister = async () => {
    if (!user || !id) return;
    const { error } = await supabase
      .from("minyan_registrations")
      .delete()
      .eq("session_id", id)
      .eq("user_id", user.id);
    if (error) toast.error("Erreur");
    else toast.success("Vous avez quitté le Minyan");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-5xl">🕍</span>
          <h1 className="font-display text-xl font-bold text-foreground mt-4">Session introuvable</h1>
          <p className="text-sm text-muted-foreground mt-2">Cette session de Minyan n'existe plus ou a été supprimée.</p>
          <button onClick={() => navigate("/")} className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[500px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">🕍 Minyan Live</h1>
          <p className="text-sm text-muted-foreground mt-1">Rejoignez ce Minyan</p>
        </div>

        {/* Session info */}
        {session && (
          <div className="rounded-2xl p-6 mb-6 border text-center" style={{
            background: isFull
              ? "linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.02))"
              : "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
            borderColor: isFull ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.15)",
            boxShadow: "var(--shadow-card)",
          }}>
            <p className="text-lg font-bold text-foreground mb-1">
              {OFFICE_LABELS[session.office_type] || session.office_type}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              📅 {new Date(session.office_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {session.office_time?.slice(0, 5)}
            </p>

            {/* Counter */}
            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="52" fill="none"
                  stroke={isFull ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))"}
                  strokeWidth="8" strokeLinecap="round"
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
                <motion.div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ background: i < count ? (isFull ? "hsl(142 76% 36% / 0.15)" : "hsl(var(--gold) / 0.15)") : "hsl(var(--muted))" }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.03 }}>
                  {i < count ? "🧑" : "⬜"}
                </motion.div>
              ))}
            </div>

            {regs.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                <p className="font-bold mb-1">Inscrits :</p>
                <p>{regs.map((r) => r.display_name).join(", ")}</p>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        {isRegistered ? (
          <div className="space-y-3">
            <div className="py-3.5 rounded-xl font-bold text-sm text-center bg-green-500/10 text-green-600 border border-green-500/20">
              ✅ Vous êtes inscrit
            </div>
            <button onClick={handleUnregister}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              ➖ Je pars
            </button>
          </div>
        ) : (
          <button onClick={handleRegister}
            className="w-full py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
            {user ? "➕ Je suis là !" : "🔑 Se connecter pour participer"}
          </button>
        )}

        {/* Back link */}
        <div className="text-center mt-8">
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer hover:underline">
            ← Retour à Chabbat Chalom
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

const MinyanJoin = () => (
  <AuthProvider>
    <MinyanJoinContent />
  </AuthProvider>
);

export default MinyanJoin;
