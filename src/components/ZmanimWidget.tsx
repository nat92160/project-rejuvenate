import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchZmanim, ZmanItem } from "@/lib/hebcal";

const ZmanimWidget = () => {
  const { city } = useCity();
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchZmanim(city).then((d) => { setZmanim(d); setLoading(false); });
  }, [city]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
      <p className="text-sm text-muted-foreground mt-1 capitalize">{city.name} • {dateStr}</p>

      {loading ? (
        <div className="mt-5 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-0">
          {zmanim.map((z, i) => (
            <div
              key={z.label}
              className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors hover:bg-secondary ${
                i !== zmanim.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="text-sm text-foreground flex items-center gap-2">
                <span>{z.icon}</span> {z.label}
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{z.time}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ZmanimWidget;
