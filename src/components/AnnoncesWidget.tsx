import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Annonce {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: "normal" | "urgent";
}

const DEMO_ANNONCES: Annonce[] = [
  { id: "1", title: "Kidouch ce Chabbat", content: "Un grand Kidouch est organisé ce Chabbat après l'office de Cha'harit, offert par la famille Cohen à l'occasion du Bar Mitsva de leur fils.", date: "20 mars 2026", priority: "normal" },
  { id: "2", title: "Cours de Guémara", content: "Le cours de Guémara du Rav reprend tous les mardis soirs à 20h30.", date: "18 mars 2026", priority: "normal" },
  { id: "3", title: "Collecte urgente", content: "Une famille de la communauté a besoin d'aide urgente. Merci de contacter le président.", date: "17 mars 2026", priority: "urgent" },
];

const AnnoncesWidget = () => {
  const [annonces] = useState<Annonce[]>(DEMO_ANNONCES);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    // In future: save to DB
    setShowForm(false);
    setNewTitle("");
    setNewContent("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          📢 Annonces
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          + Nouvelle
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
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre de l'annonce"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Contenu de l'annonce..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 resize-none"
            />
            <button
              onClick={handleAdd}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
              style={{ background: "var(--gradient-gold)" }}
            >
              Publier
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {annonces.map((a, i) => (
          <motion.div
            key={a.id}
            className="rounded-2xl bg-card p-5 border border-border"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
              {a.priority === "urgent" && (
                <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-destructive/10 text-destructive whitespace-nowrap">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.content}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-3">{a.date}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AnnoncesWidget;
