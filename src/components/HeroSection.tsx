import { motion } from "framer-motion";
import starOfDavid from "@/assets/star-of-david.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}>
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gold/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-gold/5 blur-3xl" />

      <motion.img
        src={starOfDavid}
        alt="Étoile de David"
        className="w-20 h-20 mb-6 animate-float"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      <motion.h1
        className="text-4xl md:text-6xl font-serif font-bold text-foreground tracking-tight text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Chabbat{" "}
        <span className="gold-shimmer">Chalom</span>
      </motion.h1>

      <motion.p
        className="font-hebrew text-xl md:text-2xl text-gold-dark mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        שבת שלום
      </motion.p>

      <motion.p
        className="text-muted-foreground text-center max-w-md mt-6 text-base md:text-lg leading-relaxed text-balance"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        Votre calendrier juif complet : horaires de Chabbat, Zmanim, fêtes, Tehilim en communauté, cours en ligne et bien plus.
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 mt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <button className="px-8 py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
          🕎 Je suis un Fidèle
        </button>
        <button className="px-8 py-3.5 rounded-xl font-semibold border-2 border-foreground/15 bg-card text-foreground transition-all duration-300 hover:border-gold/40 hover:scale-[1.03] active:scale-[0.98]"
          style={{ boxShadow: "var(--shadow-card)" }}>
          🏛️ Je gère une Synagogue
        </button>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        className="grid grid-cols-3 gap-4 mt-14 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        {[
          { icon: "🕯️", title: "Horaires Chabbat", sub: "Allumage & Havdala précis" },
          { icon: "📖", title: "Tehilim", sub: "Chaînes communautaires" },
          { icon: "🎥", title: "Cours Zoom", sub: "Depuis votre synagogue" },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card text-center cursor-pointer transition-all duration-300 hover:scale-[1.03]"
            style={{ boxShadow: "var(--shadow-card)" }}
            whileHover={{ y: -4 }}
            transition={{ delay: 1 + i * 0.1 }}
          >
            <span className="text-2xl">{f.icon}</span>
            <span className="text-sm font-semibold text-foreground">{f.title}</span>
            <span className="text-xs text-muted-foreground">{f.sub}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        Continuer sans compte →
      </motion.button>
    </section>
  );
};

export default HeroSection;
