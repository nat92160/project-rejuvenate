import { motion } from "framer-motion";
import StarOfDavid from "./StarOfDavid";

interface HeroSectionProps {
  onContinue?: (role?: string) => void;
}

const HeroSection = ({ onContinue }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-background">
      {/* Subtle radial accents */}
      <div className="absolute -top-1/3 -right-[20%] w-[500px] h-[500px] rounded-full z-0"
        style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.08) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[30%] -left-[15%] w-[400px] h-[400px] rounded-full z-0"
        style={{ background: "radial-gradient(circle, hsl(var(--navy) / 0.04) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] mx-auto py-16">
        <motion.div
          className="w-24 h-24 mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{ animation: "landingStar 3s ease-in-out infinite" }}
        >
          <StarOfDavid size={96} />
        </motion.div>

        <motion.h1
          className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Chabbat<br />
          <span className="gold-shimmer">Chalom</span>
        </motion.h1>

        <motion.div
          className="font-hebrew text-2xl mt-3 text-primary/60"
          style={{ direction: "rtl" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4 }}
        >
          שבת שלום
        </motion.div>

        <motion.p
          className="text-base mt-8 mb-12 max-w-[420px] leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Horaires de prière, Siddour, Tehilim et vie communautaire — tout dans une seule app.
        </motion.p>

        <motion.div
          className="flex flex-col gap-4 mb-16 w-full max-w-[320px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => onContinue?.("fidele")}
            className="px-9 py-4 rounded-2xl font-bold text-primary-foreground text-base transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] w-full border-none cursor-pointer"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "var(--shadow-gold)",
              minHeight: "56px",
            }}
          >
            Commencer
          </button>
          <button
            onClick={() => onContinue?.("admin")}
            className="px-9 py-3.5 rounded-2xl font-semibold text-muted-foreground text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] w-full cursor-pointer bg-transparent border border-border"
          >
            Je gère une Synagogue
          </button>
        </motion.div>

        <motion.div
          className="flex items-center gap-8 text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            { icon: "🕯️", label: "Chabbat" },
            { icon: "📖", label: "Siddour" },
            { icon: "🙏", label: "Tehilim" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1.5">
              <span className="text-2xl">{f.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{f.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.button
          className="mt-12 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-200 cursor-pointer bg-transparent border-none"
          onClick={() => onContinue?.("skip")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Continuer sans compte →
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
