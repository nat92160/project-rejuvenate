import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

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

  const getShareText = (a: Annonce) =>
    `📢 *${a.title}*${a.priority === "urgent" ? " 🔴 URGENT" : ""}\n\n${a.content}\n\n📅 ${formatDate(a.created_at)}\n— Chabbat Chalom\n📲 chabbat-chalom.com`;

  const getShareUrl = (a: Annonce) =>
    `https://wa.me/?text=${encodeURIComponent(getShareText(a))}`;


  const isPresident = dbRole === "president";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">📢 Annonces</h3>
        {isPresident && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
            {showForm ? "✕" : "+ Nouvelle"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de l'annonce"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Contenu de l'annonce..." rows={3}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 resize-none" />
            <div className="flex gap-2 mb-3">
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
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : annonces.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annonces.map((a, i) => (
            <motion.div key={a.id} className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
                {a.priority === "urgent" && (
                  <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-destructive/10 text-destructive whitespace-nowrap">Urgent</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.content}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] text-muted-foreground/60">{formatDate(a.created_at)}</p>
                <div className="flex gap-1.5">
                  <a href={getShareUrl(a)} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-full no-underline cursor-pointer"
                    style={{ background: "#25d366", color: "#fff" }}>
                    💬 WhatsApp
                  </a>
                  {isPresident && user?.id === a.creator_id && (
                    <button onClick={() => handleDelete(a.id)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-destructive/10 text-destructive border-none cursor-pointer">
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

export default AnnoncesWidget;
