import { forwardRef } from "react";
import { isInstructionOnly } from "@/lib/utils";
import type { FullSection } from "@/hooks/useSiddourFullOffice";
import SiddourSectionTranslation from "./SiddourSectionTranslation";
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
  ({ sections, fontSize, registerSectionRef, rite, office, autoTranslateIndices }, ref) => {
    return (
      <div ref={ref} className="space-y-12 pb-32">
        {sections.map((sec, sIdx) => (
          <section
            key={`${sec.index}-${sec.title}`}
            id={`sec-${sIdx}`}
            ref={(el) => registerSectionRef(sIdx, el)}
            className="scroll-mt-24"
          >
            {/* En-tête ornemental de section */}
            <header className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="block h-[1px] w-16" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.5))" }} />
                <span className="text-sm" style={{ color: "hsl(var(--gold) / 0.7)" }}>✦</span>
                <span className="block h-[1px] w-16" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.5))" }} />
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold" style={{ color: "hsl(var(--primary))" }}>
                {sec.title}
              </h2>
              <p className="mt-1" style={{
                fontFamily: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
                fontSize: `${Math.min(fontSize + 4, 36)}px`,
                color: "hsl(var(--gold-matte))",
                fontWeight: 600,
              }}>
                {sec.heTitle}
              </p>
              {sec.isHazara && (
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full"
                  style={{ background: "hsl(var(--gold) / 0.08)", border: "1px solid hsl(var(--gold) / 0.2)" }}>
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
                if (isInternalSectionTitle(verse)) {
                  const titleText = normalizeHebrewMatch(verse);
                  return (
                    <h3 key={i} className="my-6 text-center font-bold"
                      style={{
                        fontFamily: "'Noto Serif Hebrew', serif",
                        fontSize: `${Math.min(fontSize + 2, 32)}px`,
                        color: "hsl(var(--gold-matte))",
                        lineHeight: 1.4,
                      }}>
                      {titleText}
                    </h3>
                  );
                }
                if (isInstructionOnly(verse)) {
                  if (isShemaSecondaryLine(verse)) {
                    return (
                      <div key={i} style={{ marginBottom: "0.75rem", lineHeight: 1.8 }}
                        dangerouslySetInnerHTML={{ __html: verse }} />
                    );
                  }
                  return null;
                }
                return (
                  <p key={i} style={{ marginBottom: "1.1rem", lineHeight: 2.4 }}
                    dangerouslySetInnerHTML={{ __html: verse }} />
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
          </section>
        ))}
      </div>
    );
  }
);
SiddourBookReader.displayName = "SiddourBookReader";

export default SiddourBookReader;
