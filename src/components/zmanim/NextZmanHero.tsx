import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ZmanItem } from "@/lib/hebcal";

interface NextZmanHeroProps {
  zmanim: ZmanItem[];
  isToday: boolean;
}

function timeToMinutes(time: string): number | null {
  if (!time || time === "--:--") return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type TimeOfDay = "morning" | "afternoon" | "evening";

function getTimeOfDay(min: number): TimeOfDay {
  if (min < 720) return "morning";
  if (min < 1080) return "afternoon";
  return "evening";
}

const STYLES: Record<TimeOfDay, { bg: string; border: string; shadow: string; accent: string; sub: string }> = {
  morning: {
    bg: "linear-gradient(135deg, hsl(45 80% 60% / 0.12), hsl(35 70% 65% / 0.06))",
    border: "hsl(var(--gold) / 0.25)",
    shadow: "0 4px 20px hsl(var(--gold) / 0.1)",
    accent: "hsl(var(--gold-matte))",
    sub: "hsl(var(--gold) / 0.8)",
  },
  afternoon: {
    bg: "linear-gradient(135deg, hsl(30 70% 55% / 0.12), hsl(25 60% 60% / 0.06))",
    border: "hsl(30 60% 50% / 0.25)",
    shadow: "0 4px 20px hsl(30 60% 40% / 0.1)",
    accent: "hsl(30 70% 45%)",
    sub: "hsl(30 50% 50%)",
  },
  evening: {
    bg: "linear-gradient(135deg, hsl(220 40% 25% / 0.12), hsl(250 35% 30% / 0.08))",
    border: "hsl(220 40% 50% / 0.2)",
    shadow: "0 4px 20px hsl(220 40% 30% / 0.1)",
    accent: "hsl(220 60% 70%)",
    sub: "hsl(220 40% 60%)",
  },
};

const NextZmanHero = ({ zmanim, isToday }: NextZmanHeroProps) => {
  const [countdown, setCountdown] = useState("");
  const [nextZman, setNextZman] = useState<ZmanItem | null>(null);
  const [tod, setTod] = useState<TimeOfDay>("morning");

  useEffect(() => {
    if (!isToday || zmanim.length === 0) {
      setNextZman(null);
      return;
    }

    const update = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      let found: ZmanItem | null = null;
      for (const z of zmanim) {
        const min = timeToMinutes(z.time);
        if (min === null) continue;
        if (min > currentMin) {
          found = z;
          break;
        }
      }

      if (!found) {
        setNextZman(null);
        setCountdown("");
        return;
      }

      setNextZman(found);
      const targetMin = timeToMinutes(found.time)!;
      setTod(getTimeOfDay(targetMin));

      const target = new Date(now);
      const [h, m] = found.time.split(":").map(Number);
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("Maintenant");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (hours > 0) {
        setCountdown(`${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`);
      } else {
        setCountdown(`${mins}m ${String(secs).padStart(2, "0")}s`);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [zmanim, isToday]);

  if (!nextZman || !isToday) return null;

  const s = STYLES[tod];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nextZman.label}
        className="rounded-xl p-4 mb-4 border"
        style={{
          background: s.bg,
          borderColor: s.border,
          boxShadow: s.shadow,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-1">
          Prochain Zman
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">
              {nextZman.icon} {nextZman.label}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{nextZman.description}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold font-display tabular-nums" style={{ color: s.accent }}>
              {nextZman.time}
            </div>
            <div className="text-xs font-bold tabular-nums mt-0.5" style={{ color: s.sub }}>
              dans {countdown}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NextZmanHero;
