import { forwardRef, useMemo } from "react";
import { isInstructionOnly } from "@/lib/utils";
import type { FullSection } from "@/hooks/useSiddourFullOffice";
import SiddourSectionTranslation from "./SiddourSectionTranslation";
import SiddourSectionCommentary from "./SiddourSectionCommentary";
import SiddourSectionNotes from "./SiddourSectionNotes";
import { getLiturgicalContext, processAmidaVerses } from "@/lib/liturgicalContext";
import { detectPeriod, getNotesForVerse } from "@/lib/siddourLiturgicalNotes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SiddourRite } from "@/hooks/useSiddourRite";

interface Props {
  sections: FullSection[];
  fontSize: number;
  onSectionVisible?: (index: number) => void;
  registerSectionRef: (index: number, el: HTMLElement | null) => void;
  rite: SiddourRite;
  office: string;
  /** Indices des sections à traduire automatiquement (déclenché par "Tout traduire") */
  autoTranslateIndices?: Set<number>;
  /** Naviguer vers la section index dans la liste */
  onJumpToSection?: (index: number) => void;
}

function normalizeHebrewMatch(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[׀־:.,;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isInternalSectionTitle(html: string): boolean {
  const trimmed = html.trim();
  if (/^<big><b>.*<\/b><\/big>$/.test(trimmed)) {
    const text = normalizeHebrewMatch(trimmed);
    return text.length >= 2 && text.length <= 80;
  }
  if (trimmed.startsWith("<b>") && trimmed.endsWith("</b>") && !trimmed.includes("<small>")) {
    const text = normalizeHebrewMatch(trimmed);
    return text.length >= 2 && text.length <= 80;
  }
  return false;
}

const SHEMA_SECONDARY = "ברוך שם כבוד מלכותו לעולם ועד";
function isShemaSecondaryLine(html: string): boolean {
  return normalizeHebrewMatch(html).includes(SHEMA_SECONDARY);
}

const SiddourBookReader = forwardRef<HTMLDivElement, Props>(
  ({ sections, fontSize, registerSectionRef, rite, office, autoTranslateIndices, onJumpToSection }, ref) => {
    const period = useMemo(() => detectPeriod(new Date(), false), []);
    const liturgicalContext = useMemo(() => getLiturgicalContext(), []);
    const processedSections = useMemo(
      () => sections.map((sec) => processAmidaVerses(sec.hebrew, liturgicalContext)),
      [sections, liturgicalContext]
    );
    return (
      <div ref={ref} className="space-y-12 pb-32">
        {sections.map((sec, sIdx) => {
          const processedVerses = processedSections[sIdx];
          return (
            <section
            key={`${sec.index}-${sec.title}`}
            id={`sec-${sIdx}`}
            ref={(el) => registerSectionRef(sIdx, el)}
            className="scroll-mt-24"
          >
            {/* Hero bilingue style affiche */}
            <header className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.55))" }} />
                <span className="text-sm" style={{ color: "hsl(var(--gold) / 0.7)" }}>✦</span>
                <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.55))" }} />
              </div>
              <h2
                className="font-display font-bold uppercase tracking-[0.15em] text-base sm:text-xl"
                style={{ color: "hsl(var(--primary))", letterSpacing: "0.15em" }}
              >
                {sec.title}
              </h2>
              <p className="mt-2" style={{
                fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                fontSize: `${Math.min(fontSize + 8, 40)}px`,
                color: "hsl(var(--gold-matte))",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}>
                {sec.heTitle}
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.55))" }} />
                <span className="text-xs" style={{ color: "hsl(var(--gold) / 0.7)" }}>❦</span>
                <span className="block h-[1px] flex-1 max-w-[80px]" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.55))" }} />
              </div>
              {sec.isHazara && (
                <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full"
                  style={{ background: "hsl(var(--gold) / 0.08)", border: "1px solid hsl(var(--gold) / 0.25)" }}>
                  <span className="text-xs">🔄</span>
                  <span className="text-[11px] font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
                    Hazarat HaChats
                  </span>
                </div>
              )}
            </header>

            {/* Texte hébreu */}
            <div
              dir="rtl"
              className="px-4 sm:px-6"
              style={{
                fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                fontSize: `${fontSize}px`,
                textAlign: "center",
                fontWeight: 600,
                color: "#111",
                fontFeatureSettings: "'kern', 'mark', 'mkmk'",
              }}
            >
              {sec.hebrew.length === 0 && (
                <p className="text-center text-sm italic" style={{ color: "hsl(var(--muted-foreground))", fontFamily: "'Lora', serif" }}>
                  Texte indisponible pour ce rite.
                </p>
              )}
              {sec.hebrew.map((verse, i) => {
                const processed = processedVerses?.[i];
                if (processed) {
                  if (!processed.isActive || processed.isSeasonalMarker) return null;
                  verse = processed.html;
                }
                const inlineNotes = getNotesForVerse(verse, rite, period);
                const noteNode = inlineNotes.length > 0 ? (
                  <SiddourSectionNotes key={`notes-${i}`} notes={inlineNotes} compact />
                ) : null;
                if (isInternalSectionTitle(verse)) {
                  const titleText = normalizeHebrewMatch(verse);
                  return (
                    <div key={i}>
                      {noteNode}
                      <h3 className="my-6 text-center font-bold"
                        style={{
                          fontFamily: "'Noto Serif Hebrew', serif",
                          fontSize: `${Math.min(fontSize + 2, 32)}px`,
                          color: "hsl(var(--gold-matte))",
                          lineHeight: 1.4,
                        }}>
                        {titleText}
                      </h3>
                    </div>
                  );
                }
                if (isInstructionOnly(verse)) {
                  if (isShemaSecondaryLine(verse)) {
                    return (
                      <div key={i}>
                        {noteNode}
                        <div style={{ marginBottom: "0.75rem", lineHeight: 1.8 }}
                          dangerouslySetInnerHTML={{ __html: verse }} />
                      </div>
                    );
                  }
                  return noteNode;
                }
                return (
                  <div key={i}>
                    {noteNode}
                    <p style={{ marginBottom: "1.1rem", lineHeight: 2.4 }}
                      dangerouslySetInnerHTML={{ __html: verse }} />
                  </div>
                );
              })}
            </div>

            {/* Traduction française à la demande */}
            <SiddourSectionTranslation
              rite={rite}
              office={office}
              sectionIndex={sIdx}
              sectionTitle={sec.title}
              hebrew={sec.hebrew}
              fontSize={fontSize}
              autoTranslate={autoTranslateIndices?.has(sIdx)}
            />

            {/* Commentaire d'étude IA à la demande */}
            <SiddourSectionCommentary
              rite={rite}
              office={office}
              sectionIndex={sIdx}
              sectionTitle={sec.title}
              hebrew={sec.hebrew}
            />

            {/* Navigation linéaire entre sections */}
            {onJumpToSection && (
              <div className="mt-10 pt-6 border-t flex items-center justify-between gap-2"
                   style={{ borderColor: "hsl(var(--gold) / 0.25)" }}>
                <button
                  onClick={() => onJumpToSection(sIdx - 1)}
                  disabled={sIdx === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    background: "hsl(var(--background))",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--gold) / 0.35)",
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {sIdx + 1} / {sections.length}
                </span>
                <button
                  onClick={() => onJumpToSection(sIdx + 1)}
                  disabled={sIdx === sections.length - 1}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            </section>
          );
        })}
      </div>
    );
  }
);
SiddourBookReader.displayName = "SiddourBookReader";

export default SiddourBookReader;
