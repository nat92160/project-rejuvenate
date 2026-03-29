import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import {
  FestivalCard,
  FestivalDay,
  DAY_TYPE_LABELS,
  fetchFestivalCards,
  downloadICalEvent,
  addToGoogleCalendar,
} from "@/lib/festivals";

type FilterType = "all" | "yomtov" | "jeune" | "roshchodesh";

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  bientot: { label: "Bientôt", bg: "hsl(var(--gold) / 0.1)", text: "hsl(var(--gold-matte))" },
  encours: { label: "En cours", bg: "hsl(120 60% 45% / 0.12)", text: "hsl(120 50% 35%)" },
  holhamoed: { label: "Hol HaMoèd", bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))" },
  termine: { label: "Terminé", bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))" },
};

const CATEGORY_COLORS: Record<string, string> = {
  yomtov: "hsl(var(--gold))",
  jeune: "hsl(0 70% 50%)",
  minor: "hsl(210 60% 55%)",
};

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "yomtov", label: "Yom Tov" },
  { key: "jeune", label: "Jeûnes" },
  { key: "roshchodesh", label: "Roch 'Hodech" },
];

const FestivalCalendar = () => {
  const { city } = useCity();
  const [cards, setCards] = useState<FestivalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [calMenuDay, setCalMenuDay] = useState<{ day: FestivalDay; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchFestivalCards(city).then((c) => {
      setCards(c);
      setLoading(false);
    });
  }, [city]);

  const filtered = filter === "all"
    ? cards
    : filter === "roshchodesh"
    ? cards.filter((c) => c.id.startsWith("roshchodesh-"))
    : cards.filter((c) => c.category === filter);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-lg font-bold text-foreground">📅 Calendrier des Fêtes</h2>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-200 border cursor-pointer ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-4xl">🕊️</span>
          <p className="mt-3 text-sm text-muted-foreground">Aucune fête à venir dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((card) => (
            <FestivalAccordionCard
              key={card.id}
              card={card}
              isExpanded={expandedId === card.id}
              onToggle={() => toggleExpand(card.id)}
              onCalendarClick={(day) => setCalMenuDay({ day, name: card.name })}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {calMenuDay && (
          <>
            <motion.div
              className="fixed inset-0 z-[300]"
              style={{ background: "hsl(var(--navy) / 0.25)", backdropFilter: "blur(8px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCalMenuDay(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[310] rounded-t-3xl bg-card p-6"
              style={{
                paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
                boxShadow: "var(--shadow-elevated)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-1">
                Ajouter au calendrier
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                {calMenuDay.name} — {calMenuDay.day.dateFr}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { addToGoogleCalendar(calMenuDay.day, calMenuDay.name); setCalMenuDay(null); }}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-card border border-border text-foreground cursor-pointer transition-all hover:bg-muted active:scale-[0.98]"
                >
                  📅 Google Calendar
                </button>
                <button
                  onClick={() => { downloadICalEvent(calMenuDay.day, calMenuDay.name); setCalMenuDay(null); }}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-card border border-border text-foreground cursor-pointer transition-all hover:bg-muted active:scale-[0.98]"
                >
                  📱 Apple Calendar / iCal
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Accordion Card with color bar ───

interface AccordionProps {
  card: FestivalCard;
  isExpanded: boolean;
  onToggle: () => void;
  onCalendarClick: (day: FestivalDay) => void;
}

const FestivalAccordionCard = ({ card, isExpanded, onToggle, onCalendarClick }: AccordionProps) => {
  const badge = STATUS_BADGES[card.status];
  const isMultiDay = card.days.length > 1;
  const isFast = card.category === "jeune";
  const barColor = CATEGORY_COLORS[card.category] || CATEGORY_COLORS.minor;

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border transition-all duration-300"
      style={{
        borderColor: card.category === "yomtov"
          ? "hsl(var(--gold) / 0.2)"
          : card.category === "jeune"
          ? "hsl(0 70% 50% / 0.15)"
          : "hsl(var(--border))",
        boxShadow: isExpanded ? "var(--shadow-elevated)" : "var(--shadow-card)",
      }}
      layout
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 bg-card text-left cursor-pointer border-none transition-colors hover:bg-muted/30"
        style={{ borderLeft: `4px solid ${barColor}` }}
      >
        <span className="text-3xl flex-shrink-0">{card.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-base font-bold text-foreground uppercase tracking-wide">
              {card.name}
            </h3>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-hebrew" style={{ direction: "rtl" }}>
            {card.hebrew}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{card.dateRange}</p>

          {/* Inline fast times directly on card */}
          {isFast && !isMultiDay && card.days[0] && (
            <div className="flex items-center gap-4 mt-2">
              {card.days[0].candles && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">⏰</span>
                  <span className="text-[10px] font-medium text-muted-foreground">Début</span>
                  <span className="text-sm font-bold" style={{ color: "hsl(0 70% 45%)" }}>{card.days[0].candles}</span>
                </div>
              )}
              {card.days[0].havdalah && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">✅</span>
                  <span className="text-[10px] font-medium text-muted-foreground">Fin</span>
                  <span className="text-sm font-bold" style={{ color: "hsl(120 50% 35%)" }}>{card.days[0].havdalah}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          {card.daysLeft > 0 && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border border-primary/20 text-primary mb-2"
              style={{ background: "hsl(var(--gold) / 0.08)" }}
            >
              {card.daysLeft}j
            </span>
          )}
          {isMultiDay && (
            <motion.span
              className="text-muted-foreground text-sm"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          )}
        </div>
      </button>

      {!isMultiDay && !isFast && card.days[0] && (
        <div className="px-5 pb-4 bg-card border-t border-border">
          <DayTimeline day={card.days[0]} festivalName={card.name} onCalendarClick={onCalendarClick} isFirstDay isLastDay />
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && isMultiDay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              <div className="relative">
                {card.days.map((day, idx) => (
                  <DayRow
                    key={day.date}
                    day={day}
                    isFirst={idx === 0}
                    isLast={idx === card.days.length - 1}
                    festivalName={card.name}
                    onCalendarClick={onCalendarClick}
                    categoryColor={barColor}
                  />
                ))}
              </div>
              {/* Footnote for multi-day Yom Tov */}
              {card.category === "yomtov" && card.days.length > 1 && (
                <div className="px-5 py-3 border-t border-border" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    📝 Note : Pour le 2ème soir de fête, l'allumage se fait après la sortie des étoiles à partir d'une flamme existante.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Day Row ───

interface DayRowProps {
  day: FestivalDay;
  isFirst: boolean;
  isLast: boolean;
  festivalName: string;
  onCalendarClick: (day: FestivalDay) => void;
  categoryColor: string;
}

const DayRow = ({ day, isFirst, isLast, festivalName, onCalendarClick, categoryColor }: DayRowProps) => {
  const isYomTov = day.type === "yomtov" || day.type === "erev";
  const isHolHaMoed = day.type === "holhamoed";

  return (
    <div
      className="flex gap-4 px-5 py-4 transition-colors"
      style={{
        background: isHolHaMoed
          ? "hsl(var(--muted))"
          : isYomTov
          ? "hsl(var(--gold) / 0.03)"
          : "hsl(var(--card))",
        borderBottom: isLast ? "none" : "1px solid hsl(var(--border))",
        borderLeft: `3px solid ${isYomTov ? categoryColor : isHolHaMoed ? "hsl(var(--border))" : "transparent"}`,
      }}
    >
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: isYomTov
              ? categoryColor
              : isHolHaMoed
              ? "hsl(var(--border))"
              : "hsl(var(--muted-foreground) / 0.3)",
            border: isYomTov ? `2px solid ${categoryColor}40` : "none",
          }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{ background: "hsl(var(--border))" }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider"
            style={{
              color: isYomTov
                ? "hsl(var(--gold-matte))"
                : "hsl(var(--muted-foreground))",
            }}
          >
            {DAY_TYPE_LABELS[day.type]}
          </span>
          {day.type === "yomtov" && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
            >
              Yom Tov
            </span>
          )}
          {day.isShabbat && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/10 text-primary">
              Chabbat
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground mt-1 capitalize">{day.dateFr}</p>

        <DayTimeline day={day} festivalName={festivalName} onCalendarClick={onCalendarClick} compact isFirstDay={isFirst} isLastDay={isLast} />
      </div>
    </div>
  );
};

// ─── Times display ───

interface DayTimelineProps {
  day: FestivalDay;
  festivalName: string;
  onCalendarClick: (day: FestivalDay) => void;
  compact?: boolean;
  isFirstDay?: boolean;
  isLastDay?: boolean;
}

const DayTimeline = ({ day, festivalName, onCalendarClick, compact, isFirstDay = true, isLastDay = true }: DayTimelineProps) => {
  const isFast = day.type === "fast";

  // Show 🕯️ Allumage for:
  // - Erev (veille de fête)
  // - Friday (entering Shabbat)
  // - Fasts ("Début")
  // - Single-day events
  const showCandles = day.candles && (
    isFast ||
    day.type === "erev" ||
    day.dayOfWeek === 5 || // Friday
    (isFirstDay && isLastDay)
  );

  // Show ✨ Sortie for:
  // - Saturday (Shabbat ending) — ALWAYS, even mid-festival
  // - Last day of the festival
  // - End of any Yom Tov day that has havdalah
  // - Fasts ("Fin")
  // - Single-day events
  const showHavdalah = day.havdalah && (
    isFast ||
    isLastDay ||
    day.isShabbat || // Saturday = always show Sortie
    day.dayOfWeek === 6 || // Shabbat day
    (isFirstDay && isLastDay)
  );

  if (!showCandles && !showHavdalah && compact) return null;

  const candleIcon = isFast ? "⏰" : "🕯️";
  const candleLabel = isFast ? "Début" : "Allumage";
  const havdalahIcon = isFast ? "✅" : "✨";
  const havdalahLabel = isFast ? "Fin" : "Sortie";

  return (
    <div className={`flex items-center gap-4 flex-wrap ${compact ? "mt-2" : "mt-3"}`}>
      {showCandles && (
        <div className="flex items-center gap-2">
          <span className="text-xs">{candleIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{candleLabel}</span>
          <span
            className="text-sm font-bold tracking-wide"
            style={{ color: isFast ? "hsl(0 70% 45%)" : "hsl(var(--primary))" }}
          >
            {day.candles}
          </span>
        </div>
      )}
      {showHavdalah && (
        <div className="flex items-center gap-2">
          <span className="text-xs">{havdalahIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{havdalahLabel}</span>
          <span
            className="text-sm font-bold tracking-wide"
            style={{ color: isFast ? "hsl(120 50% 35%)" : "hsl(var(--primary))" }}
          >
            {day.havdalah}
          </span>
        </div>
      )}
      {(showCandles || showHavdalah) && (
        <button
          onClick={(e) => { e.stopPropagation(); onCalendarClick(day); }}
          className="ml-auto text-[10px] font-bold text-primary/60 hover:text-primary cursor-pointer bg-transparent border-none transition-colors px-2 py-1 rounded-lg hover:bg-primary/5"
          title="Ajouter au calendrier"
        >
          📅 +Cal
        </button>
      )}
    </div>
  );
};

export default FestivalCalendar;
