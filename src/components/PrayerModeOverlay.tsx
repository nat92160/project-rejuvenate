import { motion, AnimatePresence } from "framer-motion";

interface PrayerModeOverlayProps {
  active: boolean;
  onClose: () => void;
  onOpenSiddur: () => void;
}

const PrayerModeOverlay = ({ active, onClose, onOpenSiddur }: PrayerModeOverlayProps) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
          style={{ background: "#000" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-12 right-6 text-white/60 text-sm font-bold border border-white/20 rounded-full px-4 py-2 cursor-pointer bg-transparent transition-all hover:text-white hover:border-white/40"
          >
            ✕ Quitter
          </button>

          {/* Central Siddur button */}
          <motion.button
            onClick={() => { onOpenSiddur(); }}
            className="flex flex-col items-center gap-4 cursor-pointer bg-transparent border-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 15 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(45 80% 55% / 0.2), hsl(45 80% 55% / 0.05))",
                border: "2px solid hsl(45 80% 55% / 0.3)",
                boxShadow: "0 0 60px hsl(45 80% 55% / 0.15)",
              }}
            >
              <span className="text-5xl">📖</span>
            </div>
            <span
              className="text-lg font-bold uppercase tracking-[4px]"
              style={{ color: "hsl(45 80% 65%)" }}
            >
              Siddour
            </span>
          </motion.button>

          {/* Quick actions */}
          <div className="mt-12 flex gap-6">
            {[
              { icon: "📜", label: "Tehilim", tab: "tehilim" },
              { icon: "🙌", label: "Brakhot", tab: "brakhot" },
            ].map((item) => (
              <motion.button
                key={item.tab}
                onClick={() => { onClose(); }}
                className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Mode label */}
          <div className="absolute bottom-12 text-center">
            <div className="text-[10px] uppercase tracking-[5px] text-white/20 font-medium">
              Mode Prière
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrayerModeOverlay;
