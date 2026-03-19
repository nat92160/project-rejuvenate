import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchNextRoshHodesh, RoshHodeshInfo } from "@/lib/hebcal";

const RoshHodeshWidget = () => {
  const { city } = useCity();
  const [info, setInfo] = useState<RoshHodeshInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setInfo(null);

    fetchNextRoshHodesh(city)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🌙 Prochain Roch 'Hodech
      </h3>

      {loading ? (
        <div className="mt-4 h-16 rounded-xl animate-pulse bg-muted" />
      ) : info ? (
        <div className="mt-4 p-4 rounded-xl border border-primary/12" style={{ background: "hsl(var(--gold) / 0.04)" }}>
          <p className="font-display text-lg font-bold text-foreground text-center">
            🌙 {info.month}
          </p>
          {info.hebrew && (
            <p className="mt-1 text-sm text-center text-primary/70 font-hebrew" style={{ direction: "rtl" }}>
              {info.hebrew}
            </p>
          )}
          <div className="mt-3 space-y-1.5">
            {info.dates.map((dateLabel) => (
              <p key={dateLabel} className="text-sm text-center capitalize text-muted-foreground">
                {dateLabel}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Aucune information disponible</p>
      )}
    </motion.div>
  );
};

export default RoshHodeshWidget;
