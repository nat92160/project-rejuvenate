import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { useTransliteration, type ViewMode } from "@/hooks/useTransliteration";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSiddourBookmark } from "@/hooks/useSiddourBookmark";
import { useSiddourFavorites } from "@/hooks/useSiddourFavorites";
import SiddourToc from "@/components/siddour/SiddourToc";
import SiddourReader from "@/components/siddour/SiddourReader";
import SiddourQuickJump from "@/components/siddour/SiddourQuickJump";
import SiddourSearch from "@/components/siddour/SiddourSearch";

type Office = "shacharit" | "minha" | "arvit" | "shabbat" | "rosh_hodesh" | "fetes" | "hanukkah" | "purim" | "taanit" | "birkat" | "berakhot" | "tikoun_hatsot" | "nissan" | "mishnayot_shabbat" | "birkat_halevana" | "shabbat_special";

interface Section { index: number; title: string; heTitle: string; isHazara?: boolean; }
interface SectionContent { hebrew: string[]; french: string[]; title: string; heTitle: string; isHazara?: boolean; }

const OFFICES: { key: Office; label: string; icon: string }[] = [
  // ── Prières quotidiennes ──
  { key: "shacharit", label: "Cha'harit", icon: "🌅" },
  { key: "minha", label: "Min'ha", icon: "🌇" },
  { key: "arvit", label: "Arvit", icon: "🌙" },
  // ── Chabbat & fêtes ──
  { key: "shabbat", label: "Chabbat", icon: "🕯️" },
  { key: "rosh_hodesh", label: "Roch 'Hodech", icon: "🌙" },
  { key: "fetes", label: "Fêtes", icon: "🎺" },
  // ── Fêtes spéciales ──
  { key: "hanukkah", label: "'Hanouka", icon: "🕎" },
  { key: "purim", label: "Pourim", icon: "🎭" },
  { key: "taanit", label: "Jeûnes", icon: "🕊️" },
  // ── Berakhot & Birkat ──
  { key: "birkat", label: "Birkat HaMazone", icon: "🍞" },
  { key: "berakhot", label: "Bénédictions", icon: "✡️" },
  // ── Suppléments ──
  { key: "tikoun_hatsot", label: "Tikoun 'Hatsot", icon: "🌑" },
  { key: "nissan", label: "Nissan", icon: "🌸" },
  { key: "mishnayot_shabbat", label: "Michnayot", icon: "📖" },
  { key: "birkat_halevana", label: "Birkat HaLévana", icon: "🌕" },
];

const CACHE_PREFIX = "siddour_v8_sefarade_";

/** Detect the most relevant office based on current time */
function detectOffice(): Office {
  const h = new Date().getHours();
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  if (day === 6 || (day === 5 && h >= 16)) return "shabbat";
  if (h < 12) return "shacharit";
  if (h < 17) return "minha";
  return "arvit";
}

interface SiddourWidgetProps { prayerMode?: boolean; initialOffice?: Office; }

const SiddourWidget = ({ prayerMode = false, initialOffice }: SiddourWidgetProps) => {
  const [office, setOffice] = useState<Office>(initialOffice || detectOffice);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [content, setContent] = useState<SectionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [tocLoading, setTocLoading] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [viewMode, setViewMode] = useState<ViewMode>("hebrew");
  const { transliterations, loading: translitLoading, fetchTransliteration, clearTransliterations } = useTransliteration();
  const { favorites, toggle: toggleFavorite, isFavorite } = useSiddourFavorites();
  const { save: saveBookmark, load: loadBookmark, restoreScroll, startAutoSave } = useSiddourBookmark();

  // Wake lock while siddour is open
  useWakeLock(true);

  // Track if we should auto-open the first section (deep-link from dashboard)
  const [autoOpenDone, setAutoOpenDone] = useState(false);

  // Restore bookmark on mount (only if no initialOffice deep-link)
  const [bookmarkRestored, setBookmarkRestored] = useState(false);
  useEffect(() => {
    if (bookmarkRestored) return;
    if (initialOffice) {
      // Deep-link: skip bookmark, will auto-open first section
      setBookmarkRestored(true);
      return;
    }
    const bm = loadBookmark();
    if (bm) {
      setOffice(bm.office as Office);
      setActiveSection(bm.sectionIndex);
      setBookmarkRestored(true);
      setTimeout(() => restoreScroll(bm), 500);
    } else {
      setBookmarkRestored(true);
    }
  }, [bookmarkRestored, loadBookmark, restoreScroll, initialOffice]);

  // Auto-open first section when deep-linked from dashboard
  useEffect(() => {
    if (initialOffice && !autoOpenDone && sections.length > 0 && activeSection === null) {
      setActiveSection(0);
      setAutoOpenDone(true);
    }
  }, [initialOffice, autoOpenDone, sections, activeSection]);

  // Auto-save bookmark when reading
  useEffect(() => {
    if (activeSection !== null) startAutoSave(office, activeSection);
  }, [activeSection, office, startAutoSave]);

  const fetchToc = useCallback(async (off: Office) => {
    setTocLoading(true);
    setSections([]);
    setActiveSection(null);
    setContent(null);

    const cacheKey = `${CACHE_PREFIX}toc_${off}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setSections(JSON.parse(cached)); setTocLoading(false); return; } catch { /* */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off } });
      if (error) throw error;
      if (data?.sections) {
        setSections(data.sections);
        try { localStorage.setItem(cacheKey, JSON.stringify(data.sections)); } catch { /* */ }
      }
    } catch (err) { console.error("Error fetching siddour toc:", err); }
    setTocLoading(false);
  }, []);

  const fetchSection = useCallback(async (off: Office, idx: number) => {
    setLoading(true);
    setContent(null);
    clearTransliterations();

    const cacheKey = `${CACHE_PREFIX}${off}_${idx}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setContent(JSON.parse(cached)); setLoading(false); return; } catch { /* */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off, section: idx } });
      if (error) throw error;
      if (data?.hebrew) {
        const c: SectionContent = {
          hebrew: data.hebrew,
          french: data.french || [],
          title: data.title,
          heTitle: data.heTitle,
          isHazara: data.isHazara || false,
        };
        setContent(c);
        try { localStorage.setItem(cacheKey, JSON.stringify(c)); } catch { /* */ }
      }
    } catch (err) { console.error("Error fetching section:", err); }
    setLoading(false);
  }, [clearTransliterations]);

  useEffect(() => { if (bookmarkRestored) fetchToc(office); }, [office, fetchToc, bookmarkRestored]);
  useEffect(() => { if (activeSection !== null) fetchSection(office, activeSection); }, [activeSection, office, fetchSection]);

  // Auto-fetch transliteration
  useEffect(() => {
    if ((viewMode === "phonetic" || viewMode === "bilingual") && content && content.hebrew.length > 0 && transliterations.length === 0) {
      fetchTransliteration(content.hebrew, `siddour_${office}_${activeSection}`);
    }
  }, [viewMode, content, transliterations.length, office, activeSection, fetchTransliteration]);

  // Sort offices: detected first
  const suggestedOffice = useMemo(detectOffice, []);

  const pmBg = prayerMode ? "#000" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  const handleSelectSection = useCallback((idx: number) => {
    setActiveSection(idx);
    setViewMode("hebrew");
  }, []);

  const handleBack = useCallback(() => {
    setActiveSection(null);
    setContent(null);
    clearTransliterations();
  }, [clearTransliterations]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
      style={prayerMode ? { background: pmBg, margin: "-1rem", padding: "1rem", minHeight: "100vh" } : undefined}
    >
      {/* Header */}
      <div
        className="rounded-2xl border border-primary/15 p-5 text-center"
        style={{
          background: prayerMode ? pmCard : "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
          borderColor: pmBorder,
        }}
      >
        <span className="text-3xl">📖</span>
        <h3 className="mt-2 font-display text-lg font-bold" style={{ color: pmText }}>Siddour Complet</h3>
        <p className="mt-1 text-xs" style={{ color: pmMuted }}>Rite Séfarade — Hébreu, Phonétique & Traduction</p>
      </div>

      {/* Office selector — horizontal scrollable chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {OFFICES.map((off) => {
          const isSuggested = off.key === suggestedOffice && office !== off.key;
          return (
            <button
              key={off.key}
              onClick={() => { setOffice(off.key); setActiveSection(null); setViewMode("hebrew"); }}
              className="shrink-0 flex items-center gap-1 rounded-xl border-none px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap relative"
              style={{
                background: office === off.key ? "var(--gradient-gold)" : (prayerMode ? pmCard : "hsl(var(--muted))"),
                color: office === off.key ? "hsl(var(--primary-foreground))" : (prayerMode ? pmMuted : "hsl(var(--muted-foreground))"),
                boxShadow: office === off.key ? "var(--shadow-gold)" : "none",
              }}
            >
              <span>{off.icon}</span>
              <span>{off.label}</span>
              {isSuggested && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "hsl(var(--gold))" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Font size slider */}
      <div
        className="rounded-2xl border p-3"
        style={{
          boxShadow: prayerMode ? "none" : "var(--shadow-card)",
          background: prayerMode ? pmCard : "hsl(var(--card))",
          borderColor: pmBorder || "hsl(var(--border))",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: pmMuted }}>A-</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-sm font-bold" style={{ color: pmMuted }}>A+</span>
        </div>
      </div>

      {/* Quick Jump Bar - visible when reading */}
      {activeSection !== null && sections.length > 1 && (
        <SiddourQuickJump
          sections={sections}
          activeIndex={activeSection}
          onJump={handleSelectSection}
          prayerMode={prayerMode}
        />
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {activeSection === null ? (
          <motion.div key="toc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Search */}
            <SiddourSearch sections={sections} onSelect={handleSelectSection} prayerMode={prayerMode} />
            {/* Table of Contents */}
            <SiddourToc
              sections={sections}
              loading={tocLoading}
              onSelect={handleSelectSection}
              favorites={favorites}
              isFavorite={isFavorite}
              onFavoriteTap={toggleFavorite}
              office={office}
              prayerMode={prayerMode}
            />
          </motion.div>
        ) : (
          <SiddourReader
            content={content}
            loading={loading}
            fontSize={fontSize}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            transliterations={transliterations}
            translitLoading={translitLoading}
            onBack={handleBack}
            onPrev={() => activeSection > 0 && setActiveSection(activeSection - 1)}
            onNext={() => activeSection < sections.length - 1 && setActiveSection(activeSection + 1)}
            hasPrev={activeSection > 0}
            hasNext={activeSection < sections.length - 1}
            isFavorite={isFavorite(office, activeSection)}
            onToggleFavorite={() => {
              const sec = sections.find(s => s.index === activeSection);
              if (sec) toggleFavorite({ office, sectionIndex: sec.index, title: sec.title, heTitle: sec.heTitle });
            }}
            prayerMode={prayerMode}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SiddourWidget;
