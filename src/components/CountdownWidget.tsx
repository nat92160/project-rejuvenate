import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";

const CountdownWidget = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [candleTime, setCandleTime] = useState<string | null>(null);
  const { city } = useCity();

  useEffect(() => {
    fetchShabbatTimes(city).then((data) => {
      if (data?.candleLighting) setCandleTime(data.candleLighting);
    });
  }, [city]);

  useEffect(() => {
    const getNextFriday = () => {
      const now = new Date();
      const day = now.getDay();
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const nextFriday = new Date(now);
      nextFriday.setDate(now.getDate() + daysUntilFriday);
      nextFriday.setHours(18, 45, 0, 0);
      return nextFriday;
    };

    const update = () => {
      const target = getNextFriday();
      const diff = target.getTime() - Date.now();
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
  }, []);

  const blocks = [
    { value: timeLeft.days, label: "jours" },
    { value: timeLeft.hours, label: "heures" },
    { value: timeLeft.mins, label: "min" },
    { value: timeLeft.secs, label: "sec" },
  ];

  const isClose = timeLeft.days === 0 && timeLeft.hours < 3;

  return (
    <motion.div
      className="text-center p-5 rounded-2xl mb-4 border border-primary/10"
      style={{
        background: isClose
          ? "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.04))"
          : "linear-gradient(135deg, hsl(var(--gold) / 0.05), hsl(var(--gold) / 0.02))",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="text-[10px] uppercase tracking-[3px] mb-1 text-muted-foreground font-semibold">
        ⏳ Temps avant Chabbat
      </div>
      {candleTime && (
        <div className="text-xs text-primary/70 mb-2">
          Allumage à {candleTime} • {city.name}
        </div>
      )}
      <div className="flex justify-center gap-3 mt-3">
        {blocks.map((b, i) => (
          <motion.div
            key={b.label}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div
              className="text-2xl font-extrabold font-display tabular-nums px-3.5 py-2.5 rounded-xl border border-primary/12 bg-card"
              style={{
                color: "hsl(var(--gold-matte))",
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
      {isClose && (
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
