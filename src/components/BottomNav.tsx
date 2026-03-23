import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MoreMenu from "./MoreMenu";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";
import {
  DEFAULT_BOTTOM_TABS_BY_MODE,
  getAvailableTabs,
  getBottomNavStorageKey,
  sanitizeBottomTabs,
  NAV_ITEMS,
  type BottomNavMode,
} from "@/lib/navigation";
  DEFAULT_BOTTOM_TABS_BY_MODE,
  getAvailableTabs,
  getBottomNavStorageKey,
  sanitizeBottomTabs,
  NAV_ITEMS,
  type BottomNavMode,
} from "@/lib/navigation";

function isFridayOrShabbat(): boolean {
  const now = new Date();
  const day = now.getDay();
  return (day === 5 && now.getHours() >= 12) || day === 6;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MAX_TABS = 4;

const loadTabsForMode = (mode: BottomNavMode) => {
  try {
    const raw = localStorage.getItem(getBottomNavStorageKey(mode));
    if (!raw) return DEFAULT_BOTTOM_TABS_BY_MODE[mode];
    return sanitizeBottomTabs(JSON.parse(raw), mode);
  } catch {
    return DEFAULT_BOTTOM_TABS_BY_MODE[mode];
  }
};

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { dbRole } = useAuth();
  const { city } = useCity();
  const mode: BottomNavMode = dbRole === "president" ? "president" : "fidele";
  const [showMore, setShowMore] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(() => loadTabsForMode(mode));
  const [microInfo, setMicroInfo] = useState<Record<string, string>>({});

  const availableTabs = useMemo(() => getAvailableTabs(mode), [mode]);

  // Load micro-widget data
  useEffect(() => {
    const loadMicro = async () => {
      try {
        const shabbat = await fetchShabbatTimes(city);
        const info: Record<string, string> = {};
        if (shabbat?.candleLighting) info["chabbat"] = shabbat.candleLighting;
        if (shabbat?.havdalah) info["dashboard"] = `Chab. ${shabbat.candleLighting || ""}`;
        
        // Next zman simple
        const now = new Date();
        const h = now.getHours();
        if (h < 12) info["zmanim"] = "Matin";
        else if (h < 17) info["zmanim"] = "Après-midi";
        else info["zmanim"] = "Soir";
        
        setMicroInfo(info);
      } catch { /* silent */ }
    };
    loadMicro();
  }, [city]);

  useEffect(() => {
    const sanitized = sanitizeBottomTabs(selectedTabs, mode);

    if (JSON.stringify(sanitized) !== JSON.stringify(selectedTabs)) {
      setSelectedTabs(sanitized);
      return;
    }

    try {
      localStorage.setItem(getBottomNavStorageKey(mode), JSON.stringify(sanitized));
    } catch {
      // ignore storage failures
    }
  }, [selectedTabs, mode]);

  const fridayMode = isFridayOrShabbat();

  const visibleTabs = [
    ...selectedTabs
      .map((id) => {
        const tab = availableTabs.find((tab) => tab.id === id) || NAV_ITEMS.find((t) => t.id === id);
        if (!tab) return null;
        // On Friday/Shabbat, replace the central tab with "Focus Chabbat"
        if (fridayMode && id === selectedTabs[Math.floor(selectedTabs.length / 2)]) {
          return { ...tab, id: "chabbat", icon: "🕯️", label: "Chabbat" };
        }
        return tab;
      })
      .filter((tab): tab is (typeof availableTabs)[number] => Boolean(tab)),
    { id: "menu", icon: "☰", label: "Plus" },
  ];

  const handleTabClick = (id: string) => {
    if (id === "menu") {
      setShowMore(true);
      return;
    }

    onTabChange(id);
  };

  const toggleTab = (id: string) => {
    setSelectedTabs((prev) => {
      const current = sanitizeBottomTabs(prev, mode);

      if (current.includes(id)) {
        if (current.length <= 1) return current;
        return current.filter((tabId) => tabId !== id);
      }

      if (current.length >= MAX_TABS) return current;
      return [...current, id];
    });
  };

  const resetTabs = () => {
    setSelectedTabs(DEFAULT_BOTTOM_TABS_BY_MODE[mode]);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch glass"
        style={{
          height: "72px",
          borderTop: "1px solid hsl(var(--border))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex flex-1 justify-around items-stretch">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === "menu" && showMore);

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (tab.id !== "menu") setShowCustomize(true);
                }}
                className={`relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 border-none bg-transparent px-0 transition-all duration-200 cursor-pointer ${
                  fridayMode && tab.id === "chabbat" ? "animate-pulse" : ""
                }`}
                style={{
                  color: isActive
                    ? "hsl(var(--gold-matte))"
                    : fridayMode && tab.id === "chabbat"
                    ? "hsl(var(--gold))"
                    : "hsl(var(--muted-foreground))",
                  fontFamily: "'Montserrat', sans-serif",
                  padding: "8px 0",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {isActive && (
                  <motion.div
                    className="absolute left-1/2 top-0 h-[3px] -translate-x-1/2 rounded-b-full"
                    layoutId="bottomNavIndicator"
                    style={{
                      width: "28px",
                      background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-matte)))",
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}

                <motion.span
                  className="flex h-7 items-center justify-center text-xl leading-none"
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  {tab.icon}
                </motion.span>

                <span
                  className="max-w-full truncate px-1 text-[9px] uppercase tracking-wide"
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: "0.4px",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Customize shortcut */}
        <button
          onClick={() => setShowCustomize(true)}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer transition-all active:scale-90"
          style={{
            width: "48px",
            borderLeft: "1px solid hsl(var(--border) / 0.5)",
            color: "hsl(var(--gold-matte))",
            WebkitTapHighlightColor: "transparent",
          }}
          title="Personnaliser"
        >
          <span className="text-base">⚙️</span>
          <span className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">Perso</span>
        </button>
      </nav>

      <AnimatePresence>
        {showCustomize && (
          <>
            <motion.div
              className="fixed inset-0 z-[200]"
              style={{ background: "hsl(var(--navy) / 0.25)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomize(false)}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl"
              style={{
                background: "hsl(var(--card))",
                borderTop: "2px solid hsl(var(--gold) / 0.15)",
                padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
                boxShadow: "var(--shadow-elevated)",
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h2 className="font-display text-sm font-bold text-foreground">
                    Mes widgets favoris ({selectedTabs.length}/{MAX_TABS})
                  </h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {mode === "president"
                      ? "Configuration du bandeau en mode Président"
                      : "Configuration du bandeau en mode Fidèle"}
                  </p>
                </div>

                <button
                  onClick={() => setShowCustomize(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-muted text-lg text-muted-foreground cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableTabs.map((tab) => {
                  const selectedIndex = selectedTabs.indexOf(tab.id);
                  const isSelected = selectedIndex !== -1;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => toggleTab(tab.id)}
                      className={`relative flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {selectedIndex + 1}
                        </span>
                      )}
                      <span className="text-lg">{tab.icon}</span>
                      <span className="text-[9px] font-bold leading-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={resetTabs}
                className="mt-3 w-full rounded-xl border-none bg-muted py-2 text-xs font-bold text-muted-foreground cursor-pointer"
              >
                Réinitialiser ce mode
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MoreMenu
        isOpen={showMore}
        mode={mode}
        onClose={() => setShowMore(false)}
        onCustomize={() => {
          setShowMore(false);
          setShowCustomize(true);
        }}
        onNavigate={(tab) => {
          onTabChange(tab);
          setShowMore(false);
        }}
      />
    </>
  );
};

export default BottomNav;
