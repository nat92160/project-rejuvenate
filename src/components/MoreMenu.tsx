import { AnimatePresence, motion } from "framer-motion";

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
            {/* Handle bar */}
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

            <div className="grid grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center justify-center gap-2.5 py-5 px-3 rounded-2xl cursor-pointer transition-all duration-200 text-center border border-border bg-card hover:bg-muted hover:border-primary/20 hover:-translate-y-0.5 active:scale-95"
                  style={{ minHeight: "100px" }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MoreMenu;
