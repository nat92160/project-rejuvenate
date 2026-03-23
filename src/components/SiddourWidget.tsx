import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { toHebrewLetter, isInstructionOnly } from "@/lib/utils";
import ViewModeSelector from "@/components/ViewModeSelector";
import { useTransliteration, type ViewMode } from "@/hooks/useTransliteration";

type Office = "shacharit" | "minha" | "arvit" | "shabbat" | "hallel" | "birkat" | "kaddish";

interface Section {
  index: number;
  title: string;
  heTitle: string;
}

interface SectionContent {
  hebrew: string[];
  french: string[];
  title: string;
  heTitle: string;
}

const OFFICES: { key: Office; label: string; icon: string }[] = [
  { key: "shacharit", label: "Cha'harit", icon: "🌅" },
  { key: "minha", label: "Min'ha", icon: "🌇" },
  { key: "arvit", label: "Arvit", icon: "🌙" },
  { key: "shabbat", label: "Chabbat", icon: "🕯️" },
  { key: "hallel", label: "Hallel", icon: "🎶" },
  { key: "birkat", label: "Birkat", icon: "🍞" },
  { key: "kaddish", label: "Kaddich", icon: "📜" },
];

const CACHE_PREFIX = "siddour_v5_";

interface SiddourWidgetProps {
  prayerMode?: boolean;
}

const SiddourWidget = ({ prayerMode = false }: SiddourWidgetProps) => {
  const [office, setOffice] = useState<Office>("shacharit");
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [content, setContent] = useState<SectionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [tocLoading, setTocLoading] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [viewMode, setViewMode] = useState<ViewMode>("hebrew");
  const { transliterations, loading: translitLoading, fetchTransliteration, clearTransliterations } = useTransliteration();

  const fetchToc = useCallback(async (off: Office) => {
    setTocLoading(true);
    setSections([]);
    setActiveSection(null);
    setContent(null);

    const cacheKey = `${CACHE_PREFIX}toc_${off}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setSections(JSON.parse(cached));
        setTocLoading(false);
        return;
      } catch { /* ignore */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off } });
      if (error) throw error;
      if (data?.sections) {
        setSections(data.sections);
        try { localStorage.setItem(cacheKey, JSON.stringify(data.sections)); } catch { /* */ }
      }
    } catch (err) {
      console.error("Error fetching siddour toc:", err);
    }
    setTocLoading(false);
  }, []);

  const fetchSection = useCallback(async (off: Office, idx: number) => {
    setLoading(true);
    setContent(null);
    clearTransliterations();

    const cacheKey = `${CACHE_PREFIX}${off}_${idx}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setContent(JSON.parse(cached));
        setLoading(false);
        return;
      } catch { /* ignore */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off, section: idx } });
      if (error) throw error;
      if (data?.hebrew) {
        const c: SectionContent = { hebrew: data.hebrew, french: data.french || [], title: data.title, heTitle: data.heTitle };
        setContent(c);
        try { localStorage.setItem(cacheKey, JSON.stringify(c)); } catch { /* */ }
      }
    } catch (err) {
      console.error("Error fetching section:", err);
    }
    setLoading(false);
  }, [clearTransliterations]);

  useEffect(() => { fetchToc(office); }, [office, fetchToc]);
  useEffect(() => { if (activeSection !== null) fetchSection(office, activeSection); }, [activeSection, office, fetchSection]);

  // Auto-fetch transliteration when switching to phonetic/bilingual
  useEffect(() => {
    if ((viewMode === "phonetic" || viewMode === "bilingual") && content && content.hebrew.length > 0 && transliterations.length === 0) {
      fetchTransliteration(content.hebrew, `siddour_${office}_${activeSection}`);
    }
  }, [viewMode, content, transliterations.length, office, activeSection, fetchTransliteration]);

  const pmBg = prayerMode ? "#000" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4"
      style={prayerMode ? { background: pmBg, margin: "-1rem", padding: "1rem", minHeight: "100vh" } : undefined}
    >
      {/* Header */}
      <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{
        background: prayerMode ? pmCard : "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
        borderColor: pmBorder,
      }}>
        <span className="text-3xl">📖</span>
        <h3 className="mt-2 font-display text-lg font-bold" style={{ color: pmText }}>Siddour Complet</h3>
        <p className="mt-1 text-xs" style={{ color: pmMuted }}>Navigation libre — Hébreu, Phonétique & Traduction</p>
      </div>

      {/* Office selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {OFFICES.map((off) => (
          <button
            key={off.key}
            onClick={() => { setOffice(off.key); setActiveSection(null); setViewMode("hebrew"); }}
            className="shrink-0 flex items-center gap-1 rounded-xl border-none px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            style={{
              background: office === off.key ? "var(--gradient-gold)" : (prayerMode ? pmCard : "hsl(var(--muted))"),
              color: office === off.key ? "hsl(var(--primary-foreground))" : (prayerMode ? pmMuted : "hsl(var(--muted-foreground))"),
              boxShadow: office === off.key ? "var(--shadow-gold)" : "none",
            }}
          >
            <span>{off.icon}</span>
            <span>{off.label}</span>
          </button>
        ))}
      </div>

      {/* Controls: Font size + View mode */}
      <div className="rounded-2xl border p-3 space-y-3" style={{
        boxShadow: prayerMode ? "none" : "var(--shadow-card)",
        background: prayerMode ? pmCard : "hsl(var(--card))",
        borderColor: pmBorder || "hsl(var(--border))",
      }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: pmMuted }}>A-</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-sm font-bold" style={{ color: pmMuted }}>A+</span>
        </div>
        <ViewModeSelector mode={viewMode} onModeChange={setViewMode} loading={translitLoading} prayerMode={prayerMode} />
      </div>

      {/* Table of Contents or Reading content */}
      <AnimatePresence mode="wait">
        {activeSection === null ? (
          <motion.div key="toc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {tocLoading ? (
              <div className="py-10 text-center text-sm" style={{ color: pmMuted }}>Chargement du sommaire…</div>
            ) : sections.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{
                background: prayerMode ? pmCard : "hsl(var(--card))",
                borderColor: pmBorder || "hsl(var(--border))",
                boxShadow: prayerMode ? "none" : "var(--shadow-card)",
              }}>
                <span className="text-4xl">📖</span>
                <p className="mt-3 text-sm" style={{ color: pmMuted }}>Aucune section disponible.</p>
              </div>
            ) : (
              sections.map((sec, i) => (
                <motion.button
                  key={sec.index}
                  onClick={() => setActiveSection(sec.index)}
                  className="w-full flex items-center gap-4 rounded-2xl border p-4 text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    boxShadow: prayerMode ? "none" : "var(--shadow-card)",
                    background: prayerMode ? pmCard : "hsl(var(--card))",
                    borderColor: pmBorder || "hsl(var(--border))",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{
                    background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))",
                    color: "hsl(var(--gold-matte))",
                  }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold" style={{ color: pmText }}>{sec.title}</p>
                    <p className="text-xs" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted }}>{sec.heTitle}</p>
                  </div>
                  <span style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}>›</span>
                </motion.button>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <button
              onClick={() => { setActiveSection(null); setContent(null); clearTransliterations(); }}
              className="flex items-center gap-2 mb-4 text-sm font-bold bg-transparent border-none cursor-pointer hover:underline"
              style={{ color: prayerMode ? "#e8e0d0" : "hsl(var(--primary))" }}
            >
              ← Sommaire
            </button>

            {loading ? (
              <div className="py-10 text-center text-sm" style={{ color: pmMuted }}>Chargement du texte…</div>
            ) : content ? (
              <div className="rounded-2xl border px-5 py-6 sm:px-8" style={{
                boxShadow: prayerMode ? "none" : "var(--shadow-card)",
                background: prayerMode ? "#0a0a0a" : "#FEFEFE",
                borderColor: pmBorder || "hsl(var(--border) / 0.5)",
              }}>
                <h4 className="text-center font-display text-base font-bold mb-0.5" style={{ color: pmText }}>{content.title}</h4>
                <p className="text-center mb-6" style={{
                  fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
                  fontSize: `${fontSize}px`,
                  color: pmMuted,
                }}>{content.heTitle}</p>

                {/* Hebrew text */}
                {(viewMode === "hebrew" || viewMode === "bilingual") && (
                  <div dir="rtl" className="hebrew-reading-block" style={{
                    fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 2.4,
                    textAlign: "justify",
                    fontWeight: 600,
                    color: prayerMode ? "#e8e0d0" : "#111",
                    wordSpacing: "0.06em",
                  }}>
                    {(() => {
                      let verseNum = 0;
                      return content.hebrew.map((verse, i) => {
                        if (isInstructionOnly(verse)) {
                          return <span key={i} className="verse-instruction" dangerouslySetInnerHTML={{ __html: verse }} />;
                        }
                        verseNum++;
                        return (
                          <span key={i}>
                            <span style={{ fontSize: `${Math.max(fontSize - 3, 14)}px`, marginInlineEnd: "5px", fontWeight: 700, color: "#888", verticalAlign: "baseline" }}>{toHebrewLetter(verseNum)}</span>
                            <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
                            {viewMode === "bilingual" && transliterations[i] && (
                              <p dir="ltr" className="my-2 leading-relaxed" style={{
                                fontSize: `${Math.max(fontSize - 4, 13)}px`,
                                textAlign: "left",
                                fontWeight: 400,
                                color: prayerMode ? "#b8a87a" : "hsl(var(--gold-matte))",
                                fontFamily: "'Lora', serif",
                                fontStyle: "italic",
                              }}>
                                {transliterations[i]}
                              </p>
                            )}
                            {viewMode === "bilingual" && content.french[i] && (
                              <p dir="ltr" className="my-1 leading-relaxed" style={{
                                fontSize: `${Math.max(fontSize - 6, 12)}px`,
                                textAlign: "left",
                                fontWeight: 400,
                                color: prayerMode ? "#888" : "#666",
                                fontFamily: "'Lora', serif",
                                fontStyle: "italic",
                              }}
                              dangerouslySetInnerHTML={{ __html: content.french[i] }}
                              />
                            )}
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Phonetic only */}
                {viewMode === "phonetic" && (
                  <div dir="ltr" style={{
                    fontFamily: "'Lora', serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 2.2,
                    textAlign: "left",
                    fontWeight: 500,
                    color: prayerMode ? "#e8e0d0" : "#222",
                  }}>
                    {translitLoading ? (
                      <div className="text-center py-10">
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-sm mt-3" style={{ color: pmMuted }}>Génération de la phonétique…</p>
                      </div>
                    ) : transliterations.length > 0 ? (
                      (() => {
                        let verseNum = 0;
                        return content.hebrew.map((verse, i) => {
                          if (isInstructionOnly(verse)) return null;
                          verseNum++;
                          if (!transliterations[i]) return null;
                          return (
                            <p key={i} className="mb-3">
                              <span className="font-bold mr-2" style={{ color: prayerMode ? "#888" : "hsl(var(--gold-matte))", fontSize: `${Math.max(fontSize - 2, 14)}px` }}>
                                {toHebrewLetter(verseNum)}
                              </span>
                              {transliterations[i]}
                            </p>
                          );
                        });
                      })()
                    ) : (
                      <p className="text-center text-sm" style={{ color: pmMuted }}>
                        La phonétique n'est pas encore disponible pour cette section.
                      </p>
                    )}
                  </div>
                )}

                {/* Section navigation */}
                <div className="flex justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${pmBorder || "hsl(var(--border))"}` }}>
                  <button
                    onClick={() => activeSection > 0 && setActiveSection(activeSection - 1)}
                    disabled={activeSection <= 0}
                    className="rounded-xl border px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 bg-transparent"
                    style={{ borderColor: pmBorder || "hsl(var(--border))", color: pmText || "hsl(var(--foreground))" }}
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => activeSection < sections.length - 1 && setActiveSection(activeSection + 1)}
                    disabled={activeSection >= sections.length - 1}
                    className="rounded-xl border-none px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 text-primary-foreground"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm" style={{ color: pmMuted }}>Erreur de chargement.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SiddourWidget;
