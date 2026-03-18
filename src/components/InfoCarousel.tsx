import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, fetchHolidays, fetchZmanim } from "@/lib/hebcal";
import { getHilloulaForDate } from "@/lib/hilloula";

interface Slide {
  icon: string;
  label: string;
  content: string;
  source?: string;
}

const HALAKHOT = [
  { text: "Il est interdit de cuire, rôtir ou réchauffer de la nourriture pendant Chabbat. Tout aliment consommé chaud le Chabbat doit avoir été placé sur la plaque chauffante (Plata) avant l'entrée du Chabbat.", ref: "Kitsour Ch. A. 80:1" },
  { text: "On ne doit pas presser des fruits pour en extraire le jus pendant Chabbat. Cependant, si le jus qui sort du fruit n'est pas habituellement bu, il est permis.", ref: "Kitsour Ch. A. 80:12" },
  { text: "Il est interdit de trier des aliments mélangés pendant Chabbat, sauf si on trie ce qu'on veut manger immédiatement, à la main, sans ustensile.", ref: "Kitsour Ch. A. 80:13" },
  { text: "On ne doit pas ouvrir une bouteille dont le bouchon se détache complètement lors de la première ouverture, car cela revient à fabriquer un ustensile.", ref: "Choul'han Aroukh 314:1" },
  { text: "Il est permis de plier un vêtement le Chabbat seulement s'il n'a pas été lavé et si on le plie différemment de d'habitude.", ref: "Kitsour Ch. A. 80:44" },
];

const InfoCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const { city } = useCity();

  // Load real data
  useEffect(() => {
    const halakha = HALAKHOT[Math.floor(Math.random() * HALAKHOT.length)];
    const initialSlides: Slide[] = [
      {
        icon: "📖",
        label: "HALAKHA DU JOUR",
        content: halakha.text,
        source: halakha.ref,
      },
      { icon: "📜", label: "PARACHA DE LA SEMAINE", content: "Chargement..." },
      { icon: "🎉", label: "PROCHAINE FÊTE", content: "Chargement..." },
      { icon: "⏰", label: "HORAIRES CLÉ", content: "Chargement..." },
    ];
    setSlides(initialSlides);

    // Fetch parasha
    fetchShabbatTimes(city).then((data) => {
      if (data?.parasha) {
        setSlides((prev) => prev.map((s, i) =>
          i === 1
            ? {
                ...s,
                content: `${data.parasha}${data.parashaHebrew ? ` — ${data.parashaHebrew}` : ""}`,
                source: "Chabbat à venir",
              }
            : s
        ));
      }
    });

    // Fetch next holiday
    fetchHolidays(city).then((holidays) => {
      if (holidays.length > 0) {
        const h = holidays[0];
        setSlides((prev) => prev.map((s, i) =>
          i === 2
            ? {
                ...s,
                content: `${h.emoji} ${h.title}${h.hebrew ? ` (${h.hebrew})` : ""} — ${h.date} (dans ${h.daysLeft} jours)`,
              }
            : s
        ));
      }
    });

    // Fetch key zmanim for today
    fetchZmanim(city).then((zmanim) => {
      const sunrise = zmanim.find((z) => z.label.includes("Nets"));
      const sunset = zmanim.find((z) => z.label.includes("Chkia"));
      const chema = zmanim.find((z) => z.label.includes("Chéma") && z.label.includes("GR"));
      if (sunrise && sunset) {
        setSlides((prev) => prev.map((s, i) =>
          i === 3
            ? {
                ...s,
                content: `🌅 Lever ${sunrise.time} • ${chema ? `📖 Chéma ${chema.time} • ` : ""}🌇 Coucher ${sunset.time}`,
                source: city.name,
              }
            : s
        ));
      }
    });

    // Check for Hilloula
    const now = new Date();
    fetch(
      `https://www.hebcal.com/converter?cfg=json&g2h=1&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}`
    )
      .then((r) => r.json())
      .then((hd) => {
        const hilloulot = getHilloulaForDate(hd.hm, hd.hd);
        if (hilloulot.length > 0) {
          const h = hilloulot[0];
          setSlides((prev) => [
            ...prev,
            {
              icon: "🕯️",
              label: "HILLOULA DU JOUR",
              content: `${h.name} — ${h.desc}`,
              source: `${hd.hd} ${hd.hm} ${hd.hy}`,
            },
          ]);
        }
      })
      .catch(() => {});
  }, [city]);

  const next = useCallback(() => {
    if (!expanded && slides.length > 0) {
      setCurrent((prev) => (prev + 1) % slides.length);
    }
  }, [expanded, slides.length]);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  if (slides.length === 0) return null;

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
              {slides[current].source && (
                <span className="ml-auto text-[10px] italic text-muted-foreground">
                  {slides[current].source}
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
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoCarousel;
