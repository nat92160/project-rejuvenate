import { useState, useEffect, useRef } from "react";
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

type CardStyle = "elegant" | "urgence" | "communaute" | "custom";

const cardStyles: Record<CardStyle, { name: string; headerBg: string; headerText: string; accentColor: string; icon: string }> = {
  elegant: { name: "Élégant", headerBg: "linear-gradient(135deg, #1E293B, #334155)", headerText: "#fff", accentColor: "#d4af37", icon: "✨" },
  urgence: { name: "Urgent", headerBg: "linear-gradient(135deg, #991B1B, #DC2626)", headerText: "#fff", accentColor: "#fca5a5", icon: "🚨" },
  communaute: { name: "Communauté", headerBg: "linear-gradient(135deg, #1a3a6b, #2563eb)", headerText: "#fff", accentColor: "#93c5fd", icon: "🏛️" },
  custom: { name: "Personnalisé", headerBg: "linear-gradient(135deg, #D4AF37, #b8860b)", headerText: "#fff", accentColor: "#D4AF37", icon: "🎨" },
};

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
  const [selectedCardStyle, setSelectedCardStyle] = useState<CardStyle>("elegant");
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

  const getShareText = (a: Annonce) =>
    `📢 *${a.title}*${a.priority === "urgent" ? " 🔴 URGENT" : ""}\n\n${a.content}\n\n📅 ${formatDate(a.created_at)}\n— Chabbat Chalom\n📲 chabbat-chalom.com`;

  const getShareUrl = (a: Annonce) =>
    `https://wa.me/?text=${encodeURIComponent(getShareText(a))}`;

  // Remove unused state
  void sharingId; void setSharingId;

  const isPresident = dbRole === "president";
  const sharingAnnonce = annonces.find(a => a.id === sharingId);
  const cs = cardStyles[selectedCardStyle];

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

      {/* Card style selector */}
      {isPresident && annonces.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Style de carte WhatsApp</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(cardStyles) as CardStyle[]).map(key => (
              <button key={key} onClick={() => setSelectedCardStyle(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer border transition-all ${selectedCardStyle === key ? "border-primary/30 text-foreground" : "border-border text-muted-foreground bg-card"}`}
                style={selectedCardStyle === key ? { background: "hsl(var(--gold) / 0.1)" } : {}}>
                <span>{cardStyles[key].icon}</span>
                <span>{cardStyles[key].name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden poster for JPG generation */}
      {sharingAnnonce && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={posterRef} style={{
            width: "480px", background: "#ffffff", overflow: "hidden",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}>
            {/* Header */}
            <div style={{
              background: cs.headerBg, padding: "32px 28px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: "0.75rem", color: cs.accentColor, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px", fontWeight: 600 }}>
                {cs.icon} ANNONCE COMMUNAUTAIRE
              </div>
              <div style={{
                fontSize: "1.5rem", fontWeight: 800, color: cs.headerText, lineHeight: 1.3,
                fontFamily: "'Frank Ruhl Libre', 'Georgia', serif",
              }}>
                {sharingAnnonce.title}
              </div>
              {sharingAnnonce.priority === "urgent" && (
                <div style={{
                  display: "inline-block", marginTop: "12px",
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", padding: "4px 14px", borderRadius: "20px",
                  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                }}>
                  🔴 URGENT
                </div>
              )}
            </div>
            {/* Content */}
            <div style={{ padding: "28px" }}>
              <div style={{
                fontSize: "0.95rem", color: "#334155", lineHeight: 1.7,
                borderLeft: `3px solid ${cs.accentColor}`, paddingLeft: "16px",
                whiteSpace: "pre-wrap",
              }}>
                {sharingAnnonce.content || "—"}
              </div>
              <div style={{
                marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {formatDate(sharingAnnonce.created_at)}
                </div>
                <div style={{ fontSize: "0.65rem", color: cs.accentColor, fontWeight: 700, letterSpacing: "1px" }}>
                  CHABBAT-CHALOM.COM
                </div>
              </div>
            </div>
            {/* Footer bar */}
            <div style={{ background: cs.headerBg, height: "6px" }} />
          </div>
        </div>
      )}

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
                  <button onClick={() => handleShareJPG(a)} disabled={sharingId === a.id}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-full border-none cursor-pointer transition-colors disabled:opacity-50"
                    style={{ background: "#25d366", color: "#fff" }}>
                    {sharingId === a.id ? "⏳" : "📲 JPG"}
                  </button>
                  <button onClick={() => handleShareText(a)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-full border-none cursor-pointer transition-colors"
                    style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}>
                    💬 Texte
                  </button>
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
