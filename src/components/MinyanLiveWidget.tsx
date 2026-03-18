import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MinyanLiveWidget = () => {
  const [count, setCount] = useState(7);
  const [target] = useState(10);
  const needed = Math.max(0, target - count);
  const isFull = count >= target;

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Random fluctuation for demo
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Main counter */}
      <div
        className="rounded-2xl p-8 mb-4 border text-center"
        style={{
          background: isFull
            ? "linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.02))"
            : "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
          borderColor: isFull ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--gold) / 0.15)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h3 className="font-display text-base font-bold text-foreground flex items-center justify-center gap-2 mb-6">
          👥 Minyan Live
        </h3>

        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke={isFull ? "hsl(142 76% 36%)" : "hsl(var(--gold-matte))"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(count / target) * 327} 327`}
              initial={{ strokeDasharray: "0 327" }}
              animate={{ strokeDasharray: `${Math.min(count / target, 1) * 327} 327` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold font-display text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">/ {target}</span>
          </div>
        </div>

        {isFull ? (
          <div className="text-sm font-bold text-green-600 dark:text-green-400">
            ✅ Minyan atteint !
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Encore <span className="font-bold text-foreground">{needed}</span> personne{needed > 1 ? "s" : ""} nécessaire{needed > 1 ? "s" : ""}
          </div>
        )}

        {/* Person icons */}
        <div className="flex justify-center gap-1.5 mt-5 flex-wrap max-w-[200px] mx-auto">
          {Array.from({ length: target }).map((_, i) => (
            <motion.div
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{
                background: i < count
                  ? isFull ? "hsl(142 76% 36% / 0.15)" : "hsl(var(--gold) / 0.15)"
                  : "hsl(var(--muted))",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {i < count ? "🧑" : "⬜"}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setCount((c) => Math.min(c + 1, 20))}
          className="py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
        >
          ➕ Je suis là
        </button>
        <button
          onClick={() => setCount((c) => Math.max(c - 1, 0))}
          className="py-3.5 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        >
          ➖ Je pars
        </button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/60 mt-3 italic">
        Démo — En version complète, le compteur sera synchronisé en temps réel
      </p>
    </motion.div>
  );
};

export default MinyanLiveWidget;
