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

const MariagesWidget = () => {
  const now = new Date();

  const isInPeriod = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T23:59:59");
    return now >= s && now <= e;
  };

  const isPast = (end: string) => {
    return new Date(end + "T23:59:59") < now;
  };

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Check if today is forbidden
  const todayForbidden = FORBIDDEN_PERIODS.some(
    (p) => !isPast(p.end) && isInPeriod(p.start, p.end)
  );

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
        {FORBIDDEN_PERIODS.filter((p) => !isPast(p.end)).map((p) => {
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
                {"rite" in p && (
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
