import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BIRKAT_HAMAZONE, BIRKAT_INSERTS } from "@/lib/brakhot-data";

interface Props {
  onBack: () => void;
}

const hebrewTextStyle = {
  direction: "rtl" as const,
  fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
  fontFeatureSettings: "'kern', 'mark', 'mkmk'",
  color: "hsl(var(--foreground))",
};

const BirkatHamazoneReader = ({ onBack }: Props) => {
  const [selectedVersion, setSelectedVersion] = useState("sefarade");
  const [activeInserts, setActiveInserts] = useState<string[]>([]);
  const version = BIRKAT_HAMAZONE.find((v) => v.id === selectedVersion) || BIRKAT_HAMAZONE[0];

  const toggleInsert = (id: string) => {
    setActiveInserts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Build paragraph list with inserts injected at correct positions
  const enrichedParagraphs = useMemo(() => {
    if (selectedVersion === "abregee" || activeInserts.length === 0) {
      return version.paragraphs.map((p) => ({ ...p, isInsert: false, insertLabel: "" }));
    }

    const activeInsertData = BIRKAT_INSERTS.filter((ins) => activeInserts.includes(ins.id));
    const result: Array<{
      hebrew: string;
      transliteration?: string;
      isInsert: boolean;
      insertLabel: string;
      insertIcon?: string;
    }> = [];

    for (const para of version.paragraphs) {
      // Check if any insert should be placed before this paragraph
      const insertsHere = activeInsertData.filter((ins) =>
        para.hebrew.startsWith(ins.insertBeforeMarker)
      );
      for (const ins of insertsHere) {
        result.push({
          hebrew: ins.hebrew,
          transliteration: ins.transliteration,
          isInsert: true,
          insertLabel: `${ins.icon} ${ins.label}`,
          insertIcon: ins.icon,
        });
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

      {/* Festival inserts toggle (only for sefarade/ashkenaze) */}
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

      {/* Reading mode with inline inserts */}
      <div
        className="rounded-2xl border border-border p-5 space-y-6"
        style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)" }}
      >
        <p className="text-center text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--gold-matte))" }}>
          {version.name}
        </p>

        {enrichedParagraphs.map((para, i) => (
          <div key={i} className="space-y-2">
            {/* Insert label badge */}
            {para.isInsert && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mb-1"
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

            <p
              className={`text-lg leading-[2.4] font-semibold text-right ${para.isInsert ? "rounded-xl px-3 py-2" : ""}`}
              style={{
                ...hebrewTextStyle,
                ...(para.isInsert
                  ? {
                      background: "hsl(var(--gold) / 0.06)",
                      borderLeft: "3px solid hsl(var(--gold) / 0.3)",
                    }
                  : {}),
              }}
            >
              {para.hebrew}
            </p>
            {para.transliteration && (
              <p className="text-xs text-muted-foreground italic">{para.transliteration}</p>
            )}
            {i < enrichedParagraphs.length - 1 && !para.isInsert && (
              <div className="border-t border-border/50 pt-2" />
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="rounded-xl p-3 border border-primary/15 text-center" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-[11px] text-muted-foreground">
          ⚠️ Le Birkat HaMazone est obligatoire après avoir mangé du pain (≥27g).
          <br />En cas de doute sur le nossakh, consultez votre Rav.
        </p>
      </div>
    </motion.div>
  );
};

export default BirkatHamazoneReader;
