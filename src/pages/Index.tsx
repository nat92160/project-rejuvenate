import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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
import AfficheChabbatWidget from "@/components/AfficheChabbatWidget";
import AnnoncesWidget from "@/components/AnnoncesWidget";
import RefouaChelemaWidget from "@/components/RefouaChelemaWidget";
import MinyanLiveWidget from "@/components/MinyanLiveWidget";
import EvenementsWidget from "@/components/EvenementsWidget";
import CoursZoomWidget from "@/components/CoursZoomWidget";
import CoursVirtuelWidget from "@/components/CoursVirtuelWidget";
import DarkModeToggle from "@/components/DarkModeToggle";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";

const IndexContent = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);
  const { role, setRole } = useRole();
  const { user, dbRole, signOut } = useAuth();

  // President access must come from the backend role only
  const isPresident = dbRole === "president";

  const handleContinue = (selectedRole?: string) => {
    if (selectedRole === "admin") {
      setRole("guest");
      setShowDashboard(true);
      if (!isPresident) {
        setAuthOpen(true);
      }
      return;
    }

    if (selectedRole === "fidele") {
      setRole("fidele");
    } else {
      setRole("guest");
    }
    setShowDashboard(true);
  };

  const renderTabContent = () => {
    // President-specific dashboard
    if (isPresident && activeTab === "dashboard") {
      return <PresidentDashboard onLoginClick={() => setAuthOpen(true)} />;
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
        return <PresidentDashboard onLoginClick={() => setAuthOpen(true)} />;
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
      case "annonces":
        return <AnnoncesWidget />;
      case "refoua":
        return <RefouaChelemaWidget />;
      case "minyan":
        return <MinyanLiveWidget />;
      case "evenements":
        return <EvenementsWidget />;
      case "courszoom":
        return <CoursZoomWidget />;
      case "coursvirtuel":
        return <CoursVirtuelWidget />;
      case "affiche":
        return <AfficheChabbatWidget />;
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
                {user ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                    <button
                      onClick={signOut}
                      className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 bg-muted text-muted-foreground border-none"
                    >
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 text-primary-foreground border-none"
                    style={{
                      background: "var(--gradient-gold)",
                      boxShadow: "var(--shadow-gold)",
                    }}
                  >
                    🔑 Connexion
                  </button>
                )}
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

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

const Index = () => {
  return (
    <CityProvider>
      <RoleProvider>
        <AuthProvider>
          <IndexContent />
        </AuthProvider>
      </RoleProvider>
    </CityProvider>
  );
};

export default Index;
