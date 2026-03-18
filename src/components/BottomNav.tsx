import { useState } from "react";
import MoreMenu from "./MoreMenu";

const tabs = [
  { id: "chabbat", icon: "🕯️", label: "Chabbat" },
  { id: "synagogue", icon: "🏛️", label: "Ma Synag." },
  { id: "carte", icon: "🗺️", label: "Carte" },
  { id: "zmanim", icon: "⏰", label: "Zmanim" },
  { id: "plus", icon: "•••", label: "Plus" },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const [showMore, setShowMore] = useState(false);

  const handleTabClick = (id: string) => {
    if (id === "plus") {
      setShowMore(true);
    } else {
      onTabChange(id);
    }
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-stretch"
        style={{
          height: "64px",
          background: "rgba(255, 255, 255, 0.92)",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 border-none bg-transparent cursor-pointer transition-colors duration-200 relative"
            style={{
              color: activeTab === tab.id ? "#B8860B" : "#94A3B8",
              fontFamily: "'Inter', sans-serif",
              padding: "6px 0",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {activeTab === tab.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-b-sm"
                style={{ background: "#D4AF37" }} />
            )}
            <span className="text-xl leading-none flex items-center justify-center h-7">{tab.icon}</span>
            <span
              className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[72px]"
              style={{
                fontWeight: activeTab === tab.id ? 600 : 500,
                letterSpacing: "0.1px",
              }}
            >
              {tab.label}
            </span>
          </button>
        ))}
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
