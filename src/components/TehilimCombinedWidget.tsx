import { useState } from "react";
import { motion } from "framer-motion";
import TehilimLibreWidget from "./TehilimLibreWidget";
import TehilimWidget from "./TehilimWidget";

type Tab = "livre" | "chaines";

interface TehilimCombinedWidgetProps {
  prayerMode?: boolean;
}

const TehilimCombinedWidget = ({ prayerMode = false }: TehilimCombinedWidgetProps) => {
  const [tab, setTab] = useState<Tab>("livre");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
        <span className="text-3xl">📜</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Tehilim — Psaumes</h3>
        <p className="mt-1 text-xs text-muted-foreground">Lecture libre & Chaînes communautaires</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-border bg-muted/60 p-1.5">
        <button
          onClick={() => setTab("livre")}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-none py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
          style={{
            background: tab === "livre" ? "var(--gradient-gold)" : "transparent",
            color: tab === "livre" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            boxShadow: tab === "livre" ? "var(--shadow-gold)" : "none",
          }}
        >
          📖 Livre
        </button>
        <button
          onClick={() => setTab("chaines")}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-none py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
          style={{
            background: tab === "chaines" ? "var(--gradient-gold)" : "transparent",
            color: tab === "chaines" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            boxShadow: tab === "chaines" ? "var(--shadow-gold)" : "none",
          }}
        >
          🤝 Chaînes
        </button>
      </div>

      {/* Content */}
      {tab === "livre" ? <TehilimLibreWidget /> : <TehilimWidget />}
    </motion.div>
  );
};

export default TehilimCombinedWidget;
