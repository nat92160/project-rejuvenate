import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  storageKey: string;
  title: string;
  message: string;
  /** Delai d'apparition après mount (ms). */
  delay?: number;
}

/** Bulle « première fois » qui s'affiche une seule fois puis disparaît. */
const FirstTimeHint = ({ storageKey, title, message, delay = 600 }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [storageKey, delay]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-[350]"
            style={{ background: "hsl(var(--navy) / 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />
          <motion.div
            className="fixed left-4 right-4 z-[360] rounded-2xl p-5 border border-primary/15"
            style={{
              background: "hsl(var(--card))",
              boxShadow: "var(--shadow-elevated)",
              maxWidth: 420,
              margin: "0 auto",
              top: "50%",
              transform: "translateY(-50%)",
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 22 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: "hsl(var(--gold) / 0.18)",
                  color: "hsl(var(--gold))",
                  fontSize: 22,
                }}
              >
                💡
              </div>
              <div className="flex-1">
                <h4 className="font-display text-sm font-bold text-foreground mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="w-full rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer"
              style={{ background: "var(--gradient-gold)", minHeight: 48, WebkitTapHighlightColor: "transparent" }}
            >
              J'ai compris ✓
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FirstTimeHint;