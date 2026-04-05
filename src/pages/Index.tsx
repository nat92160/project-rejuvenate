import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { CityProvider } from "@/hooks/useCity";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";

import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import MySynagogueCard from "@/components/MySynagogueCard";
import { getCurrentPrayer } from "@/components/MySynagogueCard";
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";
import { User } from "lucide-react";
import StarOfDavid from "@/components/StarOfDavid";
import { useSynaServices } from "@/hooks/useSynaServices";
import { Droplets, ExternalLink } from "lucide-react";
import GreetingHeader from "@/components/GreetingHeader";
import QuickActions from "@/components/QuickActions";
const SpiritualTimeline = lazy(() => import("@/components/SpiritualTimeline"));

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
const SynagogueChooser = lazy(() => import("@/components/SynagogueChooser"));
const SynaProfileManager = lazy(() => import("@/components/SynaProfileManager"));
const PrayerTimesWidget = lazy(() => import("@/components/PrayerTimesWidget"));
const SiddourWidget = lazy(() => import("@/components/SiddourWidget"));
const EspacePersonnelWidget = lazy(() => import("@/components/EspacePersonnelWidget"));
const AlerteCommunautaireWidget = lazy(() => import("@/components/AlerteCommunautaireWidget"));
const BrakhotWidget = lazy(() => import("@/components/BrakhotWidget"));
const InfoCarousel = lazy(() => import("@/components/InfoCarousel"));
const MikveInfoView = lazy(() => import("@/components/MikveInfoView"));
const CitySelector = lazy(() => import("@/components/CitySelector"));

import { useOmerVisibility } from "@/hooks/useOmerVisibility";

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
    {children}
  </Suspense>
);

const OmerGated = () => {
  const { visible, isBeforeCountingTime } = useOmerVisibility();
  if (!visible) return null;
  return <Lazy><OmerCounterWidget isBeforeCountingTime={isBeforeCountingTime} /></Lazy>;
};

/* ─── Shabbat countdown (J-1 only, relative format) ─── */
const ShabbatCountdownBanner = () => {
  const { city } = useCity();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [candleTime, setCandleTime] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    fetchShabbatTimes(city).then((data) => {
      if (cancelled) return;
      if (!data?.candleLightingDateTime) return;
      setCandleTime(data.candleLighting);

      const update = () => {
        const now = Date.now();
        const target = data.candleLightingDateTime!.getTime();
        const diff = target - now;
        if (diff <= 0) { setTimeLeft(null); return; }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);

        // Only show if less than ~30h away (J-1)
        if (h > 30) { setTimeLeft(null); return; }

        if (h > 0) setTimeLeft(`${h}h ${String(m).padStart(2, "0")}min`);
        else setTimeLeft(`${m} min`);
      };

      update();
      intervalId = setInterval(update, 30000);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [city]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.includes("min") && !timeLeft.includes("h");

  return (
    <div
      className={`rounded-2xl p-4 mb-6 flex items-center justify-between border ${
        isUrgent ? "border-destructive/30" : "border-border"
      }`}
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, hsl(var(--destructive) / 0.06), hsl(var(--destructive) / 0.02))"
          : "hsl(var(--gold) / 0.04)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🕯️</span>
        <div>
          <div className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground">
            {isUrgent ? "Allumez les bougies !" : "Chabbat"}
          </div>
          {candleTime && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Allumage à {candleTime}
            </div>
          )}
        </div>
      </div>
      <div
        className={`text-xl font-extrabold font-display tabular-nums ${isUrgent ? "text-destructive" : ""}`}
        style={isUrgent ? {} : { color: "hsl(var(--gold-matte))" }}
      >
        {timeLeft}
      </div>
    </div>
  );
};

/* ─── (PowerButton removed — replaced by QuickActions) ─── */

/* ─── Ultra-thin Header Bar ─── */
const HeaderBar = ({ onLogoClick, user, isAdmin, isPresident, pendingCount, signOut, onLoginClick }: any) => (
  <div className="flex items-center justify-between py-4 mb-2">
    <button
      onClick={onLogoClick}
      className="inline-flex items-center gap-2 bg-transparent border-none cursor-pointer p-1 -m-1 active:scale-95 transition-transform"
    >
      <StarOfDavid size={22} />
      <span className="font-display text-base font-bold tracking-tight text-foreground">
        Chabbat <span className="text-primary">Chalom</span>
      </span>
    </button>

    <div className="flex items-center gap-2">
      {isAdmin && (
        <button
          onClick={() => window.location.assign("/admin")}
          className="relative h-8 w-8 rounded-xl bg-card border border-border flex items-center justify-center text-sm cursor-pointer hover:bg-muted transition-all active:scale-95"
          title="Admin"
        >
          🔔
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
              {pendingCount}
            </span>
          )}
        </button>
      )}
      {isPresident && (
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
        >
          Président
        </span>
      )}
      {user ? (
        <button
          onClick={signOut}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all active:scale-95 bg-muted text-muted-foreground border-none hover:bg-muted/80"
        >
          Déconnexion
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="h-8 w-8 rounded-xl bg-card border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-all active:scale-95"
          title="Se connecter"
        >
          <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </button>
      )}
    </div>
  </div>
);

/* ─── Dashboard Home with conditional services ─── */
const DashboardHome = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const currentPrayer = getCurrentPrayer();
  const { services } = useSynaServices();

  return (
    <>
      <GreetingHeader />
      <Lazy><CitySelector /></Lazy>
      <MySynagogueCard onNavigate={setActiveTab} />
      <ShabbatCountdownBanner />
      <QuickActions onNavigate={setActiveTab} currentPrayer={currentPrayer} />

      {/* Conditional services from subscribed synagogue */}
      {(services?.mikveEnabled || services?.donationLink) && (
        <div className="flex gap-3 mb-6">
          {services.mikveEnabled && (
            <button
              onClick={() => setActiveTab("mikve-info")}
              className="flex-1 flex items-center gap-2.5 p-3.5 rounded-2xl border border-border bg-card cursor-pointer transition-all active:scale-[0.97] hover:bg-muted/50"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Droplets className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-bold text-foreground">Mikvé</span>
            </button>
          )}
          {services.donationLink && (
            <a
              href={services.donationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border-none cursor-pointer transition-all active:scale-[0.97] hover:-translate-y-0.5 no-underline"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)", color: "hsl(var(--primary-foreground))" }}
            >
              <span className="text-sm">💛</span>
              <span className="text-xs font-bold">Faire un don</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <Lazy><SpiritualTimeline /></Lazy>
      <OmerGated />
    </>
  );
};

const IndexContent = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authOpen, setAuthOpen] = useState(false);

  const { role, setRole } = useRole();
  const { user, dbRole, isAdmin, signOut, loading: authLoading, suspended } = useAuth();
  const pendingCount = usePendingRequests();
  const { triggerAutoGeo, city } = useCity();
  const [showHomeBtn, setShowHomeBtn] = useState(false);

  const isPresident = dbRole === "president";
  const currentPrayer = getCurrentPrayer();

  useEffect(() => { triggerAutoGeo(); }, []);

  // Listen for auth modal trigger from OmerWidget
  useEffect(() => {
    const handler = () => setAuthOpen(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

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

  // President sees fidele dashboard by default, can switch to president mode
  const isPresidentDashboard = activeTab === "president-dashboard";

  const renderTabContent = () => {
    if (activeTab === "president-dashboard") {
      return <Lazy><PresidentDashboard onLoginClick={() => setAuthOpen(true)} onSwitchToFidele={() => setActiveTab("dashboard")} /></Lazy>;
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* Bouton basculer vers interface président */}
            {isPresident && (
              <button
                onClick={() => setActiveTab("president-dashboard")}
                className="w-full mb-5 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-none cursor-pointer transition-all active:scale-[0.98] hover:-translate-y-0.5"
                style={{
                  background: "var(--gradient-gold)",
                  boxShadow: "var(--shadow-gold)",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                <span className="text-base">🏛️</span>
                <span className="text-sm font-bold">Gérer ma synagogue</span>
                <span className="text-xs opacity-70">→</span>
              </button>
            )}
            <DashboardHome setActiveTab={setActiveTab} />
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
      case "siddour": return <Lazy><SiddourWidget initialOffice={currentPrayer === "Cha'harit" ? "shacharit" : currentPrayer === "Min'ha" ? "minha" : "arvit"} /></Lazy>;
      case "tehilimlibre":
      case "tehilim": return <Lazy><TehilimCombinedWidget /></Lazy>;
      case "synagogue": return <Lazy><FideleSynagogueView /></Lazy>;
      case "chooser": return <Lazy><SynagogueChooser onSelect={() => setActiveTab("dashboard")} /></Lazy>;
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
      case "mikve-info": return <Lazy><MikveInfoView /></Lazy>;
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
        <div className={`max-w-[600px] mx-auto px-5 ${isPresidentDashboard ? "pb-6" : "pb-24"}`}>
          {/* Ultra-thin header bar */}
          <HeaderBar
            onLogoClick={goHome}
            user={user}
            isAdmin={isAdmin}
            isPresident={isPresident}
            pendingCount={pendingCount}
            signOut={signOut}
            onLoginClick={() => setAuthOpen(true)}
          />

          {suspended && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-4 text-center">
              <span className="text-2xl">⏸️</span>
              <p className="text-sm font-bold text-destructive mt-2">Votre compte est suspendu</p>
              <p className="text-xs text-muted-foreground mt-1">Contactez l'administrateur.</p>
            </div>
          )}

          {renderTabContent()}

          <div className="text-center py-6 mt-12">
            <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">
              Horaires vérifiés par la communauté à {city?.name || "votre ville"}
            </p>
            <p className="text-[10px] text-muted-foreground/30 font-medium tracking-wider uppercase mt-1">
              Chabbat Chalom © {new Date().getFullYear()}
            </p>
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
      </div>

      {!isPresidentDashboard && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}

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
