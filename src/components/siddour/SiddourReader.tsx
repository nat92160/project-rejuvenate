import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { toHebrewLetter, isInstructionOnly } from "@/lib/utils";
import ViewModeSelector from "@/components/ViewModeSelector";
import type { ViewMode } from "@/hooks/useTransliteration";

/** Known liturgical openings matched without niqqud/html for robust detection. */
const KNOWN_OPENINGS = ["שמע ישראל", "אדני שפתי ת֤תח"];
const SHEMA_SECONDARY = "ברוך שם כבוד מלכותו לעולם ועד";

function normalizeHebrewMatch(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[׀־:.,;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isShemaSecondaryLine(html: string): boolean {
  return normalizeHebrewMatch(html).includes(SHEMA_SECONDARY);
}

/**
 * Detect the true liturgical start.
 * 1. Explicit sacred openings (Shema / Amida)
 * 2. First bold verse
 * 3. First non-instruction verse
 */
function findPrayerStartIndex(hebrew: string[]): number {
  let firstNonInstruction = -1;
  let firstBold = -1;

  for (let i = 0; i < hebrew.length; i++) {
    if (isInstructionOnly(hebrew[i])) continue;
    if (firstNonInstruction === -1) firstNonInstruction = i;

    const normalized = normalizeHebrewMatch(hebrew[i]);
    if (KNOWN_OPENINGS.some((opening) => normalized.includes(opening))) return i;
    if (firstBold === -1 && hebrew[i].includes("<b>")) firstBold = i;
  }

  if (firstBold >= 0) return firstBold;
  return firstNonInstruction >= 0 ? firstNonInstruction : 0;
}



interface SectionContent {
  hebrew?: string[];
  french?: string[];
  title: string;
  heTitle: string;
  isHazara?: boolean;
  phonetic?: string[];
}

interface SiddourReaderProps {
  content: SectionContent | null;
  loading: boolean;
  fontSize: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  transliterations: string[];
  translitLoading: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  prayerMode?: boolean;
}

const SiddourReader = ({
  content, loading, fontSize, viewMode, onViewModeChange,
  transliterations, translitLoading,
  onBack, onPrev, onNext, hasPrev, hasNext,
  isFavorite, onToggleFavorite,
  prayerMode = false,
}: SiddourReaderProps) => {
  const topRef = useRef<HTMLDivElement>(null);
  const prayerStartRef = useRef<HTMLSpanElement>(null);

  // Detect the real prayer start index (first <b> verse, or first non-instruction)
  const prayerStartIdx = useMemo(
    () => (content?.hebrew?.length) ? findPrayerStartIndex(content.hebrew) : 0,
    [content]
  );

  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  // Scroll to first actual prayer verse, skipping instructions
  useEffect(() => {
    if (!content) return;
    const timer = setTimeout(() => {
      if (prayerStartRef.current) {
        const y = prayerStartRef.current.getBoundingClientRect().top + window.scrollY - 20;
        window.scrollTo({ top: y, behavior: "auto" });
      } else if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <motion.div
      key="reader"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div ref={topRef} id="siddour-reader-top" />

      {/* Back + Favorite bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:underline"
          style={{ color: prayerMode ? "#e8e0d0" : "hsl(var(--primary))" }}
        >
          ← Sommaire
        </button>
        <button
          onClick={onToggleFavorite}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-transparent border cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: isFavorite ? "hsl(var(--gold) / 0.3)" : (pmBorder || "hsl(var(--border))"),
            color: isFavorite ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
          }}
        >
          <Star className="w-3 h-3" fill={isFavorite ? "currentColor" : "none"} />
          {isFavorite ? "Favori" : "Épingler"}
        </button>
      </div>

      {/* View mode selector */}
      <div className="mb-4">
        <ViewModeSelector mode={viewMode} onModeChange={onViewModeChange} loading={translitLoading} prayerMode={prayerMode} />
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: `hsl(var(--gold)) transparent transparent transparent` }} />
          <p className="text-sm mt-4" style={{ color: pmMuted }}>Chargement du texte…</p>
        </div>
      ) : content ? (
        <div
          className="rounded-2xl border px-5 py-6 sm:px-8"
          style={{
            boxShadow: prayerMode ? "none" : "0 2px 12px hsl(var(--foreground) / 0.06)",
            background: prayerMode ? "#0a0a0a" : "#FEFEFE",
            borderColor: pmBorder || "hsl(var(--border) / 0.5)",
          }}
        >
          {/* Title block - ornamental, 20px comfort margin top */}
          <div className="text-center mb-6 pb-4 pt-5" style={{ borderBottom: `1px solid ${pmBorder || "hsl(var(--gold) / 0.15)"}` }}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="block h-[1px] w-8" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.4))" }} />
              <span className="text-[10px]" style={{ color: "hsl(var(--gold) / 0.5)" }}>✦</span>
              <span className="block h-[1px] w-8" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.4))" }} />
            </div>
            <h4 className="font-display text-base font-bold" style={{ color: pmText }}>{content.title}</h4>
            <p
              className="mt-1"
              style={{
                fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
                fontSize: `${Math.min(fontSize + 2, 36)}px`,
                color: pmMuted,
              }}
            >
              {content.heTitle}
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="block h-[1px] w-8" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.4))" }} />
              <span className="text-[10px]" style={{ color: "hsl(var(--gold) / 0.5)" }}>✦</span>
              <span className="block h-[1px] w-8" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.4))" }} />
            </div>
          </div>

          {/* Hazara banner */}
          {content.isHazara && (
            <div
              className="flex items-center justify-center gap-2 mb-5 px-4 py-2.5 rounded-xl"
              style={{
                background: prayerMode ? "rgba(255,215,0,0.06)" : "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.03))",
                border: `1px solid ${prayerMode ? "rgba(255,215,0,0.15)" : "hsl(var(--gold) / 0.2)"}`,
              }}
            >
              <span className="text-xs">🔄</span>
              <p className="text-[11px] font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
                Hazarat HaChats — Répétition de la Amida par l'officiant
              </p>
            </div>
          )}

          {/* Hebrew text */}
          {viewMode === "hebrew" && (
            <div
              dir="rtl"
              className="hebrew-reading-block"
              style={{
                fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                fontSize: `${fontSize}px`,
                lineHeight: 2.4,
                textAlign: "right",
                fontWeight: 600,
                color: prayerMode ? "#e8e0d0" : "#111",
              }}
            >
              {(() => {
                let verseNum = 0;
                return (content.hebrew || []).map((verse, i) => {
                  const isPrayerStart = i === prayerStartIdx;
                  const isPrelude = i < prayerStartIdx;

                  if (isInstructionOnly(verse)) {
                    return (
                      <span
                        key={i}
                        className={isShemaSecondaryLine(verse) ? "verse-secondary" : "verse-instruction"}
                        dangerouslySetInnerHTML={{ __html: verse }}
                      />
                    );
                  }

                  if (isPrelude) {
                    return (
                      <span
                        key={i}
                        className="verse-prelude"
                        dangerouslySetInnerHTML={{ __html: verse }}
                      />
                    );
                  }

                  verseNum++;
                  return (
                    <span key={i} ref={isPrayerStart ? prayerStartRef : undefined}>
                      <span
                        style={{
                          fontSize: isPrayerStart ? `${fontSize + 8}px` : `${Math.max(fontSize - 3, 14)}px`,
                          marginInlineEnd: isPrayerStart ? "4px" : "5px",
                          fontWeight: isPrayerStart ? 800 : 700,
                          color: isPrayerStart
                            ? (prayerMode ? "#e8e0d0" : "hsl(var(--gold-matte))")
                            : "#888",
                          verticalAlign: "baseline",
                          lineHeight: 1,
                        }}
                      >
                        {toHebrewLetter(verseNum)}
                      </span>
                      <span
                        className={isPrayerStart ? "prayer-opening" : undefined}
                        dangerouslySetInnerHTML={{ __html: verse }}
                      />{" "}
                      {false && transliterations[i] && (
                        <p
                          dir="ltr"
                          className="my-2 leading-relaxed"
                          style={{
                            fontSize: `${Math.max(fontSize - 4, 13)}px`,
                            textAlign: "left",
                            fontWeight: 400,
                            color: prayerMode ? "#b8a87a" : "hsl(var(--gold-matte))",
                            fontFamily: "'Lora', serif",
                            fontStyle: "italic",
                          }}
                        >
                          {transliterations[i]}
                        </p>
                      )}
                      {false && content.french[i] && (
                        <p
                          dir="ltr"
                          className="my-1 leading-relaxed"
                          style={{
                            fontSize: `${Math.max(fontSize - 6, 12)}px`,
                            textAlign: "left",
                            fontWeight: 400,
                            color: prayerMode ? "#888" : "#666",
                            fontFamily: "'Lora', serif",
                            fontStyle: "italic",
                          }}
                          dangerouslySetInnerHTML={{ __html: content.french[i] }}
                        />
                      )}
                    </span>
                  );
                });
              })()}
            </div>
          )}

          {/* Phonetic only */}
          {viewMode === "phonetic" && (
            <div
              dir="ltr"
              style={{
                fontFamily: "'Lora', serif",
                fontSize: `${fontSize}px`,
                lineHeight: 2.2,
                textAlign: "left",
                fontWeight: 500,
                color: prayerMode ? "#e8e0d0" : "#222",
              }}
            >
              {translitLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm mt-3" style={{ color: pmMuted }}>Génération de la phonétique…</p>
                </div>
              ) : transliterations.length > 0 ? (
                (() => {
                  let verseNum = 0;
                  let firstFound = false;
                  return content.hebrew.map((verse, i) => {
                    if (isInstructionOnly(verse)) return null;
                    verseNum++;
                    if (!transliterations[i]) return null;
                    const isFirst = !firstFound;
                    if (isFirst) firstFound = true;
                    return (
                      <p key={i} className="mb-3">
                        <span
                          className="font-bold mr-2"
                          style={{
                            color: isFirst
                              ? (prayerMode ? "#e8e0d0" : "hsl(var(--gold-matte))")
                              : (prayerMode ? "#888" : "hsl(var(--gold-matte))"),
                            fontSize: isFirst
                              ? `${fontSize + 6}px`
                              : `${Math.max(fontSize - 2, 14)}px`,
                            fontWeight: isFirst ? 800 : 700,
                          }}
                        >
                          {toHebrewLetter(verseNum)}
                        </span>
                        {transliterations[i]}
                      </p>
                    );
                  });
                })()
              ) : (
                <p className="text-center text-sm" style={{ color: pmMuted }}>
                  La phonétique n'est pas encore disponible pour cette section.
                </p>
              )}
            </div>
          )}

          {/* Translation view */}
          {viewMode === "translation" && (
            <div
              dir="ltr"
              style={{
                fontFamily: "'Lora', serif",
                fontSize: `${Math.max(fontSize - 2, 14)}px`,
                lineHeight: 2,
                textAlign: "left",
                fontWeight: 400,
                color: prayerMode ? "#ccc" : "#333",
              }}
            >
              {content.french.length > 0 ? (
                content.french.map((verse, i) => (
                  verse && verse.trim() ? (
                    <p key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: verse }} />
                  ) : null
                ))
              ) : (
                <p className="text-center text-sm" style={{ color: pmMuted }}>
                  La traduction n'est pas encore disponible pour cette section.
                </p>
              )}
            </div>
          )}

          {/* Section separator ornament */}
          <div className="flex items-center justify-center gap-4 mt-6 mb-4">
            <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.2))" }} />
            <span className="text-[10px]" style={{ color: "hsl(var(--gold) / 0.35)" }}>◈</span>
            <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.2))" }} />
          </div>

          {/* Section navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-30 bg-transparent transition-all active:scale-95"
              style={{
                borderColor: pmBorder || "hsl(var(--border))",
                color: pmText || "hsl(var(--foreground))",
              }}
            >
              ← Précédent
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="rounded-xl border-none px-4 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-30 text-primary-foreground transition-all active:scale-95"
              style={{ background: "var(--gradient-gold)" }}
            >
              Suivant →
            </button>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-sm" style={{ color: pmMuted }}>
          Erreur de chargement.
        </div>
      )}
    </motion.div>
  );
};

export default SiddourReader;
