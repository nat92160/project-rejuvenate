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
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🕯️ Horaires de Chabbat
      </h3>
      <p className="text-xs mt-1 text-muted-foreground">{city.name}</p>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-20 rounded-xl animate-pulse bg-muted" />
          <div className="h-20 rounded-xl animate-pulse bg-muted" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl p-5 text-center bg-muted border border-border transition-all hover:border-primary/20">
              <div className="text-[10px] uppercase tracking-[2px] mb-2 text-muted-foreground font-semibold">
                Allumage
              </div>
              <div className="text-3xl font-extrabold font-display text-primary">
                {data.candleLighting || "--:--"}
              </div>
              <div className="text-[11px] mt-1.5 capitalize text-muted-foreground">
                {data.candleLightingDate}
              </div>
            </div>

            <div className="rounded-xl p-5 text-center bg-muted border border-border transition-all hover:border-primary/20">
              <div className="text-[10px] uppercase tracking-[2px] mb-2 text-muted-foreground font-semibold">
                Havdala
              </div>
              <div className="text-3xl font-extrabold font-display text-primary">
                {data.havdalah || "--:--"}
              </div>
              <div className="text-[11px] mt-1.5 capitalize text-muted-foreground">
                {data.havdalahDate}
              </div>
            </div>
          </div>

          {data.parasha && (
            <div className="mt-4 p-4 rounded-xl text-center border border-primary/12"
              style={{ background: "hsl(var(--gold) / 0.04)" }}>
              <div className="text-[10px] uppercase tracking-[2px] mb-1 text-muted-foreground font-semibold">
                Paracha de la semaine
              </div>
              <div className="font-display text-lg font-bold text-foreground">
                {data.parasha}
              </div>
              {data.parashaHebrew && (
                <div className="font-hebrew text-base mt-1 text-primary/70" style={{ direction: "rtl" }}>
                  {data.parashaHebrew}
                </div>
              )}
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
