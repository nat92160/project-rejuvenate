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
      className="rounded-3xl bg-white p-6 mb-4"
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="font-hebrew text-lg font-semibold flex items-center gap-2" style={{ color: "#1E293B" }}>
        📅 Quelle paracha pour une date ?
      </h3>
      <p className="text-xs mt-1 mb-3" style={{ color: "#475569" }}>Recherchez par date civile</p>

      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-[10px] text-sm"
          style={{
            border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(0,0,0,0.02)",
            color: "#1E293B",
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-5 py-2 rounded-[10px] text-sm font-semibold text-white border-none cursor-pointer transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #B8860B, #D4AF37)",
            minHeight: "40px",
          }}
        >
          {loading ? "..." : "Rechercher"}
        </button>
      </div>

      {result && (
        <div className="mt-3 p-3 rounded-xl text-center" style={{
          background: "rgba(212,175,55,0.06)",
          border: "1px solid rgba(212,175,55,0.15)",
        }}>
          <p className="font-hebrew text-lg font-semibold" style={{ color: "#1E293B" }}>{result}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ParashaSearchWidget;
