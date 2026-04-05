import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLiturgicalContext, type LiturgicalPeriod } from "@/lib/liturgicalContext";

interface Props {
  prayerMode?: boolean;
  /** Override du contexte liturgique (mode manuel) */
  onContextChange?: (ctx: LiturgicalPeriod) => void;
  context: LiturgicalPeriod;
}

const OVERRIDE_OPTIONS = [
  { key: "mashivHaRouach" as const, label: "משיב הרוח", labelFr: "Hiver (Guévourot)", icon: "🌧️", group: "guevourot" },
  { key: "moridHaTal" as const, label: "מוריד הטל", labelFr: "Été (Guévourot)", icon: "☀️", group: "guevourot" },
  { key: "vetenTalOuMatar" as const, label: "ברך עלינו", labelFr: "Hiver — Barekh Alénou", icon: "🌧️", group: "barekh" },
  { key: "vetenBerakha" as const, label: "ברכנו", labelFr: "Été — Berekhenou", icon: "☀️", group: "barekh" },
  { key: "aseretYemeiTeshuva" as const, label: "עשי״ת", labelFr: "Asèrèt Yémé Téchouva", icon: "📜" },
  { key: "roshHodesh" as const, label: "ר״ח", labelFr: "Roch Hodech", icon: "🌙" },
  { key: "holHaMoed" as const, label: "חוה״מ", labelFr: "Hol HaMoed", icon: "🎪" },
  { key: "hanoucca" as const, label: "חנוכה", labelFr: "Hanoucca", icon: "🕎" },
  { key: "pourim" as const, label: "פורים", labelFr: "Pourim", icon: "🎭" },
];

const LiturgicalContextBar = ({ prayerMode, onContextChange, context }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Partial<LiturgicalPeriod>>({});

  const autoContext = useMemo(() => getLiturgicalContext(), []);

  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;

  const handleToggle = (key: keyof LiturgicalPeriod) => {
    const newOverrides = { ...manualOverrides };
    const currentValue = !!(context as any)[key];

    // Toggle grouped options
    if (key === "mashivHaRouach") {
      newOverrides.mashivHaRouach = !currentValue;
      newOverrides.moridHaTal = currentValue;
    } else if (key === "moridHaTal") {
      newOverrides.moridHaTal = !currentValue;
      newOverrides.mashivHaRouach = currentValue;
    } else if (key === "vetenTalOuMatar") {
      newOverrides.vetenTalOuMatar = !currentValue;
      newOverrides.vetenBerakha = currentValue;
    } else if (key === "vetenBerakha") {
      newOverrides.vetenBerakha = !currentValue;
      newOverrides.vetenTalOuMatar = currentValue;
    } else {
      (newOverrides as any)[key] = !currentValue;
    }

    setManualOverrides(newOverrides);
    onContextChange?.({ ...context, ...newOverrides } as LiturgicalPeriod);
  };

  const activeLabels = context.activeInserts;

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: prayerMode ? pmCard : "hsl(var(--gold) / 0.04)",
        borderColor: pmBorder || "hsl(var(--gold) / 0.15)",
      }}
    >
      {/* Summary line */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
            📅 Période liturgique
          </span>
          {activeLabels.slice(0, 3).map((label, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold"
              style={{
                background: "hsl(var(--gold) / 0.12)",
                color: "hsl(var(--gold-matte))",
                border: "1px solid hsl(var(--gold) / 0.2)",
              }}
              dir="rtl"
            >
              {label}
            </span>
          ))}
          {activeLabels.length > 3 && (
            <span className="text-[9px]" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
              +{activeLabels.length - 3}
            </span>
          )}
        </div>
        <span
          className="text-xs transition-transform"
          style={{
            color: pmMuted || "hsl(var(--muted-foreground))",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        >
          ▼
        </span>
      </button>

      {/* Manual overrides */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t space-y-2" style={{ borderColor: pmBorder || "hsl(var(--border) / 0.3)" }}>
              <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
                🔧 Forcer manuellement (détection auto par défaut)
              </p>

              {/* Guévourot group */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold" style={{ color: pmText || "hsl(var(--foreground))" }}>
                  Guévourot (2e brakha) :
                </p>
                <div className="flex gap-1.5">
                  {OVERRIDE_OPTIONS.filter(o => o.group === "guevourot").map(opt => {
                    const isActive = !!context[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleToggle(opt.key)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer transition-all"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none",
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barekh Aleinou group */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold" style={{ color: pmText || "hsl(var(--foreground))" }}>
                  Birkat HaChanim (9e brakha) :
                </p>
                <div className="flex gap-1.5">
                  {OVERRIDE_OPTIONS.filter(o => o.group === "barekh").map(opt => {
                    const isActive = !!context[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleToggle(opt.key)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer transition-all"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none",
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other toggles */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold" style={{ color: pmText || "hsl(var(--foreground))" }}>
                  Ajouts spéciaux :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OVERRIDE_OPTIONS.filter(o => !o.group).map(opt => {
                    const isActive = !!context[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleToggle(opt.key)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer transition-all"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none",
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[8px] italic" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
                ⚠️ La détection est automatique. Utilisez ces boutons uniquement pour forcer une période spécifique.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiturgicalContextBar;
