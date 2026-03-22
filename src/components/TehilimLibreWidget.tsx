import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const TOTAL_PSALMS = 150;
const CACHE_PREFIX = "tehilim_libre_";
const FAV_KEY = "tehilim_favorites";

const loadFavorites = (): number[] => {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const TehilimLibreWidget = () => {
  const [search, setSearch] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<string[]>([]);
  const [heTitle, setHeTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(22);
  const [favorites, setFavorites] = useState<number[]>(loadFavorites);
  const [showFavOnly, setShowFavOnly] = useState(false);

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
  }, []);

  useEffect(() => {
    if (selectedChapter !== null) fetchChapter(selectedChapter);
  }, [selectedChapter, fetchChapter]);

  const filteredChapters = useMemo(() => {
    let chapters = Array.from({ length: TOTAL_PSALMS }, (_, i) => i + 1);
    if (showFavOnly) chapters = chapters.filter((ch) => favorites.includes(ch));
    if (search.trim()) {
      const num = parseInt(search, 10);
      if (!isNaN(num) && num >= 1 && num <= 150) {
        chapters = chapters.filter((ch) => ch === num);
      }
    }
    return chapters;
  }, [search, showFavOnly, favorites]);

  // Psalm grid view
  if (selectedChapter === null) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
          <span className="text-3xl">📜</span>
          <h3 className="mt-2 font-display text-lg font-bold text-foreground">Livre de Tehilim</h3>
          <p className="mt-1 text-xs text-muted-foreground">Lecture libre — 150 Psaumes</p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min={1}
              max={150}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un psaume (1-150)…"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
          </div>
          <button
            onClick={() => setShowFavOnly(!showFavOnly)}
            className="shrink-0 rounded-xl border px-4 py-2 text-sm font-bold cursor-pointer transition-all active:scale-95"
            style={{
              borderColor: showFavOnly ? "hsl(var(--gold-matte))" : "hsl(var(--border))",
              background: showFavOnly ? "hsl(var(--gold) / 0.1)" : "transparent",
              color: showFavOnly ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
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
                  borderColor: isFav ? "hsl(var(--gold-matte) / 0.4)" : "hsl(var(--border))",
                  background: isFav ? "hsl(var(--gold) / 0.06)" : "hsl(var(--card))",
                  boxShadow: "var(--shadow-card)",
                }}
                whileTap={{ scale: 0.93 }}
              >
                <span className="font-display text-base font-bold text-foreground">{ch}</span>
                {isFav && <span className="absolute top-1 right-1 text-[8px]">❤️</span>}
              </motion.button>
            );
          })}
        </div>

        {filteredChapters.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-4xl">📜</span>
            <p className="mt-3 text-sm text-muted-foreground">
              {showFavOnly ? "Aucun psaume favori. Cliquez ❤️ sur un psaume pour l'ajouter." : "Aucun résultat."}
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // Reading view
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => { setSelectedChapter(null); setVerses([]); }}
        className="flex items-center gap-2 text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline"
      >
        ← Retour aux Psaumes
      </button>

      {/* Controls */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">A-</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-sm font-bold text-muted-foreground">A+</span>
          <button
            onClick={() => toggleFav(selectedChapter)}
            className="ml-2 shrink-0 rounded-xl border border-border px-3 py-1.5 text-sm cursor-pointer transition-all active:scale-95 bg-transparent"
          >
            {favorites.includes(selectedChapter) ? "❤️" : "🤍"}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Chargement du psaume…</div>
      ) : (
        <div className="rounded-2xl border border-border p-6 px-7" style={{ boxShadow: "var(--shadow-card)", background: "#FDFDFD" }}>
          <h4 className="text-center text-lg font-bold text-foreground mb-1" style={{ fontFamily: "'Frank Ruhl Libre', serif", direction: "rtl" }}>
            {heTitle}
          </h4>
          <p className="text-center text-xs text-muted-foreground mb-5">Psaume {selectedChapter}</p>

          <div dir="rtl" style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: `${fontSize}px`, lineHeight: 2, textAlign: "justify" }} className="text-foreground">
            {verses.map((verse, i) => (
              <span key={i}>
                <span className="text-muted-foreground/40 font-bold" style={{ fontSize: `${Math.max(fontSize - 6, 11)}px`, marginInlineEnd: "4px" }}>{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
              </span>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <button
              onClick={() => selectedChapter > 1 && setSelectedChapter(selectedChapter - 1)}
              disabled={selectedChapter <= 1}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 bg-transparent text-foreground"
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
