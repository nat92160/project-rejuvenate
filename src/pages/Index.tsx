import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
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
import TehilimCombinedWidget from "@/components/TehilimCombinedWidget";
import DateConverterWidget from "@/components/DateConverterWidget";
import MizrahCompass from "@/components/MizrahCompass";
import RoshHodeshWidget from "@/components/RoshHodeshWidget";
import MariagesWidget from "@/components/MariagesWidget";
import AlarmWidget from "@/components/AlarmWidget";
import ShabbatSpeciauxWidget from "@/components/ShabbatSpeciauxWidget";
import PresidentDashboard from "@/components/PresidentDashboard";
import AfficheChabbatWidget from "@/components/AfficheChabbatWidget";
import AnnoncesWidget from "@/components/AnnoncesWidget";
import RefouaChelemaWidget from "@/components/RefouaChelemaWidget";
import MinyanLiveWidget from "@/components/MinyanLiveWidget";
import EvenementsWidget from "@/components/EvenementsWidget";
import CoursVirtuelWidget from "@/components/CoursVirtuelWidget";
import FideleSynagogueView from "@/components/FideleSynagogueView";
import SynaProfileManager from "@/components/SynaProfileManager";
import PrayerTimesWidget from "@/components/PrayerTimesWidget";
import SiddourWidget from "@/components/SiddourWidget";

import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { usePendingRequests } from "@/hooks/usePendingRequests";

const IndexContent = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);
  const { role, setRole } = useRole();
  const { user, dbRole, isAdmin, signOut, loading: authLoading, suspended } = useAuth();
  const pendingCount = usePendingRequests();

  const isPresident = dbRole === "president";

  const handleContinue = (selectedRole?: string) => {
    if (selectedRole === "admin") {
      setRole("guest");
      setShowDashboard(true);
      if (!user && !authLoading) setAuthOpen(true);
      return;
    }
    setRole(selectedRole === "fidele" ? "fidele" : "guest");
    setShowDashboard(true);
  };

  const renderTabContent = () => {
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
      case "zmanim": return <ZmanimWidget />;
      case "chabbat": return (<><CountdownWidget /><ShabbatWidget /></>);
      case "explorer":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🗺️</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Explorer</h3>
            <p className="text-sm mt-2 text-muted-foreground">Bientôt disponible</p>
          </div>
        );
      case "siddour": return <SiddourWidget />;
      case "tehilimlibre":
      case "tehilim": return <TehilimCombinedWidget />;
      case "synagogue": return isPresident ? <PresidentDashboard onLoginClick={() => setAuthOpen(true)} /> : <FideleSynagogueView />;
      case "fetes": return <FestivalCalendar />;
      case "convertisseur": return <DateConverterWidget />;
      case "mizrah": return <MizrahCompass />;
      case "roshhodesh": return <RoshHodeshWidget />;
      case "mariages": return <MariagesWidget />;
      case "reveil": return <AlarmWidget />;
      case "annonces": return <AnnoncesWidget />;
      case "refoua": return <RefouaChelemaWidget />;
      case "minyan": return <MinyanLiveWidget />;
      case "evenements": return <EvenementsWidget />;
      case "courszoom":
      case "coursvirtuel": return <CoursVirtuelWidget />;
      case "affiche": return <AfficheChabbatWidget />;
      case "horaires": return <PrayerTimesWidget />;
      case "infosyna": return <SynaProfileManager />;
      case "shabbatspec": return <ShabbatSpeciauxWidget />;
      case "communaute":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">👥</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Communauté</h3>
            <p className="text-xs mt-3 text-muted-foreground/60 italic">Bientôt disponible</p>
          </div>
        );
      default:
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🔜</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Bientôt disponible</h3>
          </div>
        );
    }
  };

  return (
    <>
      {!showDashboard ? (
        <HeroSection onContinue={handleContinue} />
      ) : (
        <div className="relative min-h-screen bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="max-w-[600px] mx-auto px-4 pb-24">
            {/* Top bar — no dark mode toggle */}
            <div className="flex justify-end items-center py-2.5">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => window.location.assign("/admin")}
                    className="relative h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center text-base cursor-pointer hover:bg-muted transition-all active:scale-95"
                    title="Demandes en attente"
                  >
                    🔔
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}
                {isPresident && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
                    style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}>
                    🏛️ Président
                  </span>
                )}
                {user && (
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
                )}
              </div>
            </div>

            <AppHeader onLogoClick={() => { setActiveTab("dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

            {suspended && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 mb-4 text-center">
                <span className="text-2xl">⏸️</span>
                <p className="text-sm font-bold text-red-600 mt-2">Votre compte est suspendu</p>
                <p className="text-xs text-muted-foreground mt-1">Contactez l'administrateur pour plus d'informations.</p>
              </div>
            )}


            <DateHeader />
            <InfoCarousel />
            <CitySelector />

            {renderTabContent()}

            {/* Connexion button — only for non-logged users, not labeled "admin" */}
            {!user && (
              <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <button
                  onClick={() => setAuthOpen(true)}
                  className="pointer-events-auto px-8 py-3 rounded-full text-sm font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 text-primary-foreground border-none shadow-lg"
                  style={{ background: "var(--gradient-gold)", boxShadow: "0 6px 24px hsl(var(--gold) / 0.35)" }}
                >
                  🔑 Se connecter
                </button>
              </div>
            )}

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

const Index = () => (
  <CityProvider>
    <RoleProvider>
      <IndexContent />
    </RoleProvider>
  </CityProvider>
);

export default Index;
