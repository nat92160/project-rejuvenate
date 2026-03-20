import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getAvailableTabs, type BottomNavMode } from "@/lib/navigation";
import AuthModal from "@/components/AuthModal";

interface MoreMenuProps {
  isOpen: boolean;
  mode: BottomNavMode;
  onClose: () => void;
  onCustomize: () => void;
  onNavigate: (tab: string) => void;
}

const MoreMenu = ({ isOpen, mode, onClose, onCustomize, onNavigate }: MoreMenuProps) => {
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [zoomOn, setZoomOn] = useState(() => {
    try {
      return localStorage.getItem("zoom_connected") === "true";
    } catch {
      return false;
    }
  });

  const menuItems = useMemo(() => getAvailableTabs(mode), [mode]);

  const toggleZoom = (checked: boolean) => {
    setZoomOn(checked);

    try {
      localStorage.setItem("zoom_connected", checked ? "true" : "false");
    } catch {
      // ignore storage failures
    }

    if (!checked) {
      try {
        localStorage.removeItem("zoom_access_token");
        localStorage.removeItem("zoom_refresh_token");
      } catch {
        // ignore storage failures
      }
      toast.success("Zoom déconnecté (session locale)");
      return;
    }

    toast.success("Zoom activé");
  };

  const toggleAccount = (checked: boolean) => {
    if (checked) {
      setAuthOpen(true);
    } else {
      void signOut();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bottom-sheet-backdrop"
              style={{ background: "hsl(var(--navy) / 0.25)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[210] overflow-y-auto rounded-t-3xl"
              style={{
                background: "hsl(var(--card))",
                borderTop: "2px solid hsl(var(--gold) / 0.15)",
                maxHeight: "75vh",
                padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
                boxShadow: "var(--shadow-elevated)",
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-display text-lg font-bold text-foreground">Menu</h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-muted text-lg text-muted-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <button
                onClick={onCustomize}
                className="mb-4 flex w-full items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-left cursor-pointer transition-all hover:border-primary/25"
              >
                <div>
                  <div className="text-sm font-bold text-foreground">Personnaliser le bandeau du bas</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Choisissez vos 4 widgets favoris pour ce mode.
                  </div>
                </div>
                <span className="text-xl">⭐</span>
              </button>

              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="flex min-h-[96px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-4 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted active:scale-95"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium leading-tight text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Account & Zoom switches */}
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {/* Account switch */}
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">👤</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground">Compte</span>
                        {user && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.user_metadata?.full_name || user.email?.split("@")[0] || "Connecté"}
                          </p>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={!!user}
                        onChange={(event) => toggleAccount(event.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>

                {/* Zoom switch (only when logged in) */}
                {user && (
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🎥</span>
                        <span className="text-xs font-bold text-foreground">Zoom</span>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={zoomOn}
                          onChange={(event) => toggleZoom(event.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default MoreMenu;
