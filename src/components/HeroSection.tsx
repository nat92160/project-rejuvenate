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
        style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.06) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[30%] -left-[15%] w-[400px] h-[400px] rounded-full z-0"
        style={{ background: "radial-gradient(circle, hsl(var(--navy) / 0.04) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] mx-auto py-16">
        <motion.div
          className="w-20 h-20 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{ animation: "landingStar 3s ease-in-out infinite" }}
        >
          <StarOfDavid size={80} />
        </motion.div>

        <motion.h1
          className="font-display text-5xl md:text-6xl font-extrabold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Chabbat <span className="text-primary">Chalom</span>
        </motion.h1>

        <motion.div
          className="font-hebrew text-xl mt-2 text-primary/70"
          style={{ direction: "rtl" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4 }}
        >
          שבת שלום
        </motion.div>

        <motion.p
          className="text-base mt-6 mb-12 max-w-[460px] leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Votre calendrier juif complet : horaires de Chabbat, Zmanim, fêtes, Tehilim et communauté.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-14 w-full max-w-[340px] sm:max-w-none justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => onContinue?.("fidele")}
            className="px-9 py-4 rounded-2xl font-bold text-primary-foreground text-base transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] w-full sm:w-auto border-none cursor-pointer"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "var(--shadow-gold)",
              minHeight: "56px",
            }}
          >
            🕎 Je suis un Fidèle
          </button>
          <button
            onClick={() => onContinue?.("admin")}
            className="px-9 py-4 rounded-2xl font-bold text-foreground text-base transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] w-full sm:w-auto cursor-pointer bg-card border border-border"
            style={{
              boxShadow: "var(--shadow-soft)",
              minHeight: "56px",
            }}
          >
            🏛️ Je gère une Synagogue
          </button>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-[560px] mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {[
            { icon: "🕯️", title: "Horaires Chabbat", desc: "Allumage & Havdala précis" },
            { icon: "📖", title: "Tehilim", desc: "Chaînes communautaires" },
            { icon: "🎥", title: "Cours Zoom", desc: "Depuis votre synagogue" },
          ].map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2.5 py-5 px-4 rounded-2xl bg-card text-center transition-all duration-300 hover:-translate-y-1 border border-border"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <span className="text-3xl">{f.icon}</span>
              <span className="text-sm font-bold text-foreground">{f.title}</span>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </div>
          ))}
        </motion.div>

        <motion.button
          className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-none"
          onClick={() => onContinue?.("skip")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Continuer sans compte →
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
