import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface OmerAdminSimulatorProps {
  simulatedDay: number | null;
  onSimulate: (day: number | null) => void;
}

const OmerAdminSimulator = ({ simulatedDay, onSimulate }: OmerAdminSimulatorProps) => {
  const [open, setOpen] = useState(false);
  const isForced = simulatedDay !== null;

  return (
    <div className="absolute top-3 left-3 z-10">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-full border-none cursor-pointer transition-all hover:scale-110"
        style={{
          background: isForced ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--muted) / 0.5)",
          color: isForced ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
        }}
        title="Simuler un jour (Admin)"
      >
        <Settings size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-10 left-0 p-3 rounded-xl border shadow-lg min-w-[220px]"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
            }}
          >
            <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              🛠 Simulation Admin
            </div>

            <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isForced}
                onChange={(e) => onSimulate(e.target.checked ? 1 : null)}
                className="rounded"
              />
              <span className="text-foreground font-medium">Forcer l'affichage</span>
            </label>

            {isForced && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Jour</span>
                  <span className="font-bold text-foreground">{simulatedDay}</span>
                </div>
                <Slider
                  min={1}
                  max={49}
                  step={1}
                  value={[simulatedDay || 1]}
                  onValueChange={([v]) => onSimulate(v)}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>1</span>
                  <span>49</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OmerAdminSimulator;
