import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  type: "kidouch" | "cours" | "fete" | "autre";
}

const DEMO_EVENTS: Event[] = [
  { id: "1", title: "Grand Kidouch communautaire", date: "21 mars 2026", time: "12:00", location: "Synagogue", description: "Offert par la famille Lévy pour la naissance de leur fille", type: "kidouch" },
  { id: "2", title: "Soirée de Pourim", date: "3 mars 2026", time: "19:30", location: "Salle des fêtes", description: "Lecture de la Méguila, déguisements, buffet", type: "fete" },
  { id: "3", title: "Conférence du Rav", date: "25 mars 2026", time: "20:30", location: "Zoom + Synagogue", description: "Les clés du Chalom Bayit — ouvert à tous", type: "cours" },
  { id: "4", title: "Vente de Hametz", date: "30 mars 2026", time: "10:00-17:00", location: "Bureau du Rav", description: "Dernière date pour la vente du Hametz avant Pessa'h", type: "autre" },
];

const typeConfig: Record<string, { emoji: string; color: string }> = {
  kidouch: { emoji: "🍷", color: "bg-purple-500/10 text-purple-600" },
  cours: { emoji: "📖", color: "bg-blue-500/10 text-blue-600" },
  fete: { emoji: "🎉", color: "bg-amber-500/10 text-amber-600" },
  autre: { emoji: "📌", color: "bg-muted text-muted-foreground" },
};

const EvenementsWidget = () => {
  const [events] = useState<Event[]>(DEMO_EVENTS);
  const [showForm, setShowForm] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          📅 Événements
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          + Créer
        </button>
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
            <p className="text-xs text-muted-foreground text-center py-4">
              Formulaire de création d'événement — Connectez-vous pour utiliser cette fonctionnalité
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        
        <div className="space-y-4">
          {events.map((ev, i) => {
            const tc = typeConfig[ev.type] || typeConfig.autre;
            return (
              <motion.div
                key={ev.id}
                className="relative pl-12"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {/* Timeline dot */}
                <div className="absolute left-3 top-5 w-5 h-5 rounded-full border-2 border-border bg-card flex items-center justify-center text-[10px]">
                  {tc.emoji}
                </div>

                <div className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all"
                  style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tc.color}`}>
                      {ev.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{ev.date}</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{ev.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{ev.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground/80">
                    <span>🕐 {ev.time}</span>
                    <span>📍 {ev.location}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default EvenementsWidget;
