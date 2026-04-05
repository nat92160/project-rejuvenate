import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { ViewMode } from "@/hooks/useTransliteration";

interface ViewModeSelectorProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  loading?: boolean;
  options?: { key: ViewMode; label: string; icon: string }[];
  prayerMode?: boolean;
}

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: string }[] = [
  { key: "hebrew", label: "Hébreu", icon: "🔤" },
  { key: "phonetic", label: "Phonétique", icon: "🗣️" },
];

const ViewModeSelector = forwardRef<HTMLDivElement, ViewModeSelectorProps>(({ mode, onModeChange, loading = false, options = VIEW_OPTIONS, prayerMode = false }, ref) => {
  return (
    <div
      ref={ref}
      className="flex gap-1 rounded-xl p-1"
      style={{
        background: prayerMode ? "rgba(255,255,255,0.06)" : "hsl(var(--muted))",
      }}
    >
      {options.map((opt) => {
        const isActive = mode === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onModeChange(opt.key)}
            disabled={loading && opt.key === "phonetic"}
            className="relative flex-1 flex items-center justify-center gap-1 rounded-lg border-none py-2 text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50"
            style={{
              background: isActive
                ? (prayerMode ? "rgba(255,255,255,0.12)" : "hsl(var(--card))")
                : "transparent",
              color: isActive
                ? (prayerMode ? "#e8e0d0" : "hsl(var(--foreground))")
                : (prayerMode ? "#777" : "hsl(var(--muted-foreground))"),
              boxShadow: isActive ? "var(--shadow-soft)" : "none",
            }}
          >
            <span className="text-xs">{opt.icon}</span>
            <span>{opt.label}</span>
            {loading && opt.key === "phonetic" && isActive && (
              <motion.span
                className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

ViewModeSelector.displayName = "ViewModeSelector";

export default ViewModeSelector;
