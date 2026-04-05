import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, BookOpen, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import type { SiddourFavorite } from "@/hooks/useSiddourFavorites";

interface Section {
  index: number;
  title: string;
  heTitle: string;
  isHazara?: boolean;
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

/**
 * Detect logical groups in a list of sections.
 * Uses title patterns (Arvit, Cha'harit, Min'ha, Moussaf, etc.)
 * and returns grouped sections for easier navigation.
 */
function groupSections(sections: Section[], office: string): { label: string; sections: Section[] }[] {
  // Only group for offices with many sections (shabbat, etc.)
  if (sections.length <= 10 || office === "shabbat_special") {
    return [{ label: "", sections }];
  }

  if (office === "shabbat") {
    const groups: { label: string; sections: Section[] }[] = [];
    let currentGroup: { label: string; sections: Section[] } = { label: "🕯️ Préparation & Kabbalat Chabbat", sections: [] };

    for (const sec of sections) {
      const t = sec.title.toLowerCase();
      if (t.includes("chalom alékhem") || t.includes("échèt") || t.includes("atkinou") || t.includes("kiddouch du vendredi") || t.includes("birkat habanim") || t.includes("séouda richona") || t.includes("zohar") || t.includes("chants de chabbat")) {
        if (currentGroup.label !== "🍷 Séder du vendredi soir") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🍷 Séder du vendredi soir", sections: [] };
        }
      } else if (t.includes("psaumes de chabbat") || t.includes("pessouké dézimra (chabbat)") || t.includes("chéma (cha'harit") || t.includes("amida cha'harit de chabbat") || t.includes("répétition") && t.includes("cha'harit chabbat") || t.includes("kériat hatorah (chabbat)") || t.includes("hagomel") || t.includes("haftara") || t.includes("birkat ha'hodech") || t.includes("mi chébérakh") || t.includes("achré (chabbat)")) {
        if (currentGroup.label !== "🌅 Cha'harit de Chabbat") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🌅 Cha'harit de Chabbat", sections: [] };
        }
      } else if (t.includes("moussaf") || (t.includes("amida du moussaf") || (t.includes("répétition") && t.includes("moussaf")) || t.includes("pitoum hakétoret (moussaf)") || t.includes("alénou (moussaf)"))) {
        if (currentGroup.label !== "📜 Moussaf") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "📜 Moussaf", sections: [] };
        }
      } else if (t.includes("séouda chnia") || t.includes("kiddouch du jour")) {
        if (currentGroup.label !== "🍽️ Repas de Chabbat") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🍽️ Repas de Chabbat", sections: [] };
        }
      } else if (t.includes("korbanot (min'ha") || t.includes("ouva létsion (chabbat)") || t.includes("amida min'ha de chabbat") || (t.includes("répétition") && t.includes("min'ha chabbat")) || t.includes("alénou (min'ha")) {
        if (currentGroup.label !== "🌇 Min'ha de Chabbat") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🌇 Min'ha de Chabbat", sections: [] };
        }
      } else if (t.includes("séouda chlichit")) {
        if (currentGroup.label !== "🍽️ Séouda Chlichit") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🍽️ Séouda Chlichit", sections: [] };
        }
      } else if (t.includes("havdala") || t.includes("motsaé") || t.includes("vayitèn") || t.includes("mélavé")) {
        if (currentGroup.label !== "✨ Havdala & Motsaé Chabbat") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "✨ Havdala & Motsaé Chabbat", sections: [] };
        }
      }
      currentGroup.sections.push(sec);
    }
    if (currentGroup.sections.length > 0) groups.push(currentGroup);
    return groups;
  }

  // For shacharit, basic grouping
  if (office === "shacharit" && sections.length > 15) {
    const groups: { label: string; sections: Section[] }[] = [];
    let currentGroup: { label: string; sections: Section[] } = { label: "🌅 Préparation", sections: [] };

    for (const sec of sections) {
      const t = sec.title.toLowerCase();
      if (t.includes("hodou") || t.includes("pessouké")) {
        if (currentGroup.label !== "🎵 Pessouké Dézimra") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🎵 Pessouké Dézimra", sections: [] };
        }
      } else if (t.includes("chéma")) {
        if (currentGroup.label !== "📜 Chéma & Amida") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "📜 Chéma & Amida", sections: [] };
        }
      } else if (t.includes("vidouï") || t.includes("kériat hatorah") || t.includes("achré") || t.includes("ouva létsion") || t.includes("beit yaakov") || t.includes("chir chel") || t.includes("kavé") || t.includes("alénou")) {
        if (currentGroup.label !== "🏁 Conclusion") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "🏁 Conclusion", sections: [] };
        }
      } else if (t.includes("13 principes") || t.includes("10 zékhirot")) {
        if (currentGroup.label !== "📖 Ajouts") {
          if (currentGroup.sections.length > 0) groups.push(currentGroup);
          currentGroup = { label: "📖 Ajouts", sections: [] };
        }
      }
      currentGroup.sections.push(sec);
    }
    if (currentGroup.sections.length > 0) groups.push(currentGroup);
    return groups;
  }

  return [{ label: "", sections }];
}

const SiddourToc = ({
  sections, loading, onSelect, favorites, isFavorite, onFavoriteTap, office, prayerMode = false,
}: SiddourTocProps) => {
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  const groups = useMemo(() => groupSections(sections, office), [sections, office]);
  const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0].label !== "");

  // Track which groups are collapsed (default: all expanded)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: `hsl(var(--gold)) transparent transparent transparent` }} />
        <p className="text-sm mt-4" style={{ color: pmMuted }}>Chargement du sommaire…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3 px-1">
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

      {/* Ornamental header */}
      <div className="text-center py-3">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="block h-[1px] w-12" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.4))" }} />
          <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />
          <span className="block h-[1px] w-12" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.4))" }} />
        </div>
        <h4 className="font-display text-sm font-bold tracking-wide" style={{ color: pmText }}>Table des Matières</h4>
        <p className="text-[10px] mt-1" style={{ color: pmMuted }}>{sections.length} sections</p>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{
          background: prayerMode ? pmCard : "hsl(var(--card))",
          borderColor: pmBorder || "hsl(var(--border))",
        }}>
          <span className="text-4xl">📖</span>
          <p className="mt-3 text-sm" style={{ color: pmMuted }}>Aucune section disponible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, gi) => {
            const isCollapsed = group.label ? collapsed[group.label] : false;
            return (
              <div key={gi}>
                {/* Group header (only if groups exist) */}
                {group.label && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 mb-1.5 rounded-xl border-none cursor-pointer transition-all active:scale-[0.98]"
                    style={{
                      background: prayerMode ? "rgba(255,215,0,0.06)" : "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
                    }}
                  >
                    <span className="text-[12px] font-bold" style={{ color: prayerMode ? "#d4c8a0" : "hsl(var(--gold-matte))" }}>
                      {group.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
                        {group.sections.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }} />
                      )}
                    </div>
                  </button>
                )}

                {/* Section items */}
                {!isCollapsed && (
                  <div className="space-y-1.5">
                    {group.sections.map((sec, i) => {
                      const isFav = isFavorite(office, sec.index);
                      const isHazara = sec.isHazara;
                      return (
                        <motion.div
                          key={sec.index}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-1"
                        >
                          <button
                            onClick={() => onSelect(sec.index)}
                            className="flex-1 flex items-center gap-3.5 rounded-xl border px-4 py-3 text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                            style={{
                              background: isHazara
                                ? (prayerMode ? "rgba(255,215,0,0.04)" : "linear-gradient(135deg, hsl(var(--gold) / 0.06), transparent)")
                                : (prayerMode ? pmCard : "hsl(var(--card))"),
                              borderColor: isHazara
                                ? (prayerMode ? "rgba(255,215,0,0.12)" : "hsl(var(--gold) / 0.2)")
                                : (pmBorder || "hsl(var(--border) / 0.5)"),
                              boxShadow: prayerMode ? "none" : "0 1px 3px hsl(var(--foreground) / 0.04)",
                            }}
                          >
                            {/* Chapter number or Hazara icon */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{
                              background: isHazara
                                ? "linear-gradient(135deg, hsl(var(--gold) / 0.2), hsl(var(--gold) / 0.08))"
                                : "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
                              color: "hsl(var(--gold-matte))",
                              border: "1px solid hsl(var(--gold) / 0.15)",
                            }}>
                              {isHazara ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                sec.index + 1
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-[13px] font-bold leading-tight" style={{ color: pmText }}>
                                {sec.title}
                              </p>
                              <p className="text-[11px] mt-0.5 leading-tight" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted }}>
                                {sec.heTitle}
                              </p>
                              {isHazara && (
                                <span
                                  className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: prayerMode ? "rgba(255,215,0,0.1)" : "hsl(var(--gold) / 0.1)",
                                    color: "hsl(var(--gold-matte))",
                                  }}
                                >
                                  Hazara — Répétition
                                </span>
                              )}
                            </div>
                            <span className="text-xs" style={{ color: pmMuted || "hsl(var(--muted-foreground) / 0.4)" }}>›</span>
                          </button>
                          {/* Favorite star */}
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
              </div>
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
