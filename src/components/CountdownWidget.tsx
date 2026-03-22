import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, type ShabbatTimes } from "@/lib/hebcal";

type CountdownMode = "candles" | "havdalah";

const CountdownWidget = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [shabbatData, setShabbatData] = useState<ShabbatTimes | null>(null);
  const [mode, setMode] = useState<CountdownMode>("candles");
  const { city } = useCity();

  useEffect(() => {
    fetchShabbatTimes(city).then((data) => {
      if (data) setShabbatData(data);
    });
  }, [city]);

  // Parse "HH:MM" time + date string into a Date
  const parseTarget = useCallback((): Date | null => {
    if (!shabbatData) return null;

    const timeStr = mode === "candles" ? shabbatData.candleLighting : shabbatData.havdalah;
    const dateStr = mode === "candles" ? shabbatData.candleLightingDate : shabbatData.havdalahDate;
    if (!timeStr) return null;

    // Try to build target from current week's Friday/Saturday
    const now = new Date();
    const day = now.getDay();
    const [h, m] = timeStr.split(":").map(Number);

    if (mode === "candles") {
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const target = new Date(now);
      target.setDate(now.getDate() + daysUntilFriday);
      target.setHours(h, m, 0, 0);
      // If it's Friday and the time already passed, next week
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 7);
      }
      return target;
    } else {
      // Havdalah: next Saturday
      const daysUntilSat = (6 - day + 7) % 7 || 7;
      const target = new Date(now);
      target.setDate(now.getDate() + daysUntilSat);
      target.setHours(h, m, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 7);
      }
      return target;
    }
  }, [shabbatData, mode]);

  useEffect(() => {
    const update = () => {
      const now = Date.now();

      // Auto-switch to Havdala if candles time has passed
      if (mode === "candles" && shabbatData?.candleLighting) {
        const candleTarget = parseTarget();
        if (candleTarget && candleTarget.getTime() <= now) {
          setMode("havdalah");
          return;
        }
      }

      // Auto-switch back to candles if Havdala has passed
      if (mode === "havdalah" && shabbatData?.havdalah) {
        const havTarget = parseTarget();
        if (havTarget && havTarget.getTime() <= now) {
          setMode("candles");
          return;
        }
      }

      const target = parseTarget();
      if (!target) return;

      const diff = target.getTime() - now;
      if (diff <= 0) return;

      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [mode, shabbatData, parseTarget]);

  const blocks = [
    { value: timeLeft.days, label: "jours" },
    { value: timeLeft.hours, label: "heures" },
    { value: timeLeft.mins, label: "min" },
    { value: timeLeft.secs, label: "sec" },
  ];

  const totalSeconds =
    timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.mins * 60 + timeLeft.secs;
  const isUrgent = mode === "candles" && totalSeconds > 0 && totalSeconds <= 18 * 60;
  const isClose = timeLeft.days === 0 && timeLeft.hours < 3;

  const label = mode === "candles" ? "⏳ Temps avant Chabbat" : "✨ Temps avant Havdala";
  const timeDisplay =
    mode === "candles"
      ? shabbatData?.candleLighting
        ? `Allumage à ${shabbatData.candleLighting} • ${city.name}`
        : null
      : shabbatData?.havdalah
      ? `Sortie à ${shabbatData.havdalah} • ${city.name}`
      : null;

  return (
    <motion.div
      className={`text-center p-5 rounded-2xl mb-4 border ${
        isUrgent ? "border-red-500/40" : "border-primary/10"
      }`}
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, hsl(0 84% 60% / 0.12), hsl(0 84% 60% / 0.04))"
          : isClose
          ? "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.04))"
          : "linear-gradient(135deg, hsl(var(--gold) / 0.05), hsl(var(--gold) / 0.02))",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      animate={isUrgent ? { scale: [1, 1.01, 1] } : {}}
      transition={isUrgent ? { repeat: Infinity, duration: 1.5 } : {}}
    >
      <div
        className={`text-[10px] uppercase tracking-[3px] mb-1 font-semibold ${
          isUrgent ? "text-red-500" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      {timeDisplay && (
        <div className={`text-xs mb-2 ${isUrgent ? "text-red-400 font-bold" : "text-primary/70"}`}>
          {timeDisplay}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mb-3">
        {(["candles", "havdalah"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-none cursor-pointer transition-all"
            style={{
              background: mode === m ? "hsl(var(--gold) / 0.15)" : "transparent",
              color: mode === m ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            {m === "candles" ? "🕯️ Allumage" : "✨ Havdala"}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        {blocks.map((b, i) => (
          <motion.div
            key={b.label}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div
              className={`text-2xl font-extrabold font-display tabular-nums px-3.5 py-2.5 rounded-xl border bg-card ${
                isUrgent ? "border-red-500/30" : "border-primary/12"
              }`}
              style={{
                color: isUrgent ? "hsl(0 84% 60%)" : "hsl(var(--gold-matte))",
                minWidth: "54px",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              {String(b.value).padStart(2, "0")}
            </div>
            <span className="text-[9px] uppercase tracking-widest mt-1.5 text-muted-foreground font-medium">
              {b.label}
            </span>
          </motion.div>
        ))}
      </div>

      {isUrgent && (
        <motion.p
          className="text-xs mt-3 font-bold inline-block px-3 py-1 rounded-full"
          style={{ color: "hsl(0 84% 60%)", background: "hsl(0 84% 60% / 0.1)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          🔴 Moins de 18 minutes ! Allumez vos bougies !
        </motion.p>
      )}
      {!isUrgent && isClose && mode === "candles" && (
        <motion.p
          className="text-xs mt-3 font-bold animate-pulse-gold inline-block px-3 py-1 rounded-full"
          style={{ color: "hsl(var(--gold-matte))", background: "hsl(var(--gold) / 0.1)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          🕯️ Chabbat approche !
        </motion.p>
      )}
    </motion.div>
  );
};

export default CountdownWidget;
