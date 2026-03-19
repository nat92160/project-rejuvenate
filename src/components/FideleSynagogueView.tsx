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

interface SynagogueResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distance: number; // in meters
  address?: string;
  phone?: string;
  website?: string;
  denomination?: string;
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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAddress(tags: Record<string, string | undefined>) {
  return [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:postcode"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
  ].filter(Boolean).join(", ");
}

async function fetchNearbySynagogues(lat: number, lon: number, radiusKm: number = 15, signal?: AbortSignal): Promise<SynagogueResult[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="jewish"](around:${radiusMeters},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="jewish"](around:${radiusMeters},${lat},${lon});
      relation["amenity"="place_of_worship"]["religion"="jewish"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const data = await res.json();
  const seen = new Set<string>();

  return (data.elements || [])
    .map((el: any) => {
      const elLat = Number(el.lat ?? el.center?.lat);
      const elLon = Number(el.lon ?? el.center?.lon);
      const tags = (el.tags || {}) as Record<string, string | undefined>;
      const distance = haversineDistance(lat, lon, elLat, elLon);

      return {
        id: el.id,
        name: tags.name || tags["name:fr"] || "Synagogue",
        lat: elLat,
        lon: elLon,
        distance,
        address: buildAddress(tags) || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        denomination: tags.denomination || undefined,
      } as SynagogueResult;
    })
    .filter((item: SynagogueResult) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
    .filter((item: SynagogueResult) => item.distance <= radiusMeters + 100)
    .filter((item: SynagogueResult) => {
      const key = `${item.name}-${item.address || ""}-${item.lat.toFixed(4)}-${item.lon.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: SynagogueResult, b: SynagogueResult) => a.distance - b.distance)
    .slice(0, 20);
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

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

  // Fetch DB data
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

  // Fetch nearby synagogues based on city GPS
  useEffect(() => {
    if (!city.lat || !city.lng) return;

    const controller = new AbortController();
    setSynLoading(true);
    setSynError(null);
    setSynagogues([]);

    fetchNearbySynagogues(city.lat, city.lng, 15, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setSynagogues(results);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Erreur synagogues proches:", error);
        setSynagogues([]);
        setSynError("Impossible de charger les synagogues à proximité.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSynLoading(false);
        }
      });

    return () => controller.abort();
  }, [city.lat, city.lng]);

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const tabs = [
    { id: "synagogues" as const, icon: "🏛️", label: "Synagogues", count: synagogues.length },
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
        <p className="text-xs text-muted-foreground mt-1">📍 {city.name} — Synagogues, cours & événements près de chez vous</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1.5 rounded-2xl bg-muted/60 border border-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-none active:scale-95 whitespace-nowrap min-w-0"
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

      {loading && tab !== "synagogues" ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <>
          {/* SYNAGOGUES */}
          {tab === "synagogues" && (
            <div className="space-y-3">
              {synLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">🔍 Recherche des synagogues…</div>
              ) : synError ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">😕</span>
                  <p className="text-sm text-muted-foreground mt-3">{synError}</p>
                </div>
              ) : synagogues.length === 0 ? (
                <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
                  <span className="text-4xl">🏛️</span>
                  <p className="text-sm text-muted-foreground mt-3">Aucune synagogue trouvée dans un rayon de 15 km.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Localisez-vous pour améliorer les résultats.</p>
                </div>
              ) : synagogues.map((s, i) => (
                <motion.div key={s.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))" }}>
                      🕍
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-sm font-bold text-foreground leading-tight">{s.name}</h4>
                      {s.denomination && (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 bg-primary/10 text-primary">
                          {s.denomination}
                        </span>
                      )}
                      {s.address && <p className="text-[11px] text-muted-foreground mt-1">📍 {s.address}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-primary/80">📏 {formatDistance(s.distance)}</span>
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="text-[11px] text-muted-foreground hover:text-primary no-underline">📞 {s.phone}</a>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white no-underline transition-all hover:scale-105 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #34a853, #1e8e3e)" }}>
                          🧭 Itinéraire
                        </a>
                        {s.website && (
                          <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold no-underline transition-all hover:scale-105 active:scale-95 bg-muted text-foreground border border-border">
                            🌐 Site
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

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
