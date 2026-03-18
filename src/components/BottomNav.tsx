import { useState } from "react";

const tabs = [
  { id: "chabbat", icon: "🕯️", label: "Chabbat" },
  { id: "synagogue", icon: "🏛️", label: "Ma Synag." },
  { id: "carte", icon: "🗺️", label: "Carte" },
  { id: "zmanim", icon: "⏰", label: "Zmanim" },
  { id: "plus", icon: "•••", label: "Plus" },
];

const BottomNav = () => {
  const [active, setActive] = useState("chabbat");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
              active === tab.id
                ? "text-gold-dark"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
