import { motion } from "framer-motion";

const holidays = [
  { name: "Erev Pessa'h", hebrew: "ערב פסח", date: "31 mars", daysLeft: 14, emoji: "🫓" },
  { name: "Pessa'h I", hebrew: "פסח", date: "1 avril", daysLeft: 15, emoji: "🍷" },
  { name: "Pessa'h II", hebrew: "פסח", date: "2 avril", daysLeft: 16, emoji: "📖" },
];

const HolidaysWidget = () => {
  return (
    <motion.div
      className="rounded-2xl bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
        🎉 Prochaines Fêtes
      </h3>

      <div className="mt-5 space-y-3">
        {holidays.map((h) => (
          <div
            key={h.name}
            className="flex items-center justify-between p-4 rounded-xl bg-secondary"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{h.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{h.name}</p>
                <p className="text-xs font-hebrew text-muted-foreground">{h.hebrew}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{h.date}</p>
              <p className="text-xs text-gold-dark">dans {h.daysLeft} jours</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default HolidaysWidget;
