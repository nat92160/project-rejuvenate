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
      className="rounded-2xl bg-card p-4 sm:p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold flex items-center gap-2 text-foreground">
          🕯️ Horaires de Chabbat
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {city.name}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-xl animate-pulse bg-muted" />
          <div className="h-16 rounded-xl animate-pulse bg-muted" />
        </div>
      ) : data ? (
        <>
          {/* Times row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-3 sm:p-4 text-center bg-muted/60 border border-border/60">
              <div className="text-[9px] uppercase tracking-[1.5px] mb-1 text-muted-foreground font-semibold">
                Allumage
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-display text-primary leading-tight">
                {data.candleLighting || "--:--"}
              </div>
              <div className="text-[10px] mt-1 capitalize text-muted-foreground leading-tight">
                {data.candleLightingDate}
              </div>
            </div>

            <div className="rounded-xl p-3 sm:p-4 text-center bg-muted/60 border border-border/60">
              <div className="text-[9px] uppercase tracking-[1.5px] mb-1 text-muted-foreground font-semibold">
                Havdala
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-display text-primary leading-tight">
                {data.havdalah || "--:--"}
              </div>
              <div className="text-[10px] mt-1 capitalize text-muted-foreground leading-tight">
                {data.havdalahDate}
              </div>
            </div>
          </div>

          {/* Parasha */}
          {data.parasha && (
            <div className="mt-3 p-3 rounded-xl text-center border border-primary/10"
              style={{ background: "hsl(var(--gold) / 0.04)" }}>
              <div className="text-[9px] uppercase tracking-[1.5px] mb-0.5 text-muted-foreground font-semibold">
                Paracha de la semaine
              </div>
              <div className="font-display text-base font-bold text-foreground leading-tight">
                {data.parasha}
              </div>
              {data.parashaHebrew && (
                <div className="font-hebrew text-sm mt-0.5 text-primary/70" style={{ direction: "rtl" }}>
                  {data.parashaHebrew}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Impossible de charger les horaires</p>
      )}
    </motion.div>
  );
};

export default ShabbatWidget;
