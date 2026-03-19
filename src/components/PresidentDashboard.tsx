import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AfficheChabbatWidget from "./AfficheChabbatWidget";
import AnnoncesWidget from "./AnnoncesWidget";
import RefouaChelemaWidget from "./RefouaChelemaWidget";
import MinyanLiveWidget from "./MinyanLiveWidget";
import EvenementsWidget from "./EvenementsWidget";
import CoursVirtuelWidget from "./CoursVirtuelWidget";

const features = [
  { id: "affiche", icon: "📋", title: "Affiche Chabbat" },
  { id: "annonces", icon: "📢", title: "Annonces" },
  { id: "refoua", icon: "🙏", title: "Refoua Chelema" },
  { id: "minyan", icon: "👥", title: "Minyan Live" },
  { id: "evenements", icon: "📅", title: "Événements" },
  { id: "cours", icon: "🎥", title: "Cours en ligne" },
  { id: "stats", icon: "📊", title: "Statistiques" },
];

interface PresidentDashboardProps {
  onLoginClick?: () => void;
}

// CreateMinyanForm removed — creation is now integrated into MinyanLiveWidget
const StatsDashboard = () => {
  const [stats, setStats] = useState({ annonces: 0, sessions: 0, registrations: 0, evenements: 0, cours: 0 });
  const [recentRegs, setRecentRegs] = useState<{ display_name: string; office_type: string; office_date: string }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [annonces, sessions, regs, events, cours] = await Promise.all([
        supabase.from("annonces").select("id", { count: "exact", head: true }),
        supabase.from("minyan_sessions").select("id", { count: "exact", head: true }),
        supabase.from("minyan_registrations").select("id", { count: "exact", head: true }),
        supabase.from("evenements").select("id", { count: "exact", head: true }),
        supabase.from("cours_zoom").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        annonces: annonces.count || 0,
        sessions: sessions.count || 0,
        registrations: regs.count || 0,
        evenements: events.count || 0,
        cours: cours.count || 0,
      });

      const { data } = await supabase
        .from("minyan_registrations")
        .select("display_name, session_id")
        .order("registered_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const sessionIds = [...new Set(data.map((d) => d.session_id))];
        const { data: sessionsData } = await supabase
          .from("minyan_sessions")
          .select("id, office_type, office_date")
          .in("id", sessionIds);

        const sessionMap = new Map((sessionsData || []).map((s) => [s.id, s]));
        setRecentRegs(
          data.map((d) => {
            const s = sessionMap.get(d.session_id);
            return { display_name: d.display_name, office_type: s?.office_type || "", office_date: s?.office_date || "" };
          })
        );
      }
    };

    void fetchStats();
  }, []);

  const statCards = [
    { label: "Annonces", value: stats.annonces, icon: "📢" },
    { label: "Sessions Minyan", value: stats.sessions, icon: "🕍" },
    { label: "Inscriptions Minyan", value: stats.registrations, icon: "👥" },
    { label: "Événements", value: stats.evenements, icon: "📅" },
    { label: "Cours Zoom", value: stats.cours, icon: "🎥" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2 mb-4">
        📊 Tableau de bord
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-extrabold font-display text-foreground mt-1">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {recentRegs.length > 0 && (
        <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <h4 className="font-display text-sm font-bold text-foreground mb-3">Dernières inscriptions Minyan</h4>
          <div className="space-y-2">
            {recentRegs.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium">{r.display_name}</span>
                <span className="text-muted-foreground">{r.office_type} — {r.office_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const PresidentDashboard = ({ onLoginClick }: PresidentDashboardProps) => {
  const { user, dbRole } = useAuth();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const canManage = !!user && dbRole === "president";

  const openFeature = (featureId: string) => {
    if (!user) {
      toast.error("Connectez-vous avec un compte Président.");
      onLoginClick?.();
      return;
    }

    if (dbRole !== "president") {
      toast.error("Votre compte est connecté, mais il n'a pas le rôle Président.");
      return;
    }

    setActiveFeature(featureId);
  };

  const renderFeature = () => {
    switch (activeFeature) {
      case "affiche": return <AfficheChabbatWidget />;
      case "annonces": return <AnnoncesWidget />;
      case "refoua": return <RefouaChelemaWidget />;
      case "minyan": return <MinyanLiveWidget />;
      case "create-minyan":
      case "minyan": return <MinyanLiveWidget />;
      case "evenements": return <EvenementsWidget />;
      case "cours": return <CoursVirtuelWidget />;
      case "stats": return <StatsDashboard />;
      default: return null;
    }
  };

  if (activeFeature) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={() => setActiveFeature(null)}
          className="flex items-center gap-2 mb-4 text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline"
        >
          ← Retour à l'espace Président
        </button>
        {renderFeature()}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-6 mb-5 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏛️</span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Espace Président</h2>
            <p className="text-xs text-muted-foreground">Gérez votre synagogue</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {canManage
            ? "Depuis cet espace, gérez les annonces, l'affiche de Chabbat, le minyan et bien plus."
            : "Les outils de gestion sont activés uniquement pour un compte connecté avec le rôle Président côté backend."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => openFeature(f.id)}
            className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all cursor-pointer hover:-translate-y-0.5 text-left"
            style={{ boxShadow: "var(--shadow-card)", opacity: canManage ? 1 : 0.78 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: canManage ? 1 : 0.78, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-display text-sm font-bold mt-2 text-foreground">{f.title}</h3>
            <span
              className="inline-block mt-2.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
            >
              {canManage ? "Ouvrir →" : user ? "Accès requis" : "Connexion"}
            </span>
          </motion.button>
        ))}
      </div>

      {!canManage && (
        <div className="rounded-2xl bg-card p-6 mt-5 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground mb-4">
            {!user
              ? "Connectez-vous pour gérer votre communauté."
              : "Votre compte est connecté, mais il n'a pas encore le rôle Président dans la base."}
          </p>
          {!user && (
            <button
              onClick={onLoginClick}
              className="px-7 py-3.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              🔑 Se connecter
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default PresidentDashboard;
