import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import type { ViewMode } from "@/hooks/useTransliteration";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSiddourBookmark } from "@/hooks/useSiddourBookmark";
import { useSiddourFavorites } from "@/hooks/useSiddourFavorites";
import SiddourToc from "@/components/siddour/SiddourToc";
import SiddourReader from "@/components/siddour/SiddourReader";
import SiddourQuickJump from "@/components/siddour/SiddourQuickJump";
import SiddourSearch from "@/components/siddour/SiddourSearch";

type Office = "shacharit" | "hazara" | "additions_shacharit" | "minha" | "arvit" | "shabbat" | "shabbat_shacharit" | "shabbat_mussaf" | "shabbat_minha" | "havdala" | "rosh_hodesh" | "fetes" | "hanukkah" | "purim" | "taanit" | "tikoun_hatsot" | "nissan" | "sefirat_haomer" | "birkat" | "berakhot" | "birkat_halevana" | "bedtime_shema" | "mishnayot_shabbat";

interface Section { index: number; title: string; heTitle: string; isHazara?: boolean; }

/** Full section data from the API */
interface ApiSection {
  title: string;
  heTitle: string;
  ref: string;
  he: string[];
  en: string[];
  phonetic: string[];
}

interface SectionContent { hebrew: string[]; french: string[]; title: string; heTitle: string; isHazara?: boolean; phonetic?: string[]; }

const OFFICES: { key: Office; label: string; icon: string }[] = [
  { key: "shacharit", label: "Cha'harit", icon: "🌅" },
  { key: "hazara", label: "Hazara", icon: "🔄" },
  { key: "additions_shacharit", label: "Ajouts", icon: "➕" },
  { key: "minha", label: "Min'ha", icon: "☀️" },
  { key: "arvit", label: "Arvit", icon: "🌙" },
  { key: "shabbat", label: "Chabbat", icon: "🕯️" },
  { key: "shabbat_shacharit", label: "Chabbat Cha'harit", icon: "✡️" },
  { key: "shabbat_mussaf", label: "Moussaf", icon: "📜" },
  { key: "shabbat_minha", label: "Chabbat Min'ha", icon: "🌤️" },
  { key: "havdala", label: "Havdala", icon: "🔥" },
  { key: "rosh_hodesh", label: "Roch 'Hodech", icon: "🌙" },
  { key: "fetes", label: "Fêtes", icon: "🎺" },
  { key: "hanukkah", label: "'Hanouka", icon: "🕎" },
  { key: "purim", label: "Pourim", icon: "🎭" },
  { key: "taanit", label: "Jeûnes", icon: "🕊️" },
  { key: "tikoun_hatsot", label: "Tikoun 'Hatsot", icon: "🌑" },
  { key: "nissan", label: "Nissan", icon: "🌸" },
  { key: "sefirat_haomer", label: "Séfirat HaOmer", icon: "🔢" },
  { key: "birkat", label: "Birkat HaMazone", icon: "🍞" },
  { key: "berakhot", label: "Brakhot", icon: "🙏" },
  { key: "birkat_halevana", label: "Birkat HaLévana", icon: "🌕" },
  { key: "bedtime_shema", label: "Chéma' du coucher", icon: "😴" },
  { key: "mishnayot_shabbat", label: "Michnayot", icon: "📖" },
];

const CACHE_PREFIX = "siddour_v9_sefarade_";

function detectOffice(): Office {
  const h = new Date().getHours();
  const day = new Date().getDay();
  if (day === 6 || (day === 5 && h >= 16)) return "shabbat";
  if (h < 12) return "shacharit";
  if (h < 17) return "minha";
  return "arvit";
}

interface SiddourWidgetProps { prayerMode?: boolean; initialOffice?: Office; }

const SiddourWidget = ({ prayerMode = false, initialOffice }: SiddourWidgetProps) => {
  const [office, setOffice] = useState<Office>(initialOffice || detectOffice);
  const [sections, setSections] = useState<Section[]>([]);
  const [allSectionData, setAllSectionData] = useState<ApiSection[]>([]);
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

  // Fetch all sections for an office (single API call)
  const fetchOffice = useCallback(async (off: Office) => {
    setTocLoading(true);
    setSections([]);
    setAllSectionData([]);
    setActiveSection(null);
    setContent(null);

    const cacheKey = `${CACHE_PREFIX}all_${off}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed: ApiSection[] = JSON.parse(cached);
        setAllSectionData(parsed);
        setSections(parsed.map((s, i) => ({ index: i, title: s.title, heTitle: s.heTitle })));
        setTocLoading(false);
        return;
      } catch { /* */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off } });
      if (error) throw error;
      if (data?.sections && Array.isArray(data.sections)) {
        const apiSections: ApiSection[] = data.sections;
        setAllSectionData(apiSections);
        setSections(apiSections.map((s, i) => ({ index: i, title: s.title, heTitle: s.heTitle })));
        try { localStorage.setItem(cacheKey, JSON.stringify(apiSections)); } catch { /* */ }
      }
    } catch (err) { console.error("Error fetching siddour:", err); }
    setTocLoading(false);
  }, []);

  // When a section is selected, build content from stored data
  useEffect(() => {
    if (activeSection === null || allSectionData.length === 0) {
      if (activeSection === null) setContent(null);
      return;
    }
    const sec = allSectionData[activeSection];
    if (!sec) return;
    setContent({
      hebrew: sec.he,
      french: sec.en,
      title: sec.title,
      heTitle: sec.heTitle,
      phonetic: sec.phonetic,
    });
  }, [activeSection, allSectionData]);

  useEffect(() => { if (bookmarkRestored) fetchOffice(office); }, [office, fetchOffice, bookmarkRestored]);

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

      {/* Office selector */}
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
            content={content}
            loading={tocLoading && !content}
            fontSize={fontSize}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            transliterations={content?.phonetic || []}
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
