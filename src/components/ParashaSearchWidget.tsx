import { useState } from "react";
import { motion } from "framer-motion";

const ParashaSearchWidget = () => {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!date) return;
    setLoading(true);
    try {
      const d = new Date(date);
      const url = `https://www.hebcal.com/shabbat?cfg=json&gy=${d.getFullYear()}&gm=${d.getMonth() + 1}&gd=${d.getDate()}&geo=none`;
      const r = await fetch(url);
      const data = await r.json();
      const parashat = data.items?.find((i: any) => i.category === "parashat");
      setResult(parashat ? parashat.title : "Aucune paracha trouvée");
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
      <p className="text-xs mt-1 mb-3 text-muted-foreground">Recherchez par date civile</p>

      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all disabled:opacity-50 hover:-translate-y-0.5 active:scale-95"
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
