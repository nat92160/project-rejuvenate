import { useState } from "react";
import MoreMenu from "./MoreMenu";

const tabs = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "explorer", icon: "🗺️", label: "Explorer" },
  { id: "tehilim", icon: "📖", label: "Tehilim" },
  { id: "menu", icon: "☰", label: "Menu" },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const [showMore, setShowMore] = useState(false);

  const handleTabClick = (id: string) => {
    if (id === "menu") {
      setShowMore(true);
    } else {
      onTabChange(id);
    }
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-stretch glass"
        style={{
          height: "68px",
          borderTop: "1px solid hsl(var(--border))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === "menu" && showMore);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex flex-col items-center justify-center gap-1 flex-1 border-none bg-transparent cursor-pointer transition-all duration-200 relative"
              style={{
                color: isActive ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                fontFamily: "'Montserrat', sans-serif",
                padding: "8px 0",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full"
                  style={{
                    width: "28px",
                    background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-matte)))",
                  }}
                />
              )}
              <span className="text-xl leading-none flex items-center justify-center h-7">
                {tab.icon}
              </span>
              <span
                className="text-[10px] tracking-wide uppercase"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.5px",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <MoreMenu
        isOpen={showMore}
        onClose={() => setShowMore(false)}
        onNavigate={(tab) => { onTabChange(tab); setShowMore(false); }}
      />
    </>
  );
};

export default BottomNav;
