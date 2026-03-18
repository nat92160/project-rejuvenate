import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";

const ShabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => { setData(d); setLoading(false); });
  }, [city]);

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
      <p className="text-xs text-muted-foreground mt-1">{city.name}</p>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-20 rounded-xl bg-secondary animate-pulse" />
          <div className="h-20 rounded-xl bg-secondary animate-pulse" />
        </div>
      ) : data ? (
        <>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
              <div>
                <p className="text-sm text-muted-foreground">🕯️ Allumage des bougies</p>
                <p className="text-xs text-muted-foreground mt-1">{data.candleLightingDate}</p>
              </div>
              <span className="text-2xl font-serif font-bold text-foreground tabular-nums">{data.candleLighting || "--:--"}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
              <div>
                <p className="text-sm text-muted-foreground">✨ Havdala</p>
                <p className="text-xs text-muted-foreground mt-1">{data.havdalahDate}</p>
              </div>
              <span className="text-2xl font-serif font-bold text-foreground tabular-nums">{data.havdalah || "--:--"}</span>
            </div>
          </div>

          {data.parasha && (
            <div className="mt-5 p-4 rounded-xl border border-border bg-card text-center">
              <p className="text-sm text-muted-foreground">📖 Paracha de la semaine</p>
              <p className="text-lg font-serif font-semibold text-foreground mt-1">{data.parasha}</p>
              {data.parashaHebrew && <p className="font-hebrew text-gold-dark mt-0.5">{data.parashaHebrew}</p>}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Impossible de charger les horaires</p>
      )}
    </motion.div>
  );
};

export default ShabbatWidget;
