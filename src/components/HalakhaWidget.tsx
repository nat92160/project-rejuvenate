import { motion } from "framer-motion";

const HalakhaWidget = () => {
  return (
    <motion.div
      className="rounded-2xl bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15 }}
    >
      <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
        📖 Halakha du jour
      </h3>
      <p className="text-xs text-gold-dark mt-1 font-medium">Kitsour Ch. A. 80:1</p>

      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
        Il est interdit de cuire, rôtir ou réchauffer de la nourriture pendant Chabbat. 
        Tout aliment consommé chaud le Chabbat doit avoir été placé sur la plaque chauffante 
        (Plata) avant l'entrée du Chabbat.
      </p>

      <button className="mt-4 text-sm text-gold-dark hover:text-gold font-medium transition-colors">
        ▼ Lire la suite
      </button>
    </motion.div>
  );
};

export default HalakhaWidget;
