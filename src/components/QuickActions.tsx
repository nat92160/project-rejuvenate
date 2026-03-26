import { motion } from "framer-motion";
import { Book, Heart, MapPin, Compass, Calendar } from "lucide-react";

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
}

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
  currentPrayer?: string;
}

const QuickActions = ({ onNavigate, currentPrayer }: QuickActionsProps) => {
  const actions: QuickAction[] = [
    {
      id: "siddour",
      icon: <Book className="w-5 h-5" strokeWidth={1.5} />,
      label: "Siddour",
      subtitle: currentPrayer || undefined,
    },
    {
      id: "tehilim",
      icon: <Heart className="w-5 h-5" strokeWidth={1.5} />,
      label: "Tehilim",
    },
    {
      id: "synagogue",
      icon: <MapPin className="w-5 h-5" strokeWidth={1.5} />,
      label: "Synagogues",
    },
    {
      id: "brakhot",
      icon: <Compass className="w-5 h-5" strokeWidth={1.5} />,
      label: "Brakhot",
    },
    {
      id: "fetes",
      icon: <Calendar className="w-5 h-5" strokeWidth={1.5} />,
      label: "Fêtes",
    },
  ];

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="flex flex-col items-center gap-1.5 min-w-[72px] py-3 px-2 rounded-2xl border border-border bg-card cursor-pointer transition-all active:scale-95 hover:-translate-y-0.5 shrink-0"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.03))",
                color: "hsl(var(--gold-matte))",
              }}
            >
              {action.icon}
            </div>
            <span className="text-[10px] font-bold text-foreground leading-tight">{action.label}</span>
            {action.subtitle && (
              <span
                className="text-[8px] font-semibold leading-tight px-1.5 py-0.5 rounded-full"
                style={{
                  background: "hsl(var(--gold) / 0.1)",
                  color: "hsl(var(--gold-matte))",
                }}
              >
                {action.subtitle}
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickActions;
