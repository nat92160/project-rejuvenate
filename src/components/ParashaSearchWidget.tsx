import { useState } from "react";
import { motion } from "framer-motion";

const hebrewMonths = [
  "Nisan", "Iyyar", "Sivan", "Tamuz", "Av", "Elul",
  "Tishrei", "Cheshvan", "Kislev", "Tevet", "Sh'vat", "Adar",
];

const ParashaSearchWidget = () => {
  const [hDay, setHDay] = useState("");
  const [hMonth, setHMonth] = useState("Nisan");
  const [hYear, setHYear] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!hDay || !hYear) return;
    setLoading(true);
    try {
      // First convert Hebrew date to Gregorian
      const convUrl = `https://www.hebcal.com/converter?cfg=json&h2g=1&hd=${hDay}&hm=${encodeURIComponent(hMonth)}&hy=${hYear}`;
      const convRes = await fetch(convUrl);
      const convData = await convRes.json();

      // Then find parasha for that Gregorian date
      const url = `https://www.hebcal.com/shabbat?cfg=json&gy=${convData.gy}&gm=${convData.gm}&gd=${convData.gd}&geo=none`;
      const r = await fetch(url);
      const data = await r.json();
      const parashat = data.items?.find((i: any) => i.category === "parashat");
      setResult(parashat ? parashat.title : "Aucune paracha trouvée pour cette date");
    } catch {
      setResult("Erreur de recherche");
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        📅 Quelle paracha pour une date ?
      </h3>
      <p className="text-xs mt-1 mb-4 text-muted-foreground">Recherchez par date hébraïque</p>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Jour</label>
            <input
              type="number"
              min="1"
              max="30"
              value={hDay}
              onChange={(e) => setHDay(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[52px]"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Mois</label>
            <select
              value={hMonth}
              onChange={(e) => setHMonth(e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[52px]"
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
              className="w-full px-3 py-3 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[52px]"
            />
          </div>
        </div>
        <button
          onClick={search}
          disabled={loading || !hDay || !hYear}
          className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 min-h-[52px]"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
        >
          {loading ? "..." : "Rechercher"}
        </button>
      </div>

      {result && (
        <div className="mt-3 p-4 rounded-xl text-center border border-primary/12"
          style={{ background: "hsl(var(--gold) / 0.04)" }}>
          <p className="font-display text-lg font-bold text-foreground">{result}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ParashaSearchWidget;
