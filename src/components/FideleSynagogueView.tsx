import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCity } from "@/hooks/useCity";

interface CoursItem {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  zoom_link: string;
  description: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  event_type: string;
  zoom_link: string | null;
}

interface AnnonceItem {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

const dayColors: Record<string, string> = {
  Lundi: "#3b82f6",
  Mardi: "#8b5cf6",
  Mercredi: "#22c55e",
  Jeudi: "#f97316",
  Vendredi: "#ef4444",
  Dimanche: "#eab308",
};

const typeEmoji: Record<string, string> = {
  kidouch: "🍷",
  cours: "📖",
  fete: "🎉",
  autre: "📌",
};

const FideleSynagogueView = () => {
  const { city } = useCity();
  const [cours, setCours] = useState<CoursItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cours" | "events" | "annonces">("cours");

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [coursRes, eventsRes, annoncesRes] = await Promise.all([
        supabase.from("cours_zoom").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("evenements").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(20),
        supabase.from("annonces").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setCours((coursRes.data || []) as CoursItem[]);
      setEvents((eventsRes.data || []) as EventItem[]);
      setAnnonces((annoncesRes.data || []) as AnnonceItem[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const tabs = [
    { id: "cours" as const, icon: "🎥", label: "Cours", count: cours.length },
    { id: "events" as const, icon: "📅", label: "Événements", count: events.length },
    { id: "annonces" as const, icon: "📢", label: "Annonces", count: annonces.length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="rounded-2xl p-5 mb-4 border border-primary/15 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
        <span className="text-3xl">🏛️</span>
        <h3 className="font-display text-lg font-bold text-foreground mt-2">Ma Communauté</h3>
        <p className="text-xs text-muted-foreground mt-1">📍 {city.name} — Cours, événements & annonces près de chez vous</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 mb-4 p-1.5 rounded-2xl bg-muted/60 border border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border-none active:scale-95"
            style={{
              background: tab === t.id ? "var(--gradient-gold)" : "transparent",
              color: tab === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === t.id ? "var(--shadow-gold)" : "none",
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count > 0 && <span className="ml-0.5 text-[9px] opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <>
          {/* COURS */}
          {tab === "cours" && (
            <div className="space-y-3">
              {cours.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📚</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucun cours programmé pour le moment.</p>
                </div>
              ) : cours.map((c, i) => {
                const dotColor = dayColors[c.day_of_week] || "#94a3b8";
                const href = c.zoom_link?.startsWith("http") ? c.zoom_link : `https://${c.zoom_link}`;
                return (
                  <motion.div key={c.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${dotColor}15`, color: dotColor }}>
                            {c.day_of_week}
                          </span>
                          <span className="text-xs font-bold text-foreground">{c.course_time?.slice(0, 5)}</span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                        {c.rav && <p className="text-xs text-primary/80 font-medium mt-0.5">👨‍🏫 {c.rav}</p>}
                        {c.description && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{c.description}</p>}
                      </div>
                      {c.zoom_link && (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 no-underline transition-transform hover:scale-110 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                          🎥
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ÉVÉNEMENTS */}
          {tab === "events" && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📅</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucun événement à venir.</p>
                </div>
              ) : events.map((ev, i) => (
                <motion.div key={ev.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{typeEmoji[ev.event_type] || "📌"}</span>
                    <span className="text-[10px] font-bold uppercase text-primary">{ev.event_type}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(ev.event_date)}</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{ev.title}</h4>
                  {ev.description && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{ev.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/80">
                    <span>🕐 {ev.event_time?.slice(0, 5)}</span>
                    {ev.location && <span>📍 {ev.location}</span>}
                  </div>
                  {ev.zoom_link && (
                    <a href={ev.zoom_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white no-underline transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" }}>
                      🎥 Rejoindre
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* ANNONCES */}
          {tab === "annonces" && (
            <div className="space-y-3">
              {annonces.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📢</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucune annonce pour le moment.</p>
                </div>
              ) : annonces.map((a, i) => (
                <motion.div key={a.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-center gap-2 mb-1">
                    {a.priority === "urgent" && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Urgent</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{a.content}</p>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FideleSynagogueView;
