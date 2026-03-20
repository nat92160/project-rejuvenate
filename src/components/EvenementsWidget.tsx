import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { toast } from "sonner";
import CardPosterTemplate, { type CardPosterContent } from "@/components/poster/CardPosterTemplate";
import { exportPosterPng } from "@/components/poster/usePosterExport";

interface Evenement {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  event_type: string;
  zoom_link: string | null;
  creator_id: string;
}

const typeConfig: Record<string, { emoji: string; color: string; badgeColor: string; bgColor: string; label: string }> = {
  kidouch: { emoji: "🍷", color: "bg-purple-500/10 text-purple-600", badgeColor: "#7C3AED", bgColor: "#FAF5FF", label: "KIDOUCH" },
  cours: { emoji: "📖", color: "bg-blue-500/10 text-blue-600", badgeColor: "#2563EB", bgColor: "#EFF6FF", label: "COURS" },
  fete: { emoji: "🎉", color: "bg-amber-500/10 text-amber-600", badgeColor: "#D97706", bgColor: "#FFFBEB", label: "FÊTE" },
  autre: { emoji: "📌", color: "bg-muted text-muted-foreground", badgeColor: "#D4AF37", bgColor: "#FDFAF3", label: "ÉVÉNEMENT" },
};

const EvenementsWidget = () => {
  const { user, dbRole } = useAuth();
  const { profile: synaProfile, synagogueId } = useSynaProfile();
  const { subIds, loading: subLoading } = useSubscribedSynaIds();
  const [events, setEvents] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "autre", zoom_link: "" });
  const [submitting, setSubmitting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [posterEvent, setPosterEvent] = useState<Evenement | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const isPresident = dbRole === "president";

  useEffect(() => {
    if (subLoading) return;
    const fetchEvents = async () => {
      let query = supabase
        .from("evenements")
        .select("*")
        .order("event_date", { ascending: true })
        .limit(20);

      if (isPresident && synagogueId) {
        query = query.eq("synagogue_id", synagogueId);
      } else if (user && subIds.length > 0) {
        query = query.in("synagogue_id", subIds);
      } else if (user && subIds.length === 0) {
        setEvents([]); setLoading(false); return;
      }

      const { data } = await query;
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, [subLoading, subIds, user, isPresident, synagogueId]);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.event_date) {
      toast.error("Veuillez remplir le titre et la date");
      return;
    }
    if (!user) { toast.error("Vous devez être connecté"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("evenements").insert({
      creator_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      event_date: form.event_date,
      event_time: form.event_time || "00:00",
      location: form.location.trim(),
      event_type: form.event_type,
      zoom_link: form.zoom_link.trim() || null,
      synagogue_id: synagogueId || null,
    } as any).select().single();

    if (error) {
      toast.error("Erreur: vérifiez que vous avez le rôle Président.");
    } else if (data) {
      setEvents((prev) => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setShowForm(false);
      setForm({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "autre", zoom_link: "" });
      toast.success("✅ Événement créé !");
    }
    setSubmitting(false);
  };

  const formatDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const triggerExport = useCallback(async (ev: Evenement) => {
    setExportingId(ev.id);
    setPosterEvent(ev);
  }, []);

  useEffect(() => {
    if (!posterEvent || !exportingId) return;
    const timer = requestAnimationFrame(() => {
      setTimeout(async () => {
        await exportPosterPng(posterRef.current, `evenement-${posterEvent.title.replace(/\s+/g, "-").toLowerCase()}.png`);
        setExportingId(null);
        setPosterEvent(null);
      }, 100);
    });
    return () => cancelAnimationFrame(timer);
  }, [posterEvent, exportingId]);

  const tc = posterEvent ? (typeConfig[posterEvent.event_type] || typeConfig.autre) : typeConfig.autre;

  const posterContent: CardPosterContent | null = posterEvent ? {
    topEmoji: tc.emoji,
    badge: tc.label,
    badgeColor: tc.badgeColor,
    title: posterEvent.title,
    description: posterEvent.description || undefined,
    date: formatDate(posterEvent.event_date),
    dateEmoji: "📅",
    details: [
      ...(posterEvent.event_time && posterEvent.event_time !== "00:00" ? [{ icon: "🕐", text: posterEvent.event_time }] : []),
      ...(posterEvent.location ? [{ icon: "📍", text: posterEvent.location }] : []),
    ],
    accentColor: tc.badgeColor,
    bgColor: tc.bgColor,
  } : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hidden poster */}
      {posterContent && (
        <div style={{ position: "fixed", left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
          <CardPosterTemplate
            ref={posterRef}
            profile={{ name: synaProfile.name || "Chabbat Chalom", logo_url: synaProfile.logo_url, website: "chabbat-chalom.com" }}
            content={posterContent}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">📅 Événements</h3>
        {isPresident && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
            + Créer
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="✏️ Titre de l'événement"
                className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }} />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="📝 Description (optionnel)" rows={2}
                className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">📅 Date</label>
                  <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">🕐 Heure</label>
                  <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }} />
                </div>
              </div>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="📍 Lieu"
                className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }} />
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }}>
                <option value="kidouch">🍷 Kidouch</option>
                <option value="cours">📖 Cours</option>
                <option value="fete">🎉 Fête</option>
                <option value="autre">📌 Autre</option>
              </select>
              <input value={form.zoom_link} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })} placeholder="🎥 Lien Zoom (optionnel)"
                className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: "48px" }} />
              <button onClick={handleAdd} disabled={submitting || !form.title.trim() || !form.event_date}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Création..." : "Créer l'événement"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun événement programmé.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {events.map((ev, i) => {
              const evTc = typeConfig[ev.event_type] || typeConfig.autre;
              return (
                <motion.div key={ev.id} className="relative pl-12"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="absolute left-3 top-5 w-5 h-5 rounded-full border-2 border-border bg-card flex items-center justify-center text-[10px]">
                    {evTc.emoji}
                  </div>
                  <div className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${evTc.color}`}>{ev.event_type}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(ev.event_date)}</span>
                    </div>
                    <h4 className="font-display text-sm font-bold text-foreground">{ev.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{ev.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground/80">
                      <span>🕐 {ev.event_time}</span>
                      {ev.location && <span>📍 {ev.location}</span>}
                    </div>
                    {ev.zoom_link && (
                      <a href={ev.zoom_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white no-underline transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                        🎥 Rejoindre le Zoom
                      </a>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => triggerExport(ev)}
                        disabled={exportingId === ev.id}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full border-none cursor-pointer text-primary-foreground disabled:opacity-50"
                        style={{ background: "var(--gradient-gold)" }}>
                        {exportingId === ev.id ? "⏳ Export..." : "📥 Télécharger PNG"}
                      </button>
                      {isPresident && user?.id === ev.creator_id && (
                        <button onClick={async () => {
                          if (!confirm("Supprimer cet événement ?")) return;
                          const { error } = await supabase.from("evenements").delete().eq("id", ev.id);
                          if (error) toast.error("Erreur lors de la suppression");
                          else { setEvents(prev => prev.filter(e => e.id !== ev.id)); toast.success("Événement supprimé"); }
                        }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border-none cursor-pointer hover:bg-destructive/20 transition-colors">
                          🗑️ Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EvenementsWidget;
