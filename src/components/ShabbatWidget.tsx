import { motion } from "framer-motion";

const ShabbatWidget = () => {
  return (
    <motion.div
      className="rounded-2xl bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
        🕯️ Horaires de Chabbat
      </h3>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
          <div>
            <p className="text-sm text-muted-foreground">🕯️ Allumage des bougies</p>
            <p className="text-xs text-muted-foreground mt-1">vendredi — 18 min avant le coucher</p>
          </div>
          <span className="text-2xl font-serif font-bold text-foreground tabular-nums">18:45</span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
          <div>
            <p className="text-sm text-muted-foreground">✨ Havdala</p>
            <p className="text-xs text-muted-foreground mt-1">samedi — Sortie des étoiles</p>
          </div>
          <span className="text-2xl font-serif font-bold text-foreground tabular-nums">19:52</span>
        </div>
      </div>

      <div className="mt-5 p-4 rounded-xl border border-border bg-card text-center">
        <p className="text-sm text-muted-foreground">📖 Paracha de la semaine</p>
        <p className="text-lg font-serif font-semibold text-foreground mt-1">Vayikra</p>
        <p className="font-hebrew text-gold-dark mt-0.5">פרשת ויקרא</p>
      </div>
    </motion.div>
  );
};

export default ShabbatWidget;
