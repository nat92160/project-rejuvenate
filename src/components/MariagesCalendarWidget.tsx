import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HebrewCalendar, HDate, Location, flags } from "@hebcal/core";

// Compute forbidden marriage periods dynamically for any year
function computeForbiddenPeriods(year: number) {
  const events = HebrewCalendar.calendar({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    il: false,
  }).filter(ev => ev.getDate().greg().getFullYear() === year);

  let pessachEnd: string | null = null;
  let lagBaomer: string | null = null;
  let shavuotErev: string | null = null;
  let tammuz17: string | null = null;
  let tishaBeav: string | null = null;

  for (const ev of events) {
    const desc = ev.getDesc().toLowerCase();
    const d = ev.getDate().greg();
    const iso = toIso(d);

    if (desc === "pesach ii") pessachEnd = iso;
    if (desc === "lag baomer") lagBaomer = iso;
    if (desc === "erev shavuot") shavuotErev = iso;
    if (desc === "tzom tammuz") tammuz17 = iso;
    if (desc === "tish'a b'av") tishaBeav = iso;
  }

  const periods: { name: string; start: string; end: string; color: string; reason: string }[] = [];

  if (pessachEnd && lagBaomer) {
    periods.push({ name: "Omer (Séfarade)", start: pessachEnd, end: lagBaomer, color: "#F97316", reason: "Période du Omer (coutume séfarade)" });
  }
  if (pessachEnd && shavuotErev) {
    periods.push({ name: "Omer (Ashkénaze)", start: pessachEnd, end: shavuotErev, color: "#EF4444", reason: "Période du Omer (coutume ashkénaze)" });
  }
  if (tammuz17 && tishaBeav) {
    periods.push({ name: "Bein HaMetsarim", start: tammuz17, end: tishaBeav, color: "#DC2626", reason: "Période de Bein HaMetsarim (3 Semaines)" });
  }

  return periods;
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const MariagesCalendarWidget = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [checkDate, setCheckDate] = useState("");
  const [checkResult, setCheckResult] = useState<{ allowed: boolean; reason?: string } | null>(null);

  const forbiddenPeriods = useMemo(() => computeForbiddenPeriods(selectedYear), [selectedYear]);

  const isDateForbidden = (dateStr: string) =>
    forbiddenPeriods.some((p) => dateStr >= p.start && dateStr <= p.end);

  const getForbiddenPeriod = (dateStr: string) =>
    forbiddenPeriods.find((p) => dateStr >= p.start && dateStr <= p.end);

  const daysInMonth = getDaysInMonth(selectedYear, viewMonth);
  const firstDay = getFirstDayOfWeek(selectedYear, viewMonth);
  const todayStr = toIso(now);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setSelectedYear(selectedYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setSelectedYear(selectedYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const cells: { day: number; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${selectedYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const monthStart = `${selectedYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const monthEnd = `${selectedYear}-${String(viewMonth + 1).padStart(2, "0")}-${daysInMonth}`;
  const activePeriods = forbiddenPeriods.filter((p) => p.start <= monthEnd && p.end >= monthStart);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const handleCheckDate = () => {
    if (!checkDate) return;
    // Compute for the year of the checked date
    const checkYear = parseInt(checkDate.split("-")[0]);
    const periods = computeForbiddenPeriods(checkYear);
    const period = periods.find((p) => checkDate >= p.start && checkDate <= p.end);
    if (period) {
      setCheckResult({ allowed: false, reason: period.reason });
    } else {
      setCheckResult({ allowed: true });
    }
  };

  const handleDayClick = (dateStr: string) => {
    setCheckDate(dateStr);
    const period = getForbiddenPeriod(dateStr);
    if (period) {
      setCheckResult({ allowed: false, reason: period.reason });
    } else {
      // Check across all years
      const year = parseInt(dateStr.split("-")[0]);
      const periods = computeForbiddenPeriods(year);
      const p = periods.find((p) => dateStr >= p.start && dateStr <= p.end);
      setCheckResult(p ? { allowed: false, reason: p.reason } : { allowed: true });
    }
  };

  return (
    <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground mb-4">
        💍 Calendrier Mariages
      </h3>

      {/* Date checker */}
      <div className="p-4 rounded-xl mb-4 border border-border" style={{ background: "hsl(var(--muted))" }}>
        <div className="text-xs font-bold text-foreground mb-2">🔍 Vérifier ma date</div>
        <div className="flex gap-2">
          <input
            type="date"
            value={checkDate}
            onChange={(e) => { setCheckDate(e.target.value); setCheckResult(null); }}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={handleCheckDate}
            className="px-4 py-2 rounded-lg text-xs font-bold border-none cursor-pointer transition-all active:scale-95"
            style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
          >
            Vérifier
          </button>
        </div>
        <AnimatePresence>
          {checkResult && (
            <motion.div
              className="mt-3 p-3 rounded-lg text-sm font-bold text-center"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: checkResult.allowed ? "hsl(120 60% 45% / 0.1)" : "hsl(0 70% 50% / 0.1)",
                color: checkResult.allowed ? "hsl(120 50% 35%)" : "hsl(0 70% 45%)",
              }}
            >
              {checkResult.allowed ? "✅ Autorisé — Mazal Tov ! 💍" : `❌ Interdit — ${checkResult.reason}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Year selector */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {yearOptions.map((y) => (
          <button
            key={y}
            onClick={() => { setSelectedYear(y); setViewMonth(0); setCheckResult(null); }}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all"
            style={selectedYear === y
              ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            {y}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border-none cursor-pointer text-foreground font-bold">←</button>
        <span className="font-display text-sm font-bold text-foreground">{MONTHS[viewMonth]} {selectedYear}</span>
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
          const isSelected = dateStr === checkDate;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(dateStr)}
              className="relative flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
              style={{
                height: "36px",
                background: isSelected
                  ? "hsl(var(--primary) / 0.15)"
                  : forbidden
                  ? `${period?.color || "#EF4444"}18`
                  : isToday
                  ? "hsl(var(--gold) / 0.12)"
                  : "transparent",
                color: forbidden
                  ? period?.color || "#EF4444"
                  : isToday
                  ? "hsl(var(--gold-matte))"
                  : "hsl(var(--foreground))",
                border: isSelected
                  ? "2px solid hsl(var(--primary))"
                  : isToday
                  ? "2px solid hsl(var(--gold))"
                  : "1px solid transparent",
              }}
              title={forbidden ? `🚫 ${period?.name}` : "✅ Autorisé"}
            >
              {day}
              {forbidden && (
                <span className="absolute -top-0.5 -right-0.5 text-[7px]">🚫</span>
              )}
              {!forbidden && !isToday && (
                <span className="absolute -bottom-0.5 text-[6px]">💚</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: "hsl(120 60% 45%)" }} />
          <span className="text-foreground font-medium">Autorisé</span>
        </div>
        {activePeriods.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-foreground font-medium">{p.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default MariagesCalendarWidget;
