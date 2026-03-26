import { useState } from "react";
import { motion } from "framer-motion";

const DateConverterWidget = () => {
  const [mode, setMode] = useState<"g2h" | "h2g">("g2h");
  const [gDate, setGDate] = useState("");
  const [hDay, setHDay] = useState("");
  const [hMonth, setHMonth] = useState("Nisan");
  const [hYear, setHYear] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hebrewMonths = [
    "Nisan", "Iyyar", "Sivan", "Tamuz", "Av", "Elul",
    "Tishrei", "Cheshvan", "Kislev", "Tevet", "Sh'vat", "Adar",
  ];

  const convertG2H = async () => {
    if (!gDate) return;
    setLoading(true);
    try {
      const d = new Date(gDate);
      const r = await fetch(
        `https://www.hebcal.com/converter?cfg=json&g2h=1&gy=${d.getFullYear()}&gm=${d.getMonth() + 1}&gd=${d.getDate()}`
      );
      const data = await r.json();
      setResult(`${data.hd} ${data.hm} ${data.hy} — ${data.hebrew}`);
    } catch {
      setResult("Erreur de conversion");
    }
    setLoading(false);
  };

  const convertH2G = async () => {
    if (!hDay || !hYear) return;
    setLoading(true);
    try {
      const monthNum = hebrewMonths.indexOf(hMonth) + 1;
      const r = await fetch(
        `https://www.hebcal.com/converter?cfg=json&h2g=1&hd=${hDay}&hm=${encodeURIComponent(hMonth)}&hy=${hYear}`
      );
      const data = await r.json();
      const gd = new Date(data.gy, data.gm - 1, data.gd);
      setResult(gd.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    } catch {
      setResult("Erreur de conversion");
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🔄 Convertisseur de dates
      </h3>

      {/* Mode toggle */}
      <div className="flex gap-2 mt-4 mb-5">
        {[
          { key: "g2h" as const, label: "Grégorien → Hébraïque" },
          { key: "h2g" as const, label: "Hébraïque → Grégorien" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
              mode === m.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "g2h" ? (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
              Date civile
            </label>
            <input
              type="date"
              value={gDate}
              onChange={(e) => setGDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[52px]"
              style={{ colorScheme: "light" }}
            />
          </div>
          <button
            onClick={convertG2H}
            disabled={loading || !gDate}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 min-h-[52px]"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            {loading ? "..." : "Convertir"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Jour</label>
              <input
                type="number"
                min="1"
                max="30"
                value={hDay}
                onChange={(e) => setHDay(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[48px]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Mois</label>
              <select
                value={hMonth}
                onChange={(e) => setHMonth(e.target.value)}
                className="w-full px-2 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[48px]"
              >
                {hebrewMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Année</label>
              <input
                type="number"
                value={hYear}
                onChange={(e) => setHYear(e.target.value)}
                placeholder="5786"
                className="w-full px-3 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[48px]"
              />
            </div>
          </div>
          <button
            onClick={convertH2G}
            disabled={loading || !hDay || !hYear}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 min-h-[48px]"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            {loading ? "..." : "Convertir"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-xl text-center border border-primary/12" style={{ background: "hsl(var(--gold) / 0.04)" }}>
          <p className="font-display text-lg font-bold text-foreground">{result}</p>
        </div>
      )}
    </motion.div>
  );
};

export default DateConverterWidget;
