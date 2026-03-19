import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MoreMenu from "./MoreMenu";

const ALL_TABS = [
  { id: "dashboard", icon: "🏠", label: "Accueil" },
  { id: "zmanim", icon: "⏰", label: "Zmanim" },
  { id: "tehilim", icon: "📖", label: "Tehilim" },
  { id: "chabbat", icon: "🕯️", label: "Chabbat" },
  { id: "fetes", icon: "📅", label: "Fêtes" },
  { id: "annonces", icon: "📢", label: "Annonces" },
  { id: "minyan", icon: "👥", label: "Minyan" },
  { id: "refoua", icon: "🙏", label: "Refoua" },
  { id: "coursvirtuel", icon: "🎥", label: "Cours" },
  { id: "evenements", icon: "📅", label: "Events" },
];

const STORAGE_KEY = "calj_bottom_tabs";
const DEFAULT_TABS = ["dashboard", "zmanim", "tehilim"];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const [showMore, setShowMore] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_TABS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedTabs));
  }, [selectedTabs]);

  const visibleTabs = [
    ...selectedTabs.map((id) => ALL_TABS.find((t) => t.id === id)).filter(Boolean),
    { id: "menu", icon: "☰", label: "Plus" },
  ] as { id: string; icon: string; label: string }[];

  const handleTabClick = (id: string) => {
    if (id === "menu") {
      setShowMore(true);
    } else {
      onTabChange(id);
    }
  };

  const toggleTab = (id: string) => {
    setSelectedTabs((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-stretch glass"
        style={{
          height: "72px",
          borderTop: "1px solid hsl(var(--border))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === "menu" && showMore);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (tab.id !== "menu") setShowCustomize(true);
              }}
              className="flex flex-col items-center justify-center gap-1 flex-1 border-none bg-transparent cursor-pointer transition-all duration-200 relative min-w-0"
              style={{
                color: isActive ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                fontFamily: "'Montserrat', sans-serif",
                padding: "8px 0",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full"
                  layoutId="bottomNavIndicator"
                  style={{
                    width: "28px",
                    background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-matte)))",
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                />
              )}
              <motion.span
                className="text-xl leading-none flex items-center justify-center h-7"
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", damping: 15 }}
              >
                {tab.icon}
              </motion.span>
              <span
                className="text-[9px] tracking-wide uppercase truncate max-w-full px-1"
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
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-border gap-3">
                <h2 className="font-display text-sm font-bold text-foreground">Personnaliser la barre (max 4)</h2>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="bg-muted border-none text-lg cursor-pointer w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ALL_TABS.map((tab) => {
                  const isSelected = selectedTabs.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => toggleTab(tab.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-center border cursor-pointer transition-all min-h-[82px] ${
                        isSelected
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="text-[9px] font-bold leading-tight">{tab.label}</span>
                      {isSelected && <span className="text-[8px] text-primary">✓</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { setSelectedTabs(DEFAULT_TABS); }}
                className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-muted-foreground bg-muted border-none cursor-pointer"
              >
                Réinitialiser
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MoreMenu
        isOpen={showMore}
        onClose={() => setShowMore(false)}
        onNavigate={(tab) => { onTabChange(tab); setShowMore(false); }}
      />
    </>
  );
};

export default BottomNav;
