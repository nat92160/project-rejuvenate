import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BIRKAT_HAMAZONE, BIRKAT_INSERTS, type BirkatParagraph } from "@/lib/brakhot-data";

interface Props {
  onBack: () => void;
}

const hebrewTextStyle = {
  direction: "rtl" as const,
  fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
  fontFeatureSettings: "'kern', 'mark', 'mkmk'",
  color: "hsl(var(--foreground))",
};

const SECTION_LABELS: Record<string, string> = {
  zimoun: "זִמּוּן — Zimoun",
  brakha1: "בִּרְכַּת הַזָּן — 1re Brakha",
  brakha2: "בִּרְכַּת הָאָרֶץ — 2e Brakha",
  brakha3: "בִּרְכַּת יְרוּשָׁלַיִם — 3e Brakha",
  brakha4: "הַטּוֹב וְהַמֵּטִיב — 4e Brakha",
  harahamane: "הָרַחֲמָן — HaRa'hamane",
  conclusion: "סִיּוּם — Conclusion",
};

const SectionSeparator = ({ label }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 my-5">
    <span className="block h-[1px] flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.3))" }} />
    <span className="text-[10px] font-bold uppercase tracking-wider px-2" style={{ color: "hsl(var(--gold-matte) / 0.7)" }}>
      {label || "✦"}
    </span>
    <span className="block h-[1px] flex-1 max-w-[60px]" style={{ background: "linear-gradient(270deg, transparent, hsl(var(--gold) / 0.3))" }} />
  </div>
);

const BirkatHamazoneReader = ({ onBack }: Props) => {
  const [selectedVersion, setSelectedVersion] = useState("sefarade");
  const [activeInserts, setActiveInserts] = useState<string[]>([]);
  const version = BIRKAT_HAMAZONE.find((v) => v.id === selectedVersion) || BIRKAT_HAMAZONE[0];

  const toggleInsert = (id: string) => {
    setActiveInserts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const enrichedParagraphs = useMemo(() => {
    if (selectedVersion === "abregee" || activeInserts.length === 0) {
      return version.paragraphs.map((p) => ({ ...p, isInsert: false, insertLabel: "" }));
    }

    const activeInsertData = BIRKAT_INSERTS.filter((ins) => activeInserts.includes(ins.id));
    const result: Array<BirkatParagraph & { isInsert: boolean; insertLabel: string; insertIcon?: string }> = [];

    for (const para of version.paragraphs) {
      for (const ins of activeInsertData) {
        for (const seg of ins.segments) {
          if (para.hebrew.startsWith(seg.insertBeforeMarker)) {
            result.push({
              hebrew: seg.hebrew,
              transliteration: seg.transliteration,
              section: para.section,
              isInsert: true,
              insertLabel: `${ins.icon} ${ins.label}`,
              insertIcon: ins.icon,
            });
          }
        }
      }
      result.push({ ...para, isInsert: false, insertLabel: "" });
    }

    return result;
  }, [version, selectedVersion, activeInserts]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border-none cursor-pointer text-foreground font-bold text-sm"
        >
          ←
        </button>
        <div>
          <h3 className="font-display text-base font-bold text-foreground">🍞 Birkat HaMazone</h3>
          <p className="text-[11px] text-muted-foreground">Bénédiction après le repas avec pain</p>
        </div>
      </div>

      {/* Version selector */}
      <div className="flex gap-2">
        {BIRKAT_HAMAZONE.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVersion(v.id)}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold border-none cursor-pointer transition-all"
            style={{
              background: selectedVersion === v.id ? "hsl(var(--gold) / 0.15)" : "hsl(var(--muted))",
              color: selectedVersion === v.id ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Festival inserts toggle */}
      {selectedVersion !== "abregee" && (
        <div className="rounded-xl border border-border p-3 space-y-2" style={{ background: "hsl(var(--muted) / 0.3)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            📅 Ajouts selon la période
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BIRKAT_INSERTS.map((ins) => {
              const isActive = activeInserts.includes(ins.id);
              return (
                <button
                  key={ins.id}
                  onClick={() => toggleInsert(ins.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all"
                  style={{
                    background: isActive ? "hsl(var(--gold) / 0.18)" : "hsl(var(--muted))",
                    color: isActive ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                    boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none",
                  }}
                >
                  {ins.icon} {ins.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reading area */}
      <div
        className="rounded-2xl border border-border p-5 space-y-1"
        style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)" }}
      >
        <p className="text-center text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "hsl(var(--gold-matte))" }}>
          {version.name}
        </p>

        {enrichedParagraphs.map((para, i) => {
          const prevSection = i > 0 ? enrichedParagraphs[i - 1].section : null;
          const currentSection = para.section;
          const isNewSection = currentSection && currentSection !== prevSection && !para.isInsert;

          return (
            <div key={i}>
              {/* Section separator with label */}
              {isNewSection && i > 0 && (
                <SectionSeparator label={SECTION_LABELS[currentSection]} />
              )}
              {isNewSection && i === 0 && currentSection && (
                <p className="text-center text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--gold-matte) / 0.6)" }}>
                  {SECTION_LABELS[currentSection]}
                </p>
              )}

              {/* Insert badge */}
              {para.isInsert && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 mb-1 mt-3"
                  >
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: "hsl(var(--gold) / 0.15)",
                        color: "hsl(var(--gold-matte))",
                        border: "1px solid hsl(var(--gold) / 0.25)",
                      }}
                    >
                      {para.insertLabel}
                    </span>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Text — Zimoun: call-and-response styling */}
              <p
                className={`text-lg leading-[2.4] font-semibold text-right ${para.isInsert ? "rounded-xl px-3 py-2" : ""} ${para.role === "leader" ? "mt-2" : ""}`}
                style={{
                  ...hebrewTextStyle,
                  ...(para.isInsert
                    ? { background: "hsl(var(--gold) / 0.06)", borderLeft: "3px solid hsl(var(--gold) / 0.3)" }
                    : {}),
                  ...(para.role === "leader"
                    ? { fontWeight: 700, color: "hsl(var(--foreground))" }
                    : {}),
                  ...(para.role === "response"
                    ? { fontWeight: 600, paddingRight: "16px", borderRight: "3px solid hsl(var(--gold) / 0.25)", background: "hsl(var(--gold) / 0.04)", borderRadius: "8px", padding: "4px 16px 4px 4px", marginBottom: "4px" }
                    : {}),
                }}
              >
                {para.role && (
                  <span
                    className="text-[10px] font-bold inline-block ml-2"
                    style={{
                      color: "hsl(var(--gold-matte) / 0.6)",
                      fontFamily: "system-ui, sans-serif",
                      direction: "ltr",
                    }}
                  >
                    {para.role === "leader" ? "מְזַמֵּן" : "מְסֻבִּין"}
                  </span>
                )}
                {para.hebrew}
              </p>

              {para.transliteration && (
                <p className="text-xs text-muted-foreground italic mb-2">{para.transliteration}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="rounded-xl p-3 border border-primary/15 text-center" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-[11px] text-muted-foreground">
          ⚠️ Le Birkat HaMazone est obligatoire après avoir mangé du pain (≥27g).
          <br />Le Chabbat et Yom Tov, on dit « מִגְדּוֹל » au lieu de « מַגְדִּיל » dans la conclusion.
          <br />En cas de doute sur le nossakh, consultez votre Rav.
        </p>
      </div>
    </motion.div>
  );
};

export default BirkatHamazoneReader;
