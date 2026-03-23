import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";

import AppHeader from "@/components/AppHeader";
import DateHeader from "@/components/DateHeader";
import InfoCarousel from "@/components/InfoCarousel";
import CitySelector from "@/components/CitySelector";
import CountdownWidget from "@/components/CountdownWidget";
import ShabbatWidget from "@/components/ShabbatWidget";
import ZmanimWidget from "@/components/ZmanimWidget";
import HolidaysWidget from "@/components/HolidaysWidget";
import MagicCard from "@/components/MagicCard";
import OmerCounterWidget from "@/components/OmerCounterWidget";

import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { useCity } from "@/hooks/useCity";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { MapPin } from "lucide-react";

// Lazy-loaded heavy modules
const ParashaSearchWidget = lazy(() => import("@/components/ParashaSearchWidget"));
const FestivalCalendar = lazy(() => import("@/components/FestivalCalendar"));
const TehilimCombinedWidget = lazy(() => import("@/components/TehilimCombinedWidget"));
const DateConverterWidget = lazy(() => import("@/components/DateConverterWidget"));
const MizrahCompass = lazy(() => import("@/components/MizrahCompass"));
const RoshHodeshWidget = lazy(() => import("@/components/RoshHodeshWidget"));
const MariagesWidget = lazy(() => import("@/components/MariagesWidget"));
const AlarmWidget = lazy(() => import("@/components/AlarmWidget"));
const ShabbatSpeciauxWidget = lazy(() => import("@/components/ShabbatSpeciauxWidget"));
const PresidentDashboard = lazy(() => import("@/components/PresidentDashboard"));
const AfficheChabbatWidget = lazy(() => import("@/components/AfficheChabbatWidget"));
const AnnoncesWidget = lazy(() => import("@/components/AnnoncesWidget"));
const RefouaChelemaWidget = lazy(() => import("@/components/RefouaChelemaWidget"));
const MinyanLiveWidget = lazy(() => import("@/components/MinyanLiveWidget"));
const EvenementsWidget = lazy(() => import("@/components/EvenementsWidget"));
const CoursVirtuelWidget = lazy(() => import("@/components/CoursVirtuelWidget"));
const FideleSynagogueView = lazy(() => import("@/components/FideleSynagogueView"));
const SynaProfileManager = lazy(() => import("@/components/SynaProfileManager"));
const PrayerTimesWidget = lazy(() => import("@/components/PrayerTimesWidget"));
const SiddourWidget = lazy(() => import("@/components/SiddourWidget"));
const EspacePersonnelWidget = lazy(() => import("@/components/EspacePersonnelWidget"));
const AlerteCommunautaireWidget = lazy(() => import("@/components/AlerteCommunautaireWidget"));
const BrakhotWidget = lazy(() => import("@/components/BrakhotWidget"));

const LazyFallback = () => (
  <div className="flex justify-center py-12">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const IndexContent = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);
  
  const { role, setRole } = useRole();
  const { user, dbRole, isAdmin, signOut, loading: authLoading, suspended } = useAuth();
  const pendingCount = usePendingRequests();
  const { triggerAutoGeo } = useCity();
  const { subIds } = useSubscribedSynaIds();
  const [showHomeBtn, setShowHomeBtn] = useState(false);

  const isPresident = dbRole === "president";
  const hasSynagogue = subIds.length > 0;

  useEffect(() => { triggerAutoGeo(); }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowHomeBtn(window.scrollY > 200 && activeTab !== "dashboard");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeTab]);

  const goHome = useCallback(() => {
    setActiveTab("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const renderTabContent = () => {
    if (isPresident && activeTab === "dashboard") {
      return (
        <Suspense fallback={<LazyFallback />}>
          <PresidentDashboard onLoginClick={() => setAuthOpen(true)} />
        </Suspense>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* Magic Card — contextual smart widget */}
            <MagicCard onNavigate={setActiveTab} />
            <OmerCounterWidget />
            <CountdownWidget />
            <ShabbatWidget />

            {/* Welcome + CTA for users without synagogue */}
            {!hasSynagogue && (
              <div className="rounded-2xl p-5 mb-4 border border-border bg-card text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Votre guide communautaire : horaires, synagogues et siddour.
                </p>
                <button
                  onClick={() => setActiveTab("synagogue")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98] border-none text-primary-foreground"
                  style={{ background: "var(--gradient-gold)" }}
                >
                  <MapPin className="w-4 h-4" />
                  Trouver une synagogue autour de moi
                </button>
              </div>
            )}

            <ZmanimWidget />
            <HolidaysWidget />
            <Suspense fallback={<LazyFallback />}>
              <ParashaSearchWidget />
            </Suspense>
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
      case "siddour": return <Suspense fallback={<LazyFallback />}><SiddourWidget /></Suspense>;
      case "tehilimlibre":
      case "tehilim": return <Suspense fallback={<LazyFallback />}><TehilimCombinedWidget /></Suspense>;
      case "synagogue": return <Suspense fallback={<LazyFallback />}><FideleSynagogueView /></Suspense>;
      case "fetes": return <Suspense fallback={<LazyFallback />}><FestivalCalendar /></Suspense>;
      case "convertisseur": return <Suspense fallback={<LazyFallback />}><DateConverterWidget /></Suspense>;
      case "mizrah": return <Suspense fallback={<LazyFallback />}><MizrahCompass /></Suspense>;
      case "roshhodesh": return <Suspense fallback={<LazyFallback />}><RoshHodeshWidget /></Suspense>;
      case "mariages": return <Suspense fallback={<LazyFallback />}><MariagesWidget /></Suspense>;
      case "reveil": return <Suspense fallback={<LazyFallback />}><AlarmWidget /></Suspense>;
      case "annonces": return <Suspense fallback={<LazyFallback />}><AnnoncesWidget /></Suspense>;
      case "refoua": return <Suspense fallback={<LazyFallback />}><RefouaChelemaWidget /></Suspense>;
      case "minyan": return <Suspense fallback={<LazyFallback />}><MinyanLiveWidget /></Suspense>;
      case "evenements": return <Suspense fallback={<LazyFallback />}><EvenementsWidget /></Suspense>;
      case "courszoom":
      case "coursvirtuel": return <Suspense fallback={<LazyFallback />}><CoursVirtuelWidget /></Suspense>;
      case "affiche": return <Suspense fallback={<LazyFallback />}><AfficheChabbatWidget /></Suspense>;
      case "horaires": return <Suspense fallback={<LazyFallback />}><PrayerTimesWidget /></Suspense>;
      case "infosyna": return <Suspense fallback={<LazyFallback />}><SynaProfileManager /></Suspense>;
      case "shabbatspec": return <Suspense fallback={<LazyFallback />}><ShabbatSpeciauxWidget /></Suspense>;
      case "perso": return <Suspense fallback={<LazyFallback />}><EspacePersonnelWidget /></Suspense>;
      case "alerte": return <Suspense fallback={<LazyFallback />}><AlerteCommunautaireWidget /></Suspense>;
      case "brakhot": return <Suspense fallback={<LazyFallback />}><BrakhotWidget /></Suspense>;
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
      <div className="relative min-h-screen bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="max-w-[600px] mx-auto px-4 pb-24">
            {/* Top bar */}
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
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1 animate-pulse">
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
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-4 text-center">
                <span className="text-2xl">⏸️</span>
                <p className="text-sm font-bold text-destructive mt-2">Votre compte est suspendu</p>
                <p className="text-xs text-muted-foreground mt-1">Contactez l'administrateur pour plus d'informations.</p>
              </div>
            )}

            <DateHeader />
            <InfoCarousel />
            <CitySelector />

            {renderTabContent()}

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

          {/* Floating home button */}
          {showHomeBtn && (
            <button
              onClick={goHome}
              className="fixed z-40 flex items-center gap-1.5 rounded-full border border-border shadow-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-0.5"
              style={{
                bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
                left: "16px",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                padding: "10px 16px",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              <span className="text-base">🏠</span>
              <span className="text-xs font-bold">Accueil</span>
            </button>
          )}

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

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
