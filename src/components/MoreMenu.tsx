import { AnimatePresence, motion } from "framer-motion";

const menuItems = [
  { id: "fetes", icon: "📅", label: "Fêtes & Jeûnes" },
  { id: "roshhodesh", icon: "🌙", label: "Roch Hodech" },
  { id: "shabbatspec", icon: "📖", label: "Chabbatot spéciaux" },
  { id: "mariages", icon: "💍", label: "Mariages" },
  { id: "convertisseur", icon: "🔄", label: "Convertisseur" },
  { id: "mizrah", icon: "🧭", label: "Mizra'h" },
  { id: "reveil", icon: "⏰", label: "Réveil" },
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
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(5px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl overflow-y-auto"
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              borderTop: "2px solid rgba(212, 168, 67, 0.15)",
              backdropFilter: "blur(20px)",
              maxHeight: "70vh",
              padding: "20px",
            }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex justify-between items-center mb-5 pb-3"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <h2 className="font-hebrew text-xl" style={{ color: "#B8860B" }}>Plus</h2>
              <button
                onClick={onClose}
                className="bg-transparent border-none text-2xl cursor-pointer p-1 transition-colors"
                style={{ color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center justify-center gap-3 py-5 px-4 rounded-[14px] cursor-pointer transition-all duration-200 text-center border-none"
                  style={{
                    background: "#F1F5F9",
                    border: "1.5px solid rgba(0,0,0,0.06)",
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    minHeight: "110px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "rgba(212, 168, 67, 0.2)";
                    e.currentTarget.style.color = "#B8860B";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F1F5F9";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                    e.currentTarget.style.color = "#475569";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <span>{item.label}</span>
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
