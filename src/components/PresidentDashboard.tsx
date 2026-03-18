import { useState } from "react";
import { motion } from "framer-motion";
import AfficheChabbatWidget from "./AfficheChabbatWidget";
import AnnoncesWidget from "./AnnoncesWidget";
import RefouaChelemaWidget from "./RefouaChelemaWidget";
import MinyanLiveWidget from "./MinyanLiveWidget";
import EvenementsWidget from "./EvenementsWidget";
import CoursZoomWidget from "./CoursZoomWidget";
import CoursVirtuelWidget from "./CoursVirtuelWidget";

const features = [
  { id: "affiche", icon: "📋", title: "Affiche Chabbat" },
  { id: "annonces", icon: "📢", title: "Annonces" },
  { id: "refoua", icon: "🙏", title: "Refoua Chelema" },
  { id: "minyan", icon: "👥", title: "Minyan Live" },
  { id: "evenements", icon: "📅", title: "Événements" },
  { id: "cours", icon: "📚", title: "Cours Zoom" },
  { id: "coursvirtuel", icon: "🎥", title: "Cours Virtuel" },
];

interface PresidentDashboardProps {
  onLoginClick?: () => void;
}

const PresidentDashboard = ({ onLoginClick }: PresidentDashboardProps) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const renderFeature = () => {
    switch (activeFeature) {
      case "affiche": return <AfficheChabbatWidget />;
      case "annonces": return <AnnoncesWidget />;
      case "refoua": return <RefouaChelemaWidget />;
      case "minyan": return <MinyanLiveWidget />;
      case "evenements": return <EvenementsWidget />;
      case "cours": return <CoursZoomWidget />;
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
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 mb-5 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏛️</span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Espace Président</h2>
            <p className="text-xs text-muted-foreground">Gérez votre synagogue</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Depuis cet espace, gérez les annonces, l'affiche de Chabbat, le minyan et bien plus.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => setActiveFeature(f.id)}
            className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all cursor-pointer hover:-translate-y-0.5 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-display text-sm font-bold mt-2 text-foreground">{f.title}</h3>
            <span
              className="inline-block mt-2.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
            >
              Ouvrir →
            </span>
          </motion.button>
        ))}
      </div>

      {/* Connect CTA */}
      <div className="rounded-2xl bg-card p-6 mt-5 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-sm text-muted-foreground mb-4">
          Connectez-vous pour sauvegarder vos données et gérer votre communauté.
        </p>
        <button
          onClick={onLoginClick}
          className="px-7 py-3.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
        >
          🔑 Se connecter
        </button>
      </div>
    </motion.div>
  );
};

export default PresidentDashboard;
