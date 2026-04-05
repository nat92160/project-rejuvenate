import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";
import GuestNamePrompt, { getGuestName } from "@/components/GuestNamePrompt";
import HazakCelebration from "@/components/HazakCelebration";
import { toHebrewLetter } from "@/lib/utils";
import ViewModeSelector from "@/components/ViewModeSelector";
import { useTransliteration, type ViewMode } from "@/hooks/useTransliteration";

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

// Dedication banner component
const DedicationBanner = ({ dedication, dedicationType }: { dedication?: string | null; dedicationType?: string | null }) => {
  if (!dedication) return null;
  const label = dedicationType && DEDICATION_LABELS[dedicationType] ? DEDICATION_LABELS[dedicationType] : "";
  return (
    <div
      className="mx-4 my-2 px-4 py-2.5 rounded-xl text-center border"
      style={{
        background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
        borderColor: "hsl(var(--gold-matte) / 0.25)",
      }}
    >
      {label && <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>}
      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "hsl(var(--gold-matte))" }}>
        {dedication}
      </p>
    </div>
  );
};

// Psalm Reader Overlay with mark complete + phonetic
const PsalmReaderOverlay = ({ chapter, claim, onClose, onMarkComplete, onUnclaim, nextChapter, onGoNext, dedication, dedicationType }: {
  chapter: number;
  claim?: Claim;
  onClose: () => void;
  onMarkComplete: (claim: Claim) => void;
  onUnclaim: (claim: Claim) => void;
  nextChapter?: number | null;
  onGoNext?: () => void;
  dedication?: string | null;
  dedicationType?: string | null;
}) => {
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fontSize, setFontSize] = useState(22);
  const [viewMode, setViewMode] = useState<ViewMode>("hebrew");
  const { transliterations, loading: translitLoading, fetchTransliteration, clearTransliterations } = useTransliteration();

  useEffect(() => {
    (async () => {
      setLoading(true); setError(""); clearTransliterations();
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-psalm", { body: { chapter } });
        if (fnError || !data?.success) { setError("Impossible de charger ce psaume."); return; }
        setVerses(data.verses); setHeTitle(data.heTitle);
      } catch { setError("Erreur de connexion."); }
      finally { setLoading(false); }
    })();
  }, [chapter, clearTransliterations]);

  useEffect(() => {
    if (viewMode === "phonetic" && verses.length > 0 && transliterations.length === 0) {
      fetchTransliteration(verses, `psalm_${chapter}`);
    }
  }, [viewMode, verses, transliterations.length, chapter, fetchTransliteration]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-foreground truncate">📖 Psaume {chapter}</h3>
            {heTitle && <p className="text-xs text-muted-foreground font-hebrew truncate" dir="rtl">{heTitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer border-none">✕</button>
        </div>

        {/* Dedication banner */}
        <DedicationBanner dedication={dedication} dedicationType={dedicationType} />

        {/* View mode selector */}
        <div className="px-4 py-2 border-b border-border">
          <ViewModeSelector mode={viewMode} onModeChange={setViewMode} loading={translitLoading} />
        </div>

        <div className="px-4 py-2 border-b border-border flex items-center gap-3">
          <span className="text-xs text-muted-foreground">A-</span>
          <input type="range" min={16} max={36} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="text-sm font-bold text-muted-foreground">A+</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4" style={{ background: "#FEFEFE" }}>
          {loading && <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /><p className="text-sm text-muted-foreground mt-3">Chargement…</p></div>}
          {error && <div className="text-center py-10"><p className="text-sm text-destructive">{error}</p></div>}
          {!loading && !error && (
            <>
               {viewMode === "hebrew" && (
                <div dir="rtl" className="hebrew-reading-block" style={{ fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif", fontSize: `${fontSize}px`, lineHeight: 2.2, textAlign: "right", fontWeight: 600, color: "#111" }}>
                  {verses.map((verse, i) => (
                    <span key={i}>
                      <span style={{ fontSize: `${Math.max(fontSize - 3, 14)}px`, marginInlineEnd: "5px", fontWeight: 700, color: "#888", verticalAlign: "baseline" }}>{toHebrewLetter(i + 1)}</span>
                      <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
                    </span>
                  ))}
                </div>
              )}
              {viewMode === "phonetic" && (
                <div dir="ltr" style={{ fontFamily: "'Lora', serif", fontSize: `${fontSize}px`, lineHeight: 2, textAlign: "left", fontWeight: 500, color: "#222" }}>
                  {translitLoading ? (
                    <div className="text-center py-10">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-muted-foreground mt-3">Génération de la phonétique…</p>
                    </div>
                  ) : transliterations.length > 0 ? (
                    transliterations.map((line, i) => (
                      <p key={i} className="mb-2.5">
                        <span className="font-bold mr-2" style={{ color: "hsl(var(--gold-matte))", fontSize: `${Math.max(fontSize - 2, 14)}px` }}>{i + 1}.</span>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">La phonétique n'est pas encore disponible.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {claim && (
          <div className="p-4 border-t border-border space-y-2" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
            {!claim.completed ? (
              <>
                <button onClick={() => onMarkComplete(claim)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}>
                  ✅ Marquer comme lu
                </button>
                <button onClick={() => onUnclaim(claim)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold border border-destructive/30 bg-destructive/5 text-destructive cursor-pointer">
                  🗑️ Annuler ma réservation
                </button>
              </>
            ) : (
              <div className="text-center py-2">
                <span className="text-xs font-bold text-green-600">✅ Psaume déjà lu</span>
              </div>
            )}
            {nextChapter && onGoNext && (
              <button
                onClick={onGoNext}
                className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-[0.98] text-primary-foreground"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
              >
                ➡️ Psaume suivant (Ps {nextChapter})
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
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
  const [showHazak, setShowHazak] = useState(false);
  const [prevCompletedCount, setPrevCompletedCount] = useState<number | null>(null);
  const [readingChapter, setReadingChapter] = useState<number | null>(null);

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

  // Detect completion for Hazak
  const totalCompleted = claims.filter((c) => c.completed).length;
  useEffect(() => {
    if (prevCompletedCount !== null && prevCompletedCount < TOTAL_PSALMS && totalCompleted >= TOTAL_PSALMS) {
      setShowHazak(true);
    }
    setPrevCompletedCount(totalCompleted);
  }, [totalCompleted, prevCompletedCount]);

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
  const progress = Math.round((totalClaimed / TOTAL_PSALMS) * 100);
  const completedPct = Math.round((totalCompleted / TOTAL_PSALMS) * 100);

  const myClaims = claims.filter(c => isOwnClaim(c));
  const participants = [...new Set(claims.map(c => c.display_name))];

  const shareChain = async () => {
    if (!chain) return;
    const shareUrl = `${window.location.origin}/tehilim/${chain.id}`;
    const text = `📖 Chaîne de Tehilim : ${chain.title}${chain.dedication ? `\n🙏 ${chain.dedication}` : ""}\n\n${totalClaimed}/150 réservés • ${totalCompleted} terminés\n\nChoisissez un psaume :\n${shareUrl}`;
    await shareText(text, `📖 ${chain.title}`);
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
    <div className="min-h-screen bg-background" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="max-w-[500px] mx-auto px-3 sm:px-4 py-6 sm:py-8">
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

            {/* Participants */}
            {participants.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2">
                👥 {participants.length} participant{participants.length > 1 ? "s" : ""} : {participants.slice(0, 5).join(", ")}{participants.length > 5 ? ` +${participants.length - 5}` : ""}
              </p>
            )}

            <div className="mt-4 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>📖 {totalClaimed}/{TOTAL_PSALMS} réservés</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: progress === 100 ? "#22c55e" : "var(--gradient-gold)" }}
                    initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>✅ {totalCompleted}/{TOTAL_PSALMS} terminés</span>
                  <span>{completedPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: "#22c55e" }}
                    initial={{ width: 0 }} animate={{ width: `${completedPct}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            </div>

            {/* Completion badge */}
            {completedPct === 100 && (
              <motion.div
                className="mt-3 p-3 rounded-xl text-center border border-green-500/30"
                style={{ background: "hsl(142 76% 36% / 0.08)" }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <span className="text-2xl">🏆</span>
                <p className="text-xs font-bold text-green-600 mt-1">Chaîne complétée — Hazak Hazak !</p>
              </motion.div>
            )}

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
            <div className="flex flex-wrap gap-2">
              {myClaims.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border" style={{
                  background: c.completed ? "hsl(142 76% 36% / 0.1)" : "hsl(var(--gold) / 0.1)",
                  borderColor: c.completed ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.2)",
                  color: c.completed ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))",
                }}>
                  <span>Ps {c.chapter_start}</span>
                  {c.completed ? (
                    <span>✅</span>
                  ) : (
                    <>
                      <button onClick={() => toggleComplete(c)} className="bg-transparent border-none cursor-pointer text-sm p-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-green-500/10 transition-colors active:scale-90" title="Marquer comme lu">✔️</button>
                      <button onClick={() => unclaimPsalm(c)} className="text-destructive bg-transparent border-none cursor-pointer text-sm p-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors active:scale-90" title="Annuler">✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Psalms grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {Array.from({ length: TOTAL_PSALMS }, (_, i) => i + 1).map((num) => {
            const claim = claims.find((c) => c.chapter_start === num && c.chapter_end === num);
            const isMine = claim ? isOwnClaim(claim) : false;
            const firstName = claim?.display_name?.split(" ")[0] || "";

            return (
              <motion.button
                key={num}
                onClick={() => {
                  if (!claim) { setSelectedClaim({ id: '', chain_id: id!, user_id: null, display_name: '', chapter_start: num, chapter_end: num, completed: false } as any); return; }
                  if (isMine) { setSelectedClaim(claim); return; }
                }}
                disabled={!!claim && !isMine}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 overflow-hidden ${
                  claim?.completed
                    ? "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400"
                    : claim
                    ? isMine
                      ? "border-primary/50 text-primary"
                      : "border-muted text-muted-foreground opacity-70"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
                style={isMine && claim && !claim.completed ? { background: "hsl(var(--gold) / 0.12)", borderColor: "hsl(var(--gold-matte) / 0.5)" } : {}}
                title={claim ? `${claim.display_name}${claim.completed ? " ✅" : ""}` : `Psaume ${num}`}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: num * 0.003 }}
              >
                {/* Numéro français bien visible */}
                <span className="text-sm font-extrabold leading-none">{num}</span>
                {/* Numéro hébreu bien lisible */}
                <span className="text-[10px] leading-none mt-1 font-hebrew font-bold opacity-70" dir="rtl">{toHebrewLetter(num)}</span>
                {/* Prénom du lecteur */}
                {claim && (
                  <span
                    className="text-[7px] leading-tight truncate w-full text-center px-0.5 mt-1 font-bold"
                    style={{ color: claim.completed ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))" }}
                  >
                    {firstName}
                  </span>
                )}
                {claim?.completed && <span className="text-[8px] absolute top-0.5 right-0.5">✅</span>}
                {isMine && claim && !claim.completed && <span className="text-[8px] absolute top-0.5 right-0.5">📖</span>}
              </motion.button>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border inline-block" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "hsl(var(--gold) / 0.1)" }} /> Réservé</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block" /> Terminé</span>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          💡 Cliquez sur un psaume libre pour le réserver
        </p>

        <div className="text-center mt-8">
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer hover:underline">
            ← Retour à Chabbat Chalom
          </button>
        </div>
      </div>

      {/* Action menu for psalms */}
      <AnimatePresence>
        {selectedClaim && (() => {
          const isFree = selectedClaim.id === '';
          const isOwn = !isFree && isOwnClaim(selectedClaim);
          if (!isFree && !isOwn) return null;
          return (
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
                  Psaume {selectedClaim.chapter_start} — {toHebrewLetter(selectedClaim.chapter_start)}
                </h3>
                <p className="text-xs text-muted-foreground text-center mb-5">
                  {isFree ? "Ce psaume est libre" : selectedClaim.completed ? "Ce psaume est marqué comme lu" : "Que souhaitez-vous faire ?"}
                </p>
                <div className="space-y-2.5">
                  {isFree && (
                    <>
                      <button
                        onClick={() => { claimPsalm(selectedClaim.chapter_start); setSelectedClaim(null); }}
                        className="w-full py-3.5 rounded-xl text-sm font-bold border border-border bg-card text-foreground cursor-pointer"
                      >
                        📌 Réserver pour plus tard
                      </button>
                      <button
                        onClick={() => { claimPsalm(selectedClaim.chapter_start); setSelectedClaim(null); setReadingChapter(selectedClaim.chapter_start); }}
                        className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                        style={{ background: "var(--gradient-gold)" }}
                      >
                        📖 Réserver et lire maintenant
                      </button>
                    </>
                  )}
                  {isOwn && !selectedClaim.completed && (
                    <button
                      onClick={() => { setReadingChapter(selectedClaim.chapter_start); setSelectedClaim(null); }}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      📖 Lire maintenant
                    </button>
                  )}
                  {isOwn && !selectedClaim.completed && (
                    <button
                      onClick={() => toggleComplete(selectedClaim)}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border border-border bg-card text-foreground cursor-pointer"
                    >
                      ✅ Marquer comme lu
                    </button>
                  )}
                  {isOwn && selectedClaim.completed && (
                    <button
                      onClick={() => { setReadingChapter(selectedClaim.chapter_start); setSelectedClaim(null); }}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      📖 Relire
                    </button>
                  )}
                  {isOwn && selectedClaim.completed && (
                    <button
                      onClick={() => toggleComplete(selectedClaim)}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border border-border bg-card text-foreground cursor-pointer"
                    >
                      ↩️ Marquer comme non lu
                    </button>
                  )}
                  {isOwn && !selectedClaim.completed && (
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
          );
        })()}
      </AnimatePresence>

      <GuestNamePrompt open={guestPromptOpen} onSubmit={handleGuestNameSubmit} onClose={() => setGuestPromptOpen(false)} />
      <HazakCelebration show={showHazak} onDone={() => setShowHazak(false)} />

      {/* Sticky discover banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t px-4"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
          paddingTop: "12px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -4px 20px hsl(var(--foreground) / 0.06)",
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">✡️ Chabbat Chalom</p>
          <p className="text-[10px] text-muted-foreground">Zmanim, Siddour, Tehilim & plus</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="shrink-0 rounded-xl border-none px-4 py-2.5 text-xs font-bold text-primary-foreground cursor-pointer transition-all active:scale-95"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
        >
          Découvrir l'appli →
        </button>
      </div>

      {/* Psalm Reader */}
      <AnimatePresence>
        {readingChapter !== null && (() => {
          const myUnread = myClaims.filter(c => !c.completed).sort((a, b) => a.chapter_start - b.chapter_start);
          const currentIdx = myUnread.findIndex(c => c.chapter_start === readingChapter);
          const nextClaim = currentIdx >= 0 && currentIdx < myUnread.length - 1 ? myUnread[currentIdx + 1] : null;
          const myClaim = claims.find(c => c.chapter_start === readingChapter && isOwnClaim(c));
          return (
            <PsalmReaderOverlay
              chapter={readingChapter}
              claim={myClaim}
              onClose={() => setReadingChapter(null)}
              onMarkComplete={(claim) => { toggleComplete(claim); if (nextClaim) { setReadingChapter(nextClaim.chapter_start); } else { setReadingChapter(null); } }}
              onUnclaim={(claim) => { unclaimPsalm(claim); setReadingChapter(null); }}
              nextChapter={nextClaim?.chapter_start}
              onGoNext={nextClaim ? () => setReadingChapter(nextClaim.chapter_start) : undefined}
              dedication={chain?.dedication}
              dedicationType={chain?.dedication_type}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

const TehilimJoin = () => (
  <AuthProvider>
    <TehilimJoinContent />
  </AuthProvider>
);

export default TehilimJoin;
