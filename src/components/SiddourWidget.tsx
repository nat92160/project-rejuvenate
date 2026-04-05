import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import type { ViewMode } from "@/hooks/useTransliteration";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSiddourBookmark } from "@/hooks/useSiddourBookmark";
import { useSiddourFavorites } from "@/hooks/useSiddourFavorites";
import { getLiturgicalContext, type LiturgicalPeriod } from "@/lib/liturgicalContext";
import SiddourToc from "@/components/siddour/SiddourToc";
import SiddourReader from "@/components/siddour/SiddourReader";
import SiddourQuickJump from "@/components/siddour/SiddourQuickJump";
import SiddourSearch from "@/components/siddour/SiddourSearch";
import LiturgicalContextBar from "@/components/siddour/LiturgicalContextBar";

type Office = "shacharit" | "minha" | "arvit" | "shabbat" | "rosh_hodesh" | "fetes" | "hanukkah" | "purim" | "taanit" | "tikoun_hatsot" | "nissan" | "birkat" | "berakhot" | "birkat_halevana" | "mishnayot_shabbat";

interface Section { index: number; title: string; heTitle: string; isHazara?: boolean; }
interface SectionContent { hebrew: string[]; french: string[]; title: string; heTitle: string; isHazara?: boolean; }

const OFFICE_CATEGORIES = [
  {
    label: "Quotidien",
    offices: [
      { key: "shacharit" as Office, label: "Cha'harit", icon: "🌅" },
      { key: "minha" as Office, label: "Min'ha", icon: "☀️" },
      { key: "arvit" as Office, label: "Arvit", icon: "🌙" },
    ],
  },
  {
    label: "Chabbat",
    offices: [
      { key: "shabbat" as Office, label: "Chabbat complet", icon: "🕯️" },
      { key: "mishnayot_shabbat" as Office, label: "Michnayot", icon: "📖" },
    ],
  },
  {
    label: "Fêtes & Occasions",
    offices: [
      { key: "rosh_hodesh" as Office, label: "Roch 'Hodech", icon: "🌙" },
      { key: "fetes" as Office, label: "Fêtes", icon: "🎺" },
      { key: "hanukkah" as Office, label: "'Hanouka", icon: "🕎" },
      { key: "purim" as Office, label: "Pourim", icon: "🎭" },
      { key: "taanit" as Office, label: "Jeûnes", icon: "🕊️" },
      { key: "nissan" as Office, label: "Nissan", icon: "🌸" },
    ],
  },
  {
    label: "Brakhot & Prières",
    offices: [
      { key: "birkat" as Office, label: "Birkat HaMazone", icon: "🍞" },
      { key: "berakhot" as Office, label: "Brakhot", icon: "🙏" },
      { key: "birkat_halevana" as Office, label: "Birkat HaLévana", icon: "🌕" },
      { key: "tikoun_hatsot" as Office, label: "Tikoun 'Hatsot", icon: "🌑" },
    ],
  },
];

const OFFICES = OFFICE_CATEGORIES.flatMap(c => c.offices);

const CACHE_PREFIX = "siddour_v9_sefarade_";

function detectOffice(ctx?: LiturgicalPeriod): Office {
  const litCtx = ctx || getLiturgicalContext();
  const h = new Date().getHours();
  const day = new Date().getDay();

  // Festival/special period auto-detection
  if (litCtx.hanoucca) return "hanukkah";
  if (litCtx.pourim) return "purim";
  if (litCtx.holHaMoedPessach || litCtx.holHaMoedSukkot) return "fetes";
  if (litCtx.yomTov) return "fetes";
  if (litCtx.roshHodesh && !litCtx.shabbat) return "rosh_hodesh";

  // Shabbat
  if (day === 6 || (day === 5 && h >= 16)) {
    return "shabbat";
  }

  // Weekday
  if (h < 12) return "shacharit";
  if (h < 17) return "minha";
  return "arvit";
}

interface SiddourWidgetProps { prayerMode?: boolean; initialOffice?: Office; }

const SiddourWidget = ({ prayerMode = false, initialOffice }: SiddourWidgetProps) => {
  const [litContext, setLitContext] = useState<LiturgicalPeriod>(() => getLiturgicalContext());
  const [office, setOffice] = useState<Office>(initialOffice || (() => detectOffice(litContext)));
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [content, setContent] = useState<SectionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [tocLoading, setTocLoading] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [viewMode, setViewMode] = useState<ViewMode>("hebrew");
  const { favorites, toggle: toggleFavorite, isFavorite } = useSiddourFavorites();
  const { save: saveBookmark, load: loadBookmark, restoreScroll, startAutoSave } = useSiddourBookmark();

  useWakeLock(true);

  const [autoOpenDone, setAutoOpenDone] = useState(false);
  const [bookmarkRestored, setBookmarkRestored] = useState(false);

  useEffect(() => {
    if (bookmarkRestored) return;
    if (initialOffice) { setBookmarkRestored(true); return; }
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

  useEffect(() => {
    if (initialOffice && !autoOpenDone && sections.length > 0 && activeSection === null) {
      setActiveSection(0);
      setAutoOpenDone(true);
    }
  }, [initialOffice, autoOpenDone, sections, activeSection]);

  useEffect(() => {
    if (activeSection !== null) startAutoSave(office, activeSection);
  }, [activeSection, office, startAutoSave]);

  // Fetch TOC for an office
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
        const filtered = data.sections.filter((s: Section) => !s.isHazara);
        setSections(filtered);
        try { localStorage.setItem(cacheKey, JSON.stringify(filtered)); } catch { /* */ }
      }
    } catch (err) { console.error("Error fetching siddour toc:", err); }
    setTocLoading(false);
  }, []);

  // Fetch a specific section's content
  const fetchSection = useCallback(async (off: Office, idx: number) => {
    setLoading(true);
    setContent(null);

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
  }, []);

  useEffect(() => { if (bookmarkRestored) fetchToc(office); }, [office, fetchToc, bookmarkRestored]);
  useEffect(() => { if (activeSection !== null) fetchSection(office, activeSection); }, [activeSection, office, fetchSection]);

  const suggestedOffice = useMemo(() => detectOffice(litContext), [litContext]);

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
  }, []);

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

      {/* Office selector by category */}
      <div className="space-y-2">
        {OFFICE_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
              {cat.label}
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {cat.offices.map((off) => {
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
          </div>
        ))}
      </div>

      {/* Liturgical context bar */}
      <LiturgicalContextBar
        prayerMode={prayerMode}
        context={litContext}
        onContextChange={setLitContext}
      />

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

      {/* Quick Jump Bar */}
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
            <SiddourSearch sections={sections} onSelect={handleSelectSection} prayerMode={prayerMode} />
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
            litContext={litContext}
            content={content}
            loading={loading}
            fontSize={fontSize}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            transliterations={[]}
            translitLoading={false}
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
