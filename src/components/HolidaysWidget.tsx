import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchHolidays, HolidayItem } from "@/lib/hebcal";

const HolidaysWidget = () => {
  const { city } = useCity();
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHolidays(city).then((d) => { setHolidays(d); setLoading(false); });
  }, [city]);

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

      {loading ? (
        <div className="mt-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucune fête à venir</p>
      ) : (
        <div className="mt-5 space-y-3">
          {holidays.map((h) => (
            <div key={h.title + h.date} className="flex items-center justify-between p-4 rounded-xl bg-secondary">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{h.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  {h.hebrew && <p className="text-xs font-hebrew text-muted-foreground">{h.hebrew}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{h.date}</p>
                <p className="text-xs text-gold-dark">dans {h.daysLeft} jour{h.daysLeft > 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default HolidaysWidget;
