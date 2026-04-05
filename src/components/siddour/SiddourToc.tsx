import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { SiddourFavorite } from "@/hooks/useSiddourFavorites";

interface Section {
  index: number;
  title: string;
  heTitle: string;
}

interface SiddourTocProps {
  sections: Section[];
  loading: boolean;
  onSelect: (index: number) => void;
  favorites: SiddourFavorite[];
  isFavorite: (office: string, index: number) => boolean;
  onFavoriteTap: (fav: SiddourFavorite) => void;
  office: string;
  prayerMode?: boolean;
}

const SiddourToc = ({
  sections, loading, onSelect, favorites, isFavorite, onFavoriteTap, office, prayerMode = false,
}: SiddourTocProps) => {
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.06)" : undefined;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: `hsl(var(--gold)) transparent transparent transparent` }} />
        <p className="text-xs mt-3" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}>Chargement…</p>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}>Aucune section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Favorites — minimal horizontal chips */}
      {favorites.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 px-0.5" style={{ color: "hsl(var(--gold-matte) / 0.7)" }}>
            Favoris
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {favorites.map((fav) => (
              <button
                key={`${fav.office}-${fav.sectionIndex}`}
                onClick={() => onSelect(fav.sectionIndex)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border"
                style={{
                  background: "transparent",
                  borderColor: prayerMode ? "rgba(255,215,0,0.15)" : "hsl(var(--gold) / 0.2)",
                  color: pmText || "hsl(var(--foreground) / 0.8)",
                }}
              >
                {fav.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section count */}
      <div className="flex items-center gap-3 px-0.5">
        <span className="block h-[1px] flex-1" style={{ background: pmBorder || "hsl(var(--border))" }} />
        <span className="text-[9px] font-medium tracking-wider" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.4)" }}>
          {sections.length} sections
        </span>
        <span className="block h-[1px] flex-1" style={{ background: pmBorder || "hsl(var(--border))" }} />
      </div>

      {/* Sections — clean list */}
      <div className="space-y-px">
        {sections.map((sec, i) => {
          const isFav = isFavorite(office, sec.index);
          return (
            <motion.div
              key={sec.index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              className="flex items-center group"
            >
              <button
                onClick={() => onSelect(sec.index)}
                className="flex-1 flex items-center gap-3 py-3 px-2 text-left cursor-pointer transition-colors rounded-lg"
                style={{
                  background: "transparent",
                }}
              >
                <span
                  className="text-[10px] font-medium w-5 text-center shrink-0"
                  style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.35)" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug" style={{ color: pmText || "hsl(var(--foreground))" }}>
                    {sec.title}
                  </p>
                  <p
                    className="text-[11px] mt-0.5 leading-snug"
                    style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted || "hsl(var(--muted-foreground) / 0.5)" }}
                  >
                    {sec.heTitle}
                  </p>
                </div>
                <span className="text-[10px] opacity-30 group-hover:opacity-60 transition-opacity" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>›</span>
              </button>
              <button
                onClick={() => onFavoriteTap({ office, sectionIndex: sec.index, title: sec.title, heTitle: sec.heTitle })}
                className="shrink-0 p-2 bg-transparent border-none cursor-pointer transition-all hover:scale-110 active:scale-90 opacity-40 hover:opacity-100"
                style={{ opacity: isFav ? 1 : undefined }}
              >
                <Star
                  className="w-3 h-3"
                  style={{ color: isFav ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground) / 0.3)") }}
                  fill={isFav ? "hsl(var(--gold-matte))" : "none"}
                />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SiddourToc;
