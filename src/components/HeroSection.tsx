import { motion } from "framer-motion";
import StarOfDavid from "./StarOfDavid";

interface HeroSectionProps {
  onContinue?: (role?: string) => void;
}

const HeroSection = ({ onContinue }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background gradient matching original */}
      <div className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 30%, #FFF8E1 60%, #F8FAFC 100%)" }} />
      <div className="absolute -top-1/2 -right-[30%] w-[600px] h-[600px] rounded-full z-0"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[40%] -left-[20%] w-[500px] h-[500px] rounded-full z-0"
        style={{ background: "radial-gradient(circle, rgba(30,64,175,0.04) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-[700px] mx-auto py-16">
        <motion.div
          className="w-20 h-20 mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{ filter: "drop-shadow(0 4px 12px rgba(212,175,55,0.2))", animation: "landingStar 3s ease-in-out infinite" }}
        >
          <StarOfDavid size={80} />
        </motion.div>

        <motion.h1
          className="font-hebrew text-5xl md:text-6xl font-bold tracking-wide"
          style={{ color: "#1E293B", lineHeight: 1.15 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Chabbat <span style={{ color: "#B8860B" }}>Chalom</span>
        </motion.h1>

        <motion.div
          className="font-hebrew text-xl mt-2"
          style={{ color: "#D4AF37", direction: "rtl", opacity: 0.8 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.4 }}
        >
          שבת שלום
        </motion.div>

        <motion.p
          className="text-lg mt-5 mb-10 max-w-[520px] leading-relaxed"
          style={{ color: "#475569" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Votre calendrier juif complet : horaires de Chabbat, Zmanim, fêtes, Tehilim en communauté, cours en ligne et bien plus.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-12 w-full max-w-[320px] sm:max-w-none justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => onContinue?.("fidele")}
            className="px-9 py-4 rounded-[14px] font-semibold text-white text-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #B8860B, #D4AF37)",
              boxShadow: "0 4px 15px rgba(212,168,67,0.3)",
              minHeight: "56px",
            }}
          >
            🕎 Je suis un Fidèle
          </button>
          <button
            onClick={() => onContinue?.("admin")}
            className="px-9 py-4 rounded-[14px] font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-gold active:scale-[0.98] w-full sm:w-auto"
            style={{
              background: "#FFFFFF",
              color: "#1E293B",
              border: "2px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              minHeight: "56px",
            }}
          >
            🏛️ Je gère une Synagogue
          </button>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-[640px] mb-10"
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
              className="flex flex-col items-center gap-2.5 py-5 px-4 rounded-3xl bg-white text-center transition-all duration-300 hover:-translate-y-1"
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <span className="text-3xl">{f.icon}</span>
              <span className="text-sm font-semibold" style={{ color: "#1E293B" }}>{f.title}</span>
              <span className="text-xs" style={{ color: "#94A3B8" }}>{f.desc}</span>
            </div>
          ))}
        </motion.div>

        <motion.button
          className="text-sm transition-colors duration-200"
          style={{ color: "#94A3B8" }}
          onClick={() => onContinue?.("skip")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#B8860B")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
        >
          Continuer sans compte →
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
