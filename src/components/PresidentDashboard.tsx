import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  LayoutDashboard, Megaphone, Bell, Users, BarChart3,
  Settings, MessageSquare, Award, Building2, Calendar,
  BookOpen, Image, Heart as HeartIcon, Droplets, ChevronLeft,
  Menu, X, GraduationCap, Gem, Home
} from "lucide-react";

// Lazy components
const AfficheChabbatWidget = lazy(() => import("./AfficheChabbatWidget"));
const AnnoncesWidget = lazy(() => import("./AnnoncesWidget"));
const RefouaChelemaWidget = lazy(() => import("./RefouaChelemaWidget"));
const MinyanLiveWidget = lazy(() => import("./MinyanLiveWidget"));
const EvenementsWidget = lazy(() => import("./EvenementsWidget"));
const CoursVirtuelWidget = lazy(() => import("./CoursVirtuelWidget"));
const SynaProfileManager = lazy(() => import("./SynaProfileManager"));
const ChatManagement = lazy(() => import("./ChatManagement"));
const AdjointManager = lazy(() => import("./AdjointManager"));
const AlerteCommunautaireWidget = lazy(() => import("./AlerteCommunautaireWidget"));
const MariagesWidget = lazy(() => import("./MariagesWidget"));
const MikveManager = lazy(() => import("./president/MikveManager"));
const DonsManager = lazy(() => import("./president/DonsManager"));
const TehilimCombinedWidget = lazy(() => import("./TehilimCombinedWidget"));

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
    {children}
  </Suspense>
);

/* ─── Menu items ─── */
const pilotageItems = [
  { id: "overview", icon: LayoutDashboard, label: "Pilotage" },
  { id: "annonces", icon: Megaphone, label: "Annonces" },
  { id: "alerte", icon: Bell, label: "Alerte Push" },
  { id: "minyan", icon: Users, label: "Urgence Minyan" },
  { id: "tehilim", icon: BookOpen, label: "Tehilim" },
];

const servicesItems = [
  { id: "affiche", icon: Image, label: "Affiche Chabbat" },
  { id: "evenements", icon: Calendar, label: "Événements" },
  { id: "cours", icon: GraduationCap, label: "Cours Torah" },
  { id: "refoua", icon: HeartIcon, label: "Refoua Chelema" },
  { id: "calendrier-mariages", icon: Gem, label: "Cal. Mariages" },
  { id: "mikve", icon: Droplets, label: "Mikvé" },
  { id: "dons", icon: HeartIcon, label: "Dons" },
];

const adminItems = [
  { id: "syna-profile", icon: Building2, label: "Infos Synagogue" },
  { id: "adjoint", icon: Award, label: "Adjoint" },
  { id: "chat", icon: MessageSquare, label: "Chat Fidèles" },
  { id: "stats", icon: BarChart3, label: "Statistiques" },
];

/* ─── Stats Dashboard ─── */
const StatsDashboard = () => {
  const [stats, setStats] = useState({ annonces: 0, sessions: 0, registrations: 0, evenements: 0, cours: 0 });

  useEffect(() => {
    (async () => {
      const [a, s, r, e, c] = await Promise.all([
        supabase.from("annonces").select("id", { count: "exact", head: true }),
        supabase.from("minyan_sessions").select("id", { count: "exact", head: true }),
        supabase.from("minyan_registrations").select("id", { count: "exact", head: true }),
        supabase.from("evenements").select("id", { count: "exact", head: true }),
        supabase.from("cours_zoom").select("id", { count: "exact", head: true }),
      ]);
      setStats({ annonces: a.count || 0, sessions: s.count || 0, registrations: r.count || 0, evenements: e.count || 0, cours: c.count || 0 });
    })();
  }, []);

  const cards = [
    { label: "Annonces", value: stats.annonces, icon: Megaphone },
    { label: "Sessions Minyan", value: stats.sessions, icon: Users },
    { label: "Inscriptions", value: stats.registrations, icon: Users },
    { label: "Événements", value: stats.evenements, icon: Calendar },
    { label: "Cours", value: stats.cours, icon: BookOpen },
  ];

  return (
    <div>
      <h3 className="font-display text-lg font-bold text-foreground mb-4">Centre de Pilotage</h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-card p-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <c.icon className="w-5 h-5 mx-auto text-primary mb-1" strokeWidth={1.5} />
            <p className="text-2xl font-extrabold font-display text-foreground">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Sidebar Menu Item ─── */
const SidebarItem = ({ item, active, onClick, badge }: { item: typeof pilotageItems[0]; active: boolean; onClick: () => void; badge?: number }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all cursor-pointer border-none ${
      active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    }`}
    style={{ background: active ? "hsl(var(--primary) / 0.08)" : undefined }}
  >
    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
    <span className="flex-1 truncate">{item.label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
        {badge}
      </span>
    )}
  </button>
);

/* ─── Main Dashboard ─── */
interface PresidentDashboardProps {
  onLoginClick?: () => void;
  onSwitchToFidele?: () => void;
}

const PresidentDashboard = ({ onLoginClick, onSwitchToFidele }: PresidentDashboardProps) => {
  const { user, dbRole } = useAuth();
  const [activeFeature, setActiveFeature] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canManage = !!user && dbRole === "president";

  const selectFeature = (id: string) => {
    if (!user) {
      toast.error("Connectez-vous avec un compte Président.");
      onLoginClick?.();
      return;
    }
    if (dbRole !== "president") {
      toast.error("Rôle Président requis.");
      return;
    }
    setActiveFeature(id);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeFeature) {
      case "overview": return <StatsDashboard />;
      case "syna-profile": return <Lazy><SynaProfileManager /></Lazy>;
      case "adjoint": return <Lazy><AdjointManager /></Lazy>;
      case "chat": return <Lazy><ChatManagement /></Lazy>;
      case "affiche": return <Lazy><AfficheChabbatWidget /></Lazy>;
      case "annonces": return <Lazy><AnnoncesWidget /></Lazy>;
      case "alerte": return <Lazy><AlerteCommunautaireWidget /></Lazy>;
      case "refoua": return <Lazy><RefouaChelemaWidget /></Lazy>;
      case "minyan": return <Lazy><MinyanLiveWidget /></Lazy>;
      case "evenements": return <Lazy><EvenementsWidget /></Lazy>;
      case "cours": return <Lazy><CoursVirtuelWidget /></Lazy>;
      case "calendrier-mariages": return <Lazy><MariagesWidget /></Lazy>;
      case "mikve": return <Lazy><MikveManager /></Lazy>;
      case "dons": return <Lazy><DonsManager /></Lazy>;
      case "tehilim": return <Lazy><TehilimCombinedWidget /></Lazy>;
      case "stats": return <StatsDashboard />;
      default: return <StatsDashboard />;
    }
  };

  if (!canManage) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <span className="text-5xl">🏛️</span>
        <h2 className="font-display text-lg font-bold text-foreground mt-4">Espace Président</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          {!user ? "Connectez-vous pour gérer votre communauté." : "Rôle Président requis pour accéder à cet espace."}
        </p>
        {!user && (
          <button
            onClick={onLoginClick}
            className="mt-6 px-7 py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            🔑 Se connecter
          </button>
        )}
      </motion.div>
    );
  }

  const currentLabel = [...pilotageItems, ...servicesItems, ...adminItems].find(i => i.id === activeFeature)?.label || "Pilotage";

  const sidebarContent = (
    <nav className="space-y-5 p-4">
      {/* Return to Fidele view */}
      {onSwitchToFidele && (
        <button
          onClick={() => { onSwitchToFidele(); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-primary cursor-pointer border-none transition-all hover:bg-primary/5"
          style={{ background: "hsl(var(--primary) / 0.04)" }}
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Retour vue Fidèle</span>
        </button>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-2 px-3">Actions urgentes</p>
        {pilotageItems.map(item => (
          <SidebarItem key={item.id} item={item} active={activeFeature === item.id} onClick={() => selectFeature(item.id)} />
        ))}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-2 px-3">Services</p>
        {servicesItems.map(item => (
          <SidebarItem key={item.id} item={item} active={activeFeature === item.id} onClick={() => selectFeature(item.id)} />
        ))}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-2 px-3">Administration</p>
        {adminItems.map(item => (
          <SidebarItem key={item.id} item={item} active={activeFeature === item.id} onClick={() => selectFeature(item.id)} />
        ))}
      </div>
    </nav>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Mobile header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-all active:scale-95"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            🏛️ {currentLabel}
          </h2>
          <p className="text-[10px] text-muted-foreground">Espace Président</p>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[260px] bg-card border-r border-border z-50 overflow-y-auto"
              style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}
            >
              <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <span className="text-xl">🏛️</span>
                <span className="font-display text-sm font-bold text-foreground">Président</span>
                <button onClick={() => setSidebarOpen(false)} className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted border-none bg-transparent">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick action pills (always visible) */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {pilotageItems.map(item => (
          <button
            key={item.id}
            onClick={() => selectFeature(item.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activeFeature === item.id
                ? "border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            style={activeFeature === item.id ? { background: "hsl(var(--primary) / 0.08)" } : { background: "hsl(var(--card))" }}
          >
            <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="min-h-[300px]">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default PresidentDashboard;
