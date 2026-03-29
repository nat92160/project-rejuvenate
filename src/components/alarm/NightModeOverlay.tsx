import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWakeLock } from "@/hooks/useWakeLock";

interface Props {
  active: boolean;
  alarmTime: Date | null;
  isRinging: boolean;
  dawnProgress: number; // 0..1, driven by parent during alarm
  onStop: () => void;
}

const NightModeOverlay = ({ active, alarmTime, isRinging, dawnProgress, onStop }: Props) => {
  const [now, setNow] = useState(new Date());
  useWakeLock(active);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const secsStr = now.toLocaleTimeString("fr-FR", { second: "2-digit" }).slice(-2);

  const remaining = alarmTime ? Math.max(0, alarmTime.getTime() - now.getTime()) : 0;
  const remH = Math.floor(remaining / 3600000);
  const remM = Math.floor((remaining % 3600000) / 60000);

  // Dawn gradient based on progress
  const bg = isRinging
    ? `linear-gradient(180deg, 
        hsl(${240 - dawnProgress * 200}, ${30 + dawnProgress * 50}%, ${5 + dawnProgress * 40}%) 0%, 
        hsl(${240 - dawnProgress * 210}, ${40 + dawnProgress * 40}%, ${8 + dawnProgress * 45}%) 50%, 
        hsl(${40}, ${60 + dawnProgress * 20}%, ${10 + dawnProgress * 40}%) 100%)`
    : "#000000";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: bg, transition: "background 2s ease" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Clock */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div
              className="flex items-baseline gap-1"
              style={{ opacity: isRinging ? 0.6 + dawnProgress * 0.4 : 0.15 }}
            >
              <span
                className="font-light tracking-widest"
                style={{
                  fontSize: "clamp(4rem, 15vw, 8rem)",
                  color: isRinging
                    ? `hsl(40, ${60 + dawnProgress * 20}%, ${50 + dawnProgress * 30}%)`
                    : "hsl(30, 80%, 50%)",
                }}
              >
                {timeStr}
              </span>
              <span
                className="text-2xl font-light"
                style={{
                  color: isRinging
                    ? `hsl(40, 60%, ${40 + dawnProgress * 40}%)`
                    : "hsl(30, 60%, 40%)",
                  opacity: 0.5,
                }}
              >
                {secsStr}
              </span>
            </div>

            {/* Remaining time */}
            {!isRinging && remaining > 0 && (
              <p
                className="mt-4 text-sm font-light tracking-wider"
                style={{ color: "hsl(30, 60%, 40%)", opacity: 0.2 }}
              >
                Réveil dans {remH > 0 ? `${remH}h` : ""}{String(remM).padStart(2, "0")}min
              </p>
            )}

            {/* Ringing indicator */}
            {isRinging && (
              <motion.p
                className="mt-6 text-lg font-medium tracking-wider"
                style={{ color: `hsl(40, 80%, ${50 + dawnProgress * 30}%)` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🌅 Chabbat Chalom
              </motion.p>
            )}
          </motion.div>

          {/* Stop button */}
          <motion.button
            onClick={onStop}
            className="absolute bottom-16 px-8 py-3 rounded-full font-medium text-sm tracking-wider cursor-pointer"
            style={{
              background: isRinging
                ? `hsl(40, 80%, ${40 + dawnProgress * 20}%)`
                : "hsl(0, 0%, 15%)",
              color: isRinging ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 40%)",
              border: isRinging ? "none" : "1px solid hsl(0, 0%, 20%)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {isRinging ? "Arrêter le réveil" : "Quitter le mode nuit"}
          </motion.button>

          {/* Subtle instruction */}
          {!isRinging && (
            <p
              className="absolute bottom-8 text-[10px] tracking-wider"
              style={{ color: "hsl(0, 0%, 25%)" }}
            >
              Mode nuit Chabbat · L'écran reste actif
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NightModeOverlay;
