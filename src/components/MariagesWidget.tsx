import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HebrewCalendar } from "@hebcal/core";

// Données statiques Consistoire 5786
const FORBIDDEN_PERIODS_STATIC = [
  {
    name: "Omer — Rite Séfarade",
    start: "2026-04-03",
    end: "2026-05-05",
    icon: "🌾",
    detail: "Du lendemain du dernier Yom Tov de Pessah jusqu'à Lag BaOmer inclus.",
    rite: "Séfarade",
  },
  {
    name: "Omer — Rite Ashkénaze",
    start: "2026-04-02",
    end: "2026-05-24",
    icon: "🌾",
    detail: "Sauf le 5 mai 2026 (Lag BaOmer). Du 2e jour de Pessah jusqu'au 3 Sivan.",
    rite: "Ashkénaze",
  },
  {
    name: "Trois Semaines (Bein HaMétsarim)",
    start: "2026-07-07",
    end: "2026-07-28",
    icon: "😢",
    detail: "Du 17 Tamouz au 9 Av — Période de deuil national. Mariages strictement interdits.",
  },
];

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeForbiddenPeriods(year: number) {
  const events = HebrewCalendar.calendar({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    il: false,
  });

  let pessachEnd: string | null = null;
  let lagBaomer: string | null = null;
  let shavuotErev: string | null = null;
  let tammuz17: string | null = null;
  let tishaBeav: string | null = null;

  for (const ev of events) {
    const desc = ev.getDesc().toLowerCase();
    const d = ev.getDate().greg();
    if (d.getFullYear() !== year) continue;
    const iso = toIso(d);
    if (desc.includes("pesach") && (desc.includes("viii") || desc.includes("vii"))) pessachEnd = iso;
    if (desc.includes("lag b")) lagBaomer = iso;
    if (desc.includes("erev shavuot")) shavuotErev = iso;
    if (desc.includes("tammuz") || desc.includes("17 of tammuz")) tammuz17 = iso;
    if (desc.includes("tish") && desc.includes("av") && !desc.includes("erev")) tishaBeav = iso;
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

const MariagesWidget = () => {
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

  const handleDateChange = (value: string) => {
    setCheckDate(value);
    if (!value) { setCheckResult(null); return; }
    const checkYear = parseInt(value.split("-")[0]);
    if (isNaN(checkYear)) { setCheckResult(null); return; }
    const periods = computeForbiddenPeriods(checkYear);
    const period = periods.find((p) => value >= p.start && value <= p.end);
    setCheckResult(period ? { allowed: false, reason: period.reason } : { allowed: true });
    const month = parseInt(value.split("-")[1]) - 1;
    setSelectedYear(checkYear);
    setViewMonth(month);
  };

  const handleDayClick = (dateStr: string) => {
    setCheckDate(dateStr);
    const year = parseInt(dateStr.split("-")[0]);
    const periods = computeForbiddenPeriods(year);
    const p = periods.find((p) => dateStr >= p.start && dateStr <= p.end);
    setCheckResult(p ? { allowed: false, reason: p.reason } : { allowed: true });
  };

  const todayForbidden = FORBIDDEN_PERIODS_STATIC.some((p) => {
    const s = new Date(p.start + "T00:00:00");
    const e = new Date(p.end + "T23:59:59");
    return now >= s && now <= e;
  });

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  const isInPeriod = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T23:59:59");
    return now >= s && now <= e;
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        💍 Calendrier des Mariages
      </h3>

      {/* Today status */}
      <div
        className="mt-4 p-4 rounded-xl text-center text-sm font-bold"
        style={{
          background: todayForbidden ? "hsl(0 84% 60% / 0.08)" : "hsl(142 76% 36% / 0.08)",
          border: todayForbidden ? "1px solid hsl(0 84% 60% / 0.2)" : "1px solid hsl(142 76% 36% / 0.2)",
          color: todayForbidden ? "hsl(0 72% 51%)" : "hsl(142 71% 45%)",
        }}
      >
        {todayForbidden ? "🚫 Aujourd'hui — Mariage interdit" : "✅ Aujourd'hui — Mariage autorisé"}
      </div>

      {/* Date checker */}
      <div className="p-4 rounded-xl mt-4 border border-border" style={{ background: "hsl(var(--muted))" }}>
        <div className="text-xs font-bold text-foreground mb-2">🔍 Vérifier une date</div>
        <input
          type="date"
          value={checkDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
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
      <div className="flex gap-1.5 mt-4 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {yearOptions.map((y) => (
          <button
            key={y}
            onClick={() => { setSelectedYear(y); setViewMonth(0); setCheckResult(null); setCheckDate(""); }}
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
      <div className="flex items-center justify-between mb-3">
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
              {forbidden && <span className="absolute -top-0.5 -right-0.5 text-[7px]">🚫</span>}
              {!forbidden && !isToday && <span className="absolute -bottom-0.5 text-[6px]">💚</span>}
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

      {/* Static periods detail */}
      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Périodes interdites 5786</h4>
        {FORBIDDEN_PERIODS_STATIC.map((p) => {
          const active = isInPeriod(p.start, p.end);
          return (
            <div
              key={p.name}
              className="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
              style={{
                borderColor: active ? "hsl(0 84% 60% / 0.3)" : "hsl(var(--border))",
                borderLeft: "3px solid hsl(0 84% 60%)",
                background: active ? "hsl(0 84% 60% / 0.04)" : "hsl(var(--card))",
              }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{p.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  🚫 {p.name}
                  {active && <span className="ml-2 text-xs" style={{ color: "hsl(0 84% 60%)" }}>(EN COURS)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                  Du {fmtDate(p.start)} au {fmtDate(p.end)}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1 italic">{p.detail}</p>
                {p.rite && (
                  <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                    style={{ background: "hsl(var(--gold) / 0.08)", color: "hsl(var(--gold-matte))", borderColor: "hsl(var(--gold) / 0.2)" }}>
                    {p.rite}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reminder */}
      <div className="mt-5 p-4 rounded-xl text-center border border-primary/15" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-xs font-bold text-primary mb-1.5">⚠️ Rappel important</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Consultez <strong>toujours</strong> votre Rav avant de fixer une date de mariage.
        </p>
        <a
          href="https://www.consistoire.org/pdf/Mariages_interdits_5785_5790.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-primary font-semibold hover:underline"
        >
          📄 PDF officiel du Consistoire
        </a>
      </div>
    </motion.div>
  );
};

export default MariagesWidget;
