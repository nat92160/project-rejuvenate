import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "chabbat_guest_name";

export function getGuestName(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setGuestName(name: string) {
  try { localStorage.setItem(STORAGE_KEY, name); } catch {}
}

interface Props {
  open: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

const GuestNamePrompt = ({ open, onSubmit, onClose }: Props) => {
  const [name, setName] = useState(() => getGuestName() || "");

  useEffect(() => {
    if (open) setName(getGuestName() || "");
  }, [open]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGuestName(trimmed);
    onSubmit(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-card border border-border p-6"
            style={{ boxShadow: "var(--shadow-elevated)" }}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-foreground text-center mb-2">
              👤 Quel est votre nom ?
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Votre nom sera affiché pour les autres participants.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Votre prénom"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            />
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}
            >
              Continuer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuestNamePrompt;
