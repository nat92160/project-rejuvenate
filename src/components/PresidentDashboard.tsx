import { motion } from "framer-motion";

const features = [
  {
    icon: "📋",
    title: "Affiche Chabbat",
    desc: "Créez et partagez l'affiche hebdomadaire de votre synagogue avec les horaires personnalisés.",
    status: "soon" as const,
  },
  {
    icon: "📢",
    title: "Annonces",
    desc: "Publiez des annonces pour vos fidèles : événements, cours, célébrations.",
    status: "soon" as const,
  },
  {
    icon: "🙏",
    title: "Refoua Chelema",
    desc: "Gérez la liste des malades à mentionner pendant la prière.",
    status: "soon" as const,
  },
  {
    icon: "👥",
    title: "Minyan Live",
    desc: "Compteur en temps réel pour savoir si le minyan est atteint.",
    status: "soon" as const,
  },
  {
    icon: "📅",
    title: "Événements",
    desc: "Planifiez et gérez les événements communautaires.",
    status: "soon" as const,
  },
  {
    icon: "🎥",
    title: "Cours Zoom",
    desc: "Ajoutez des liens vers vos cours en ligne pour les fidèles.",
    status: "soon" as const,
  },
];

const PresidentDashboard = () => {
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
          Depuis cet espace, vous pourrez gérer les annonces, l'affiche de Chabbat, le minyan et bien plus.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all cursor-pointer hover:-translate-y-0.5"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-display text-sm font-bold mt-2 text-foreground">{f.title}</h3>
            <p className="text-[11px] mt-1 text-muted-foreground leading-snug">{f.desc}</p>
            <span
              className="inline-block mt-2.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
            >
              Bientôt
            </span>
          </motion.div>
        ))}
      </div>

      {/* Connect CTA */}
      <div className="rounded-2xl bg-card p-6 mt-5 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-sm text-muted-foreground mb-4">
          Connectez-vous pour accéder à toutes les fonctionnalités de gestion.
        </p>
        <button
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
