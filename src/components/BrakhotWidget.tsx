import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BRAKHOT_DATA,
  COMPLEX_CASES,
  BIRKAT_HAMAZONE,
  BORE_NEFASHOT,
  type BrakhaItem,
  type BrakhaCategory,
} from "@/lib/brakhot-data";
import BirkatHamazoneReader from "./brakhot/BirkatHamazoneReader";
import BrakhaCard from "./brakhot/BrakhaCard";
import ComplexCasesSection from "./brakhot/ComplexCasesSection";

const FAVORITES_KEY = "calj_brakhot_favorites";

const loadFavorites = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
};

const BrakhotWidget = () => {
  const [searchText, setSearchText] = useState("");
  const [expandedBrakha, setExpandedBrakha] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [showBirkat, setShowBirkat] = useState(false);
  const [showComplex, setShowComplex] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "categories">("search");

  const q = searchText.toLowerCase().trim();

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Flatten all items for search
  const allItems = useMemo(() => {
    const items: (BrakhaItem & { catId: string; catLabel: string })[] = [];
    for (const cat of BRAKHOT_DATA) {
      for (const item of cat.items) {
        items.push({ ...item, catId: cat.id, catLabel: cat.label });
      }
    }
    return items;
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!q) return [];
    return allItems.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.rishona.transliteration.toLowerCase().includes(q) ||
        b.rishona.translation.toLowerCase().includes(q) ||
        b.keywords.some((kw) => kw.includes(q))
    );
  }, [q, allItems]);

  // Favorites items
  const favoriteItems = useMemo(() => {
    return allItems.filter((b) => favorites.includes(`${b.catId}-${b.name}`));
  }, [favorites, allItems]);

  // Suggestions as user types
  const suggestions = useMemo(() => {
    if (q.length < 1) return [];
    return allItems
      .filter((b) => b.keywords.some((kw) => kw.startsWith(q)) || b.name.toLowerCase().startsWith(q))
      .slice(0, 5);
  }, [q, allItems]);

  if (showBirkat) {
    return <BirkatHamazoneReader onBack={() => setShowBirkat(false)} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          🙌 Brakhot — Bénédictions
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Tapez un aliment pour trouver sa brakha avec le texte complet
        </p>
      </div>

      {/* Birkat HaMazone button */}
      <button
        onClick={() => setShowBirkat(true)}
        className="w-full rounded-2xl p-4 border-2 border-primary/20 cursor-pointer transition-all active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.03))" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍞</span>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Birkat HaMazone</p>
            <p className="text-[11px] text-muted-foreground">Bénédiction après le repas — 3 versions</p>
          </div>
          <span className="ml-auto text-muted-foreground">→</span>
        </div>
      </button>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Quel aliment ? (pomme, café, pain, chocolat...)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {/* Autocomplete suggestions */}
        {q && suggestions.length > 0 && !searchResults.some((r) => r.name.toLowerCase() === q) && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-10 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={`${s.catId}-${s.name}`}
                onClick={() => {
                  setSearchText(s.name);
                  setExpandedBrakha(`${s.catId}-${s.name}`);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 border-none bg-transparent cursor-pointer flex items-center gap-2 transition-colors"
              >
                <span>{s.icon}</span>
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{s.catLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      {!q && (
        <div className="flex gap-2">
          {[
            { id: "search" as const, label: "📂 Catégories" },
            { id: "categories" as const, label: "⭐ Favoris" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id === "search" ? "search" : "categories")}
              className="flex-1 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all"
              style={{
                background: activeTab === tab.id ? "hsl(var(--gold) / 0.12)" : "hsl(var(--muted))",
                color: activeTab === tab.id ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
              }}
            >
              {tab.label} {tab.id === "categories" && favorites.length > 0 && `(${favorites.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {q && searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="rounded-xl p-3 border border-primary/20" style={{ background: "hsl(var(--gold) / 0.06)" }}>
            <p className="text-xs font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
              ✨ {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""} pour « {searchText} »
            </p>
          </div>
          {searchResults.map((b) => (
            <BrakhaCard
              key={`${b.catId}-${b.name}`}
              item={b}
              catId={b.catId}
              isExpanded={expandedBrakha === `${b.catId}-${b.name}`}
              isFavorite={favorites.includes(`${b.catId}-${b.name}`)}
              onToggle={() => setExpandedBrakha(expandedBrakha === `${b.catId}-${b.name}` ? null : `${b.catId}-${b.name}`)}
              onToggleFavorite={() => toggleFavorite(`${b.catId}-${b.name}`)}
            />
          ))}
        </div>
      )}

      {q && searchResults.length === 0 && (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-muted-foreground mt-3">Aucune bénédiction trouvée pour « {searchText} »</p>
        </div>
      )}

      {/* Favorites tab */}
      {!q && activeTab === "categories" && (
        <div className="space-y-2">
          {favoriteItems.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center border border-border">
              <span className="text-3xl">⭐</span>
              <p className="text-sm text-muted-foreground mt-3">Appuyez sur l'étoile ⭐ d'une brakha pour l'ajouter en favori</p>
            </div>
          ) : (
            favoriteItems.map((b) => (
              <BrakhaCard
                key={`${b.catId}-${b.name}`}
                item={b}
                catId={b.catId}
                isExpanded={expandedBrakha === `${b.catId}-${b.name}`}
                isFavorite
                onToggle={() => setExpandedBrakha(expandedBrakha === `${b.catId}-${b.name}` ? null : `${b.catId}-${b.name}`)}
                onToggleFavorite={() => toggleFavorite(`${b.catId}-${b.name}`)}
              />
            ))
          )}
        </div>
      )}

      {/* Categories grid */}
      {!q && activeTab === "search" && (
        <div className="space-y-3">
          {BRAKHOT_DATA.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              expandedBrakha={expandedBrakha}
              favorites={favorites}
              onToggleBrakha={(key) => setExpandedBrakha(expandedBrakha === key ? null : key)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Complex cases */}
      {!q && (
        <div className="space-y-2">
          <button
            onClick={() => setShowComplex(!showComplex)}
            className="w-full rounded-2xl p-4 border border-border cursor-pointer transition-all bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                ⚖️ Cas complexes (Ikar vé-Tafel, cuisson…)
              </span>
              <span className="text-muted-foreground text-sm" style={{ transform: showComplex ? "rotate(180deg)" : "none" }}>▼</span>
            </div>
          </button>
          <AnimatePresence>
            {showComplex && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <ComplexCasesSection />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

// ---- Category Section ----
function CategorySection({
  category,
  expandedBrakha,
  favorites,
  onToggleBrakha,
  onToggleFavorite,
}: {
  category: BrakhaCategory;
  expandedBrakha: string | null;
  favorites: string[];
  onToggleBrakha: (key: string) => void;
  onToggleFavorite: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 border-none bg-transparent cursor-pointer text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-xl">{category.icon}</span>
          <span className="font-display text-sm font-bold text-foreground">{category.label}</span>
          <span className="text-[10px] text-muted-foreground font-medium">({category.items.length})</span>
        </span>
        <span className="text-muted-foreground text-sm transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {category.items.map((item) => {
                const key = `${category.id}-${item.name}`;
                return (
                  <BrakhaCard
                    key={key}
                    item={item}
                    catId={category.id}
                    isExpanded={expandedBrakha === key}
                    isFavorite={favorites.includes(key)}
                    onToggle={() => onToggleBrakha(key)}
                    onToggleFavorite={() => onToggleFavorite(key)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BrakhotWidget;
