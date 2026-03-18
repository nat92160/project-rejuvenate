import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
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
import FestivalCalendar from "@/components/FestivalCalendar";
import TehilimWidget from "@/components/TehilimWidget";
import DateConverterWidget from "@/components/DateConverterWidget";
import MizrahCompass from "@/components/MizrahCompass";
import RoshHodeshWidget from "@/components/RoshHodeshWidget";
import MariagesWidget from "@/components/MariagesWidget";
import AlarmWidget from "@/components/AlarmWidget";
import PresidentDashboard from "@/components/PresidentDashboard";
import DarkModeToggle from "@/components/DarkModeToggle";
import BottomNav from "@/components/BottomNav";

const IndexContent = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { role, setRole, isPresident } = useRole();

  const handleContinue = (selectedRole?: string) => {
    if (selectedRole === "admin") {
      setRole("president");
    } else if (selectedRole === "fidele") {
      setRole("fidele");
    } else {
      setRole("guest");
    }
    setShowDashboard(true);
  };

  const renderTabContent = () => {
    // President-specific dashboard
    if (isPresident && activeTab === "dashboard") {
      return <PresidentDashboard />;
    }

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
        return <TehilimWidget />;
      case "synagogue":
        return <PresidentDashboard />;
      case "fetes":
        return <FestivalCalendar />;
      case "convertisseur":
        return <DateConverterWidget />;
      case "mizrah":
        return <MizrahCompass />;
      case "roshhodesh":
        return <RoshHodeshWidget />;
      case "mariages":
        return <MariagesWidget />;
      case "reveil":
        return <AlarmWidget />;
      case "shabbatspec":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">✨</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Chabbatot spéciaux</h3>
            <p className="text-sm mt-2 text-muted-foreground">
              Chabbat Hagadol, Chabbat Chouva, Chabbat Zakhor...
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60 italic">Bientôt disponible</p>
          </div>
        );
      case "communaute":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">👥</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Communauté</h3>
            <p className="text-sm mt-2 text-muted-foreground">
              Rejoignez votre communauté locale
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60 italic">Bientôt disponible</p>
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
    <>
      {!showDashboard ? (
        <HeroSection onContinue={handleContinue} />
      ) : (
        <div className="relative min-h-screen bg-background">
          <div className="max-w-[600px] mx-auto px-4 pb-24">
            {/* Auth bar */}
            <div className="flex justify-between items-center py-2.5">
              <DarkModeToggle />
              <div className="flex items-center gap-2">
                {isPresident && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
                    style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}>
                    🏛️ Président
                  </span>
                )}
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
    </>
  );
};

const Index = () => {
  return (
    <CityProvider>
      <RoleProvider>
        <IndexContent />
      </RoleProvider>
    </CityProvider>
  );
};

export default Index;
