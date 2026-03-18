import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import HeroSection from "@/components/HeroSection";
import AppHeader from "@/components/AppHeader";
import DateHeader from "@/components/DateHeader";
import InfoCarousel from "@/components/InfoCarousel";
import CitySelector from "@/components/CitySelector";
import CountdownWidget from "@/components/CountdownWidget";
import ShabbatWidget from "@/components/ShabbatWidget";
import ZmanimWidget from "@/components/ZmanimWidget";
import HolidaysWidget from "@/components/HolidaysWidget";
import ParashaSearchWidget from "@/components/ParashaSearchWidget";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <CountdownWidget />
            <ShabbatWidget />
            <ZmanimWidget />
            <HolidaysWidget />
            <ParashaSearchWidget />
          </>
        );
      case "zmanim":
        return <ZmanimWidget />;
      case "chabbat":
        return (
          <>
            <CountdownWidget />
            <ShabbatWidget />
          </>
        );
      case "explorer":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🗺️</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Explorer</h3>
            <p className="text-sm mt-2 text-muted-foreground">
              Carte des synagogues et lieux de culte
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60 italic">Bientôt disponible</p>
          </div>
        );
      case "tehilim":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">📖</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Tehilim</h3>
            <p className="text-sm mt-2 text-muted-foreground">
              Chaînes communautaires de Tehilim
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60 italic">Bientôt disponible</p>
          </div>
        );
      case "synagogue":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🏛️</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Ma Synagogue</h3>
            <p className="text-sm mt-2 text-muted-foreground">Connectez-vous pour gérer votre synagogue</p>
            <button
              className="mt-5 px-7 py-3.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-gold)",
              }}
            >
              🔑 Se connecter
            </button>
          </div>
        );
      case "fetes":
        return <HolidaysWidget />;
      case "convertisseur":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🔄</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Convertisseur de dates</h3>
            <p className="text-sm mt-2 text-muted-foreground">Bientôt disponible</p>
          </div>
        );
      default:
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🔜</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h3>
            <p className="text-sm mt-2 text-muted-foreground">Bientôt disponible</p>
          </div>
        );
    }
  };

  return (
    <CityProvider>
      {!showDashboard ? (
        <HeroSection onContinue={() => setShowDashboard(true)} />
      ) : (
        <div className="relative min-h-screen bg-background">
          <div className="max-w-[600px] mx-auto px-4 pb-24">
            {/* Auth bar */}
            <div className="flex justify-end py-2.5">
              <button
                className="px-5 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 text-primary-foreground border-none"
                style={{
                  background: "var(--gradient-gold)",
                  boxShadow: "var(--shadow-gold)",
                }}
              >
                🔑 Connexion
              </button>
            </div>

            <AppHeader />
            <DateHeader />
            <InfoCarousel />
            <CitySelector />

            {renderTabContent()}

            {/* Footer */}
            <div className="text-center py-6 mt-8 text-xs text-muted-foreground border-t border-border/50">
              Chabbat Chalom © {new Date().getFullYear()} —{" "}
              <a href="https://www.chabbat-chalom.com" className="text-primary font-semibold no-underline hover:underline">
                chabbat-chalom.com
              </a>
            </div>
          </div>

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      )}
    </CityProvider>
  );
};

export default Index;
