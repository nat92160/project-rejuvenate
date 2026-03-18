import { motion } from "framer-motion";

const zmanimData = [
  { label: "Nets (Lever du soleil)", time: "06:59", icon: "🌅" },
  { label: "Chéma (GR\"A)", time: "09:57", icon: "📖" },
  { label: "'Hatsot (Midi solaire)", time: "13:00", icon: "🕐" },
  { label: "Chkia (Coucher du soleil)", time: "19:03", icon: "🌇" },
  { label: "Tsét haKokhavim", time: "19:42", icon: "⭐" },
];

const ZmanimWidget = () => {
  return (
    <motion.div
      className="rounded-2xl bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
        ⏰ Zmanim du jour
      </h3>
      <p className="text-sm text-muted-foreground mt-1">Paris • mercredi 18 mars 2026</p>

      <div className="mt-5 space-y-1">
        {zmanimData.map((z, i) => (
          <div
            key={z.label}
            className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors hover:bg-secondary ${
              i !== zmanimData.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="text-sm text-foreground flex items-center gap-2">
              <span>{z.icon}</span> {z.label}
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{z.time}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ZmanimWidget;
