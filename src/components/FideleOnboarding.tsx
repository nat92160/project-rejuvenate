import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";

interface Props {
  onDone: () => void;
}

const STEPS = 3;

const FideleOnboarding = ({ onDone }: Props) => {
  const [step, setStep] = useState(0);
  const { city, geolocate, isGeolocating } = useCity();

  const finish = () => {
    try {
      localStorage.setItem("calj_onboarded_fidele", "1");
    } catch {}
    onDone();
  };

  const next = () => {
    if (step >= STEPS - 1) finish();
    else setStep((s) => s + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex flex-col"
        style={{
          background: "linear-gradient(160deg, hsl(var(--gold) / 0.10), hsl(var(--background)) 50%, hsl(var(--background)))",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Skip */}
        <div className="flex justify-end p-4">
          <button
            onClick={finish}
            className="text-xs font-bold text-muted-foreground bg-transparent border-none cursor-pointer"
          >
            Passer →
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="text-7xl">🕯️</div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Bienvenue sur Chabbat Chalom
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Votre compagnon spirituel quotidien : zmanim, Chabbat, prières, communauté.
                </p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="text-7xl">📍</div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Activez votre position
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Pour des horaires précis et trouver les synagogues près de chez vous.
                </p>
                <button
                  onClick={() => geolocate()}
                  disabled={isGeolocating}
                  className="mt-2 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                >
                  {isGeolocating ? "Localisation…" : `📍 Me localiser`}
                </button>
                {city.name && !isGeolocating && (
                  <p className="text-xs text-primary font-bold mt-2">
                    ✓ {city.name}
                  </p>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="text-7xl">✨</div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Tout est prêt !
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Explorez l'accueil pour vos zmanim du jour, ouvrez « Ma Syna » pour rejoindre votre communauté, et touchez ⋯ Plus pour toutes les autres fonctions.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dots + CTA */}
        <div className="p-6 pb-10 space-y-5">
          <div className="flex justify-center gap-2">
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  background: i === step ? "hsl(var(--gold))" : "hsl(var(--border))",
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-full py-4 rounded-2xl text-sm font-bold text-primary-foreground border-none cursor-pointer"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            {step === STEPS - 1 ? "🚀 Découvrir l'app" : "Suivant →"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FideleOnboarding;