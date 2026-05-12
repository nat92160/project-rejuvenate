import { useState, lazy, Suspense } from "react";

const MariagesWidget = lazy(() => import("./MariagesWidget"));
const HazkaraWidget = lazy(() => import("./HazkaraWidget"));

const TABS = [
  { id: "mariages", label: "💍 Mariages" },
  { id: "hazkara", label: "🕯️ Hazkara" },
] as const;

type TabId = typeof TABS[number]["id"];

const HalakhicDatesView = () => {
  const [tab, setTab] = useState<TabId>("mariages");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-3 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-all"
            style={tab === t.id
              ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none", boxShadow: "var(--shadow-card)" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="text-center py-8 text-sm text-muted-foreground">Chargement…</div>}>
        {tab === "mariages" ? <MariagesWidget /> : <HazkaraWidget />}
      </Suspense>
    </div>
  );
};

export default HalakhicDatesView;
