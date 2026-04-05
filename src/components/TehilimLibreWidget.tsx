import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { toHebrewLetter, isInstructionOnly } from "@/lib/utils";
import ViewModeSelector from "@/components/ViewModeSelector";
import { useTransliteration, type ViewMode } from "@/hooks/useTransliteration";
import { TEHILIM_THEMES, getDailyPsalms, type TehilimTheme } from "@/lib/tehilim-themes";

const TOTAL_PSALMS = 150;
const CACHE_PREFIX = "tehilim_libre_";
const FAV_KEY = "tehilim_favorites";

const loadFavorites = (): number[] => {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

interface TehilimLibreWidgetProps {
  prayerMode?: boolean;
}

type NavFilter = "all" | "daily" | "favorites" | string; // string = theme id

const TehilimLibreWidget = ({ prayerMode = false }: TehilimLibreWidgetProps) => {
  const [search, setSearch] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [favorites, setFavorites] = useState<number[]>(loadFavorites);
  const [navFilter, setNavFilter] = useState<NavFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("hebrew");
  const { transliterations, loading: translitLoading, fetchTransliteration, clearTransliterations } = useTransliteration();

  const pmBg = prayerMode ? "#000" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  const saveFavorites = (favs: number[]) => {
    setFavorites(favs);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* ignore */ }
  };

  const toggleFav = (ch: number) => {
    const next = favorites.includes(ch) ? favorites.filter((f) => f !== ch) : [...favorites, ch];
    saveFavorites(next);
    toast.success(next.includes(ch) ? `Psaume ${ch} ajouté aux favoris ❤️` : `Psaume ${ch} retiré des favoris`);
  };

  const fetchChapter = useCallback(async (ch: number) => {
    setLoading(true);
    setVerses([]);
    setHeTitle("");
    clearTransliterations();

    const cacheKey = `${CACHE_PREFIX}${ch}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setVerses(parsed.verses);
        setHeTitle(parsed.heTitle);
        setLoading(false);
        return;
      } catch { /* ignore */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-psalm", {
        body: { chapter: ch },
      });
      if (error) throw error;
      if (data?.verses) {
        setVerses(data.verses);
        setHeTitle(data.heTitle || `תהילים ${ch}`);
        try { localStorage.setItem(cacheKey, JSON.stringify({ verses: data.verses, heTitle: data.heTitle })); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Error fetching psalm:", err);
      toast.error("Erreur lors du chargement du psaume");
    }
    setLoading(false);
  }, [clearTransliterations]);

  useEffect(() => {
    if (selectedChapter !== null) fetchChapter(selectedChapter);
  }, [selectedChapter, fetchChapter]);

  // Auto-fetch transliteration when switching to phonetic mode
  useEffect(() => {
    if (viewMode === "phonetic" && verses.length > 0 && transliterations.length === 0 && selectedChapter !== null) {
      fetchTransliteration(verses, `psalm_${selectedChapter}`);
    }
  }, [viewMode, verses, transliterations.length, selectedChapter, fetchTransliteration]);

  const daily = getDailyPsalms();

  const filteredChapters = useMemo(() => {
    let chapters = Array.from({ length: TOTAL_PSALMS }, (_, i) => i + 1);

    if (navFilter === "favorites") {
      chapters = chapters.filter((ch) => favorites.includes(ch));
    } else if (navFilter === "daily") {
      chapters = daily.psalms;
    } else if (navFilter !== "all") {
      const theme = TEHILIM_THEMES.find((t) => t.id === navFilter);
      if (theme) chapters = theme.psalms;
    }

    if (search.trim()) {
      const num = parseInt(search, 10);
      if (!isNaN(num) && num >= 1 && num <= 150) {
        chapters = chapters.filter((ch) => ch === num);
      }
    }
    return chapters;
  }, [search, navFilter, favorites, daily.psalms]);

  const activeTheme = TEHILIM_THEMES.find((t) => t.id === navFilter);

  // Grid view
  if (selectedChapter === null) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4"
        style={prayerMode ? { background: pmBg, margin: "-1rem", padding: "1rem", minHeight: "100vh" } : undefined}
      >
        {/* Header */}
        <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{
          background: prayerMode ? pmCard : "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
          borderColor: pmBorder,
        }}>
          <span className="text-3xl">📜</span>
          <h3 className="mt-2 font-display text-lg font-bold" style={{ color: pmText }}>Livre de Tehilim</h3>
          <p className="mt-1 text-xs" style={{ color: pmMuted }}>Lecture libre — 150 Psaumes</p>
        </div>

        {/* Daily Tehilim shortcut */}
        <button
          onClick={() => setNavFilter(navFilter === "daily" ? "all" : "daily")}
          className="w-full rounded-2xl border p-4 text-left cursor-pointer transition-all active:scale-[0.98]"
          style={{
            background: navFilter === "daily"
              ? (prayerMode ? "rgba(200,168,76,0.12)" : "hsl(var(--gold) / 0.08)")
              : (prayerMode ? pmCard : "hsl(var(--card))"),
            borderColor: navFilter === "daily" ? "hsl(var(--gold-matte) / 0.4)" : (pmBorder || "hsl(var(--border))"),
            boxShadow: prayerMode ? "none" : "var(--shadow-card)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: pmText }}>Tehilim du jour — {daily.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: pmMuted }}>
                {daily.yom} • Psaumes {daily.psalms[0]}–{daily.psalms[daily.psalms.length - 1]}
              </p>
            </div>
            <span className="text-xs font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
              {daily.psalms.length} ps.
            </span>
          </div>
        </button>

        {/* Thematic categories */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
            Par thématique
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TEHILIM_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setNavFilter(navFilter === theme.id ? "all" : theme.id)}
                className="shrink-0 flex items-center gap-1 rounded-xl border-none px-3 py-2 text-[10px] font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: navFilter === theme.id ? "var(--gradient-gold)" : (prayerMode ? pmCard : "hsl(var(--muted))"),
                  color: navFilter === theme.id ? "hsl(var(--primary-foreground))" : (prayerMode ? pmMuted : "hsl(var(--muted-foreground))"),
                  boxShadow: navFilter === theme.id ? "var(--shadow-gold)" : "none",
                }}
              >
                <span>{theme.icon}</span>
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active theme description */}
        {activeTheme && (
          <div className="rounded-xl border px-4 py-3" style={{
            background: prayerMode ? pmCard : "hsl(var(--gold) / 0.04)",
            borderColor: pmBorder || "hsl(var(--gold-matte) / 0.2)",
          }}>
            <p className="text-xs font-bold" style={{ color: pmText }}>
              {activeTheme.icon} {activeTheme.label}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: pmMuted }}>
              {activeTheme.description} • {activeTheme.psalms.length} psaumes
            </p>
          </div>
        )}

        {/* Search & Favorites */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min={1}
              max={150}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un psaume (1-150)…"
              className="w-full rounded-xl border px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{
                background: prayerMode ? pmCard : "hsl(var(--background))",
                borderColor: pmBorder || "hsl(var(--border))",
                color: pmText || "hsl(var(--foreground))",
              }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: pmMuted }}>🔍</span>
          </div>
          <button
            onClick={() => setNavFilter(navFilter === "favorites" ? "all" : "favorites")}
            className="shrink-0 rounded-xl border px-4 py-2 text-sm font-bold cursor-pointer transition-all active:scale-95"
            style={{
              borderColor: navFilter === "favorites" ? "hsl(var(--gold-matte))" : (pmBorder || "hsl(var(--border))"),
              background: navFilter === "favorites" ? "hsl(var(--gold) / 0.1)" : "transparent",
              color: navFilter === "favorites" ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
            }}
          >
            ❤️ {favorites.length}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2">
          {filteredChapters.map((ch) => {
            const isFav = favorites.includes(ch);
            return (
              <motion.button
                key={ch}
                onClick={() => setSelectedChapter(ch)}
                className="relative flex flex-col items-center justify-center rounded-xl border py-3 text-center cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                  borderColor: isFav ? "hsl(var(--gold-matte) / 0.4)" : (pmBorder || "hsl(var(--border))"),
                  background: isFav ? "hsl(var(--gold) / 0.06)" : (prayerMode ? pmCard : "hsl(var(--card))"),
                  boxShadow: prayerMode ? "none" : "var(--shadow-card)",
                }}
                whileTap={{ scale: 0.93 }}
              >
                <span className="font-display text-base font-bold" style={{ color: pmText }}>{ch}</span>
                <span className="text-[8px] font-hebrew mt-0.5" style={{ color: pmMuted }} dir="rtl">{toHebrewLetter(ch)}</span>
                {isFav && <span className="absolute top-1 right-1 text-[8px]">❤️</span>}
              </motion.button>
            );
          })}
        </div>

        {filteredChapters.length === 0 && (
          <div className="rounded-2xl border p-8 text-center" style={{
            background: prayerMode ? pmCard : "hsl(var(--card))",
            borderColor: pmBorder || "hsl(var(--border))",
          }}>
            <span className="text-4xl">📜</span>
            <p className="mt-3 text-sm" style={{ color: pmMuted }}>
              {navFilter === "favorites" ? "Aucun psaume favori. Cliquez ❤️ sur un psaume pour l'ajouter." : "Aucun résultat."}
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // Reading view
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4"
      style={prayerMode ? { background: pmBg, margin: "-1rem", padding: "1rem", minHeight: "100vh" } : undefined}
    >
      {/* Back button */}
      <button
        onClick={() => { setSelectedChapter(null); setVerses([]); clearTransliterations(); setViewMode("hebrew"); }}
        className="flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:underline"
        style={{ color: prayerMode ? "#e8e0d0" : "hsl(var(--primary))" }}
      >
        ← Retour aux Psaumes
      </button>

      {/* View mode selector */}
      <ViewModeSelector mode={viewMode} onModeChange={setViewMode} loading={translitLoading} prayerMode={prayerMode} />

      {/* Controls */}
      <div className="rounded-2xl border p-4" style={{
        background: prayerMode ? pmCard : "hsl(var(--card))",
        borderColor: pmBorder || "hsl(var(--border))",
        boxShadow: prayerMode ? "none" : "var(--shadow-card)",
      }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: pmMuted }}>A-</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-sm font-bold" style={{ color: pmMuted }}>A+</span>
          <button
            onClick={() => toggleFav(selectedChapter)}
            className="ml-2 shrink-0 rounded-xl border px-3 py-1.5 text-sm cursor-pointer transition-all active:scale-95 bg-transparent"
            style={{ borderColor: pmBorder || "hsl(var(--border))" }}
          >
            {favorites.includes(selectedChapter) ? "❤️" : "🤍"}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: pmMuted }}>Chargement du psaume…</div>
      ) : (
        <div className="rounded-2xl border px-5 py-6 sm:px-8" style={{
          boxShadow: prayerMode ? "none" : "var(--shadow-card)",
          background: prayerMode ? "#0a0a0a" : "#FEFEFE",
          borderColor: pmBorder || "hsl(var(--border) / 0.5)",
        }}>
          <h4 className="text-center font-bold mb-0.5" style={{
            fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
            direction: "rtl",
            fontSize: `${fontSize + 2}px`,
            color: pmText,
          }}>
            {heTitle}
          </h4>
          <p className="text-center text-xs mb-6" style={{ color: pmMuted }}>Psaume {selectedChapter}</p>

          {/* Hebrew text */}
          {(viewMode === "hebrew" || viewMode === "bilingual") && (
            <div dir="rtl" className="hebrew-reading-block" style={{
              fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
              fontSize: `${fontSize}px`,
              lineHeight: 2.4,
              textAlign: "right",
              fontWeight: 600,
              color: prayerMode ? "#e8e0d0" : "#111",
            }}>
              {verses.map((verse, i) => (
                <span key={i}>
                  <span style={{ fontSize: `${Math.max(fontSize - 3, 14)}px`, marginInlineEnd: "5px", fontWeight: 700, color: "#888", verticalAlign: "baseline" }}>{toHebrewLetter(i + 1)}</span>
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
                </span>
              ))}
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
                transliterations.map((line, i) => (
                  <p key={i} className="mb-3">
                    <span className="font-bold mr-2" style={{ color: prayerMode ? "#888" : "hsl(var(--gold-matte))", fontSize: `${Math.max(fontSize - 2, 14)}px` }}>
                      {i + 1}.
                    </span>
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-center text-sm" style={{ color: pmMuted }}>
                  La phonétique n'est pas encore disponible pour ce psaume.
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${pmBorder || "hsl(var(--border))"}` }}>
            <button
              onClick={() => selectedChapter > 1 && setSelectedChapter(selectedChapter - 1)}
              disabled={selectedChapter <= 1}
              className="rounded-xl border px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 bg-transparent"
              style={{ borderColor: pmBorder || "hsl(var(--border))", color: pmText || "hsl(var(--foreground))" }}
            >
              ← Psaume {selectedChapter - 1}
            </button>
            <button
              onClick={() => selectedChapter < 150 && setSelectedChapter(selectedChapter + 1)}
              disabled={selectedChapter >= 150}
              className="rounded-xl border-none px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}
            >
              Psaume {selectedChapter + 1} →
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TehilimLibreWidget;
