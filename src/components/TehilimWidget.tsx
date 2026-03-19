import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Data ──────────────────────────────────────────────
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

// Standard split of 150 psalms into ~10 groups
const CHAIN_GROUPS = [
  { start: 1, end: 15 },
  { start: 16, end: 30 },
  { start: 31, end: 45 },
  { start: 46, end: 60 },
  { start: 61, end: 75 },
  { start: 76, end: 90 },
  { start: 91, end: 105 },
  { start: 106, end: 120 },
  { start: 121, end: 135 },
  { start: 136, end: 150 },
];

type Chain = {
  id: string;
  creator_id: string;
  title: string;
  dedication: string | null;
  dedication_type: string | null;
  status: string;
  created_at: string;
};

type Claim = {
  id: string;
  chain_id: string;
  user_id: string | null;
  display_name: string;
  chapter_start: number;
  chapter_end: number;
  completed: boolean;
  claimed_at: string;
  completed_at: string | null;
};

// ─── Psalm Reader Modal ────────────────────────────────
const PsalmReader = ({ chapter, onClose }: { chapter: number; onClose: () => void }) => {
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPsalm = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-psalm", {
          body: { chapter },
        });
        if (fnError || !data?.success) {
          setError("Impossible de charger ce psaume.");
          return;
        }
        setVerses(data.verses);
        setHeTitle(data.heTitle);
      } catch {
        setError("Erreur de connexion.");
      } finally {
        setLoading(false);
      }
    };
    fetchPsalm();
  }, [chapter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              📖 Psaume {chapter}
            </h3>
            {heTitle && (
              <p className="text-sm text-muted-foreground font-hebrew" dir="rtl">{heTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer border-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="text-center py-10">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Chargement…</p>
            </div>
          )}
          {error && (
            <div className="text-center py-10">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <div dir="rtl" className="space-y-3 text-right">
              {verses.map((verse, i) => (
                <p key={i} className="text-base leading-loose font-hebrew text-foreground">
                  <span
                    className="inline-block w-7 text-center text-xs font-bold mr-2 rounded-full"
                    style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
                  >
                    {i + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: verse }} />
                </p>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Chain Create Form ─────────────────────────────────
const ChainCreateForm = ({ onCreated }: { onCreated: () => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("Chaîne de Tehilim");
  const [dedication, setDedication] = useState("");
  const [dedicationType, setDedicationType] = useState("general");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer une chaîne");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("tehilim_chains").insert({
      creator_id: user.id,
      title,
      dedication: dedication || null,
      dedication_type: dedicationType,
    });
    if (error) {
      toast.error("Erreur: vérifiez que vous avez le rôle Président pour créer une chaîne.");
      console.error("Chain create error:", error);
    } else {
      toast.success("✅ Chaîne de Tehilim créée !");
    }
    setCreating(false);
    onCreated();
  };

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nom de la chaîne"
        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <select
        value={dedicationType}
        onChange={(e) => setDedicationType(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm"
      >
        <option value="general">Général</option>
        <option value="refouah">Refouah Chelema</option>
        <option value="ilouye">Ilouye Nichmat</option>
        <option value="hatslaha">Hatslaha</option>
        <option value="zivougue">Zivougué</option>
      </select>
      <input
        value={dedication}
        onChange={(e) => setDedication(e.target.value)}
        placeholder="Nom de la personne / Dédicace (optionnel)"
        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        onClick={handleCreate}
        disabled={creating || !title.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
        style={{ background: "var(--gradient-gold)" }}
      >
        {creating ? "Création…" : "🔗 Créer la chaîne"}
      </button>
    </div>
  );
};

// ─── Chain Detail View ─────────────────────────────────
const ChainDetail = ({ chain, onBack }: { chain: Chain; onBack: () => void }) => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    const { data } = await supabase
      .from("tehilim_claims")
      .select("*")
      .eq("chain_id", chain.id)
      .order("chapter_start");
    setClaims((data as Claim[]) || []);
    setLoading(false);
  }, [chain.id]);

  useEffect(() => {
    fetchClaims();

    // Realtime
    const channel = supabase
      .channel(`chain-${chain.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tehilim_claims", filter: `chain_id=eq.${chain.id}` }, () => {
        fetchClaims();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chain.id, fetchClaims]);

  const claimGroup = async (group: { start: number; end: number }) => {
    if (!user) {
      toast.error("Connectez-vous pour prendre un groupe de psaumes");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("tehilim_claims").insert({
      chain_id: chain.id,
      user_id: user.id,
      display_name: profile?.display_name || user.email || "Anonyme",
      chapter_start: group.start,
      chapter_end: group.end,
    });
    if (error) {
      toast.error("Erreur lors de la réservation");
      console.error("Claim error:", error);
    } else {
      toast.success(`✅ Chapitres ${group.start}-${group.end} réservés !`);
    }
  };

  const toggleComplete = async (claim: Claim) => {
    await supabase
      .from("tehilim_claims")
      .update({
        completed: !claim.completed,
        completed_at: !claim.completed ? new Date().toISOString() : null,
      })
      .eq("id", claim.id);
  };

  const totalClaimed = claims.length;
  const totalCompleted = claims.filter((c) => c.completed).length;
  const progress = Math.round((totalCompleted / CHAIN_GROUPS.length) * 100);

  const DEDICATION_LABELS: Record<string, string> = {
    general: "",
    refouah: "🙏 Refouah Chelema",
    ilouye: "🕯️ Ilouye Nichmat",
    hatslaha: "✨ Hatslaha",
    zivougue: "💍 Zivougué",
  };

  const shareUrl = `${window.location.origin}/?tehilim=${chain.id}`;

  const shareWhatsApp = () => {
    const text = `📖 Chaîne de Tehilim : ${chain.title}${chain.dedication ? `\n🙏 ${chain.dedication}` : ""}\n\n${totalClaimed}/${CHAIN_GROUPS.length} réservés • ${totalCompleted} terminés\n\nChoisissez un groupe de psaumes :\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareSMS = () => {
    const text = `Chaîne de Tehilim : ${chain.title} - ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    const subject = `Chaîne de Tehilim : ${chain.title}`;
    const body = `Bonjour,\n\nUne chaîne de Tehilim a été lancée :\n${chain.title}${chain.dedication ? `\n${chain.dedication}` : ""}\n\nChoisissez un groupe de psaumes en cliquant ici :\n${shareUrl}\n\nMerci !`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Lien copié !");
    }).catch(() => {
      toast.error("Impossible de copier le lien");
    });
  };

  return (
    <div>
      <button onClick={onBack} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3">
        ← Retour aux chaînes
      </button>

      {/* Chain header */}
      <div className="p-4 rounded-xl border border-border mb-4" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <h4 className="font-display text-base font-bold text-foreground">{chain.title}</h4>
        {chain.dedication && (
          <p className="text-sm text-muted-foreground mt-1">
            {DEDICATION_LABELS[chain.dedication_type || "general"]} {chain.dedication}
          </p>
        )}
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <span>{totalClaimed}/{CHAIN_GROUPS.length} réservés</span>
            <span>{totalCompleted}/{CHAIN_GROUPS.length} terminés</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "#22c55e" : "var(--gradient-gold)",
              }}
            />
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={shareWhatsApp}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none text-white"
            style={{ background: "#25d366" }}>
            📲 WhatsApp
          </button>
          <button onClick={copyLink}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-border bg-muted text-muted-foreground hover:border-primary/20">
            📋 Copier le lien
          </button>
          <button onClick={shareSMS}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-border bg-muted text-muted-foreground hover:border-primary/20">
            💬 SMS
          </button>
          <button onClick={shareEmail}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-border bg-muted text-muted-foreground hover:border-primary/20">
            ✉️ Email
          </button>
        </div>
      </div>

      {/* Groups grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="space-y-2">
          {CHAIN_GROUPS.map((group) => {
            const claim = claims.find((c) => c.chapter_start === group.start && c.chapter_end === group.end);
            const isMine = claim?.user_id === user?.id;

            return (
              <div
                key={group.start}
                className={`p-3.5 rounded-xl border transition-all ${
                  claim?.completed
                    ? "border-green-500/30 bg-green-500/5"
                    : claim
                    ? "border-primary/30 bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: claim?.completed ? "rgba(34,197,94,0.15)" : claim ? "hsl(var(--gold) / 0.1)" : "hsl(var(--muted))",
                        color: claim?.completed ? "#22c55e" : claim ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {group.start}-{group.end}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Chapitres {group.start} à {group.end}
                      </p>
                      {claim && (
                        <p className="text-[11px] text-muted-foreground">
                          {claim.completed ? "✅" : "📖"} {claim.display_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!claim && user && (
                    <button
                      onClick={() => claimGroup(group)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border-none text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      Prendre
                    </button>
                  )}
                  {isMine && !claim?.completed && (
                    <button
                      onClick={() => toggleComplete(claim!)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border border-green-500 text-green-500 bg-transparent hover:bg-green-500/10"
                    >
                      ✓ Terminé
                    </button>
                  )}
                  {isMine && claim?.completed && (
                    <span className="text-xs font-bold text-green-500">✅ Fait</span>
                  )}
                  {!user && !claim && (
                    <span className="text-[10px] text-muted-foreground">🔒 Connectez-vous</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Widget ───────────────────────────────────────
const TehilimWidget = () => {
  const [tab, setTab] = useState<"daily" | "popular" | "chain">("daily");
  const [readingChapter, setReadingChapter] = useState<number | null>(null);
  const { user, dbRole } = useAuth();
  const isPresident = dbRole === "president";
  const today = new Date().getDay();

  // Chains
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingChains, setLoadingChains] = useState(false);

  const fetchChains = useCallback(async () => {
    setLoadingChains(true);
    const { data } = await supabase
      .from("tehilim_chains")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setChains((data as Chain[]) || []);
    setLoadingChains(false);
  }, []);

  useEffect(() => {
    if (tab === "chain") fetchChains();
  }, [tab, fetchChains]);

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        📖 Tehilim — Psaumes
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 mt-4 mb-5">
        {[
          { key: "daily" as const, label: "Du jour" },
          { key: "popular" as const, label: "Populaires" },
          { key: "chain" as const, label: "Chaîne" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedChain(null); setShowCreateForm(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Daily ─── */}
        {tab === "daily" && (
          <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {TEHILIM_DAILY.map((d, i) => (
                <div
                  key={d.day}
                  className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                    i === today ? "border-2 border-primary/30" : "border border-border"
                  }`}
                  style={i === today ? { background: "hsl(var(--gold) / 0.05)" } : {}}
                >
                  <div className="flex items-center gap-3">
                    {i === today && <span className="text-lg">📖</span>}
                    <div>
                      <p className={`text-sm font-bold ${i === today ? "text-primary" : "text-foreground"}`}>{d.day}</p>
                      <p className="text-[11px] text-muted-foreground font-hebrew">{d.yom}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${i === today ? "text-primary" : "text-foreground"}`}>
                      Chap. {d.chapters}
                    </p>
                    {i === today && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary">Aujourd'hui</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Popular ─── */}
        {tab === "popular" && (
          <motion.div key="popular" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_PSALMS.map((p) => (
                <button
                  key={p.num}
                  onClick={() => setReadingChapter(p.num)}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/15 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
                    >
                      {p.num}
                    </span>
                    <span className="text-xs font-bold text-foreground">{p.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Chain ─── */}
        {tab === "chain" && (
          <motion.div key="chain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {selectedChain ? (
              <ChainDetail chain={selectedChain} onBack={() => setSelectedChain(null)} />
            ) : showCreateForm ? (
              <div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3"
                >
                  ← Retour
                </button>
                <ChainCreateForm onCreated={() => { setShowCreateForm(false); fetchChains(); }} />
              </div>
            ) : (
              <div>
                {/* President: create button */}
                {isPresident && user && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer mb-4"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    ✨ Créer une chaîne de Tehilim
                  </button>
                )}

                {/* Chain list */}
                {loadingChains ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : chains.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-5xl">🤝</span>
                    <h4 className="font-display text-lg font-bold mt-4 text-foreground">Chaîne de Tehilim</h4>
                    <p className="text-sm mt-2 text-muted-foreground max-w-[300px] mx-auto">
                      {isPresident
                        ? "Créez votre première chaîne pour que vos fidèles puissent se répartir les 150 psaumes."
                        : "Aucune chaîne active pour le moment. Demandez à votre président de synagogue d'en créer une !"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {chains.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => setSelectedChain(chain)}
                        className="w-full p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/15 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-foreground">{chain.title}</p>
                            {chain.dedication && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{chain.dedication}</p>
                            )}
                          </div>
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

      {/* Psalm reader modal */}
      <AnimatePresence>
        {readingChapter !== null && (
          <PsalmReader chapter={readingChapter} onClose={() => setReadingChapter(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TehilimWidget;
