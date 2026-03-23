import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";

import AppHeader from "@/components/AppHeader";
import DateHeader from "@/components/DateHeader";
import CitySelector from "@/components/CitySelector";
import MySynagogueCard from "@/components/MySynagogueCard";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, type ShabbatTimes } from "@/lib/hebcal";
import { Book, Heart, MapPin } from "lucide-react";

// Lazy-loaded modules
const CountdownWidget = lazy(() => import("@/components/CountdownWidget"));
const ShabbatWidget = lazy(() => import("@/components/ShabbatWidget"));
const ZmanimWidget = lazy(() => import("@/components/ZmanimWidget"));
const HolidaysWidget = lazy(() => import("@/components/HolidaysWidget"));
const OmerCounterWidget = lazy(() => import("@/components/OmerCounterWidget"));
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
const InfoCarousel = lazy(() => import("@/components/InfoCarousel"));

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
    {children}
  </Suspense>
);

/* ─── Shabbat mini-indicator (shown outside Friday) ─── */
const ShabbatMiniIndicator = () => {
  const { city } = useCity();
  const [candles, setCandles] = useState<string | null>(null);
  const now = new Date();
  const isFriday = now.getDay() === 5;

  useEffect(() => {
    fetchShabbatTimes(city).then((d) => d && setCandles(d.candleLighting));
  }, [city]);

  if (!candles) return null;

  // Friday → full countdown shown elsewhere
  if (isFriday) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <span>🕯️</span>
      <span>Allumage vendredi à <strong className="text-foreground">{candles}</strong></span>
    </div>
  );
};

/* ─── Quick Action Button ─── */
const QuickAction = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border border-border bg-card cursor-pointer transition-all active:scale-[0.96] hover:bg-muted"
    style={{ boxShadow: "var(--shadow-soft)" }}
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.08)" }}>
      {icon}
    </div>
    <span className="text-xs font-semibold text-foreground">{label}</span>
  </button>
);

const IndexContent = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);

  const { role, setRole } = useRole();
  const { user, dbRole, isAdmin, signOut, loading: authLoading, suspended } = useAuth();
  const pendingCount = usePendingRequests();
  const { triggerAutoGeo } = useCity();
  const [showHomeBtn, setShowHomeBtn] = useState(false);

  const isPresident = dbRole === "president";

  useEffect(() => { triggerAutoGeo(); }, []);

  useEffect(() => {
    const onScroll = () => setShowHomeBtn(window.scrollY > 200 && activeTab !== "dashboard");
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
      return <Lazy><PresidentDashboard onLoginClick={() => setAuthOpen(true)} /></Lazy>;
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* 1. Ma Synagogue — hero card */}
            <MySynagogueCard onNavigate={setActiveTab} />

            {/* 2. Shabbat indicator (discreet, non-Friday) */}
            <ShabbatMiniIndicator />

            {/* 3. Friday → full countdown */}
            {new Date().getDay() === 5 && (
              <Lazy><CountdownWidget /></Lazy>
            )}

            {/* 4. Quick actions */}
            <div className="flex gap-3 mb-6">
              <QuickAction
                icon={<Book className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />}
                label="Siddour"
                onClick={() => setActiveTab("siddour")}
              />
              <QuickAction
                icon={<Heart className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />}
                label="Tehilim"
                onClick={() => setActiveTab("tehilim")}
              />
              <QuickAction
                icon={<MapPin className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />}
                label="Synagogues"
                onClick={() => setActiveTab("synagogue")}
              />
            </div>

            {/* 5. Omer if applicable */}
            <Lazy><OmerCounterWidget /></Lazy>
          </>
        );
      case "zmanim": return <Lazy><ZmanimWidget /></Lazy>;
      case "chabbat": return <Lazy><><CountdownWidget /><ShabbatWidget /></></Lazy>;
      case "explorer":
        return (
          <div className="rounded-2xl bg-card p-8 mb-4 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-5xl">🗺️</span>
            <h3 className="font-display text-lg font-bold mt-4 text-foreground">Explorer</h3>
            <p className="text-sm mt-2 text-muted-foreground">Bientôt disponible</p>
          </div>
        );
      case "siddour": return <Lazy><SiddourWidget /></Lazy>;
      case "tehilimlibre":
      case "tehilim": return <Lazy><TehilimCombinedWidget /></Lazy>;
      case "synagogue": return <Lazy><FideleSynagogueView /></Lazy>;
      case "fetes": return <Lazy><FestivalCalendar /></Lazy>;
      case "convertisseur": return <Lazy><DateConverterWidget /></Lazy>;
      case "mizrah": return <Lazy><MizrahCompass /></Lazy>;
      case "roshhodesh": return <Lazy><RoshHodeshWidget /></Lazy>;
      case "mariages": return <Lazy><MariagesWidget /></Lazy>;
      case "reveil": return <Lazy><AlarmWidget /></Lazy>;
      case "annonces": return <Lazy><AnnoncesWidget /></Lazy>;
      case "refoua": return <Lazy><RefouaChelemaWidget /></Lazy>;
      case "minyan": return <Lazy><MinyanLiveWidget /></Lazy>;
      case "evenements": return <Lazy><EvenementsWidget /></Lazy>;
      case "courszoom":
      case "coursvirtuel": return <Lazy><CoursVirtuelWidget /></Lazy>;
      case "affiche": return <Lazy><AfficheChabbatWidget /></Lazy>;
      case "horaires": return <Lazy><PrayerTimesWidget /></Lazy>;
      case "infosyna": return <Lazy><SynaProfileManager /></Lazy>;
      case "shabbatspec": return <Lazy><ShabbatSpeciauxWidget /></Lazy>;
      case "perso": return <Lazy><EspacePersonnelWidget /></Lazy>;
      case "alerte": return <Lazy><AlerteCommunautaireWidget /></Lazy>;
      case "brakhot": return <Lazy><BrakhotWidget /></Lazy>;
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
              <p className="text-xs text-muted-foreground mt-1">Contactez l'administrateur.</p>
            </div>
          )}

          {/* Date header — compact */}
          <DateHeader />

          {/* City selector — only when on dashboard */}
          {activeTab === "dashboard" && <CitySelector />}

          {renderTabContent()}

          {/* Login CTA */}
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

          <div className="text-center py-6 mt-12 text-[11px] text-muted-foreground/60">
            Chabbat Chalom © {new Date().getFullYear()}
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
