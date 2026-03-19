import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import GuestNamePrompt, { getGuestName } from "@/components/GuestNamePrompt";

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
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [pendingPsalm, setPendingPsalm] = useState<number | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

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

  const isOwnClaim = (claim: Claim) => {
    if (user && claim.user_id === user.id) return true;
    const guestName = getGuestName();
    if (guestName && !claim.user_id && claim.display_name === guestName) return true;
    return false;
  };

  const getDisplayName = async (): Promise<string> => {
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      return profile?.display_name || user.email?.split("@")[0] || "Anonyme";
    }
    return getGuestName() || "Invité";
  };

  const doClaimPsalm = async (num: number, displayName: string) => {
    const optimisticClaim: Claim = {
      id: `temp-${num}-${Date.now()}`, chain_id: id!, user_id: user?.id || null,
      display_name: displayName, chapter_start: num, chapter_end: num, completed: false,
    };
    setClaims(prev => [...prev, optimisticClaim]);
    toast.success(`✅ Psaume ${num} réservé !`);

    const { error } = await supabase.from("tehilim_claims").insert({
      chain_id: id!, user_id: user?.id || null, display_name: displayName,
      chapter_start: num, chapter_end: num,
    });
    if (error) {
      setClaims(prev => prev.filter(c => c.id !== optimisticClaim.id));
      toast.error("Erreur lors de la réservation");
    } else {
      fetchClaims();
    }
  };

  const claimPsalm = async (num: number) => {
    if (!user && !getGuestName()) {
      setPendingPsalm(num);
      setGuestPromptOpen(true);
      return;
    }
    const displayName = await getDisplayName();
    doClaimPsalm(num, displayName);
  };

  const handleGuestNameSubmit = (name: string) => {
    setGuestPromptOpen(false);
    if (pendingPsalm !== null) {
      doClaimPsalm(pendingPsalm, name);
      setPendingPsalm(null);
    }
  };

  const unclaimPsalm = async (claim: Claim) => {
    if (!isOwnClaim(claim)) return;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    setSelectedClaim(null);
    toast.success("Réservation annulée");
    const { error } = await supabase.from("tehilim_claims").delete().eq("id", claim.id);
    if (error) { toast.error("Erreur"); fetchClaims(); }
  };

  const toggleComplete = async (claim: Claim) => {
    if (!isOwnClaim(claim)) return;
    const newCompleted = !claim.completed;
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, completed: newCompleted } : c));
    setSelectedClaim(null);
    await supabase
      .from("tehilim_claims")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", claim.id);
  };

  const totalClaimed = claims.length;
  const totalCompleted = claims.filter((c) => c.completed).length;
  const progress = Math.round((totalClaimed / TOTAL_PSALMS) * 100);

  const myClaims = claims.filter(c => isOwnClaim(c));

  const shareChain = async () => {
    if (!chain) return;
    const shareUrl = `${window.location.origin}/tehilim/${chain.id}`;
    const text = `📖 Chaîne de Tehilim : ${chain.title}${chain.dedication ? `\n🙏 ${chain.dedication}` : ""}\n\n${totalClaimed}/150 réservés • ${totalCompleted} terminés\n\nChoisissez un psaume :\n${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ text, url: shareUrl }); return; } catch {}
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Lien copié dans le presse-papier !");
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
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">📖 Chaîne de Tehilim</h1>
          <p className="text-sm text-muted-foreground mt-1">Choisissez un ou plusieurs psaumes à lire</p>
        </div>

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
            <div className="flex gap-2 mt-3">
              <button onClick={shareChain} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
                📤 Partager
              </button>
            </div>
          </div>
        )}

        {/* My claims summary with cancel buttons */}
        {myClaims.length > 0 && (
          <div className="p-4 rounded-xl border border-primary/20 mb-4" style={{ background: "hsl(var(--gold) / 0.06)" }}>
            <p className="text-xs font-bold text-foreground mb-2">📖 Mes psaumes ({myClaims.length}) :</p>
            <div className="flex flex-wrap gap-1.5">
              {myClaims.map(c => (
                <div key={c.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border" style={{
                  background: c.completed ? "hsl(142 76% 36% / 0.1)" : "hsl(var(--gold) / 0.1)",
                  borderColor: c.completed ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.2)",
                  color: c.completed ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))",
                }}>
                  <span>Ps {c.chapter_start}</span>
                  {c.completed ? (
                    <span>✅</span>
                  ) : (
                    <>
                      <button onClick={() => toggleComplete(c)} className="ml-1 bg-transparent border-none cursor-pointer text-[10px] p-0 hover:scale-110 transition-transform" title="Marquer comme lu">✔️</button>
                      <button onClick={() => unclaimPsalm(c)} className="ml-0.5 text-destructive bg-transparent border-none cursor-pointer text-[10px] p-0 hover:scale-110 transition-transform" title="Annuler">✕</button>
                    </>
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
            const isMine = claim ? isOwnClaim(claim) : false;

            return (
              <button
                key={num}
                onClick={() => {
                  if (!claim) { claimPsalm(num); return; }
                  if (isMine) { setSelectedClaim(claim); return; }
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

        <div className="flex gap-4 justify-center mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border inline-block" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "hsl(var(--gold) / 0.1)" }} /> Réservé</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block" /> Terminé</span>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          💡 Cliquez sur un psaume libre pour le réserver, cliquez sur votre psaume pour le gérer
        </p>

        <div className="text-center mt-8">
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer hover:underline">
            ← Retour à Chabbat Chalom
          </button>
        </div>
      </div>

      {/* Action menu for own claims */}
      <AnimatePresence>
        {selectedClaim && isOwnClaim(selectedClaim) && (
          <>
            <motion.div
              className="fixed inset-0 z-[400]"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedClaim(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[410] rounded-t-3xl bg-card p-6 border-t border-border"
              style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", boxShadow: "var(--shadow-elevated)" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground text-center mb-1">
                Psaume {selectedClaim.chapter_start}
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-5">
                {selectedClaim.completed ? "Ce psaume est marqué comme lu" : "Que souhaitez-vous faire ?"}
              </p>
              <div className="space-y-2.5">
                {!selectedClaim.completed && (
                  <button
                    onClick={() => toggleComplete(selectedClaim)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    ✅ Marquer comme lu
                  </button>
                )}
                {selectedClaim.completed && (
                  <button
                    onClick={() => toggleComplete(selectedClaim)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold border border-border bg-card text-foreground cursor-pointer"
                  >
                    ↩️ Marquer comme non lu
                  </button>
                )}
                {!selectedClaim.completed && (
                  <button
                    onClick={() => unclaimPsalm(selectedClaim)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold border border-destructive/30 bg-destructive/5 text-destructive cursor-pointer"
                  >
                    🗑️ Annuler ma réservation
                  </button>
                )}
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-muted text-muted-foreground border-none cursor-pointer"
                >
                  ✕ Fermer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GuestNamePrompt open={guestPromptOpen} onSubmit={handleGuestNameSubmit} onClose={() => setGuestPromptOpen(false)} />
    </div>
  );
};

const TehilimJoin = () => (
  <AuthProvider>
    <TehilimJoinContent />
  </AuthProvider>
);

export default TehilimJoin;
