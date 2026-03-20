import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { fetchNearbySynagogues, formatDistance, SynagogueResult } from "@/lib/synagogues";
import { toast } from "sonner";
import SynagogueChat from "./SynagogueChat";

interface SynaDirectoryItem {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  subscriber_count: number;
  isSubscribed: boolean;
}

interface CoursItem { id: string; title: string; rav: string; day_of_week: string; course_time: string; zoom_link: string; description: string; synagogue_name?: string; }
interface EventItem { id: string; title: string; description: string; event_date: string; event_time: string; location: string; event_type: string; zoom_link: string | null; synagogue_name?: string; }
interface AnnonceItem { id: string; title: string; content: string; priority: string; created_at: string; synagogue_name?: string; }

const dayColors: Record<string, string> = { Lundi: "#3b82f6", Mardi: "#8b5cf6", Mercredi: "#22c55e", Jeudi: "#f97316", Vendredi: "#ef4444", Dimanche: "#eab308" };
const typeEmoji: Record<string, string> = { kidouch: "🍷", cours: "📖", fete: "🎉", autre: "📌" };

const formatTravelTime = (minutes?: number) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
};

const FideleSynagogueView = () => {
  const { user } = useAuth();
  const { city, geolocate, isGeolocating, locationError } = useCity();
  const [tab, setTab] = useState<"annuaire" | "synagogues" | "cours" | "events" | "annonces" | "chat">("annuaire");
  const [chatSyna, setChatSyna] = useState<{ id: string; name: string } | null>(null);

  // Directory state
  const [directory, setDirectory] = useState<SynaDirectoryItem[]>([]);
  const [dirLoading, setDirLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Content state
  const [cours, setCours] = useState<CoursItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Google Maps synagogues
  const [synagogues, setSynagogues] = useState<SynagogueResult[]>([]);
  const [synLoading, setSynLoading] = useState(false);
  const [synError, setSynError] = useState<string | null>(null);

  // Fetch directory of registered synagogues
  const fetchDirectory = async () => {
    setDirLoading(true);
    const { data: allSynas } = await supabase
      .from("synagogue_profiles")
      .select("id, name, logo_url, primary_color, secondary_color")
      .neq("name", "")
      .order("name");

    // Get subscription counts
    const { data: subCounts } = await supabase
      .from("synagogue_subscriptions")
      .select("synagogue_id");

    // Get user's subscriptions
    let userSubs: string[] = [];
    if (user) {
      const { data: mySubs } = await supabase
        .from("synagogue_subscriptions")
        .select("synagogue_id")
        .eq("user_id", user.id);
      userSubs = (mySubs || []).map((s: any) => s.synagogue_id);
    }

    const countMap = new Map<string, number>();
    (subCounts || []).forEach((s: any) => {
      countMap.set(s.synagogue_id, (countMap.get(s.synagogue_id) || 0) + 1);
    });

    setDirectory(
      (allSynas || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        logo_url: s.logo_url,
        primary_color: s.primary_color || "#1e3a5f",
        secondary_color: s.secondary_color || "#c9a84c",
        subscriber_count: countMap.get(s.id) || 0,
        isSubscribed: userSubs.includes(s.id),
      }))
    );
    setDirLoading(false);
  };

  // Fetch content from subscribed synagogues
  const fetchContent = async () => {
    setContentLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    // Get user's subscribed synagogue IDs
    let subIds: string[] = [];
    if (user) {
      const { data: mySubs } = await supabase
        .from("synagogue_subscriptions")
        .select("synagogue_id")
        .eq("user_id", user.id);
      subIds = (mySubs || []).map((s: any) => s.synagogue_id);
    }

    // Fetch content — if subscribed, filter by synagogue; otherwise show all
    const filter = subIds.length > 0;

    const coursQuery = supabase.from("cours_zoom").select("*").order("created_at", { ascending: false }).limit(20);
    const eventsQuery = supabase.from("evenements").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(20);
    const annoncesQuery = supabase.from("annonces").select("*").order("created_at", { ascending: false }).limit(10);

    // If subscribed, filter by synagogue_id using raw filter
    if (filter) {
      const idList = `(${subIds.join(",")})`;
      coursQuery.filter("synagogue_id", "in", idList);
      eventsQuery.filter("synagogue_id", "in", idList);
      annoncesQuery.filter("synagogue_id", "in", idList);
    }

    const [coursRes, eventsRes, annoncesRes] = await Promise.all([coursQuery, eventsQuery, annoncesQuery]);

    setCours((coursRes.data || []) as CoursItem[]);
    setEvents((eventsRes.data || []) as EventItem[]);
    setAnnonces((annoncesRes.data || []) as AnnonceItem[]);
    setContentLoading(false);
  };

  useEffect(() => { fetchDirectory(); }, [user]);
  useEffect(() => { fetchContent(); }, [user]);

  // Google Maps nearby synagogues
  useEffect(() => {
    if (!city.lat || !city.lng) return;
    const controller = new AbortController();
    setSynLoading(true);
    setSynError(null);
    setSynagogues([]);
    fetchNearbySynagogues(city.lat, city.lng, controller.signal)
      .then((results) => { if (!controller.signal.aborted) setSynagogues(results); })
      .catch((error) => { if (!controller.signal.aborted) { console.error(error); setSynError("Impossible de charger les synagogues proches."); } })
      .finally(() => { if (!controller.signal.aborted) setSynLoading(false); });
    return () => controller.abort();
  }, [city.lat, city.lng]);

  const handleSubscribe = async (synaId: string) => {
    if (!user) { toast.error("Connectez-vous pour vous abonner"); return; }
    setSubscribing(synaId);
    const item = directory.find((d) => d.id === synaId);
    if (item?.isSubscribed) {
      await supabase.from("synagogue_subscriptions").delete().eq("user_id", user.id).eq("synagogue_id", synaId);
      toast.success("Désabonné");
    } else {
      await supabase.from("synagogue_subscriptions").insert({ user_id: user.id, synagogue_id: synaId } as any);
      toast.success("🔔 Abonné ! Vous recevrez les actualités de cette synagogue.");
    }
    await fetchDirectory();
    await fetchContent();
    setSubscribing(null);
  };

  const subscribedCount = directory.filter((d) => d.isSubscribed).length;
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const tabs = [
    { id: "annuaire" as const, icon: "📋", label: "Annuaire", count: directory.length },
    { id: "synagogues" as const, icon: "🕍", label: "Proches", count: synagogues.length },
    { id: "cours" as const, icon: "🎥", label: "Cours", count: cours.length },
    { id: "events" as const, icon: "📅", label: "Événements", count: events.length },
    { id: "annonces" as const, icon: "📢", label: "Annonces", count: annonces.length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div
        className="mb-4 rounded-2xl border border-primary/15 p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <span className="text-3xl">🏛️</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Ma Communauté</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {subscribedCount > 0
            ? `Abonné à ${subscribedCount} synagogue${subscribedCount > 1 ? "s" : ""} — ${city.name}`
            : `${city.name} — Abonnez-vous à une synagogue pour recevoir ses actualités`}
        </p>
      </div>

      {/* Tabs */}
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

      {/* Annuaire tab */}
      {tab === "annuaire" && (
        <div className="space-y-3">
          {dirLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement de l'annuaire…</div>
          ) : directory.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">🏛️</span>
              <p className="mt-3 text-sm text-muted-foreground">Aucune synagogue inscrite pour le moment.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Les présidents de synagogue doivent d'abord créer leur profil.</p>
            </div>
          ) : (
            directory.map((syna, index) => (
              <motion.div
                key={syna.id}
                className="rounded-2xl border bg-card p-4"
                style={{
                  boxShadow: "var(--shadow-card)",
                  borderColor: syna.isSubscribed ? `${syna.secondary_color}40` : "hsl(var(--border))",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex items-center gap-3">
                  {syna.logo_url ? (
                    <img src={syna.logo_url} alt="" className="h-12 w-12 rounded-xl border border-border object-contain bg-white" />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                      style={{ background: syna.primary_color }}
                    >
                      {syna.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-sm font-bold text-foreground">{syna.name}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      👥 {syna.subscriber_count} abonné{syna.subscriber_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubscribe(syna.id)}
                    disabled={subscribing === syna.id}
                    className="shrink-0 rounded-xl border-none px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    style={
                      syna.isSubscribed
                        ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        : { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", boxShadow: "var(--shadow-gold)" }
                    }
                  >
                    {subscribing === syna.id ? "…" : syna.isSubscribed ? "✓ Abonné" : "🔔 S'abonner"}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Nearby synagogues (Google Maps) */}
      {tab === "synagogues" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {Boolean(city._gps) ? "Position GPS active" : "Position approximative"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Boolean(city._gps)
                    ? `Recherche autour de votre position réelle${city.accuracyMeters ? ` (±${city.accuracyMeters} m)` : ""}.`
                    : "Utilisez votre GPS pour des résultats précis."}
                </p>
                {locationError && <p className="mt-1 text-xs text-destructive">{locationError}</p>}
              </div>
              <button
                onClick={geolocate}
                disabled={isGeolocating}
                className="shrink-0 rounded-xl border-none px-3 py-2 text-xs font-bold text-primary-foreground cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
              >
                {isGeolocating ? "Localisation…" : Boolean(city._gps) ? "Actualiser" : "Me localiser"}
              </button>
            </div>
          </div>

          {synLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">🔍 Recherche des synagogues proches…</div>
          ) : synError ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">😕</span>
              <p className="mt-3 text-sm text-muted-foreground">{synError}</p>
            </div>
          ) : synagogues.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">🏛️</span>
              <p className="mt-3 text-sm text-muted-foreground">Aucune synagogue trouvée.</p>
            </div>
          ) : (
            synagogues.map((synagogue, index) => {
              const routeLabel = synagogue.distanceSource === "road"
                ? `${formatDistance(synagogue.distance)} par route`
                : `${formatDistance(synagogue.distance)} à vol d'oiseau`;
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))" }}>🕍</div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display text-sm font-bold leading-tight text-foreground">{synagogue.name}</h4>
                      {synagogue.address && <p className="mt-1 text-[11px] text-muted-foreground">📍 {synagogue.address}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] font-bold text-primary/80">📏 {routeLabel}</span>
                        {travelLabel && <span className="text-[11px] text-muted-foreground">🚗 {travelLabel}</span>}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${synagogue.lat},${synagogue.lon}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all hover:scale-105 active:scale-95">
                          🧭 Itinéraire
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Cours */}
      {tab === "cours" && (
        <div className="space-y-3">
          {contentLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : cours.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">📚</span>
              <p className="mt-3 text-sm text-muted-foreground">
                {subscribedCount > 0 ? "Aucun cours programmé par vos synagogues." : "Abonnez-vous à une synagogue pour voir ses cours."}
              </p>
            </div>
          ) : cours.map((c, i) => {
            const dotColor = dayColors[c.day_of_week] || "#94a3b8";
            const href = c.zoom_link?.startsWith("http") ? c.zoom_link : `https://${c.zoom_link}`;
            return (
              <motion.div key={c.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${dotColor}15`, color: dotColor }}>{c.day_of_week}</span>
                      <span className="text-xs font-bold text-foreground">{c.course_time?.slice(0, 5)}</span>
                    </div>
                    <h4 className="mt-1 font-display text-sm font-bold text-foreground">{c.title}</h4>
                    {c.rav && <p className="mt-0.5 text-xs font-medium text-primary/80">👨‍🏫 {c.rav}</p>}
                    {c.description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{c.description}</p>}
                  </div>
                  {c.zoom_link && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg no-underline transition-transform hover:scale-110 active:scale-95" style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>🎥</a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Events */}
      {tab === "events" && (
        <div className="space-y-3">
          {contentLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">📅</span>
              <p className="mt-3 text-sm text-muted-foreground">
                {subscribedCount > 0 ? "Aucun événement à venir." : "Abonnez-vous pour voir les événements."}
              </p>
            </div>
          ) : events.map((ev, i) => (
            <motion.div key={ev.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-base">{typeEmoji[ev.event_type] || "📌"}</span>
                <span className="text-[10px] font-bold uppercase text-primary">{ev.event_type}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(ev.event_date)}</span>
              </div>
              <h4 className="font-display text-sm font-bold text-foreground">{ev.title}</h4>
              {ev.description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{ev.description}</p>}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/80">
                <span>🕐 {ev.event_time?.slice(0, 5)}</span>
                {ev.location && <span>📍 {ev.location}</span>}
              </div>
              {ev.zoom_link && (
                <a href={ev.zoom_link} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white no-underline transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" }}>🎥 Rejoindre</a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Annonces */}
      {tab === "annonces" && (
        <div className="space-y-3">
          {contentLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : annonces.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">📢</span>
              <p className="mt-3 text-sm text-muted-foreground">
                {subscribedCount > 0 ? "Aucune annonce récente." : "Abonnez-vous pour voir les annonces."}
              </p>
            </div>
          ) : annonces.map((a, i) => (
            <motion.div key={a.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="mb-1 flex items-center gap-2">
                {a.priority === "urgent" && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Urgent</span>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
              </div>
              <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{a.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default FideleSynagogueView;
