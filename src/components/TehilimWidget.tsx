import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TEHILIM_DAILY = [
  { day: "Dimanche", chapters: "1 – 29", yom: "Yom Rishon" },
  { day: "Lundi", chapters: "30 – 50", yom: "Yom Chéni" },
  { day: "Mardi", chapters: "51 – 72", yom: "Yom Chelichi" },
  { day: "Mercredi", chapters: "73 – 89", yom: "Yom Révi'i" },
  { day: "Jeudi", chapters: "90 – 106", yom: "Yom 'Hamichi" },
  { day: "Vendredi", chapters: "107 – 119", yom: "Yom Chichi" },
  { day: "Chabbat", chapters: "120 – 150", yom: "Yom Chabbat" },
];

const POPULAR_PSALMS = [
  { num: 20, title: "Protection", desc: "Récité pour la protection et le salut" },
  { num: 23, title: "Confiance", desc: "L'Éternel est mon berger" },
  { num: 27, title: "Lumière", desc: "L'Éternel est ma lumière" },
  { num: 91, title: "Refuge", desc: "Celui qui demeure sous l'abri du Très-Haut" },
  { num: 121, title: "Aide", desc: "Je lève les yeux vers les montagnes" },
  { num: 130, title: "Téchouva", desc: "Des profondeurs je T'invoque" },
  { num: 142, title: "Détresse", desc: "Je crie vers l'Éternel" },
  { num: 150, title: "Louange", desc: "Louez Dieu dans Son sanctuaire" },
];

const TehilimWidget = () => {
  const [tab, setTab] = useState<"daily" | "popular" | "chain">("daily");
  const today = new Date().getDay();

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        📖 Tehilim — Psaumes
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 mt-4 mb-5">
        {[
          { key: "daily" as const, label: "Du jour" },
          { key: "popular" as const, label: "Populaires" },
          { key: "chain" as const, label: "Chaîne" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "daily" && (
          <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {TEHILIM_DAILY.map((d, i) => (
                <div
                  key={d.day}
                  className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                    i === today
                      ? "border-2 border-primary/30"
                      : "border border-border"
                  }`}
                  style={i === today ? { background: "hsl(var(--gold) / 0.05)" } : {}}
                >
                  <div className="flex items-center gap-3">
                    {i === today && <span className="text-lg">📖</span>}
                    <div>
                      <p className={`text-sm font-bold ${i === today ? "text-primary" : "text-foreground"}`}>
                        {d.day}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-hebrew">{d.yom}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${i === today ? "text-primary" : "text-foreground"}`}>
                      Chap. {d.chapters}
                    </p>
                    {i === today && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary">Aujourd'hui</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "popular" && (
          <motion.div key="popular" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_PSALMS.map((p) => (
                <a
                  key={p.num}
                  href={`https://www.sefaria.org/Psalms.${p.num}?lang=he`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/15 transition-all cursor-pointer no-underline"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
                    >
                      {p.num}
                    </span>
                    <span className="text-xs font-bold text-foreground">{p.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.desc}</p>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "chain" && (
          <motion.div key="chain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center py-8">
              <span className="text-5xl">🤝</span>
              <h4 className="font-display text-lg font-bold mt-4 text-foreground">Chaîne de Tehilim</h4>
              <p className="text-sm mt-2 text-muted-foreground max-w-[300px] mx-auto">
                Rejoignez une chaîne communautaire pour compléter le livre des Psaumes ensemble.
              </p>
              <div className="mt-5 p-4 rounded-xl border border-border bg-muted">
                <p className="text-xs text-muted-foreground">
                  🔒 Connectez-vous pour rejoindre ou créer une chaîne
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TehilimWidget;
