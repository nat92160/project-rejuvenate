import { useState, useEffect } from "react";
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
      if (!data) return;
      setShabbatData(data);

      // Auto-select mode: if candle lighting is in the past, show havdalah
      const now = Date.now();
      if (data.candleLightingDateTime && data.candleLightingDateTime.getTime() <= now) {
        if (data.havdalahDateTime && data.havdalahDateTime.getTime() > now) {
          setMode("havdalah");
        } else {
          setMode("candles"); // both passed → next week's candles
        }
      } else {
        setMode("candles");
      }
    });
  }, [city]);

  useEffect(() => {
    const getTarget = (): Date | null => {
      if (!shabbatData) return null;
      if (mode === "candles") return shabbatData.candleLightingDateTime;
      return shabbatData.havdalahDateTime;
    };

    const update = () => {
      const now = Date.now();
      const target = getTarget();
      if (!target) return;

      // Auto-switch: candles passed → havdalah
      if (mode === "candles" && shabbatData?.candleLightingDateTime) {
        if (shabbatData.candleLightingDateTime.getTime() <= now) {
          if (shabbatData.havdalahDateTime && shabbatData.havdalahDateTime.getTime() > now) {
            setMode("havdalah");
            return;
          }
        }
      }

      // Auto-switch: havdalah passed → candles (will refetch next week)
      if (mode === "havdalah" && shabbatData?.havdalahDateTime) {
        if (shabbatData.havdalahDateTime.getTime() <= now) {
          setMode("candles");
          // Refetch for next week
          fetchShabbatTimes(city).then((d) => d && setShabbatData(d));
          return;
        }
      }

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
  }, [mode, shabbatData, city]);

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
        isUrgent ? "border-destructive/40" : "border-primary/10"
      }`}
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, hsl(var(--destructive) / 0.12), hsl(var(--destructive) / 0.04))"
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
          isUrgent ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      {timeDisplay && (
        <div className={`text-xs mb-2 ${isUrgent ? "text-destructive font-bold" : "text-primary/70"}`}>
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
                isUrgent ? "border-destructive/30" : "border-primary/10"
              }`}
              style={{
                color: isUrgent ? "hsl(var(--destructive))" : "hsl(var(--gold-matte))",
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
          className="text-xs mt-3 font-bold inline-block px-3 py-1 rounded-full text-destructive"
          style={{ background: "hsl(var(--destructive) / 0.1)" }}
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
