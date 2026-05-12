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
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const autoContext = useMemo(() => getLiturgicalContext(), []);

  const pmCard = prayerMode ? "#111" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setManualOverrides({});
    if (!value) return;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return;
    const newCtx = getLiturgicalContext(new Date(y, m - 1, d, 12, 0, 0));
    onContextChange?.(newCtx);
  };

  const resetToToday = () => {
    setSelectedDate(todayStr);
    setManualOverrides({});
    onContextChange?.(getLiturgicalContext());
  };

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

  // Affiche les labels en français à partir des overrides connus
  const activeLabels = OVERRIDE_OPTIONS
    .filter(o => !!(context as any)[o.key])
    .map(o => `${o.icon} ${o.labelFr}`);

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: prayerMode ? pmCard : "hsl(var(--gold) / 0.04)",
        borderColor: pmBorder || "hsl(var(--gold) / 0.15)",
      }}
    >
      {/* Date selector — always visible at the top */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
          🗓️ Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-md px-2 py-1.5 font-semibold border"
          style={{
            background: prayerMode ? "#1a1a1a" : "hsl(var(--background))",
            color: pmText || "hsl(var(--foreground))",
            borderColor: pmBorder || "hsl(var(--gold) / 0.25)",
            minHeight: 36,
            fontSize: 16, // évite le zoom auto iOS
            WebkitAppearance: "none",
          }}
        />
        {selectedDate !== todayStr && (
          <button
            onClick={resetToToday}
            className="text-[11px] font-bold px-3 py-2 rounded-md border-none cursor-pointer active:scale-95 transition"
            style={{
              background: "hsl(var(--gold) / 0.15)",
              color: "hsl(var(--gold-matte))",
              minHeight: 36,
            }}
          >
            ↻ Aujourd'hui
          </button>
        )}
      </div>

      {/* Summary line */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer py-1.5 active:opacity-70"
        style={{ minHeight: 36 }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }}>
            📜 Contexte du jour
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
                        className="px-3 py-2 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all active:scale-95"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none", minHeight: 36,
                        }}
                      >
                        {opt.icon} {opt.labelFr}
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
                        className="px-3 py-2 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all active:scale-95"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none", minHeight: 36,
                        }}
                      >
                        {opt.icon} {opt.labelFr}
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
                        className="px-3 py-2 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all active:scale-95"
                        style={{
                          background: isActive ? "hsl(var(--gold) / 0.18)" : (prayerMode ? "#222" : "hsl(var(--muted))"),
                          color: isActive ? "hsl(var(--gold-matte))" : (pmMuted || "hsl(var(--muted-foreground))"),
                          boxShadow: isActive ? "0 0 0 1.5px hsl(var(--gold) / 0.3)" : "none", minHeight: 36,
                        }}
                      >
                        {opt.icon} {opt.labelFr}
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
