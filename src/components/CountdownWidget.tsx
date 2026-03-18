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
      className="text-center p-4 rounded-3xl mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(184, 134, 11, 0.06), rgba(212, 168, 67, 0.03))",
        border: "1px solid rgba(212, 168, 67, 0.12)",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="text-xs uppercase tracking-[2px] mb-1" style={{ color: "#94A3B8" }}>
        Temps avant Chabbat
      </div>
      <div className="font-hebrew text-base mb-2" style={{ color: "#B8860B" }}>
        Prochain Chabbat
      </div>
      <div className="flex justify-center gap-3">
        {blocks.map((b) => (
          <div key={b.label} className="flex flex-col items-center">
            <div
              className="text-2xl font-bold font-hebrew tabular-nums px-3 py-2 rounded-xl"
              style={{
                color: "#B8860B",
                background: "rgba(212, 168, 67, 0.08)",
                border: "1px solid rgba(212, 168, 67, 0.15)",
                minWidth: "52px",
              }}
            >
              {String(b.value).padStart(2, "0")}
            </div>
            <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#94A3B8" }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CountdownWidget;
