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
      className="rounded-3xl bg-white p-6 mb-4"
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="font-hebrew text-lg font-semibold flex items-center gap-2" style={{ color: "#1E293B" }}>
        🎉 Prochaines Fêtes
      </h3>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#F1F5F9" }} />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "#94A3B8" }}>Aucune fête à venir</p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {holidays.map((h) => (
            <div
              key={h.title + h.date}
              className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.06)",
                borderLeft: "3px solid #D4AF37",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <span className="text-2xl flex-shrink-0">{h.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#1E293B" }}>
                  {h.title}
                  {h.hebrew && (
                    <span className="font-hebrew ml-2 text-sm" style={{ color: "#D4AF37", direction: "rtl" }}>
                      {h.hebrew}
                    </span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{h.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide"
                  style={{
                    background: "rgba(212, 168, 67, 0.2)",
                    color: "#C5943A",
                    border: "1px solid rgba(212, 168, 67, 0.3)",
                    fontSize: "0.72rem",
                  }}>
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
