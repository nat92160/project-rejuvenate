import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  icon: string;
  label: string;
  content: string;
}

const InfoCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const slides: Slide[] = [
    {
      icon: "📖",
      label: "HALAKHA DU JOUR",
      content: "Il est interdit de cuire, rôtir ou réchauffer de la nourriture pendant Chabbat. Tout aliment consommé chaud le Chabbat doit avoir été placé sur la plaque chauffante (Plata) avant l'entrée du Chabbat.",
    },
    {
      icon: "📜",
      label: "PARACHA DE LA SEMAINE",
      content: "Chargement de la paracha...",
    },
    {
      icon: "🎉",
      label: "PROCHAINE FÊTE",
      content: "Chargement...",
    },
    {
      icon: "🕐",
      label: "HORAIRES DU JOUR",
      content: "Chargement des horaires...",
    },
  ];

  const next = useCallback(() => {
    if (!expanded) {
      setCurrent((prev) => (prev + 1) % slides.length);
    }
  }, [expanded, slides.length]);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div
      className="relative mx-4 mb-4 rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 bg-card border border-border"
      style={{
        boxShadow: "var(--shadow-card)",
        minHeight: "90px",
      }}
      onClick={() => current === 0 && setExpanded(!expanded)}
    >
      {/* Gold top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: "var(--gradient-gold)", opacity: 0.6 }} />

      <div className="p-4 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{slides[current].icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-[2px] text-primary">
                {slides[current].label}
              </span>
              {current === 0 && (
                <span className="ml-auto text-[10px] italic text-muted-foreground">
                  Kitsour Ch. A. 80:1
                </span>
              )}
            </div>
            <p
              className={`text-sm leading-relaxed text-foreground transition-all duration-300 ${
                !expanded && current === 0 ? "line-clamp-3" : ""
              }`}
            >
              {slides[current].content}
            </p>
            {current === 0 && !expanded && (
              <span className="inline-block mt-1.5 text-xs text-primary/60">
                ▼ Lire la suite
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); setExpanded(false); }}
              className="w-2 h-2 rounded-full transition-all duration-300 border-none cursor-pointer"
              style={{
                background: i === current ? "hsl(var(--gold))" : "hsl(var(--border))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoCarousel;
