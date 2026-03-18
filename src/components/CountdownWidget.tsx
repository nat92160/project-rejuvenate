import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CountdownWidget = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

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

  return (
    <motion.div
      className="rounded-2xl p-6 text-center"
      style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <p className="text-sm font-semibold text-accent-foreground/80">Temps avant Chabbat</p>
      <div className="flex justify-center gap-4 mt-4">
        {blocks.map((b) => (
          <div key={b.label} className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-serif font-bold text-accent-foreground tabular-nums">
              {String(b.value).padStart(2, "0")}
            </span>
            <span className="text-xs text-accent-foreground/70 mt-1">{b.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CountdownWidget;
