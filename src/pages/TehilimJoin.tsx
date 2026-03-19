import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

const TOTAL_PSALMS = 150;

const DEDICATION_LABELS: Record<string, string> = {
  general: "", refouah: "🙏 Refouah Chelema", ilouye: "🕯️ Ilouye Nichmat",
  hatslaha: "✨ Hatslaha", zivougue: "💍 Zivougué",
};

type Chain = {
  id: string; creator_id: string; title: string;
  dedication: string | null; dedication_type: string | null;
  status: string; created_at: string;
};

type Claim = {
  id: string; chain_id: string; user_id: string | null;
  display_name: string; chapter_start: number; chapter_end: number;
  completed: boolean;
};

const TehilimJoinContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chain, setChain] = useState<Chain | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("tehilim_claims")
      .select("*")
      .eq("chain_id", id)
      .order("chapter_start");
    setClaims((data as Claim[]) || []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchChain = async () => {
      const { data, error } = await supabase
        .from("tehilim_chains")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setChain(data as Chain);
      await fetchClaims();
      setLoading(false);
    };
    fetchChain();
  }, [id, fetchClaims]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tehilim-join-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tehilim_claims", filter: `chain_id=eq.${id}` }, () => {
        fetchClaims();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchClaims]);

  const claimPsalm = async (num: number) => {
    if (!user) { setAuthOpen(true); return; }
    const { data: profile } = await supabase
      .from("profiles").select("display_name").eq("user_id", user.id).single();
    const displayName = profile?.display_name || user.email || "Anonyme";
    // Optimistic
    const optimisticClaim: Claim = {
      id: `temp-${num}`, chain_id: id!, user_id: user.id,
      display_name: displayName, chapter_start: num, chapter_end: num, completed: false,
    };
    setClaims(prev => [...prev, optimisticClaim]);
    toast.success(`✅ Psaume ${num} réservé !`);

    const { error } = await supabase.from("tehilim_claims").insert({
      chain_id: id!, user_id: user.id, display_name: displayName,
      chapter_start: num, chapter_end: num,
    });
    if (error) {
      setClaims(prev => prev.filter(c => c.id !== optimisticClaim.id));
      toast.error("Erreur lors de la réservation");
    } else {
      fetchClaims();
    }
  };

  const unclaimPsalm = async (claim: Claim) => {
    if (claim.user_id !== user?.id) return;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    toast.success("Réservation annulée");
    const { error } = await supabase.from("tehilim_claims").delete().eq("id", claim.id);
    if (error) { toast.error("Erreur lors de l'annulation"); fetchClaims(); }
  };

  const toggleComplete = async (claim: Claim) => {
    if (claim.user_id !== user?.id) return;
    const newCompleted = !claim.completed;
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : c));
    await supabase
      .from("tehilim_claims")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", claim.id);
  };

  const totalClaimed = claims.length;
  const totalCompleted = claims.filter((c) => c.completed).length;
  const progress = Math.round((totalClaimed / TOTAL_PSALMS) * 100);

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
          <span className="text-5xl">📖</span>
          <h1 className="font-display text-xl font-bold text-foreground mt-4">Chaîne introuvable</h1>
          <p className="text-sm text-muted-foreground mt-2">Cette chaîne de Tehilim n'existe plus.</p>
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
          <h1 className="font-display text-2xl font-bold text-foreground">📖 Chaîne de Tehilim</h1>
          <p className="text-sm text-muted-foreground mt-1">Choisissez un ou plusieurs psaumes à lire</p>
        </div>

        {/* Chain info */}
        {chain && (
          <div className="p-5 rounded-2xl border border-border mb-6" style={{ background: "hsl(var(--gold) / 0.04)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="font-display text-lg font-bold text-foreground">{chain.title}</h2>
            {chain.dedication && (
              <p className="text-sm text-muted-foreground mt-1">
                {DEDICATION_LABELS[chain.dedication_type || "general"]} {chain.dedication}
              </p>
            )}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <span>{totalClaimed}/{TOTAL_PSALMS} réservés</span>
                <span>{totalCompleted}/{TOTAL_PSALMS} terminés</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: progress === 100 ? "#22c55e" : "var(--gradient-gold)" }}
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          </div>
        )}

        {/* My claims summary */}
        {user && claims.filter(c => c.user_id === user.id).length > 0 && (
          <div className="p-4 rounded-xl border border-primary/20 mb-4" style={{ background: "hsl(var(--gold) / 0.06)" }}>
            <p className="text-xs font-bold text-foreground mb-2">📖 Mes psaumes réservés :</p>
            <div className="flex flex-wrap gap-1.5">
              {claims.filter(c => c.user_id === user.id).map(c => (
                <div key={c.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border" style={{
                  background: c.completed ? "hsl(142 76% 36% / 0.1)" : "hsl(var(--gold) / 0.1)",
                  borderColor: c.completed ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.2)",
                  color: c.completed ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))",
                }}>
                  <span>{c.chapter_start}</span>
                  {c.completed ? <span>✅</span> : (
                    <button onClick={() => unclaimPsalm(c)} className="ml-1 text-destructive bg-transparent border-none cursor-pointer text-[10px] hover:scale-110 transition-transform p-0">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Psalms grid */}
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: TOTAL_PSALMS }, (_, i) => i + 1).map((num) => {
            const claim = claims.find((c) => c.chapter_start === num && c.chapter_end === num);
            const isMine = claim?.user_id === user?.id;

            return (
              <button
                key={num}
                onClick={() => {
                  if (claim?.completed) return;
                  if (isMine && claim) { toggleComplete(claim); return; }
                  if (!claim) claimPsalm(num);
                }}
                disabled={!!claim && !isMine}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer border ${
                  claim?.completed
                    ? "bg-green-500/15 border-green-500/30 text-green-600"
                    : claim
                    ? isMine
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground opacity-60"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5"
                }`}
                style={isMine && claim && !claim.completed ? { background: "hsl(var(--gold) / 0.1)" } : {}}
                title={claim ? `${claim.display_name}${claim.completed ? " ✅" : ""}` : `Psaume ${num}`}
              >
                <span className="text-sm">{num}</span>
                {claim?.completed && <span className="text-[8px] absolute bottom-0.5">✅</span>}
                {isMine && claim && !claim.completed && <span className="text-[7px] absolute bottom-0.5">📖</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border inline-block" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "hsl(var(--gold) / 0.1)" }} /> Réservé</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block" /> Terminé</span>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          💡 Cliquez sur un psaume réservé par vous (📖) pour le marquer comme lu
        </p>

        {!user && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            🔑 <button onClick={() => setAuthOpen(true)} className="text-primary font-bold bg-transparent border-none cursor-pointer underline">Connectez-vous</button> pour réserver un psaume
          </p>
        )}

        {/* Back */}
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

const TehilimJoin = () => (
  <AuthProvider>
    <TehilimJoinContent />
  </AuthProvider>
);

export default TehilimJoin;
