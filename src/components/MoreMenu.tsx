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

interface MoreMenuProps { isOpen: boolean; onClose: () => void; onNavigate: (tab: string) => void; }

const MoreMenu = ({ isOpen, onClose, onNavigate }: MoreMenuProps) => {
  const { user, signOut } = useAuth();
  const [zoomOn, setZoomOn] = useState(() => {
    try { return localStorage.getItem("zoom_connected") === "true"; } catch { return false; }
  });

  const toggleZoom = (checked: boolean) => {
    setZoomOn(checked);
    try { localStorage.setItem("zoom_connected", checked ? "true" : "false"); } catch {}
    if (!checked) {
      // Clear tokens locally only — never redirect
      try { localStorage.removeItem("zoom_access_token"); localStorage.removeItem("zoom_refresh_token"); } catch {}
      toast.success("Zoom déconnecté (session locale)");
    } else {
      toast.success("Zoom activé");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 z-[200] bottom-sheet-backdrop" style={{ background: "hsl(var(--navy) / 0.25)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl overflow-y-auto" style={{ background: "hsl(var(--card))", borderTop: "2px solid hsl(var(--gold) / 0.15)", maxHeight: "75vh", padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", boxShadow: "var(--shadow-elevated)" }}
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Menu</h2>
              <button onClick={onClose} className="bg-muted border-none text-lg cursor-pointer w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => onNavigate(item.id)} className="flex flex-col items-center justify-center gap-2.5 py-4 px-3 rounded-2xl cursor-pointer transition-all duration-200 text-center border border-border bg-card hover:bg-muted hover:border-primary/20 hover:-translate-y-0.5 active:scale-95" style={{ minHeight: "96px" }}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
                </button>
              ))}
            </div>

            {user && (
              <div className="mt-5 pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">👤</span>
                    <span className="text-xs text-muted-foreground truncate">{user.user_metadata?.full_name || user.email?.split("@")[0] || "Compte"}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.preventDefault(); void signOut(); }} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer bg-destructive/10 text-destructive border-none shrink-0">🔓 Déconnexion</button>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><span className="text-sm">🎥</span><span className="text-xs text-muted-foreground">Zoom</span></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={zoomOn} onChange={e => toggleZoom(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
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
