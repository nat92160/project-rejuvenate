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

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        ⏰ Zmanim du jour
      </h3>
      <p className="text-xs mt-1 capitalize text-muted-foreground">{city.name}</p>

      {loading ? (
        <div className="mt-5 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl overflow-hidden border border-border">
          {zmanim.map((z, i) => (
            <div
              key={z.label}
              className="flex items-center gap-3.5 py-3 px-4 transition-colors duration-150 hover:bg-muted/50"
              style={{
                borderBottom: i !== zmanim.length - 1 ? "1px solid hsl(var(--border))" : "none",
              }}
            >
              <span className="text-base font-extrabold font-display text-primary" style={{ minWidth: "54px" }}>
                {z.time}
              </span>
              <div className="flex-1">
                <span className="text-sm font-semibold text-foreground">
                  {z.icon} {z.label}
                </span>
                <p className="text-[11px] mt-0.5 text-muted-foreground">{z.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ZmanimWidget;
