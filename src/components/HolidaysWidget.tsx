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
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🎉 Prochaines Fêtes
      </h3>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse bg-muted" />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucune fête à venir</p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {holidays.map((h) => (
            <div
              key={h.title + h.date}
              className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 bg-card border border-border hover:border-primary/15 hover:bg-muted/30"
              style={{ borderLeft: "3px solid hsl(var(--gold))" }}
            >
              <span className="text-2xl flex-shrink-0">{h.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {h.title}
                  {h.hebrew && (
                    <span className="font-hebrew ml-2 text-sm text-primary/70" style={{ direction: "rtl" }}>
                      {h.hebrew}
                    </span>
                  )}
                </p>
                <p className="text-[11px] mt-0.5 text-muted-foreground">{h.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border border-primary/20 text-primary"
                  style={{ background: "hsl(var(--gold) / 0.08)" }}>
                  {h.daysLeft}j
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default HolidaysWidget;
