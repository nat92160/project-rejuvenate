import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CoursZoom {
  id: string;
  title: string;
  rav: string;
  day: string;
  time: string;
  zoomLink: string;
  description: string;
}

const DEMO_COURS: CoursZoom[] = [
  { id: "1", title: "Guémara Baba Metsia", rav: "Rav David Cohen", day: "Lundi", time: "20:30", zoomLink: "https://zoom.us/j/123456789", description: "Étude approfondie du traité Baba Metsia" },
  { id: "2", title: "Halakha quotidienne", rav: "Rav Yossef Lévy", day: "Mardi", time: "21:00", zoomLink: "https://zoom.us/j/987654321", description: "Les lois du Chabbat - chapitre par chapitre" },
  { id: "3", title: "Paracha de la semaine", rav: "Rav Moché Berdugo", day: "Mercredi", time: "20:00", zoomLink: "https://zoom.us/j/456789123", description: "Commentaires et enseignements sur la Paracha" },
  { id: "4", title: "Moussar & Développement", rav: "Rav Itshak Zerbib", day: "Jeudi", time: "21:30", zoomLink: "https://zoom.us/j/321654987", description: "Travail sur les Midot et le développement personnel" },
];

const CoursZoomWidget = () => {
  const [cours] = useState<CoursZoom[]>(DEMO_COURS);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRav, setNewRav] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLink, setNewLink] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim() || !newLink.trim()) return;
    setShowForm(false);
    setNewTitle("");
    setNewRav("");
    setNewDay("");
    setNewTime("");
    setNewLink("");
  };

  const dayColors: Record<string, string> = {
    "Lundi": "bg-blue-500/10 text-blue-600",
    "Mardi": "bg-purple-500/10 text-purple-600",
    "Mercredi": "bg-green-500/10 text-green-600",
    "Jeudi": "bg-orange-500/10 text-orange-600",
    "Vendredi": "bg-red-500/10 text-red-600",
    "Dimanche": "bg-yellow-500/10 text-yellow-700",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              🎥 Cours en ligne
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Rejoignez les cours depuis chez vous via Zoom
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
            style={{ background: "var(--gradient-gold)" }}
          >
            + Ajouter
          </button>
        </div>
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
            <div className="space-y-3">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre du cours"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={newRav} onChange={(e) => setNewRav(e.target.value)} placeholder="Nom du Rav"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-3">
                <input value={newDay} onChange={(e) => setNewDay(e.target.value)} placeholder="Jour"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="Heure" type="time"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Lien Zoom"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleAdd}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
                style={{ background: "var(--gradient-gold)" }}>
                Publier le cours
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {cours.map((c, i) => (
          <motion.div
            key={c.id}
            className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${dayColors[c.day] || "bg-muted text-muted-foreground"}`}>
                    {c.day}
                  </span>
                  <span className="text-xs font-bold text-foreground">{c.time}</span>
                </div>
                <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                <p className="text-xs text-primary/80 font-medium mt-0.5">{c.rav}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.description}</p>
              </div>
              <a
                href={c.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)",
                  boxShadow: "0 4px 12px rgba(45,140,255,0.3)",
                }}
              >
                🎥
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CoursZoomWidget;
