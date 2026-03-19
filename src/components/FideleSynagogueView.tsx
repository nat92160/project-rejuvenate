import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCity } from "@/hooks/useCity";
import { fetchNearbySynagogues, formatDistance, SynagogueResult } from "@/lib/synagogues";

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
  const [synagogues, setSynagogues] = useState<SynagogueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [synLoading, setSynLoading] = useState(false);
  const [synError, setSynError] = useState<string | null>(null);
  const [tab, setTab] = useState<"synagogues" | "cours" | "events" | "annonces">("synagogues");

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

  useEffect(() => {
    if (!city.lat || !city.lng) return;

    const controller = new AbortController();
    setSynLoading(true);
    setSynError(null);
    setSynagogues([]);

    fetchNearbySynagogues(city.lat, city.lng)
      .then((results) => {
        if (!controller.signal.aborted) {
          setSynagogues(results);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Erreur synagogues proches:", error);
        setSynagogues([]);
        setSynError("Impossible de charger les synagogues les plus proches.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSynLoading(false);
        }
      });

    return () => controller.abort();
  }, [city.lat, city.lng]);

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const tabs = [
    { id: "synagogues" as const, icon: "🏛️", label: "Synagogues", count: synagogues.length },
    { id: "cours" as const, icon: "🎥", label: "Cours", count: cours.length },
    { id: "events" as const, icon: "📅", label: "Événements", count: events.length },
    { id: "annonces" as const, icon: "📢", label: "Annonces", count: annonces.length },
  ];

  const showingExpandedResults = synagogues.length > 0 && synagogues[0].distance > 15000;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-5 mb-4 border border-primary/15 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
        <span className="text-3xl">🏛️</span>
        <h3 className="font-display text-lg font-bold text-foreground mt-2">Ma Communauté</h3>
        <p className="text-xs text-muted-foreground mt-1">📍 {city.name} — Synagogues, cours & événements près de chez vous</p>
      </div>

      <div className="flex gap-1 mb-4 p-1.5 rounded-2xl bg-muted/60 border border-border overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="flex-1 flex items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-none active:scale-95 whitespace-nowrap min-w-0"
            style={{
              background: tab === item.id ? "var(--gradient-gold)" : "transparent",
              color: tab === item.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === item.id ? "var(--shadow-gold)" : "none",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.count > 0 && <span className="ml-0.5 text-[9px] opacity-70">({item.count})</span>}
          </button>
        ))}
      </div>

      {loading && tab !== "synagogues" ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <>
          {tab === "synagogues" && (
            <div className="space-y-3">
              {synLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">🔍 Recherche des synagogues les plus proches…</div>
              ) : synError ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">😕</span>
                  <p className="text-sm text-muted-foreground mt-3">{synError}</p>
                </div>
              ) : synagogues.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">🏛️</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucune synagogue trouvée, même en élargissant la recherche.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Relancez la localisation pour affiner votre point GPS.</p>
                </div>
              ) : (
                <>
                  {showingExpandedResults && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                      Aucune synagogue trouvée dans les 15 km : voici automatiquement les plus proches autour de vous.
                    </div>
                  )}

                  {synagogues.map((synagogue, index) => (
                    <motion.div
                      key={synagogue.id}
                      className="rounded-2xl bg-card p-4 border border-border"
                      style={{ boxShadow: "var(--shadow-card)" }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))" }}>
                          🕍
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display text-sm font-bold text-foreground leading-tight">{synagogue.name}</h4>
                          {synagogue.denomination && (
                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 bg-primary/10 text-primary">
                              {synagogue.denomination}
                            </span>
                          )}
                          {synagogue.address && <p className="text-[11px] text-muted-foreground mt-1">📍 {synagogue.address}</p>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-primary/80">📏 {formatDistance(synagogue.distance)}</span>
                            {synagogue.phone && (
                              <a href={`tel:${synagogue.phone}`} className="text-[11px] text-muted-foreground hover:text-primary no-underline">📞 {synagogue.phone}</a>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${synagogue.lat},${synagogue.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white no-underline transition-all hover:scale-105 active:scale-95"
                              style={{ background: "linear-gradient(135deg, #34a853, #1e8e3e)" }}
                            >
                              🧭 Itinéraire
                            </a>
                            {synagogue.website && (
                              <a
                                href={synagogue.website.startsWith("http") ? synagogue.website : `https://${synagogue.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold no-underline transition-all hover:scale-105 active:scale-95 bg-muted text-foreground border border-border"
                              >
                                🌐 Site
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "cours" && (
            <div className="space-y-3">
              {cours.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📚</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucun cours programmé pour le moment.</p>
                </div>
              ) : cours.map((coursItem, index) => {
                const dotColor = dayColors[coursItem.day_of_week] || "#94a3b8";
                const href = coursItem.zoom_link?.startsWith("http") ? coursItem.zoom_link : `https://${coursItem.zoom_link}`;
                return (
                  <motion.div
                    key={coursItem.id}
                    className="rounded-2xl bg-card p-4 border border-border"
                    style={{ boxShadow: "var(--shadow-card)" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${dotColor}15`, color: dotColor }}>
                            {coursItem.day_of_week}
                          </span>
                          <span className="text-xs font-bold text-foreground">{coursItem.course_time?.slice(0, 5)}</span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-foreground mt-1">{coursItem.title}</h4>
                        {coursItem.rav && <p className="text-xs text-primary/80 font-medium mt-0.5">👨‍🏫 {coursItem.rav}</p>}
                        {coursItem.description && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{coursItem.description}</p>}
                      </div>
                      {coursItem.zoom_link && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 no-underline transition-transform hover:scale-110 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}
                        >
                          🎥
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {tab === "events" && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📅</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucun événement à venir.</p>
                </div>
              ) : events.map((eventItem, index) => (
                <motion.div
                  key={eventItem.id}
                  className="rounded-2xl bg-card p-4 border border-border"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{typeEmoji[eventItem.event_type] || "📌"}</span>
                    <span className="text-[10px] font-bold uppercase text-primary">{eventItem.event_type}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(eventItem.event_date)}</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{eventItem.title}</h4>
                  {eventItem.description && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{eventItem.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/80">
                    <span>🕐 {eventItem.event_time?.slice(0, 5)}</span>
                    {eventItem.location && <span>📍 {eventItem.location}</span>}
                  </div>
                  {eventItem.zoom_link && (
                    <a
                      href={eventItem.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white no-underline transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" }}
                    >
                      🎥 Rejoindre
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {tab === "annonces" && (
            <div className="space-y-3">
              {annonces.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📢</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucune annonce pour le moment.</p>
                </div>
              ) : annonces.map((annonce, index) => (
                <motion.div
                  key={annonce.id}
                  className="rounded-2xl bg-card p-4 border border-border"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {annonce.priority === "urgent" && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Urgent</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(annonce.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{annonce.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{annonce.content}</p>
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
