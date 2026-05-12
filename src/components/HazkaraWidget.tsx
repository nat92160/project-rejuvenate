import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { HDate, months as HMonths } from "@hebcal/core";

const HEBREW_MONTHS = [
  { value: "Nisan", label: "Nissan (ניסן)" },
  { value: "Iyyar", label: "Iyar (אייר)" },
  { value: "Sivan", label: "Sivan (סיון)" },
  { value: "Tamuz", label: "Tamouz (תמוז)" },
  { value: "Av", label: "Av (אב)" },
  { value: "Elul", label: "Eloul (אלול)" },
  { value: "Tishrei", label: "Tichri (תשרי)" },
  { value: "Cheshvan", label: "Hechvan (חשון)" },
  { value: "Kislev", label: "Kislev (כסלו)" },
  { value: "Tevet", label: "Tévet (טבת)" },
  { value: "Sh'vat", label: "Chevat (שבט)" },
  { value: "Adar I", label: "Adar I (אדר א׳)" },
  { value: "Adar II", label: "Adar II (אדר ב׳)" },
  { value: "Adar", label: "Adar (אדר)" },
];

const MONTH_FR: Record<string, string> = {
  Nisan: "Nissan", Iyyar: "Iyar", Sivan: "Sivan", Tamuz: "Tamouz",
  Av: "Av", Elul: "Eloul", Tishrei: "Tichri", Cheshvan: "Hechvan",
  Kislev: "Kislev", Tevet: "Tévet", "Sh'vat": "Chevat",
  "Adar I": "Adar I", "Adar II": "Adar II", Adar: "Adar",
};

function fmtFr(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const HazkaraWidget = () => {
  const [mode, setMode] = useState<"greg" | "heb">("greg");
  const [gregDate, setGregDate] = useState("");
  const [afterSunset, setAfterSunset] = useState(false);
  const [hebDay, setHebDay] = useState("1");
  const [hebMonth, setHebMonth] = useState("Tishrei");
  const [hebYear, setHebYear] = useState(new HDate().getFullYear().toString());
  const [rite, setRite] = useState<"sefarade" | "ashkenaze">("sefarade");

  const result = useMemo(() => {
    try {
      let deathHDate: HDate;

      if (mode === "greg") {
        if (!gregDate) return null;
        const [y, m, d] = gregDate.split("-").map(Number);
        if (!y || !m || !d) return null;
        const gd = new Date(y, m - 1, d);
        deathHDate = new HDate(gd);
        if (afterSunset) {
          // After sunset = next Hebrew day
          deathHDate = new HDate(deathHDate.abs() + 1);
        }
      } else {
        const day = parseInt(hebDay);
        const year = parseInt(hebYear);
        if (!day || !year || day < 1 || day > 30) return null;
        // Get month number
        const isLeap = HDate.isLeapYear(year);
        let monthName = hebMonth;
        // Adar handling
        if (monthName === "Adar" && isLeap) monthName = "Adar II";
        if ((monthName === "Adar I" || monthName === "Adar II") && !isLeap) monthName = "Adar";
        try {
          const monthNum = HDate.monthFromName(monthName);
          deathHDate = new HDate(day, monthNum, year);
        } catch {
          return null;
        }
      }

      const hebrewLabel = `${deathHDate.getDate()} ${MONTH_FR[deathHDate.getMonthName()] || deathHDate.getMonthName()} ${deathHDate.getFullYear()}`;
      const hebrewGematria = deathHDate.renderGematriya();

      // Compute next 6 yahrzeits starting from current Hebrew year
      const currentHYear = new HDate().getFullYear();
      const startYear = Math.max(deathHDate.getFullYear() + 1, currentHYear);
      const yahrzeits: { hYear: number; greg: Date; hebrew: string; note?: string }[] = [];

      for (let y = startYear; y < startYear + 6; y++) {
        const isLeap = HDate.isLeapYear(y);
        const deathMonthName = deathHDate.getMonthName();
        let monthName = deathMonthName;
        let note: string | undefined;

        // Adar logic
        if (deathMonthName === "Adar") {
          // Died in non-leap Adar
          if (isLeap) {
            monthName = rite === "sefarade" ? "Adar II" : "Adar II";
            note = "Année embolismique — observé en Adar II";
          }
        } else if (deathMonthName === "Adar I") {
          if (!isLeap) {
            monthName = "Adar";
          }
        } else if (deathMonthName === "Adar II") {
          if (!isLeap) {
            monthName = "Adar";
          }
        }

        // Cheshvan / Kislev — handle 30 days for short years
        let day = deathHDate.getDate();
        if (day === 30 && (monthName === "Cheshvan" || monthName === "Kislev")) {
          // Check if month has 30 days that year
          const monthNum = HDate.monthFromName(monthName);
          const daysInMonth = HDate.daysInMonth(monthNum, y);
          if (daysInMonth < 30) {
            day = 29;
            note = (note ? note + " · " : "") + "Mois court — observé le 29";
          }
        }

        try {
          const monthNum = HDate.monthFromName(monthName);
          const yzHd = new HDate(day, monthNum, y);
          yahrzeits.push({
            hYear: y,
            greg: yzHd.greg(),
            hebrew: yzHd.renderGematriya(),
            note,
          });
        } catch { /* skip */ }
      }

      return { hebrewLabel, hebrewGematria, yahrzeits };
    } catch {
      return null;
    }
  }, [mode, gregDate, afterSunset, hebDay, hebMonth, hebYear, rite]);

  return (
    <motion.div
      className="rounded-2xl bg-card p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🕯️ Calcul de Hazkara (Yahrzeit)
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
        Calcul de la date hébraïque du décès et des prochaines azkarot. La hazkara est observée chaque année à la date hébraïque du décès.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1.5 mt-4">
        <button
          onClick={() => setMode("greg")}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all"
          style={mode === "greg"
            ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
            : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
          }
        >
          📅 Date civile
        </button>
        <button
          onClick={() => setMode("heb")}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all"
          style={mode === "heb"
            ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
            : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
          }
        >
          ✡️ Date hébraïque
        </button>
      </div>

      {/* Inputs */}
      <div className="mt-4 p-4 rounded-xl border border-border space-y-3" style={{ background: "hsl(var(--muted))" }}>
        {mode === "greg" ? (
          <>
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">Date du décès (calendrier civil)</label>
              <input
                type="date"
                value={gregDate}
                onChange={(e) => setGregDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={afterSunset}
                onChange={(e) => setAfterSunset(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="font-medium">Décès survenu <strong>après</strong> le coucher du soleil (= jour hébraïque suivant)</span>
            </label>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Jour</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={hebDay}
                  onChange={(e) => setHebDay(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Mois</label>
                <select
                  value={hebMonth}
                  onChange={(e) => setHebMonth(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {HEBREW_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Année hébraïque</label>
              <input
                type="number"
                min="5000"
                max="6000"
                value={hebYear}
                onChange={(e) => setHebYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </>
        )}

        {/* Rite */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Rite (pour les années bissextiles)</label>
          <div className="flex gap-1.5">
            {([
              { id: "sefarade", label: "Séfarade" },
              { id: "ashkenaze", label: "Ashkénaze" },
            ] as const).map((r) => (
              <button
                key={r.id}
                onClick={() => setRite(r.id)}
                className="flex-1 px-2 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all"
                style={rite === r.id
                  ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" }
                  : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          <div className="p-4 rounded-xl border" style={{
            background: "hsl(var(--gold) / 0.06)",
            borderColor: "hsl(var(--gold) / 0.25)",
          }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date hébraïque du décès</p>
            <p className="text-base font-bold text-foreground">{result.hebrewLabel}</p>
            <p className="text-sm font-display text-foreground/70 mt-0.5" dir="rtl">{result.hebrewGematria}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prochaines azkarot</h4>
            {result.yahrzeits.map((y) => (
              <div
                key={y.hYear}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
                style={{ borderLeft: "3px solid hsl(var(--gold))" }}
              >
                <span className="text-base flex-shrink-0">🕯️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground capitalize">{fmtFr(y.greg)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5" dir="rtl">{y.hebrew}</p>
                  {y.note && (
                    <p className="text-[10px] text-muted-foreground italic mt-1">⚠️ {y.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <div className="mt-5 p-4 rounded-xl text-center border border-primary/15" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-xs font-bold text-primary mb-1.5">⚠️ Rappel important</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          La veille de la hazkara, allumez une bougie qui brûlera 24h. Consultez votre Rav pour les cas particuliers (1ère année, mois d'Adar en année embolismique, 30 Hechvan/Kislev).
        </p>
      </div>
    </motion.div>
  );
};

export default HazkaraWidget;
