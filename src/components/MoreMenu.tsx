import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuItems = [
  { id: "chabbat", icon: "🕯️", label: "Horaires Chabbat" },
  { id: "zmanim", icon: "⏰", label: "Zmanim" },
  { id: "fetes", icon: "📅", label: "Fêtes & Jeûnes" },
  { id: "roshhodesh", icon: "🌙", label: "Roch Hodech" },
  { id: "shabbatspec", icon: "✨", label: "Chabbatot spéciaux" },
  { id: "mariages", icon: "💍", label: "Mariages" },
  { id: "convertisseur", icon: "🔄", label: "Convertisseur" },
  { id: "mizrah", icon: "🧭", label: "Mizra'h" },
  { id: "reveil", icon: "⏰", label: "Réveil" },
  { id: "synagogue", icon: "🏛️", label: "Ma Synagogue" },
  { id: "annonces", icon: "📢", label: "Annonces" },
  { id: "refoua", icon: "🙏", label: "Refoua Chelema" },
  { id: "minyan", icon: "👥", label: "Minyan Live" },
  { id: "evenements", icon: "📅", label: "Événements" },
  { id: "coursvirtuel", icon: "🎥", label: "Cours en ligne" },
  { id: "affiche", icon: "📋", label: "Affiche Chabbat" },
  { id: "communaute", icon: "👥", label: "Communauté" },
];

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const MoreMenu = ({ isOpen, onClose, onNavigate }: MoreMenuProps) => {
  const { user, signOut } = useAuth();
  const [zoomStatus, setZoomStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [checkingZoom, setCheckingZoom] = useState(false);

  const checkZoomStatus = async () => {
    setCheckingZoom(true);
    try {
      const { data } = await supabase.functions.invoke("zoom-proxy", {
        body: { action: "check-status" },
      });
      setZoomStatus(data?.connected ? "connected" : "disconnected");
    } catch {
      setZoomStatus("disconnected");
    }
    setCheckingZoom(false);
  };

  const disconnectZoom = () => {
    window.open("https://zoom.us/signout", "_blank", "noopener,noreferrer");
    setZoomStatus("unknown");
    toast.success("Page de déconnexion Zoom ouverte");
  };

  useEffect(() => {
    if (isOpen && user) {
      void checkZoomStatus();
    }
  }, [isOpen, user]);

  return (
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
            className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl overflow-y-auto"
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
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="flex justify-between items-center mb-5 pb-3 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Menu</h2>
              <button
                onClick={onClose}
                className="bg-muted border-none text-lg cursor-pointer w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground transition-colors hover:bg-border"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center justify-center gap-2.5 py-4 px-3 rounded-2xl cursor-pointer transition-all duration-200 text-center border border-border bg-card hover:bg-muted hover:border-primary/20 hover:-translate-y-0.5 active:scale-95"
                  style={{ minHeight: "96px" }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {user && (
              <div className="mt-5 pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">👤</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0] || "Compte"}
                    </span>
                  </div>
                  <button
                    onClick={() => { void signOut(); onClose(); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 bg-destructive/10 text-destructive border-none shrink-0"
                  >
                    🔓 Déconnexion
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">🎥</span>
                      <span className="text-xs text-muted-foreground truncate">
                        Zoom {zoomStatus === "connected" ? "✅ Connecté" : zoomStatus === "disconnected" ? "❌ Non connecté" : "—"}
                      </span>
                    </div>
                    <button
                      onClick={checkZoomStatus}
                      disabled={checkingZoom}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border border-border bg-card text-muted-foreground hover:border-primary/20 disabled:opacity-50 shrink-0"
                    >
                      {checkingZoom ? "⏳" : "Vérifier"}
                    </button>
                  </div>
                  <button
                    onClick={disconnectZoom}
                    className="w-full px-3 py-2 rounded-lg text-[11px] font-bold cursor-pointer border border-border bg-card text-foreground hover:border-primary/20"
                  >
                    ↗ Se déconnecter de Zoom
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MoreMenu;
