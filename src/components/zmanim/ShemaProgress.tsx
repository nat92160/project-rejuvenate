import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { ZmanItem } from "@/lib/hebcal";

interface ShemaProgressProps {
  zmanim: ZmanItem[];
  isToday: boolean;
}

function timeToMinutes(time: string): number | null {
  if (!time || time === "--:--") return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const ShemaProgress = ({ zmanim, isToday }: ShemaProgressProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, [isToday]);

  // Find the first Chéma item (which is the selected method's — principal)
  const shemaItem = useMemo(() => {
    return zmanim.find(z => z.label.includes('Chéma'));
  }, [zmanim]);

  // Find Alot for the start of the window
  const alotItem = useMemo(() => {
    return zmanim.find(z => z.label.includes("Alot"));
  }, [zmanim]);

  if (!isToday || !shemaItem) return null;

  const shemaMin = timeToMinutes(shemaItem.time);
  if (shemaMin === null) return null;

  const alotMin = alotItem ? timeToMinutes(alotItem.time) : null;
  const currentMin = now.getHours() * 60 + now.getMinutes();

  // Only show between Alot and Sof Zman Chéma
  const windowStart = alotMin ?? (shemaMin - 180);
  if (currentMin >= shemaMin || currentMin < windowStart) return null;

  const totalWindow = shemaMin - windowStart;
  const elapsed = currentMin - windowStart;
  const remaining = shemaMin - currentMin;
  const progress = Math.max(0, Math.min(1, elapsed / totalWindow));

  let barColor = "hsl(142 60% 45%)"; // green
  let label = `Il reste ${remaining} min pour le Chéma`;

  if (remaining <= 10) {
    barColor = "hsl(0 75% 50%)"; // red
    label = `⚠️ ${remaining} min — Imminent !`;
  } else if (remaining <= 30) {
    barColor = "hsl(35 90% 50%)"; // orange
    label = `⏳ Il reste ${remaining} min`;
  }

  return (
    <div className="px-1 mt-1 mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground">📖 Chéma avant {shemaItem.time}</span>
        <span className="text-[10px] font-bold" style={{ color: barColor }}>{label}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

export default ShemaProgress;
