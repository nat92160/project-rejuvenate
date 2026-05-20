import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MoreMenu from "./MoreMenu";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, fetchZmanim } from "@/lib/hebcal";
import { type BottomNavMode } from "@/lib/navigation";

function isFridayOrShabbat(): boolean {
  const now = new Date();
  const day = now.getDay();
  return (day === 5 && now.getHours() >= 12) || day === 6;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/** 4 onglets universels, fixes — pas de personnalisation, simplicité maximale. */
const FIXED_TABS: Array<{ id: string; icon: string; label: string }> = [
  { id: "dashboard", icon: "🏠", label: "Accueil" },
  { id: "synagogue", icon: "🏛️", label: "Ma Syna" },
  { id: "chabbat", icon: "🕯️", label: "Chabbat" },
  { id: "menu", icon: "⋯", label: "Plus" },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { dbRole } = useAuth();
  const { city } = useCity();
  const mode: BottomNavMode = "fidele";
  const [showMore, setShowMore] = useState(false);
  const [microInfo, setMicroInfo] = useState<Record<string, string>>({});

  // Load micro-widget data with real next zman
  useEffect(() => {
    const loadMicro = async () => {
      try {
        const info: Record<string, string> = {};

        // Shabbat times
        const shabbat = await fetchShabbatTimes(city);
        if (shabbat?.candleLighting) {
          info["chabbat"] = shabbat.candleLighting;
        }

        // Real next zman — used for both "zmanim" tab AND "dashboard" micro-widget
        const zmanim = await fetchZmanim(city);
        const now = new Date();
        const nowStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const nextZman = zmanim.find((z) => z.time > nowStr && z.time !== "--:--");
        if (nextZman) {
          const short = nextZman.label
            .replace("(GR\"A)", "")
            .replace("(MG\"A)", "")
            .replace("(Lever du soleil)", "")
            .replace("(Coucher du soleil)", "")
            .replace("(Midi solaire)", "")
            .trim()
            .split(" ")[0];
          info["dashboard"] = `${short} ${nextZman.time}`;
        } else {
          info["dashboard"] = shabbat?.candleLighting ? `Chab. ${shabbat.candleLighting}` : "";
        }

        setMicroInfo(info);
      } catch { /* silent */ }
    };
    loadMicro();

    // Refresh every 5 min, only when tab is visible (battery-friendly)
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMicro();
    }, 5 * 60 * 1000);

    // Re-fetch immediately when user returns to the app
    const onVisibility = () => {
      if (!document.hidden) loadMicro();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [city]);

  const fridayMode = isFridayOrShabbat();

  const visibleTabs = FIXED_TABS;

  const handleTabClick = (id: string) => {
    if (id === "menu") {
      setShowMore(true);
      return;
    }
    onTabChange(id);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch glass"
        style={{
          height: "76px",
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
                  className="max-w-full truncate px-1 text-[10px] uppercase tracking-wide"
                  style={{
                    fontWeight: isActive ? 700 : 600,
                    letterSpacing: "0.3px",
                  }}
                >
                  {tab.label}
                </span>
                {microInfo[tab.id] && !isActive && (
                  <span className="text-[9px] font-semibold truncate max-w-full px-0.5 leading-tight" style={{ color: "hsl(var(--foreground))", opacity: 0.85 }}>
                    {microInfo[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </nav>

      <MoreMenu
        isOpen={showMore}
        mode={mode}
        onClose={() => setShowMore(false)}
        onNavigate={(tab) => {
          onTabChange(tab);
          setShowMore(false);
        }}
      />
    </>
  );
};

export default BottomNav;
