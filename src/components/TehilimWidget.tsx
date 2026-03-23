import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import GuestNamePrompt, { getGuestName } from "@/components/GuestNamePrompt";
import HazakCelebration from "@/components/HazakCelebration";
import { toHebrewLetter, isInstructionOnly } from "@/lib/utils";

const TEHILIM_DAILY = [
  { day: "Dimanche", chapters: "1 – 29", yom: "Yom Rishon" },
  { day: "Lundi", chapters: "30 – 50", yom: "Yom Chéni" },
  { day: "Mardi", chapters: "51 – 72", yom: "Yom Chelichi" },
  { day: "Mercredi", chapters: "73 – 89", yom: "Yom Révi'i" },
  { day: "Jeudi", chapters: "90 – 106", yom: "Yom 'Hamichi" },
  { day: "Vendredi", chapters: "107 – 119", yom: "Yom Chichi" },
  { day: "Chabbat", chapters: "120 – 150", yom: "Yom Chabbat" },
];

const POPULAR_PSALMS = [
  { num: 20, title: "Protection", desc: "Récité pour la protection et le salut" },
  { num: 23, title: "Confiance", desc: "L'Éternel est mon berger" },
  { num: 27, title: "Lumière", desc: "L'Éternel est ma lumière" },
  { num: 91, title: "Refuge", desc: "Celui qui demeure sous l'abri du Très-Haut" },
  { num: 121, title: "Aide", desc: "Je lève les yeux vers les montagnes" },
  { num: 130, title: "Téchouva", desc: "Des profondeurs je T'invoque" },
  { num: 142, title: "Détresse", desc: "Je crie vers l'Éternel" },
  { num: 150, title: "Louange", desc: "Louez Dieu dans Son sanctuaire" },
];

type Chain = { id: string; creator_id: string; title: string; dedication: string | null; dedication_type: string | null; status: string; created_at: string };
type Claim = { id: string; chain_id: string; user_id: string | null; display_name: string; chapter_start: number; chapter_end: number; completed: boolean; claimed_at: string; completed_at: string | null };

const TOTAL_PSALMS = 150;
const DEDICATION_LABELS: Record<string, string> = {
  general: "", refouah: "🙏 Refouah Chelema", ilouye: "🕯️ Ilouye Nichmat",
  hatslaha: "✨ Hatslaha", zivougue: "💍 Zivougué",
};

// Psalm Reader Modal
const PsalmReader = ({ chapter, onClose }: { chapter: number; onClose: () => void }) => {
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-psalm", { body: { chapter } });
        if (fnError || !data?.success) { setError("Impossible de charger ce psaume."); return; }
        setVerses(data.verses); setHeTitle(data.heTitle);
      } catch { setError("Erreur de connexion."); }
      finally { setLoading(false); }
    })();
  }, [chapter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">📖 Psaume {chapter}</h3>
            {heTitle && <p className="text-sm text-muted-foreground font-hebrew" dir="rtl">{heTitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer border-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /><p className="text-sm text-muted-foreground mt-3">Chargement…</p></div>}
          {error && <div className="text-center py-10"><p className="text-sm text-destructive">{error}</p></div>}
          {!loading && !error && (
            <div dir="rtl" className="hebrew-reading-block" style={{ fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif", fontSize: "22px", lineHeight: 2.4, textAlign: "justify", fontWeight: 600, color: "#111", wordSpacing: "0.06em" }}>
              {verses.map((verse, i) => (
                <span key={i}>
                  <span style={{ fontSize: "15px", marginInlineEnd: "5px", fontWeight: 700, color: "#888", verticalAlign: "baseline" }}>{toHebrewLetter(i + 1)}</span>
                  <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Chain Psalm Reader — opens psalm + mark as complete button
const ChainPsalmReader = ({ chapter, claim, onClose, onMarkComplete }: {
  chapter: number;
  claim?: Claim;
  onClose: () => void;
  onMarkComplete: (claim: Claim) => void;
}) => {
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fontSize, setFontSize] = useState(24);

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-psalm", { body: { chapter } });
        if (fnError || !data?.success) { setError("Impossible de charger ce psaume."); return; }
        setVerses(data.verses); setHeTitle(data.heTitle);
      } catch { setError("Erreur de connexion."); }
      finally { setLoading(false); }
    })();
  }, [chapter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">📖 Psaume {chapter}</h3>
            {heTitle && <p className="text-sm text-muted-foreground font-hebrew" dir="rtl">{heTitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer border-none">✕</button>
        </div>

        {/* Font size slider */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-3">
          <span className="text-xs text-muted-foreground">A-</span>
          <input type="range" min={16} max={36} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="text-sm font-bold text-muted-foreground">A+</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: "#FEFEFE" }}>
          {loading && <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /><p className="text-sm text-muted-foreground mt-3">Chargement…</p></div>}
          {error && <div className="text-center py-10"><p className="text-sm text-destructive">{error}</p></div>}
          {!loading && !error && (
            <div dir="rtl" className="hebrew-reading-block" style={{ fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif", fontSize: `${fontSize}px`, lineHeight: 2.4, textAlign: "justify", fontWeight: 600, color: "#111", wordSpacing: "0.06em" }}>
              {verses.map((verse, i) => (
                <span key={i}>
                  <span style={{ fontSize: `${Math.max(fontSize - 3, 14)}px`, marginInlineEnd: "5px", fontWeight: 700, color: "#888", verticalAlign: "baseline" }}>{toHebrewLetter(i + 1)}</span>
                  <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        {claim && !claim.completed && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => onMarkComplete(claim)}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}
            >
              ✅ Marquer comme lu
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
// Chain Create Form
const ChainCreateForm = ({ onCreated }: { onCreated: () => void }) => {
  const { user } = useAuth();
  const { synagogueId } = useSynaProfile();
  const [title, setTitle] = useState("Chaîne de Tehilim");
  const [dedication, setDedication] = useState("");
  const [dedicationType, setDedicationType] = useState("general");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) { toast.error("Connectez-vous pour créer une chaîne"); return; }
    setCreating(true);
    const { error } = await supabase.from("tehilim_chains").insert({ creator_id: user.id, synagogue_id: synagogueId, title, dedication: dedication || null, dedication_type: dedicationType });
    if (error) { toast.error("Erreur: vérifiez que vous avez le rôle Président."); }
    else { toast.success("✅ Chaîne de Tehilim créée !"); }
    setCreating(false); onCreated();
  };

  return (
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la chaîne" className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <select value={dedicationType} onChange={(e) => setDedicationType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm">
        <option value="general">Général</option><option value="refouah">Refouah Chelema</option><option value="ilouye">Ilouye Nichmat</option><option value="hatslaha">Hatslaha</option><option value="zivougue">Zivougué</option>
      </select>
      <input value={dedication} onChange={(e) => setDedication(e.target.value)} placeholder="Nom de la personne / Dédicace (optionnel)" className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <button onClick={handleCreate} disabled={creating || !title.trim()} className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50" style={{ background: "var(--gradient-gold)" }}>
        {creating ? "Création…" : "🔗 Créer la chaîne"}
      </button>
    </div>
  );
};

// Psalm tile with name tooltip
const PsalmTile = ({
  num, claim, isMine, onClaim, onToggle, onUnclaim, onRead, onSelect
}: {
  num: number;
  claim: Claim | undefined;
  isMine: boolean;
  onClaim: () => void;
  onToggle: () => void;
  onUnclaim: () => void;
  onRead: () => void;
  onSelect: () => void;
}) => {
  const firstName = claim?.display_name?.split(" ")[0] || "";

  return (
    <motion.button
      layout
      onClick={() => {
        if (!claim) { onSelect(); return; }
        if (isMine) { onSelect(); return; }
      }}
      onContextMenu={(e) => { e.preventDefault(); if (isMine && claim && !claim.completed) onUnclaim(); }}
      disabled={!!claim && !isMine}
      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer border overflow-hidden ${
        claim?.completed ? "bg-green-500/15 border-green-500/30 text-green-600"
        : claim ? isMine ? "border-primary/40 text-primary" : "border-border text-muted-foreground opacity-60"
        : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5"
      }`}
      style={isMine && claim && !claim.completed ? { background: "hsl(var(--gold) / 0.1)" } : {}}
      title={claim ? `${claim.display_name}${claim.completed ? " ✅" : isMine ? " — clic pour gérer" : ""}` : `Psaume ${num}`}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, delay: num * 0.003 }}
    >
      <span className="text-[11px] font-bold leading-none">{num}</span>
      <span className="text-[8px] leading-none mt-0.5 font-hebrew text-muted-foreground" dir="rtl">{toHebrewLetter(num)}</span>
      {claim && (
        <span className="text-[6px] leading-tight truncate w-full text-center px-0.5 mt-0.5 font-medium" style={{ color: claim.completed ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))" }}>
          {firstName}
        </span>
      )}
      {claim?.completed && <span className="text-[7px] absolute top-0.5 right-0.5">✅</span>}
      {isMine && claim && !claim.completed && <span className="text-[7px] absolute top-0.5 right-0.5">📖</span>}
    </motion.button>
  );
};

// Chain Detail — guest-friendly
const ChainDetail = ({ chain, onBack }: { chain: Chain; onBack: () => void }) => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [pendingPsalm, setPendingPsalm] = useState<number | null>(null);
  const [showHazak, setShowHazak] = useState(false);
  const [prevCompletedCount, setPrevCompletedCount] = useState<number | null>(null);
  const [readingChapter, setReadingChapter] = useState<number | null>(null);
  const [selectedPsalm, setSelectedPsalm] = useState<number | null>(null);

  const fetchClaims = useCallback(async () => {
    const { data } = await supabase.from("tehilim_claims").select("*").eq("chain_id", chain.id).order("chapter_start");
    setClaims((data as Claim[]) || []); setLoading(false);
  }, [chain.id]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);
  useEffect(() => {
    const channel = supabase.channel(`chain-${chain.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tehilim_claims", filter: `chain_id=eq.${chain.id}` }, () => fetchClaims())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chain.id, fetchClaims]);

  // Detect completion for Hazak
  const totalCompleted = claims.filter(c => c.completed).length;
  useEffect(() => {
    if (prevCompletedCount !== null && prevCompletedCount < TOTAL_PSALMS && totalCompleted >= TOTAL_PSALMS) {
      setShowHazak(true);
    }
    setPrevCompletedCount(totalCompleted);
  }, [totalCompleted, prevCompletedCount]);

  const getDisplayName = async (): Promise<string> => {
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      return profile?.display_name || user.email?.split("@")[0] || "Anonyme";
    }
    return getGuestName() || "Invité";
  };

  const doClaimPsalm = async (num: number, displayName: string) => {
    const tempId = `temp-${num}-${Date.now()}`;
    const optimistic: Claim = { id: tempId, chain_id: chain.id, user_id: user?.id || null, display_name: displayName, chapter_start: num, chapter_end: num, completed: false, claimed_at: new Date().toISOString(), completed_at: null };
    setClaims(prev => [...prev, optimistic]);
    toast.success(`✅ Psaume ${num} réservé !`);

    const { error } = await supabase.from("tehilim_claims").insert({
      chain_id: chain.id, user_id: user?.id || null, display_name: displayName, chapter_start: num, chapter_end: num,
    });
    if (error) { setClaims(prev => prev.filter(c => c.id !== tempId)); toast.error("Erreur lors de la réservation"); }
    else { fetchClaims(); }
  };

  const claimPsalm = async (num: number) => {
    if (!user && !getGuestName()) {
      setPendingPsalm(num); setGuestPromptOpen(true); return;
    }
    const displayName = await getDisplayName();
    doClaimPsalm(num, displayName);
  };

  const handleGuestNameSubmit = (name: string) => {
    setGuestPromptOpen(false);
    if (pendingPsalm !== null) { doClaimPsalm(pendingPsalm, name); setPendingPsalm(null); }
  };

  const isOwnClaim = (claim: Claim) => {
    if (user && claim.user_id === user.id) return true;
    if (!user && !claim.user_id && claim.display_name === getGuestName()) return true;
    return false;
  };

  const unclaimPsalm = async (claim: Claim) => {
    if (!isOwnClaim(claim)) return;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    toast.success("Réservation annulée");
    const { error } = await supabase.from("tehilim_claims").delete().eq("id", claim.id);
    if (error) { toast.error("Erreur"); fetchClaims(); }
  };

  const toggleComplete = async (claim: Claim) => {
    if (!isOwnClaim(claim)) return;
    const newCompleted = !claim.completed;
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : c));
    await supabase.from("tehilim_claims").update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }).eq("id", claim.id);
  };

  const totalClaimed = claims.length;
  const progressPct = Math.round((totalClaimed / TOTAL_PSALMS) * 100);
  const completedPct = Math.round((totalCompleted / TOTAL_PSALMS) * 100);

  const isCreator = user?.id === chain.creator_id;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chain.title);

  const handleRename = async () => {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from("tehilim_chains").update({ title: editTitle.trim() }).eq("id", chain.id);
    if (error) toast.error("Erreur");
    else { chain.title = editTitle.trim(); toast.success("Nom modifié !"); setEditing(false); }
  };

  const handleDeleteChain = async () => {
    if (!confirm("Supprimer cette chaîne et toutes ses réservations ?")) return;
    await supabase.from("tehilim_claims").delete().eq("chain_id", chain.id);
    const { error } = await supabase.from("tehilim_chains").delete().eq("id", chain.id);
    if (error) toast.error("Erreur"); else { toast.success("Chaîne supprimée"); onBack(); }
  };

  const shareUrl = `${window.location.origin}/tehilim/${chain.id}`;
  const shareChain = async () => {
    const text = `📖 Chaîne de Tehilim : ${chain.title}${chain.dedication ? `\n🙏 ${chain.dedication}` : ""}\n\n${totalClaimed}/150 réservés • ${totalCompleted} terminés\n\nChoisissez un psaume :\n${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Lien copié dans le presse-papier !");
  };

  // Unique participants
  const participants = [...new Set(claims.map(c => c.display_name))];

  return (
    <div>
      <button onClick={onBack} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3">← Retour</button>

      <div className="p-4 rounded-xl border border-border mb-4" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        {editing ? (
          <div className="flex gap-2 mb-2">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm" />
            <button onClick={handleRename} className="px-3 py-2 rounded-lg text-xs font-bold text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>✓</button>
            <button onClick={() => { setEditing(false); setEditTitle(chain.title); }} className="px-3 py-2 rounded-lg text-xs font-bold bg-muted text-muted-foreground border-none cursor-pointer">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-foreground">{chain.title}</h4>
            {isCreator && (
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground border-none cursor-pointer">✏️</button>
                <button onClick={handleDeleteChain} className="text-[10px] px-2 py-1 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer">🗑️</button>
              </div>
            )}
          </div>
        )}
        {chain.dedication && <p className="text-sm text-muted-foreground mt-1">{DEDICATION_LABELS[chain.dedication_type || "general"]} {chain.dedication}</p>}

        {/* Participants count */}
        {participants.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            👥 {participants.length} participant{participants.length > 1 ? "s" : ""} : {participants.slice(0, 5).join(", ")}{participants.length > 5 ? ` +${participants.length - 5}` : ""}
          </p>
        )}

        {/* Progress bars */}
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              <span>📖 {totalClaimed}/150 réservés ({progressPct}%)</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              <span>✅ {totalCompleted}/150 terminés ({completedPct}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: completedPct === 100 ? "#22c55e" : "#22c55e" }}
                initial={{ width: 0 }}
                animate={{ width: `${completedPct}%` }}
                transition={{ duration: 0.8 }}
              />
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

        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={shareChain} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>📤 Partager</button>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Lien copié !"); }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-border bg-muted text-muted-foreground">📋 Copier</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: TOTAL_PSALMS }, (_, i) => i + 1).map((num) => {
              const claim = claims.find(c => c.chapter_start === num && c.chapter_end === num);
              const isMine = claim ? isOwnClaim(claim) : false;
              return (
                <PsalmTile
                  key={num}
                  num={num}
                  claim={claim}
                  isMine={isMine}
                  onClaim={() => claimPsalm(num)}
                  onToggle={() => claim && toggleComplete(claim)}
                  onUnclaim={() => claim && unclaimPsalm(claim)}
                  onRead={() => setReadingChapter(num)}
                  onSelect={() => setSelectedPsalm(num)}
                />
              );
            })}
          </div>

          <div className="flex gap-4 justify-center mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border inline-block" /> Libre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: "hsl(var(--gold) / 0.1)" }} /> Réservé</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block" /> Terminé</span>
          </div>

          {/* My claims summary */}
          {claims.filter(c => isOwnClaim(c) && !c.completed).length > 0 && (
            <div className="mt-3 p-3 rounded-xl border border-primary/20" style={{ background: "hsl(var(--gold) / 0.06)" }}>
              <p className="text-[10px] font-bold text-foreground mb-1.5">Mes réservations :</p>
              <div className="flex flex-wrap gap-1">
                {claims.filter(c => isOwnClaim(c) && !c.completed).map(c => (
                  <div key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-primary/20" style={{ background: "hsl(var(--gold) / 0.1)" }}>
                    <span>Ps {c.chapter_start}</span>
                    <button onClick={() => unclaimPsalm(c)} className="text-destructive bg-transparent border-none cursor-pointer text-[9px] p-0 hover:scale-110">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <GuestNamePrompt open={guestPromptOpen} onSubmit={handleGuestNameSubmit} onClose={() => setGuestPromptOpen(false)} />
      <HazakCelebration show={showHazak} onDone={() => setShowHazak(false)} />

      {/* Action bottom sheet for own psalms */}
      <AnimatePresence>
        {selectedPsalm !== null && (() => {
          const claim = claims.find(c => c.chapter_start === selectedPsalm && isOwnClaim(c));
          if (!claim) { return null; }
          return (
            <>
              <motion.div
                className="fixed inset-0 z-[400]"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedPsalm(null)}
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
                  Psaume {selectedPsalm} — {toHebrewLetter(selectedPsalm)}
                </h3>
                <p className="text-xs text-muted-foreground text-center mb-5">
                  {claim.completed ? "Ce psaume est marqué comme lu" : "Que souhaitez-vous faire ?"}
                </p>
                <div className="space-y-2.5">
                  {!claim.completed && (
                    <button
                      onClick={() => { setSelectedPsalm(null); setReadingChapter(selectedPsalm); }}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      📖 Lire maintenant
                    </button>
                  )}
                  {!claim.completed && (
                    <button
                      onClick={() => { unclaimPsalm(claim); setSelectedPsalm(null); }}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border border-destructive/30 bg-destructive/5 text-destructive cursor-pointer"
                    >
                      🗑️ Annuler ma réservation
                    </button>
                  )}
                  {claim.completed && (
                    <button
                      onClick={() => { setSelectedPsalm(null); setReadingChapter(selectedPsalm); }}
                      className="w-full py-3.5 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      📖 Relire
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPsalm(null)}
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

      <AnimatePresence>
        {readingChapter !== null && (
          <ChainPsalmReader
            chapter={readingChapter}
            claim={claims.find(c => c.chapter_start === readingChapter && isOwnClaim(c))}
            onClose={() => setReadingChapter(null)}
            onMarkComplete={(claim) => { toggleComplete(claim); setReadingChapter(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Widget
const TehilimWidget = () => {
  const [tab, setTab] = useState<"daily" | "popular" | "chain">("daily");
  const [readingChapter, setReadingChapter] = useState<number | null>(null);
  const { user, dbRole } = useAuth();
  const isPresident = dbRole === "president";
  const today = new Date().getDay();

  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingChains, setLoadingChains] = useState(false);

  const fetchChains = useCallback(async () => {
    setLoadingChains(true);

    let subIds: string[] = [];
    if (user) {
      const { data: mySubs } = await supabase
        .from("synagogue_subscriptions")
        .select("synagogue_id")
        .eq("user_id", user.id);
      subIds = (mySubs || []).map((s: any) => s.synagogue_id);
    }

    let query = supabase.from("tehilim_chains").select("*").eq("status", "active").order("created_at", { ascending: false });

    if (user) {
      if (subIds.length > 0) {
        query = query.or(`creator_id.eq.${user.id},synagogue_id.in.(${subIds.join(",")})`);
      } else {
        query = query.eq("creator_id", user.id);
      }
    } else {
      setChains([]); setLoadingChains(false); return;
    }

    const { data } = await query;
    setChains((data as Chain[]) || []); setLoadingChains(false);
  }, [user]);

  useEffect(() => { if (tab === "chain") fetchChains(); }, [tab, fetchChains]);

  return (
    <motion.div className="rounded-2xl bg-card p-6 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">📖 Tehilim — Psaumes</h3>

      <div className="flex gap-2 mt-4 mb-5">
        {([{ key: "daily" as const, label: "Du jour" }, { key: "popular" as const, label: "Populaires" }, { key: "chain" as const, label: "Chaîne" }]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedChain(null); setShowCreateForm(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
              tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}>{t.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "daily" && (
          <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {TEHILIM_DAILY.map((d, i) => (
                <div key={d.day} className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${i === today ? "border-2 border-primary/30" : "border border-border"}`}
                  style={i === today ? { background: "hsl(var(--gold) / 0.05)" } : {}}>
                  <div className="flex items-center gap-3">
                    {i === today && <span className="text-lg">📖</span>}
                    <div><p className={`text-sm font-bold ${i === today ? "text-primary" : "text-foreground"}`}>{d.day}</p><p className="text-[11px] text-muted-foreground font-hebrew">{d.yom}</p></div>
                  </div>
                  <div className="text-right"><p className={`text-sm font-semibold ${i === today ? "text-primary" : "text-foreground"}`}>Chap. {d.chapters}</p>{i === today && <span className="text-[9px] uppercase tracking-wider font-bold text-primary">Aujourd'hui</span>}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "popular" && (
          <motion.div key="popular" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_PSALMS.map(p => (
                <button key={p.num} onClick={() => setReadingChapter(p.num)} className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/15 transition-all cursor-pointer text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}>{p.num}</span>
                    <span className="text-xs font-bold text-foreground">{p.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "chain" && (
          <motion.div key="chain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {selectedChain ? (
              <ChainDetail chain={selectedChain} onBack={() => setSelectedChain(null)} />
            ) : showCreateForm ? (
              <div>
                <button onClick={() => setShowCreateForm(false)} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3">← Retour</button>
                <ChainCreateForm onCreated={() => { setShowCreateForm(false); fetchChains(); }} />
              </div>
            ) : (
              <div>
                {isPresident && user && (
                  <button onClick={() => setShowCreateForm(true)} className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer mb-4" style={{ background: "var(--gradient-gold)" }}>
                    ✨ Créer une chaîne de Tehilim
                  </button>
                )}
                {loadingChains ? (
                  <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
                ) : chains.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-5xl">🤝</span>
                    <h4 className="font-display text-lg font-bold mt-4 text-foreground">Chaîne de Tehilim</h4>
                    <p className="text-sm mt-2 text-muted-foreground max-w-[300px] mx-auto">
                      {isPresident ? "Créez votre première chaîne." : "Aucune chaîne active pour le moment."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {chains.map(c => (
                      <button key={c.id} onClick={() => setSelectedChain(c)} className="w-full p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/15 transition-all cursor-pointer text-left">
                        <div className="flex items-center justify-between">
                          <div><p className="text-sm font-bold text-foreground">{c.title}</p>{c.dedication && <p className="text-[11px] text-muted-foreground mt-0.5">{c.dedication}</p>}</div>
                          <span className="text-xs text-muted-foreground">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {readingChapter !== null && <PsalmReader chapter={readingChapter} onClose={() => setReadingChapter(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};

export default TehilimWidget;
