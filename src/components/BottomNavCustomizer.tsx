import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { BOTTOM_NAV_OPTIONS, useCustomBottomTabs, DEFAULT_TABS } from "@/lib/bottomNavCustomization";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BottomNavCustomizer = ({ open, onClose }: Props) => {
  const { tabs, save } = useCustomBottomTabs();
  const [draft, setDraft] = useState<string[]>(tabs);

  useEffect(() => { if (open) setDraft(tabs); }, [open, tabs]);

  const toggle = (id: string) => {
    if (draft.includes(id)) {
      if (draft.length <= 1) { toast.error("Gardez au moins 1 raccourci"); return; }
      setDraft(draft.filter((t) => t !== id));
    } else {
      if (draft.length >= 3) { toast.error("3 raccourcis maximum (Menu reste en 4e)"); return; }
      setDraft([...draft, id]);
    }
  };

  const handleSave = () => {
    if (draft.length !== 3) { toast.error("Choisissez exactement 3 raccourcis"); return; }
    save(draft);
    toast.success("✅ Barre du bas personnalisée");
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_TABS);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[200]"
            style={{ background: "hsl(var(--navy) / 0.25)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[210] overflow-y-auto rounded-t-3xl"
            style={{
              background: "hsl(var(--card))",
              borderTop: "2px solid hsl(var(--gold) / 0.15)",
              maxHeight: "85vh",
              padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
              boxShadow: "var(--shadow-elevated)",
              WebkitOverflowScrolling: "touch",
            }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Personnaliser la barre du bas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choisissez 3 raccourcis. Le bouton ☰ Menu reste toujours accessible.</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 flex items-center justify-center rounded-full border-none bg-muted text-lg text-muted-foreground cursor-pointer"
                style={{ width: 40, height: 40 }}
              >✕</button>
            </div>

            {/* Preview */}
            <div className="mb-5 rounded-2xl border border-border bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-[2px] font-bold text-muted-foreground mb-2">Aperçu</div>
              <div className="flex items-stretch justify-around gap-1">
                {[...draft, "menu"].map((id, i) => {
                  const opt = id === "menu"
                    ? { id: "menu", icon: "☰", label: "Menu" }
                    : BOTTOM_NAV_OPTIONS.find((o) => o.id === id);
                  if (!opt) return null;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2">
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-[10px] font-bold text-foreground truncate max-w-full">{opt.label}</span>
                    </div>
                  );
                })}
                {/* fill empty slots */}
                {Array.from({ length: Math.max(0, 3 - draft.length) }).map((_, i) => (
                  <div key={`e${i}`} className="flex-1 flex flex-col items-center gap-1 py-2 opacity-30">
                    <span className="text-xl">＋</span>
                    <span className="text-[10px]">Vide</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Catalog */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {BOTTOM_NAV_OPTIONS.map((opt) => {
                const selected = draft.includes(opt.id);
                const order = draft.indexOf(opt.id) + 1;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className="relative flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 cursor-pointer transition-all active:scale-95"
                    style={{
                      borderColor: selected ? "hsl(var(--gold))" : "hsl(var(--border))",
                      background: selected ? "hsl(var(--gold) / 0.08)" : "hsl(var(--card))",
                    }}
                  >
                    {selected && (
                      <span
                        className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground"
                        style={{ width: 18, height: 18, background: "var(--gradient-gold)" }}
                      >{order}</span>
                    )}
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-[11px] font-semibold leading-tight text-foreground">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 sticky bottom-0 bg-card pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-3 rounded-xl text-xs font-bold border border-border bg-card text-muted-foreground cursor-pointer"
              >↺ Défaut</button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
              >✅ Enregistrer</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomNavCustomizer;
