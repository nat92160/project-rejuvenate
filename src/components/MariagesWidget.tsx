import { useState } from "react";
import { motion } from "framer-motion";

// Données Consistoire 5786 (2025-2026)
const FORBIDDEN_PERIODS = [
  {
    name: "Omer — Rite Séfarade",
    start: "2026-04-03",
    end: "2026-05-05",
    icon: "🌾",
    detail: "Du lendemain du dernier Yom Tov de Pessah jusqu'à Lag BaOmer inclus.",
    rite: "Séfarade",
    month: "avril-mai",
  },
  {
    name: "Omer — Rite Ashkénaze",
    start: "2026-04-02",
    end: "2026-05-24",
    icon: "🌾",
    detail: "Sauf le 5 mai 2026 (Lag BaOmer). Du 2e jour de Pessah jusqu'au 3 Sivan.",
    rite: "Ashkénaze",
    month: "avril-mai",
  },
  {
    name: "Trois Semaines (Bein HaMétsarim)",
    start: "2026-07-07",
    end: "2026-07-28",
    icon: "😢",
    detail: "Du 17 Tamouz au 9 Av — Période de deuil national. Mariages strictement interdits.",
    month: "juillet",
  },
];

// Generate all months as "allowed" or "forbidden" entries for searchability
function generateAllMonths() {
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const entries: { name: string; start: string; end: string; icon: string; detail: string; rite?: string; month: string; status: "interdit" | "autorise" }[] = [];

  // Add forbidden periods
  for (const p of FORBIDDEN_PERIODS) {
    entries.push({ ...p, status: "interdit" });
  }

  // Add allowed months (months with no overlap with forbidden periods)
  for (let m = 0; m < 12; m++) {
    const mStr = String(m + 1).padStart(2, "0");
    const mStart = `2026-${mStr}-01`;
    const daysInMonth = new Date(2026, m + 1, 0).getDate();
    const mEnd = `2026-${mStr}-${daysInMonth}`;
    const overlapping = FORBIDDEN_PERIODS.filter((p) => p.start <= mEnd && p.end >= mStart);
    if (overlapping.length === 0) {
      entries.push({
        name: `${months[m]} 2026`,
        start: mStart,
        end: mEnd,
        icon: "💚",
        detail: `Mariages autorisés tout le mois de ${months[m].toLowerCase()}.`,
        month: months[m].toLowerCase(),
        status: "autorise",
      });
    }
  }

  return entries;
}

const ALL_ENTRIES = generateAllMonths();

const FILTER_OPTIONS = [
  { value: "all", label: "Tout" },
  { value: "interdit", label: "🚫 Interdit" },
  { value: "autorise", label: "✅ Autorisé" },
];

const MariagesWidget = () => {
  const [filter, setFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const now = new Date();

  const isInPeriod = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T23:59:59");
    return now >= s && now <= e;
  };

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const todayForbidden = FORBIDDEN_PERIODS.some(
    (p) => isInPeriod(p.start, p.end)
  );

  const filteredEntries = ALL_ENTRIES.filter((p) => {
    // Status filter
    if (filter === "interdit" && p.status !== "interdit") return false;
    if (filter === "autorise" && p.status !== "autorise") return false;

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.rite?.toLowerCase().includes(q) ?? false) ||
        p.month.toLowerCase().includes(q) ||
        p.detail.toLowerCase().includes(q) ||
        fmtDate(p.start).toLowerCase().includes(q) ||
        fmtDate(p.end).toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
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
          background: todayForbidden
            ? "hsl(0 84% 60% / 0.08)"
            : "hsl(142 76% 36% / 0.08)",
          border: todayForbidden
            ? "1px solid hsl(0 84% 60% / 0.2)"
            : "1px solid hsl(142 76% 36% / 0.2)",
          color: todayForbidden
            ? "hsl(0 72% 51%)"
            : "hsl(142 71% 45%)",
        }}
      >
        {todayForbidden
          ? "🚫 Aujourd'hui — Mariage interdit"
          : "✅ Aujourd'hui — Mariage autorisé"}
      </div>

      {/* Filter bar */}
      <div className="mt-4 space-y-2">
        <input
          type="text"
          placeholder="🔍 Rechercher (mois, rite, période, date...)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex justify-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold border-none cursor-pointer transition-all"
              style={{
                background: filter === opt.value ? "hsl(var(--gold) / 0.15)" : "hsl(var(--muted) / 0.5)",
                color: filter === opt.value ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 flex-wrap mt-4 mb-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142 76% 36%)" }} />
          Autorisé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0 84% 60%)" }} />
          Interdit
        </span>
      </div>

      {/* Periods */}
      <div className="space-y-3">
        {filteredPeriods.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {filter === "autorise"
              ? "✅ Toutes les périodes non-interdites sont autorisées pour le mariage."
              : "Aucun résultat pour cette recherche."}
          </div>
        )}
        {filteredPeriods.map((p) => {
          const active = isInPeriod(p.start, p.end);
          return (
            <div
              key={p.name}
              className="flex items-start gap-3.5 p-4 rounded-xl border transition-all"
              style={{
                borderColor: active
                  ? "hsl(0 84% 60% / 0.3)"
                  : "hsl(var(--border))",
                borderLeft: "3px solid hsl(0 84% 60%)",
                background: active
                  ? "hsl(0 84% 60% / 0.04)"
                  : "hsl(var(--card))",
              }}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  🚫 {p.name}
                  {active && (
                    <span className="ml-2 text-xs" style={{ color: "hsl(0 84% 60%)" }}>
                      (EN COURS)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                  Du {fmtDate(p.start)} au {fmtDate(p.end)}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1 italic">
                  {p.detail}
                </p>
                {"rite" in p && p.rite && (
                  <span
                    className="inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                    style={{
                      background: "hsl(var(--gold) / 0.08)",
                      color: "hsl(var(--gold-matte))",
                      borderColor: "hsl(var(--gold) / 0.2)",
                    }}
                  >
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
          Les dates ci-dessus sont celles du <strong>Consistoire de Paris</strong> pour l'année 5786.
          <br />
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
