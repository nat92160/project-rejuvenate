import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { useManagedSynagogues } from "@/hooks/useManagedSynagogues";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { toast } from "sonner";
import CardPosterTemplate, { type CardPosterContent } from "@/components/poster/CardPosterTemplate";
import { sharePosterPng } from "@/components/poster/usePosterExport";
import ManagedSynagogueSelector from "@/components/president/ManagedSynagogueSelector";
import InteractiveContent from "@/components/interactive/InteractiveContent";

interface Annonce {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  creator_id: string;
  synagogue_id?: string | null;
}

const AnnoncesWidget = () => {
  const { user } = useAuth();
  const { profile: synaProfile, synagogueId, loading: synaLoading } = useSynaProfile();
  const { subIds, loading: subLoading } = useSubscribedSynaIds();
  const { synagogues } = useManagedSynagogues();
  const isPresident = synagogues.length > 0;
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [posterAnnonce, setPosterAnnonce] = useState<Annonce | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subLoading || (isPresident && synaLoading)) return;
    const fetchAnnonces = async () => {
      let query = supabase
        .from("annonces")
        .select("id, title, content, priority, created_at, creator_id, synagogue_id")
        .order("created_at", { ascending: false })
        .limit(20);

      // Fidèles: filter by subscribed synagogues; Presidents see their own
      if (isPresident && synagogueId) {
        query = query.eq("synagogue_id", synagogueId);
      } else if (isPresident && !synagogueId) {
        setAnnonces([]); setLoading(false); return;
      } else if (user && subIds.length > 0) {
        query = query.in("synagogue_id", subIds);
      } else if (user && subIds.length === 0) {
        // No subscription = no content
        setAnnonces([]); setLoading(false); return;
      }

      const { data, error } = await query;
      if (error) toast.error("Erreur lors du chargement des annonces");
      setAnnonces(data || []);
      setLoading(false);
    };
    fetchAnnonces();
  }, [subLoading, subIds, user, isPresident, synagogueId, synaLoading]);

  // Realtime: refresh annonces when president posts/updates/deletes
  useEffect(() => {
    if (!user && subIds.length === 0) return;
    const ch = supabase
      .channel("annonces-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, (payload: any) => {
        const row = (payload.new || payload.old) as any;
        const relevant = isPresident
          ? row?.synagogue_id === synagogueId
          : subIds.includes(row?.synagogue_id);
        if (!relevant) return;
        if (payload.eventType === "DELETE") {
          setAnnonces((prev) => prev.filter((a) => a.id !== row.id));
        } else if (payload.eventType === "INSERT") {
          setAnnonces((prev) => prev.some((a) => a.id === row.id) ? prev : [row, ...prev]);
        } else {
          setAnnonces((prev) => prev.map((a) => (a.id === row.id ? { ...a, ...row } : a)));
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, isPresident, synagogueId, subIds]);

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error("Veuillez entrer un titre"); return; }
    if (!user || !isPresident) { toast.error("Seul le président peut publier des annonces"); return; }
    if (!synagogueId) { toast.error("Sélectionnez ou créez une synagogue"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("annonces").insert({
      creator_id: user.id, title: newTitle.trim(), content: newContent.trim(), priority: newPriority, synagogue_id: synagogueId,
    } as any).select().single();
    if (error) toast.error("Erreur lors de la publication.");
    else if (data) {
      setAnnonces(prev => [data, ...prev]);
      setShowForm(false); setNewTitle(""); setNewContent(""); setNewPriority("normal");
      toast.success("✅ Annonce publiée !");
      // Push notification to subscribed fidèles
      if (synagogueId) {
        try {
          const prefix = newPriority === "urgent" ? "🚨 " : newPriority === "important" ? "⚠️ " : "📢 ";
          const synaName = synaProfile?.name ? ` — ${synaProfile.name}` : "";
          await supabase.functions.invoke("send-push", {
            body: {
              synagogue_id: synagogueId,
              title: `${prefix}${newTitle.trim()}${synaName}`,
              body: (newContent.trim() || "Nouvelle annonce de votre synagogue").slice(0, 180),
              sender_id: user.id,
            },
          });
        } catch (e) { console.error("Push annonce error:", e); }
      }
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

  // Auto-share when posterAnnonce is set
  const triggerShare = useCallback(async (annonce: Annonce) => {
    setExportingId(annonce.id);
    setPosterAnnonce(annonce);
  }, []);

  useEffect(() => {
    if (!posterAnnonce || !exportingId) return;
    const timer = requestAnimationFrame(() => {
      setTimeout(async () => {
        const filename = `annonce-${posterAnnonce.title.replace(/\s+/g, "-").toLowerCase()}.png`;
        await sharePosterPng(posterRef.current, filename, `📢 ${posterAnnonce.title}`);
        setExportingId(null);
        setPosterAnnonce(null);
      }, 100);
    });
    return () => cancelAnimationFrame(timer);
  }, [posterAnnonce, exportingId]);

  const isUrgent = posterAnnonce?.priority === "urgent";

  const posterContent: CardPosterContent | null = posterAnnonce ? {
    topEmoji: isUrgent ? "🚨" : "📢",
    badge: isUrgent ? "ANNONCE URGENTE" : "ANNONCE COMMUNAUTAIRE",
    badgeColor: isUrgent ? "#DC2626" : "#D4AF37",
    badgeEmoji: isUrgent ? "🔴" : undefined,
    title: posterAnnonce.title,
    description: posterAnnonce.content || undefined,
    accentColor: isUrgent ? "#DC2626" : "#D4AF37",
    bgColor: isUrgent ? "#FFF5F5" : "#FDFAF3",
  } : null;

  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hidden poster for export */}
      {posterContent && (
        <div style={{ position: "fixed", left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
          <CardPosterTemplate
            ref={posterRef}
            profile={{ name: synaProfile.name || "Chabbat Chalom", logo_url: synaProfile.logo_url, website: "chabbat-chalom.com" }}
            content={posterContent}
          />
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
              <ManagedSynagogueSelector compact />
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
                    
                  </div>
                </div>
                {a.content && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed pl-0 sm:pl-[52px] break-words">{a.content}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4 pl-0 sm:pl-[52px]">
                  <button
                    onClick={() => triggerShare(a)}
                    disabled={exportingId === a.id}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground disabled:opacity-50"
                    style={{ background: "var(--gradient-gold)" }}>
                    {exportingId === a.id ? "⏳ Génération..." : "📤 Partager l'Affiche"}
                  </button>
                  {isPresident && user?.id === a.creator_id && (
                    <button onClick={() => handleDelete(a.id)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer">
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
                <InteractiveContent
                  contentType="annonce"
                  contentId={a.id}
                  synagogueId={a.synagogue_id ?? synagogueId}
                  fromPresident
                  verified
                  actions={{
                    shareText: `📢 ${a.title}${a.content ? ` — ${a.content}` : ""}`,
                    calendarTitle: a.title,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AnnoncesWidget;
