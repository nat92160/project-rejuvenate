import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CoursZoom {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  zoom_link: string;
  description: string;
  creator_id: string;
}

const dayColors: Record<string, string> = {
  Lundi: "bg-blue-500/10 text-blue-600",
  Mardi: "bg-purple-500/10 text-purple-600",
  Mercredi: "bg-green-500/10 text-green-600",
  Jeudi: "bg-orange-500/10 text-orange-600",
  Vendredi: "bg-red-500/10 text-red-600",
  Dimanche: "bg-yellow-500/10 text-yellow-700",
};

const CoursZoomWidget = () => {
  const { user, dbRole } = useAuth();
  const [cours, setCours] = useState<CoursZoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", rav: "", day_of_week: "Lundi", course_time: "", zoom_link: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const isPresident = dbRole === "president";

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("cours_zoom").select("*").order("created_at");
      setCours(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.zoom_link.trim()) {
      toast.error("Veuillez remplir le titre et le lien Zoom");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("cours_zoom").insert({
      creator_id: user.id,
      title: form.title.trim(),
      rav: form.rav.trim(),
      day_of_week: form.day_of_week,
      course_time: form.course_time || "20:00",
      zoom_link: form.zoom_link.trim(),
      description: form.description.trim(),
    }).select().single();

    if (error) {
      toast.error("Erreur: vérifiez que vous avez le rôle Président.");
      console.error("Cours create error:", error);
    } else if (data) {
      setCours((prev) => [...prev, data]);
      setShowForm(false);
      setForm({ title: "", rav: "", day_of_week: "Lundi", course_time: "", zoom_link: "", description: "" });
      toast.success("✅ Cours publié !");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cours_zoom").delete().eq("id", id);
    setCours((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">🎥 Cours en ligne</h3>
            <p className="text-xs text-muted-foreground mt-1">Rejoignez les cours depuis chez vous via Zoom</p>
          </div>
          {isPresident && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}>
              + Ajouter
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre du cours"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.rav} onChange={(e) => setForm({ ...form, rav: e.target.value })} placeholder="Nom du Rav"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="time" value={form.course_time} onChange={(e) => setForm({ ...form, course_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <input value={form.zoom_link} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })} placeholder="Lien Zoom"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <button onClick={handleAdd} disabled={submitting || !form.title.trim() || !form.zoom_link.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Publication..." : "Publier le cours"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : cours.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun cours programmé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cours.map((c, i) => (
            <motion.div key={c.id} className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all"
              style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${dayColors[c.day_of_week] || "bg-muted text-muted-foreground"}`}>
                      {c.day_of_week}
                    </span>
                    <span className="text-xs font-bold text-foreground">{c.course_time?.slice(0, 5)}</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                  <p className="text-xs text-primary/80 font-medium mt-0.5">{c.rav}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.description}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {c.zoom_link && (
                    <a href={c.zoom_link} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 no-underline"
                      style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                      🎥
                    </a>
                  )}
                  {isPresident && user?.id === c.creator_id && (
                    <button onClick={() => handleDelete(c.id)}
                      className="text-[10px] text-destructive bg-transparent border-none cursor-pointer hover:underline">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CoursZoomWidget;
