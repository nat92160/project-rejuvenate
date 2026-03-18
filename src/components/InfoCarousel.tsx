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
      className="relative mx-4 mb-4 rounded-3xl overflow-hidden cursor-pointer transition-shadow duration-300"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        minHeight: "90px",
      }}
      onClick={() => current === 0 && setExpanded(!expanded)}
    >
      {/* Gold top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl" style={{
        background: "linear-gradient(90deg, #D4AF37, #B8860B)",
        opacity: 0.7,
      }} />

      <div className="p-4">
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
              <span className="font-hebrew text-xs font-bold uppercase tracking-wider" style={{ color: "#D4AF37" }}>
                {slides[current].label}
              </span>
              {current === 0 && (
                <span className="ml-auto text-xs italic" style={{ color: "#94A3B8" }}>
                  Kitsour Ch. A. 80:1
                </span>
              )}
            </div>
            <p
              className={`text-sm leading-relaxed transition-all duration-300 ${
                !expanded && current === 0 ? "line-clamp-3" : ""
              }`}
              style={{ color: "#1E293B" }}
            >
              {slides[current].content}
            </p>
            {current === 0 && !expanded && (
              <span className="inline-block mt-1.5 text-xs" style={{ color: "#D4AF37", opacity: 0.7 }}>
                ▼ Lire la suite
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); setExpanded(false); }}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i === current ? "rgba(255,215,0,0.8)" : "rgba(0,0,0,0.12)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoCarousel;
