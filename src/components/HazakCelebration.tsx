import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

const COLORS = [
  "#c9a84c", "#e6c56c", "#f5d98a", "#22c55e", "#3b82f6",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

const generateConfetti = (count: number): Confetti[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

interface HazakCelebrationProps {
  show: boolean;
  onDone?: () => void;
}

const HazakCelebration = ({ show, onDone }: HazakCelebrationProps) => {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [visible, setVisible] = useState(false);

  const start = useCallback(() => {
    setConfetti(generateConfetti(80));
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onDone]);

  useEffect(() => {
    if (show) start();
  }, [show, start]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={() => { setVisible(false); onDone?.(); }}
        >
          {/* Confetti particles */}
          {confetti.map((c) => (
            <motion.div
              key={c.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${c.x}%`,
                width: c.size,
                height: c.size * 0.6,
                backgroundColor: c.color,
                rotate: c.rotation,
              }}
              initial={{ y: -20, opacity: 1, scale: 0 }}
              animate={{
                y: ["-5vh", "110vh"],
                opacity: [1, 1, 0.8, 0],
                scale: [0, 1, 1, 0.5],
                rotate: [c.rotation, c.rotation + 720],
                x: [0, (Math.random() - 0.5) * 100],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: c.delay,
                ease: "easeOut",
              }}
            />
          ))}

          {/* "Hazak!" message */}
          <motion.div
            className="text-center z-10"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.3 }}
          >
            <motion.div
              className="text-7xl mb-4"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 3 }}
            >
              🎉
            </motion.div>
            <h2
              className="font-display text-4xl font-black tracking-wider"
              style={{
                background: "linear-gradient(135deg, #c9a84c, #f5d98a, #c9a84c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 2px 8px rgba(201,168,76,0.5))",
              }}
            >
              !חזק חזק
            </h2>
            <motion.p
              className="text-xl font-bold text-white mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              Hazak Hazak Venitkhazek !
            </motion.p>
            <motion.p
              className="text-sm text-white/70 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              Les 150 psaumes ont été complétés 🙏
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HazakCelebration;
