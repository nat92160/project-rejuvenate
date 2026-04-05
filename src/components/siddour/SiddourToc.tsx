import { useState } from "react";
import { motion } from "framer-motion";
import { Star, BookOpen } from "lucide-react";
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
  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: `hsl(var(--gold)) transparent transparent transparent` }} />
        <p className="text-sm mt-4" style={{ color: pmMuted }}>Chargement du sommaire…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Favorites */}
      {favorites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--gold-matte))" }} fill="hsl(var(--gold-matte))" />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--gold-matte))" }}>
              Mes favoris
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {favorites.map((fav) => (
              <button
                key={`${fav.office}-${fav.sectionIndex}`}
                onClick={() => onSelect(fav.sectionIndex)}
                className="shrink-0 rounded-xl px-3.5 py-2.5 text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: prayerMode ? "rgba(255,215,0,0.08)" : "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.03))",
                  border: `1px solid ${prayerMode ? "rgba(255,215,0,0.15)" : "hsl(var(--gold) / 0.2)"}`,
                }}
              >
                <p className="text-[11px] font-bold truncate max-w-[120px]" style={{ color: pmText }}>{fav.title}</p>
                <p className="text-[10px] mt-0.5" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted }}>{fav.heTitle}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          <span className="block h-[1px] w-12" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.4))" }} />
          <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />
          <span className="block h-[1px] w-12" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.4))" }} />
        </div>
        <p className="text-[10px]" style={{ color: pmMuted }}>{sections.length} sections</p>
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{
          background: prayerMode ? pmCard : "hsl(var(--card))",
          borderColor: pmBorder || "hsl(var(--border))",
        }}>
          <span className="text-4xl">📖</span>
          <p className="mt-3 text-sm" style={{ color: pmMuted }}>Aucune section disponible.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sections.map((sec, i) => {
            const isFav = isFavorite(office, sec.index);
            return (
              <motion.div
                key={sec.index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="flex items-center gap-1"
              >
                <button
                  onClick={() => onSelect(sec.index)}
                  className="flex-1 flex items-center gap-3 rounded-xl border px-4 py-3 text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background: prayerMode ? pmCard : "hsl(var(--card))",
                    borderColor: pmBorder || "hsl(var(--border) / 0.5)",
                    boxShadow: prayerMode ? "none" : "0 1px 3px hsl(var(--foreground) / 0.04)",
                  }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold" style={{
                    background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
                    color: "hsl(var(--gold-matte))",
                    border: "1px solid hsl(var(--gold) / 0.15)",
                  }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13px] font-bold leading-tight" style={{ color: pmText }}>
                      {sec.title}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted }}>
                      {sec.heTitle}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.4)" }}>›</span>
                </button>
                <button
                  onClick={() => onFavoriteTap({ office, sectionIndex: sec.index, title: sec.title, heTitle: sec.heTitle })}
                  className="shrink-0 p-2 rounded-lg bg-transparent border-none cursor-pointer transition-all hover:scale-110 active:scale-90"
                >
                  <Star
                    className="w-3.5 h-3.5"
                    style={{ color: isFav ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground) / 0.3)") }}
                    fill={isFav ? "hsl(var(--gold-matte))" : "none"}
                  />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom ornament */}
      <div className="flex items-center justify-center gap-4 pt-2 pb-1">
        <span className="block h-[1px] w-16" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.3))" }} />
        <span className="text-xs" style={{ color: "hsl(var(--gold) / 0.4)" }}>✦</span>
        <span className="block h-[1px] w-16" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.3))" }} />
      </div>
    </div>
  );
};

export default SiddourToc;
