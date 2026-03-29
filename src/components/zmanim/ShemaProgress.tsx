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

  const shemaItem = useMemo(() => {
    // Find the GRA Shema (priority) or MGA
    return zmanim.find(z => z.label.includes('Chéma') && z.label.includes('GR"A'))
      || zmanim.find(z => z.label.includes('Chéma'));
  }, [zmanim]);

  if (!isToday || !shemaItem) return null;

  const shemaMin = timeToMinutes(shemaItem.time);
  if (shemaMin === null) return null;

  const currentMin = now.getHours() * 60 + now.getMinutes();

  // Only show before Shema time and after Alot (roughly 4:30 AM)
  if (currentMin >= shemaMin || currentMin < 270) return null;

  // Find sunrise for reference
  const sunriseItem = zmanim.find(z => z.label.includes("Nets"));
  const sunriseMin = sunriseItem ? timeToMinutes(sunriseItem.time) || (shemaMin - 180) : (shemaMin - 180);

  const totalWindow = shemaMin - sunriseMin;
  const elapsed = currentMin - sunriseMin;
  const remaining = shemaMin - currentMin;
  const progress = Math.max(0, Math.min(1, elapsed / totalWindow));

  // Color based on urgency
  let barColor = "hsl(142 60% 45%)"; // green
  let label = `${remaining} min restantes`;

  if (remaining <= 10) {
    barColor = "hsl(0 75% 50%)"; // red
    label = `⚠️ ${remaining} min — Imminent !`;
  } else if (remaining <= 30) {
    barColor = "hsl(35 90% 50%)"; // orange
    label = `⏳ ${remaining} min restantes`;
  }

  return (
    <div className="px-1 mt-1 mb-1">
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
