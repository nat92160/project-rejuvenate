import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";
import { getParashaInfo } from "@/lib/parashot-data";

const ParashaDetailsWidget = () => {
  const { city } = useCity();
  const [parasha, setParasha] = useState<string>("");

  useEffect(() => {
    fetchShabbatTimes(city).then((d) => { if (d?.parasha) setParasha(d.parasha); });
  }, [city]);

  const info = getParashaInfo(parasha);
  if (!info) return null;

  const cleanName = parasha.replace(/^Paracha\s+/i, "");

  return (
    <motion.div
      className="rounded-2xl bg-card p-4 sm:p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="font-display text-sm font-bold flex items-center justify-center gap-2 text-foreground mb-3">
        📖 Détails de la Paracha
      </h3>

      <div className="text-center mb-3 pb-3 border-b border-border">
        <div className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground font-semibold">
          Paracha de la semaine
        </div>
        <div className="font-display text-base font-bold text-foreground mt-0.5">
          Paracha {cleanName}
        </div>
      </div>

      <ul className="space-y-1.5 text-sm text-foreground">
        <li className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span><span className="font-semibold">Livre :</span> {info.book}</span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span><span className="font-semibold">Chapitres :</span> {info.chapters}</span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span><span className="font-semibold">Versets :</span> {info.verses}</span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span><span className="font-semibold">Haftara :</span> {info.haftara}</span>
        </li>
      </ul>

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
          ✨ Dvar Torah
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{info.dvar}</p>
      </div>
    </motion.div>
  );
};

export default ParashaDetailsWidget;