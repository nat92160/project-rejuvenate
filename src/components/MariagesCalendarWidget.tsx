import { useState } from "react";
import { motion } from "framer-motion";

const FORBIDDEN_PERIODS = [
  { name: "Omer (Séfarade)", start: "2026-04-03", end: "2026-05-05", color: "#F97316" },
  { name: "Omer (Ashkénaze)", start: "2026-04-02", end: "2026-05-24", color: "#EF4444" },
  { name: "3 Semaines", start: "2026-07-07", end: "2026-07-28", color: "#DC2626" },
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday=0
}

function isDateForbidden(dateStr: string) {
  return FORBIDDEN_PERIODS.some((p) => dateStr >= p.start && dateStr <= p.end);
}

function getForbiddenPeriod(dateStr: string) {
  return FORBIDDEN_PERIODS.find((p) => dateStr >= p.start && dateStr <= p.end);
}

const MariagesCalendarWidget = () => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const todayStr = now.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const cells: { day: number; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  // Active forbidden periods this month
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${daysInMonth}`;
  const activePeriods = FORBIDDEN_PERIODS.filter((p) => p.start <= monthEnd && p.end >= monthStart);

  return (
    <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground mb-4">
        📅 Calendrier Mariages
      </h3>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border-none cursor-pointer text-foreground font-bold">←</button>
        <span className="font-display text-sm font-bold text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border-none cursor-pointer text-foreground font-bold">→</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <div key={d} className="text-[9px] font-bold uppercase text-center text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {cells.map(({ day, dateStr }) => {
          const forbidden = isDateForbidden(dateStr);
          const period = getForbiddenPeriod(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={day}
              className="relative flex items-center justify-center rounded-lg text-xs font-bold transition-all"
              style={{
                height: "36px",
                background: forbidden
                  ? `${period?.color || "#EF4444"}18`
                  : isToday
                  ? "hsl(var(--gold) / 0.12)"
                  : "transparent",
                color: forbidden
                  ? period?.color || "#EF4444"
                  : isToday
                  ? "hsl(var(--gold-matte))"
                  : "hsl(var(--foreground))",
                border: isToday ? "2px solid hsl(var(--gold))" : "1px solid transparent",
              }}
              title={forbidden ? `🚫 ${period?.name}` : "✅ Autorisé"}
            >
              {day}
              {forbidden && (
                <span className="absolute -top-0.5 -right-0.5 text-[7px]">🚫</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {activePeriods.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {activePeriods.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-foreground font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default MariagesCalendarWidget;
