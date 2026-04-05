import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";
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
    id: "daily",
    label: "Quotidien",
    icon: "📅",
    offices: [
      { key: "shacharit" as Office, label: "Cha'harit", icon: "🌅", desc: "Prière du matin" },
      { key: "minha" as Office, label: "Min'ha", icon: "☀️", desc: "Prière de l'après-midi" },
      { key: "arvit" as Office, label: "Arvit", icon: "🌙", desc: "Prière du soir" },
    ],
  },
  {
    id: "shabbat",
    label: "Chabbat",
    icon: "🕯️",
    offices: [
      { key: "shabbat" as Office, label: "Chabbat complet", icon: "🕯️", desc: "Kabbalat Chabbat → Havdala" },
      { key: "mishnayot_shabbat" as Office, label: "Michnayot", icon: "📖", desc: "Étude des repas de Chabbat" },
    ],
  },
  {
    id: "holidays",
    label: "Fêtes",
    icon: "🎺",
    offices: [
      { key: "rosh_hodesh" as Office, label: "Roch 'Hodech", icon: "🌙", desc: "Nouveau mois" },
      { key: "fetes" as Office, label: "Fêtes", icon: "🎺", desc: "Pessa'h, Chavouot, Soukot" },
      { key: "hanukkah" as Office, label: "'Hanouka", icon: "🕎", desc: "Allumage & Hallel" },
      { key: "purim" as Office, label: "Pourim", icon: "🎭", desc: "Méguila & Séder" },
      { key: "taanit" as Office, label: "Jeûnes", icon: "🕊️", desc: "Sélihot & deuil" },
      { key: "nissan" as Office, label: "Nissan", icon: "🌸", desc: "Birkat HaIlanot" },
    ],
  },
  {
    id: "brakhot",
    label: "Brakhot",
    icon: "🙏",
    offices: [
      { key: "birkat" as Office, label: "Birkat HaMazone", icon: "🍞", desc: "Bénédiction du repas" },
      { key: "berakhot" as Office, label: "Brakhot", icon: "🙏", desc: "Mariage, Brit, Téfila…" },
      { key: "birkat_halevana" as Office, label: "Birkat HaLévana", icon: "🌕", desc: "Bénédiction de la lune" },
      { key: "tikoun_hatsot" as Office, label: "Tikoun 'Hatsot", icon: "🌑", desc: "Prière de minuit" },
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
  const [activeCategory, setActiveCategory] = useState(() => {
    const currentOffice = initialOffice || detectOffice(getLiturgicalContext());
    return OFFICE_CATEGORIES.find(c => c.offices.some(o => o.key === currentOffice))?.id || "daily";
  });
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
      {/* ── Category Tabs (segmented control) ── */}
      <div
        className="flex rounded-xl p-0.5 gap-0.5"
        style={{
          background: prayerMode ? "rgba(255,255,255,0.04)" : "hsl(var(--muted))",
        }}
      >
        {OFFICE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold cursor-pointer transition-all active:scale-[0.97]"
              style={{
                background: isActive
                  ? (prayerMode ? "rgba(255,255,255,0.1)" : "hsl(var(--background))")
                  : "transparent",
                color: isActive
                  ? (prayerMode ? "#e8e0d0" : "hsl(var(--foreground))")
                  : (prayerMode ? "#666" : "hsl(var(--muted-foreground))"),
                boxShadow: isActive ? "0 1px 3px hsl(var(--foreground) / 0.08)" : "none",
                border: "none",
              }}
            >
              <span className="text-xs">{cat.icon}</span>
              <span className="hidden min-[380px]:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Offices grid for active category ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {OFFICE_CATEGORIES.find(c => c.id === activeCategory)?.offices.map((off) => {
            const isActive = office === off.key;
            const isSuggested = off.key === suggestedOffice && !isActive;
            return (
              <button
                key={off.key}
                onClick={() => { setOffice(off.key); setActiveSection(null); setViewMode("hebrew"); }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all active:scale-[0.97] border"
                style={{
                  background: isActive
                    ? (prayerMode ? "rgba(255,215,0,0.1)" : "hsl(var(--gold) / 0.08)")
                    : "transparent",
                  borderColor: isActive
                    ? "hsl(var(--gold) / 0.3)"
                    : (prayerMode ? "rgba(255,255,255,0.06)" : "hsl(var(--border) / 0.5)"),
                }}
              >
                <span className="text-lg">{off.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold truncate" style={{ color: isActive ? "hsl(var(--gold-matte))" : (prayerMode ? "#ccc" : "hsl(var(--foreground))") }}>
                      {off.label}
                    </span>
                    {isSuggested && (
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}>
                        now
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] truncate" style={{ color: prayerMode ? "#777" : "hsl(var(--muted-foreground) / 0.6)" }}>
                    {off.desc}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-30" style={{ color: prayerMode ? "#555" : "hsl(var(--muted-foreground))" }} />
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Liturgical context bar */}
      <LiturgicalContextBar
        prayerMode={prayerMode}
        context={litContext}
        onContextChange={setLitContext}
      />

      {/* Font size — inline minimal */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[10px] font-medium" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}>A</span>
        <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
        <span className="text-sm font-medium" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}>A</span>
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
