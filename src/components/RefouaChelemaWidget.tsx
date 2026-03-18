import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Patient {
  id: string;
  hebrewName: string;
  motherName: string;
  addedAt: string;
}

const DEMO: Patient[] = [
  { id: "1", hebrewName: "יצחק", motherName: "שרה", addedAt: "15 mars 2026" },
  { id: "2", hebrewName: "רחל", motherName: "לאה", addedAt: "12 mars 2026" },
  { id: "3", hebrewName: "משה", motherName: "מרים", addedAt: "10 mars 2026" },
];

const RefouaChelemaWidget = () => {
  const [patients] = useState<Patient[]>(DEMO);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [mother, setMother] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    setShowForm(false);
    setName("");
    setMother("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            🙏 Refoua Chelema
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
            style={{ background: "var(--gradient-gold)" }}
          >
            + Ajouter
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Liste des malades à mentionner pendant la prière
        </p>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="rounded-2xl bg-card p-5 mb-4 border border-primary/20"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom hébreu du malade"
              dir="rtl"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            <input
              value={mother}
              onChange={(e) => setMother(e.target.value)}
              placeholder="Prénom hébreu de la mère"
              dir="rtl"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            <button
              onClick={handleAdd}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
              style={{ background: "var(--gradient-gold)" }}
            >
              Ajouter à la liste
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {patients.map((p, i) => (
          <motion.div
            key={p.id}
            className="rounded-xl bg-card p-4 border border-border flex items-center justify-between"
            style={{ boxShadow: "var(--shadow-soft)" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🕯️</span>
              <div>
                <span className="font-hebrew text-base font-bold text-foreground" dir="rtl">
                  {p.hebrewName} בן/בת {p.motherName}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ajouté le {p.addedAt}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Prayer text */}
      <div className="rounded-2xl bg-card p-5 mt-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="font-hebrew text-sm text-foreground leading-relaxed" dir="rtl">
          מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב הוּא יְבָרֵךְ וִירַפֵּא אֶת הַחוֹלִים
        </p>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Que le Tout-Puissant accorde une guérison complète à tous les malades
        </p>
      </div>
    </motion.div>
  );
};

export default RefouaChelemaWidget;
