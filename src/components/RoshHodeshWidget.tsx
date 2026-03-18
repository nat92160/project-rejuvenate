import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";

interface RoshHodeshInfo {
  month: string;
  dates: string[];
  molad?: string;
}

const RoshHodeshWidget = () => {
  const { city } = useCity();
  const [info, setInfo] = useState<RoshHodeshInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const year = now.getFullYear();
    fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&month=x&maj=off&min=off&mod=off&nx=off&ss=off&mf=on&c=off&geo=geoname&geonameid=${city.geonameid}`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || [];
        const roshChodeshItems = items
          .filter((i: any) => i.category === "roshchodesh" && new Date(i.date) >= now)
          .slice(0, 2);

        if (roshChodeshItems.length > 0) {
          const first = roshChodeshItems[0];
          const monthName = first.title.replace("Rosh Chodesh ", "");
          const dates = roshChodeshItems
            .filter((i: any) => i.title === first.title)
            .map((i: any) => new Date(i.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));

          setInfo({ month: monthName, dates });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
          <div className="mt-3 space-y-1.5">
            {info.dates.map((d, i) => (
              <p key={i} className="text-sm text-center capitalize text-muted-foreground">
                {d}
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
