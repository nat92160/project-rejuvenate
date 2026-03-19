import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";
import MasterPosterTemplate, { type PosterContentBlock } from "@/components/poster/MasterPosterTemplate";
import { exportPosterPng } from "@/components/poster/usePosterExport";

interface Annonce {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  creator_id: string;
}

const AnnoncesWidget = () => {
  const { user, dbRole } = useAuth();
  const { profile: synaProfile } = useSynaProfile();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [posterAnnonce, setPosterAnnonce] = useState<Annonce | null>(null);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnnonces = async () => {
      const { data, error } = await supabase
        .from("annonces")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) toast.error("Erreur lors du chargement des annonces");
      setAnnonces(data || []);
      setLoading(false);
    };
    fetchAnnonces();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error("Veuillez entrer un titre"); return; }
    if (!user || dbRole !== "president") { toast.error("Seul le président peut publier des annonces"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("annonces").insert({
      creator_id: user.id, title: newTitle.trim(), content: newContent.trim(), priority: newPriority,
    }).select().single();
    if (error) toast.error("Erreur lors de la publication.");
    else if (data) {
      setAnnonces(prev => [data, ...prev]);
      setShowForm(false); setNewTitle(""); setNewContent(""); setNewPriority("normal");
      toast.success("✅ Annonce publiée !");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("annonces").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { setAnnonces(prev => prev.filter(a => a.id !== id)); toast.success("Annonce supprimée"); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const handleExportPng = async () => {
    if (!posterAnnonce) return;
    setExporting(true);
    await exportPosterPng(posterRef.current, `annonce-${posterAnnonce.title.replace(/\s+/g, "-").toLowerCase()}.png`);
    setExporting(false);
  };

  const posterContent: PosterContentBlock | null = posterAnnonce ? {
    category: posterAnnonce.priority === "urgent" ? "ANNONCE URGENTE" : "ANNONCE COMMUNAUTAIRE",
    title: posterAnnonce.title,
    description: posterAnnonce.content || undefined,
    details: [],
    date: formatDate(posterAnnonce.created_at),
  } : null;

  const isPresident = dbRole === "president";
  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hidden poster for export */}
      {posterContent && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <MasterPosterTemplate ref={posterRef} profile={synaProfile} content={posterContent} />
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl p-4 mb-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">📢 Annonces</h3>
            <p className="text-xs text-muted-foreground mt-1">Informations de la communauté</p>
          </div>
          {isPresident && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
              {showForm ? "✕" : "+ Nouvelle"}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Titre</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de l'annonce" className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Contenu</label>
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Contenu de l'annonce..." rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNewPriority("normal")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border ${newPriority === "normal" ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground bg-card"}`}>
                  Normal
                </button>
                <button onClick={() => setNewPriority("urgent")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border ${newPriority === "urgent" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border text-muted-foreground bg-card"}`}>
                  🔴 Urgent
                </button>
              </div>
              <button onClick={handleAdd} disabled={submitting || !newTitle.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Publication..." : "Publier"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poster Modal */}
      <AnimatePresence>
        {posterAnnonce && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setPosterAnnonce(null)} />
            <motion.div className="relative z-10 w-full max-w-[400px] max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-4 border border-border"
              style={{ boxShadow: "var(--shadow-elevated)" }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>

              {/* Inline preview (scaled down) */}
              <div style={{ transform: "scale(0.55)", transformOrigin: "top center", marginBottom: -200 }}>
                <MasterPosterTemplate profile={synaProfile} content={posterContent!} />
              </div>

              <div className="mt-4 space-y-2">
                <button onClick={handleExportPng} disabled={exporting}
                  className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--gradient-gold)" }}>
                  {exporting ? "⏳ Génération..." : "📥 Générer l'Affiche Pro"}
                </button>
                <button onClick={() => setPosterAnnonce(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground border-none cursor-pointer">
                  ✕ Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : annonces.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-4xl">📢</span>
          <p className="text-sm text-muted-foreground mt-3">Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annonces.map((a, i) => (
            <motion.div key={a.id}
              className={`rounded-2xl bg-card overflow-hidden border ${a.priority === "urgent" ? "border-destructive/30" : "border-border"}`}
              style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              {a.priority === "urgent" && (
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-center text-destructive-foreground bg-destructive">
                  🔴 Annonce urgente
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.priority === "urgent" ? "bg-destructive/10" : "bg-primary/10"}`}>
                    {a.priority === "urgent" ? "🚨" : "📢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-sm font-bold text-foreground leading-tight">{a.title}</h4>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">📅 {formatDate(a.created_at)}</p>
                  </div>
                </div>
                {a.content && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed pl-[52px]">{a.content}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4 pl-[52px]">
                  <button onClick={async (e) => {
                    e.stopPropagation();
                    const text = `📢 ${a.title}${a.content ? `\n\n${a.content}` : ""}\n\n📅 ${formatDate(a.created_at)}\n\n✡️ Chabbat Chalom`;
                    if (navigator.share) {
                      try { await navigator.share({ text }); return; } catch {}
                    }
                    await navigator.clipboard?.writeText(text);
                    toast.success("Texte copié dans le presse-papier !");
                  }}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground"
                    style={{ background: "var(--gradient-gold)" }}>
                    📤 Partager
                  </button>
                  <button onClick={() => setPosterAnnonce(a)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-pointer">
                    📥 Affiche Pro
                  </button>
                  {isPresident && user?.id === a.creator_id && (
                    <button onClick={() => handleDelete(a.id)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer">
                      🗑️ Supprimer
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

export default AnnoncesWidget;
