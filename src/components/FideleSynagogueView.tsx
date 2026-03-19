import { useEffect, useState } from "react";
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

const formatTravelTime = (minutes?: number) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

const FideleSynagogueView = () => {
  const { city, geolocate, isGeolocating, locationError } = useCity();
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

    void fetchAll();
  }, []);

  useEffect(() => {
    if (!city.lat || !city.lng) return;

    const controller = new AbortController();
    setSynLoading(true);
    setSynError(null);
    setSynagogues([]);

    fetchNearbySynagogues(city.lat, city.lng, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setSynagogues(results);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Erreur synagogues proches:", error);
        setSynagogues([]);
        setSynError("Impossible de charger les synagogues les plus proches avec une distance fiable.");
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

  const firstDistance = synagogues[0]?.straightLineDistance ?? synagogues[0]?.distance ?? 0;
  const showingExpandedResults = synagogues.length > 0 && firstDistance > 15000;
  const isUsingGps = Boolean(city._gps);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div
        className="mb-4 rounded-2xl border border-primary/15 p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <span className="text-3xl">🏛️</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Ma Communauté</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {city.name} — Synagogues, cours & événements près de chez vous
        </p>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/60 p-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-xl border-none py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
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
        <div className="py-10 text-center text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <>
          {tab === "synagogues" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {isUsingGps ? "Position GPS active" : "Position approximative"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isUsingGps
                        ? `Recherche autour de votre position réelle${city.accuracyMeters ? ` (±${city.accuracyMeters} m)` : ""}.`
                        : "Utilisez votre GPS pour obtenir les synagogues réellement autour de vous et des distances exactes."}
                    </p>
                    {locationError ? <p className="mt-1 text-xs text-destructive">{locationError}</p> : null}
                  </div>

                  <button
                    onClick={geolocate}
                    disabled={isGeolocating}
                    className="shrink-0 rounded-xl border-none px-3 py-2 text-xs font-bold text-primary-foreground cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                  >
                    {isGeolocating ? "Localisation..." : isUsingGps ? "Actualiser" : "Me localiser"}
                  </button>
                </div>
              </div>

              {synLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  🔍 Recherche des synagogues les plus proches avec calcul des distances exactes…
                </div>
              ) : synError ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">😕</span>
                  <p className="mt-3 text-sm text-muted-foreground">{synError}</p>
                </div>
              ) : synagogues.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">🏛️</span>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aucune synagogue trouvée, même en élargissant la recherche.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Activez la localisation GPS pour repartir de votre position exacte.
                  </p>
                </div>
              ) : (
                <>
                  {showingExpandedResults && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                      Aucune synagogue trouvée à proximité immédiate : la recherche a été élargie automatiquement aux résultats les plus proches.
                    </div>
                  )}

                  {synagogues.map((synagogue, index) => {
                    const routeLabel = synagogue.distanceSource === "road"
                      ? `${formatDistance(synagogue.distance)} par route`
                      : `${formatDistance(synagogue.distance)} à vol d'oiseau`;
                    const straightLineLabel = synagogue.distanceSource === "road"
                      ? `${formatDistance(synagogue.straightLineDistance)} à vol d'oiseau`
                      : null;
                    const travelLabel = formatTravelTime(synagogue.travelDurationMinutes);

                    return (
                      <motion.div
                        key={synagogue.id}
                        className="rounded-2xl border border-border bg-card p-4"
                        style={{ boxShadow: "var(--shadow-card)" }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                            style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))" }}
                          >
                            🕍
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-display text-sm font-bold leading-tight text-foreground">{synagogue.name}</h4>
                            {synagogue.denomination && (
                              <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                                {synagogue.denomination}
                              </span>
                            )}
                            {synagogue.address && (
                              <p className="mt-1 text-[11px] text-muted-foreground">📍 {synagogue.address}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-3">
                              <span className="text-[11px] font-bold text-primary/80">📏 {routeLabel}</span>
                              {travelLabel && (
                                <span className="text-[11px] text-muted-foreground">🚗 {travelLabel}</span>
                              )}
                              {synagogue.phone && (
                                <a
                                  href={`tel:${synagogue.phone}`}
                                  className="text-[11px] text-muted-foreground no-underline hover:text-primary"
                                >
                                  📞 {synagogue.phone}
                                </a>
                              )}
                            </div>
                            {straightLineLabel && (
                              <p className="mt-1 text-[10px] text-muted-foreground/80">{straightLineLabel}</p>
                            )}
                            <div className="mt-2 flex gap-2">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${synagogue.lat},${synagogue.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all hover:scale-105 active:scale-95"
                              >
                                🧭 Itinéraire
                              </a>
                              {synagogue.website && (
                                <a
                                  href={synagogue.website.startsWith("http") ? synagogue.website : `https://${synagogue.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all hover:scale-105 active:scale-95"
                                >
                                  🌐 Site
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab === "cours" && (
            <div className="space-y-3">
              {cours.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📚</span>
                  <p className="mt-3 text-sm text-muted-foreground">Aucun cours programmé pour le moment.</p>
                </div>
              ) : cours.map((coursItem, index) => {
                const dotColor = dayColors[coursItem.day_of_week] || "#94a3b8";
                const href = coursItem.zoom_link?.startsWith("http") ? coursItem.zoom_link : `https://${coursItem.zoom_link}`;
                return (
                  <motion.div
                    key={coursItem.id}
                    className="rounded-2xl border border-border bg-card p-4"
                    style={{ boxShadow: "var(--shadow-card)" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${dotColor}15`, color: dotColor }}>
                            {coursItem.day_of_week}
                          </span>
                          <span className="text-xs font-bold text-foreground">{coursItem.course_time?.slice(0, 5)}</span>
                        </div>
                        <h4 className="mt-1 font-display text-sm font-bold text-foreground">{coursItem.title}</h4>
                        {coursItem.rav && <p className="mt-0.5 text-xs font-medium text-primary/80">👨‍🏫 {coursItem.rav}</p>}
                        {coursItem.description && (
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{coursItem.description}</p>
                        )}
                      </div>
                      {coursItem.zoom_link && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg no-underline transition-transform hover:scale-110 active:scale-95"
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
                <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📅</span>
                  <p className="mt-3 text-sm text-muted-foreground">Aucun événement à venir.</p>
                </div>
              ) : events.map((eventItem, index) => (
                <motion.div
                  key={eventItem.id}
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-base">{typeEmoji[eventItem.event_type] || "📌"}</span>
                    <span className="text-[10px] font-bold uppercase text-primary">{eventItem.event_type}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(eventItem.event_date)}</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{eventItem.title}</h4>
                  {eventItem.description && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{eventItem.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/80">
                    <span>🕐 {eventItem.event_time?.slice(0, 5)}</span>
                    {eventItem.location && <span>📍 {eventItem.location}</span>}
                  </div>
                  {eventItem.zoom_link && (
                    <a
                      href={eventItem.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white no-underline transition-all hover:scale-105"
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
                <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">📢</span>
                  <p className="mt-3 text-sm text-muted-foreground">Aucune annonce pour le moment.</p>
                </div>
              ) : annonces.map((annonce, index) => (
                <motion.div
                  key={annonce.id}
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {annonce.priority === "urgent" && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                        Urgent
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(annonce.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{annonce.title}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{annonce.content}</p>
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
