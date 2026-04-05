import { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { toHebrewLetter, isInstructionOnly } from "@/lib/utils";
import ViewModeSelector from "@/components/ViewModeSelector";
import LiturgicalContextBar from "@/components/siddour/LiturgicalContextBar";
import { getLiturgicalContext, processAmidaVerses, type LiturgicalPeriod } from "@/lib/liturgicalContext";
import type { ViewMode } from "@/hooks/useTransliteration";

const SIDDOUR_VIEW_OPTIONS: { key: ViewMode; label: string; icon: string }[] = [
  { key: "hebrew", label: "Hébreu", icon: "🔤" },
  { key: "phonetic", label: "Phonétique", icon: "🗣️" },
  { key: "translation", label: "Traduction", icon: "🌍" },
];

const KNOWN_OPENINGS = ["שמע ישראל", "אדני שפתי תפתח"];
const SHEMA_SECONDARY = "ברוך שם כבוד מלכותו לעולם ועד";

function isAmidaSection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes("amida") || lower.includes("עמידה") || lower.includes("amidah");
}

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
  he: string[];
  en: string[];
  phonetic: string[];
  title: string;
  heTitle: string;
}

interface SiddourReaderProps {
  content: SectionContent | null;
  loading: boolean;
  fontSize: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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
  onBack, onPrev, onNext, hasPrev, hasNext,
  isFavorite, onToggleFavorite,
  prayerMode = false,
}: SiddourReaderProps) => {
  const topRef = useRef<HTMLDivElement>(null);
  const prayerStartRef = useRef<HTMLSpanElement>(null);

  const [litContext, setLitContext] = useState<LiturgicalPeriod>(() => getLiturgicalContext());
  const showAmidaContext = content ? isAmidaSection(content.title) : false;

  const processedVerses = useMemo(() => {
    if (!content || !showAmidaContext) return null;
    return processAmidaVerses(content.he, litContext);
  }, [content, showAmidaContext, litContext]);

  const prayerStartIdx = useMemo(
    () => content ? findPrayerStartIndex(content.he) : 0,
    [content]
  );

  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

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

      {showAmidaContext && (
        <div className="mb-4">
          <LiturgicalContextBar
            context={litContext}
            onContextChange={setLitContext}
            prayerMode={prayerMode}
          />
        </div>
      )}

      <div className="mb-4">
        <ViewModeSelector mode={viewMode} onModeChange={onViewModeChange} options={SIDDOUR_VIEW_OPTIONS} prayerMode={prayerMode} />
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
                return content.he.map((verse, i) => {
                  const processed = processedVerses?.[i];
                  const renderedVerse = processed?.html ?? verse;
                  const isInstruction = processed?.isInstruction ?? isInstructionOnly(verse);
                  const isSeasonalInactive = Boolean(processed && !processed.isActive && !processed.isInstruction);
                  const isSeasonalMarker = Boolean(processed?.isSeasonalMarker);
                  const isPrayerStart = i === prayerStartIdx;
                  const isPrelude = i < prayerStartIdx;

                  if (isSeasonalMarker && processed && !processed.isActive) return null;
                  if (isSeasonalInactive) return null;

                  if (isInstruction) {
                    if (isSeasonalMarker && processed?.isActive) {
                      return (
                        <span
                          key={i}
                          className="block text-center my-3"
                          dir="ltr"
                        >
                          <span
                            className="inline-block rounded-full px-3 py-1 text-[11px] font-bold"
                            style={{
                              background: "hsl(var(--gold) / 0.10)",
                              color: "hsl(var(--gold-matte))",
                              border: "1px solid hsl(var(--gold) / 0.18)",
                            }}
                            dangerouslySetInnerHTML={{ __html: renderedVerse.replace(/<\/?small>/g, '') }}
                          />
                        </span>
                      );
                    }

                    return (
                      <span
                        key={i}
                        className={isShemaSecondaryLine(renderedVerse) ? "verse-secondary" : "verse-instruction"}
                        dangerouslySetInnerHTML={{ __html: renderedVerse }}
                      />
                    );
                  }

                  if (isPrelude) {
                    const isLastPrelude = (i + 1 >= prayerStartIdx);
                    return (
                      <span key={i}>
                        <span
                          className="verse-prelude"
                          dangerouslySetInnerHTML={{ __html: renderedVerse }}
                        />
                        {isLastPrelude && (
                          <span className="block my-4 flex items-center justify-center gap-3" dir="ltr">
                            <span className="block h-[1px] w-16" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.3))" }} />
                            <span style={{ color: "hsl(var(--gold) / 0.4)", fontSize: "10px" }}>✦</span>
                            <span className="block h-[1px] w-16" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.3))" }} />
                          </span>
                        )}
                      </span>
                    );
                  }

                  verseNum++;

                  const activeSeasonalStyle: React.CSSProperties = (processed && processed.isActive && !processed.isSeasonalMarker && processedVerses?.[i - 1]?.isSeasonalMarker)
                    ? { background: "hsl(var(--gold) / 0.06)", borderRadius: "8px", padding: "4px 8px", borderRight: "3px solid hsl(var(--gold) / 0.3)" }
                    : {};

                  return (
                    <span key={i} ref={isPrayerStart ? prayerStartRef : undefined} style={activeSeasonalStyle}>
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
                        dangerouslySetInnerHTML={{ __html: renderedVerse }}
                      />{" "}
                    </span>
                  );
                });
              })()}
            </div>
          )}

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
              {content.phonetic.length > 0 ? (
                (() => {
                  let verseNum = 0;
                  let firstFound = false;
                  return content.he.map((verse, i) => {
                    if (isInstructionOnly(verse)) return null;
                    verseNum++;
                    if (!content.phonetic[i]) return null;
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
                        {content.phonetic[i]}
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

          {viewMode === "translation" && (
            <div
              dir="ltr"
              style={{
                fontFamily: "'Lora', serif",
                fontSize: `${Math.max(fontSize - 2, 16)}px`,
                lineHeight: 2,
                textAlign: "left",
                fontWeight: 500,
                color: prayerMode ? "#e8e0d0" : "#222",
              }}
            >
              {content.en.length > 0 ? (
                content.en.map((paragraph, index) => (
                  <p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: paragraph }} />
                ))
              ) : (
                <p className="text-center text-sm" style={{ color: pmMuted }}>
                  La traduction n'est pas disponible pour cette section.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mt-6 mb-4">
            <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.2))" }} />
            <span className="text-[10px]" style={{ color: "hsl(var(--gold) / 0.35)" }}>◈</span>
            <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.2))" }} />
          </div>

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
