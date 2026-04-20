import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { toast } from "sonner";
import { fetchNearbySynagogues, formatDistance, type SynagogueResult } from "@/lib/synagogues";
import SynagogueChat from "./SynagogueChat";
import SynaInfoCard from "./SynaInfoCard";
import PrayerTimeSuggestionForm from "./PrayerTimeSuggestionForm";
import VerifiedSuggestionsDisplay from "./VerifiedSuggestionsDisplay";
import SynagogueFormSheet from "./SynagogueFormSheet";
import SynagogueWall from "./SynagogueWall";

interface SynaDirectoryItem {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  subscriber_count: number;
  isSubscribed: boolean;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
}

interface CoursItem { id: string; title: string; rav: string; day_of_week: string; course_time: string; zoom_link: string; description: string; synagogue_name?: string; }
interface EventItem { id: string; title: string; description: string; event_date: string; event_time: string; location: string; event_type: string; zoom_link: string | null; synagogue_name?: string; }
interface AnnonceItem { id: string; title: string; content: string; priority: string; created_at: string; synagogue_name?: string; }
interface MinyanSessionView { id: string; office_type: string; office_date: string; office_time: string; target_count: number; current_count: number; synagogue_id: string | null; synagogue_name?: string; }
interface TehilimChainView { id: string; title: string; dedication: string | null; dedication_type: string | null; status: string; total_chapters: number; completed_chapters: number; synagogue_id: string | null; synagogue_name?: string; }

const dayColors: Record<string, string> = { Lundi: "#3b82f6", Mardi: "#8b5cf6", Mercredi: "#22c55e", Jeudi: "#f97316", Vendredi: "#ef4444", Dimanche: "#eab308" };
const typeEmoji: Record<string, string> = { kidouch: "🍷", cours: "📖", fete: "🎉", autre: "📌" };
const OFFICE_LABELS: Record<string, string> = { shacharit: "🌅 Cha'harit", minha: "☀️ Min'ha", arvit: "🌙 Arvit" };
const DEDICATION_LABELS: Record<string, string> = { general: "📜 Général", refoua: "🙏 Réfoua", elevation: "🕯️ Élévation", hatzlakha: "🌟 Hatzlakha" };

const formatTravelTime = (minutes?: number) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
};

const hasCoordinates = (lat?: number | null, lng?: number | null) =>
  typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);

const getDistanceInMeters = (originLat: number, originLng: number, targetLat: number, targetLng: number) => {
  const R = 6371000;
  const dLat = ((targetLat - originLat) * Math.PI) / 180;
  const dLng = ((targetLng - originLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((originLat * Math.PI) / 180) *
    Math.cos((targetLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FideleSynagogueView = () => {
  const { user, dbRole } = useAuth();
  const { city, geolocate, isGeolocating, locationError } = useCity();
  const [tab, setTab] = useState<"wall" | "annuaire" | "synagogues" | "cours" | "events" | "annonces" | "chat" | "horaires" | "tehilim" | "minyan">("wall");
  const [chatSyna, setChatSyna] = useState<{ id: string; name: string } | null>(null);
  const [suggestingSynaId, setSuggestingSynaId] = useState<string | null>(null);
  const [showCreateSyna, setShowCreateSyna] = useState(false);
  const isPresident = dbRole === "president";

  // Directory state
  const [directory, setDirectory] = useState<SynaDirectoryItem[]>([]);
  const [dirLoading, setDirLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Google Maps nearby results
  const [googleResults, setGoogleResults] = useState<SynagogueResult[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSearched, setGoogleSearched] = useState(false);

  // Content state
  const [cours, setCours] = useState<CoursItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceItem[]>([]);
  const [minyans, setMinyans] = useState<MinyanSessionView[]>([]);
  const [tehilimChains, setTehilimChains] = useState<TehilimChainView[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Fetch directory of registered synagogues
  const fetchDirectory = async () => {
    setDirLoading(true);
    const { data: allSynas } = await (supabase
      .from("synagogue_profiles")
      .select("id, name, logo_url, primary_color, secondary_color, shacharit_time, minha_time, arvit_time, address, phone, email, latitude, longitude, verified, president_id, adjoint_id") as any)
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
      (allSynas || [])
        .filter((s: any) => s.verified === true || s.president_id === user?.id || s.adjoint_id === user?.id)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          logo_url: s.logo_url,
          primary_color: s.primary_color || "#1e3a5f",
          secondary_color: s.secondary_color || "#c9a84c",
          subscriber_count: countMap.get(s.id) || 0,
          isSubscribed: userSubs.includes(s.id),
          shacharit_time: s.shacharit_time || null,
          minha_time: s.minha_time || null,
          arvit_time: s.arvit_time || null,
          address: s.address || null,
          phone: s.phone || null,
          email: s.email || null,
          latitude: s.latitude || null,
          longitude: s.longitude || null,
          verified: s.verified ?? false,
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

    let coursQuery = supabase.from("cours_zoom").select("*").order("created_at", { ascending: false }).limit(20);
    let eventsQuery = supabase.from("evenements").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(20);
    let annoncesQuery = supabase.from("annonces").select("*").order("created_at", { ascending: false }).limit(10);
    let minyanQuery = supabase.from("minyan_sessions").select("*").gte("office_date", today).order("office_date", { ascending: true }).limit(20);
    let tehilimQuery = supabase.from("tehilim_chains").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(20);

    // If subscribed, filter by synagogue_id
    if (filter) {
      coursQuery = coursQuery.in("synagogue_id", subIds);
      eventsQuery = eventsQuery.in("synagogue_id", subIds);
      annoncesQuery = annoncesQuery.in("synagogue_id", subIds);
      minyanQuery = minyanQuery.in("synagogue_id", subIds);
      tehilimQuery = tehilimQuery.in("synagogue_id", subIds);
    }

    const [coursRes, eventsRes, annoncesRes, minyanRes, tehilimRes] = await Promise.all([coursQuery, eventsQuery, annoncesQuery, minyanQuery, tehilimQuery]);

    setCours((coursRes.data || []) as CoursItem[]);
    setEvents((eventsRes.data || []) as EventItem[]);
    setAnnonces((annoncesRes.data || []) as AnnonceItem[]);

    // Enrich minyan with registration counts
    const sessions = (minyanRes.data || []) as any[];
    if (sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: regs } = await supabase.from("minyan_registrations").select("session_id, guest_count").in("session_id", sessionIds);
      const countMap = new Map<string, number>();
      (regs || []).forEach((r: any) => {
        countMap.set(r.session_id, (countMap.get(r.session_id) || 0) + (r.guest_count || 1));
      });
      setMinyans(sessions.map(s => ({ ...s, current_count: countMap.get(s.id) || 0 })));
    } else {
      setMinyans([]);
    }

    // Enrich tehilim with completion counts
    const chains = (tehilimRes.data || []) as any[];
    if (chains.length > 0) {
      const chainIds = chains.map(c => c.id);
      const { data: claims } = await supabase.from("tehilim_claims").select("chain_id, completed").in("chain_id", chainIds);
      const totalMap = new Map<string, number>();
      const completedMap = new Map<string, number>();
      (claims || []).forEach((cl: any) => {
        totalMap.set(cl.chain_id, (totalMap.get(cl.chain_id) || 0) + 1);
        if (cl.completed) completedMap.set(cl.chain_id, (completedMap.get(cl.chain_id) || 0) + 1);
      });
      setTehilimChains(chains.map(c => ({ ...c, total_chapters: totalMap.get(c.id) || 0, completed_chapters: completedMap.get(c.id) || 0 })));
    } else {
      setTehilimChains([]);
    }
    setContentLoading(false);
  };

  useEffect(() => { fetchDirectory(); }, [user]);
  useEffect(() => { fetchContent(); }, [user]);

  // Fetch Google Maps nearby synagogues when GPS is active
  const fetchGoogleNearby = useCallback(async () => {
    if (!hasCoordinates(city.lat, city.lng)) return;
    setGoogleLoading(true);
    try {
      const results = await fetchNearbySynagogues(city.lat, city.lng);
      setGoogleResults(results.filter(r => r.distance <= 100000));
      setGoogleSearched(true);
    } catch (err) {
      console.warn("Google nearby search failed:", err);
      setGoogleSearched(true);
    } finally {
      setGoogleLoading(false);
    }
  }, [city.lat, city.lng]);

  useEffect(() => { fetchGoogleNearby(); }, [fetchGoogleNearby]);

  // Partner synagogues from our DB within 15km
  const nearbyPartners = useMemo(() => {
    if (!hasCoordinates(city.lat, city.lng)) return [];
    return directory
      .filter((syna) => hasCoordinates(syna.latitude, syna.longitude))
      .map((syna) => ({
        ...syna,
        dist: getDistanceInMeters(city.lat, city.lng, syna.latitude!, syna.longitude!),
      }))
      .filter((syna) => syna.dist <= 100000)
      .sort((a, b) => a.dist - b.dist);
  }, [directory, city.lat, city.lng]);

  // Google results that are NOT already in our DB (deduplicate by proximity)
  const externalGoogleResults = useMemo(() => {
    if (nearbyPartners.length === 0) return googleResults;
    return googleResults.filter((gr) => {
      // Exclude if a DB partner is within 100m of this Google result
      return !nearbyPartners.some(
        (p) => hasCoordinates(p.latitude, p.longitude) && getDistanceInMeters(p.latitude!, p.longitude!, gr.lat, gr.lon) < 100
      );
    });
  }, [googleResults, nearbyPartners]);

  const totalNearbyCount = nearbyPartners.length + externalGoogleResults.length;

  // Track which Google places are subscribed (by place name match)
  const [subscribedPlaceNames, setSubscribedPlaceNames] = useState<Set<string>>(new Set());

  const handleSubscribe = async (synaId: string) => {
    if (!user) { toast.error("Connectez-vous pour vous abonner"); return; }
    setSubscribing(synaId);
    const item = directory.find((d) => d.id === synaId);
    if (item?.isSubscribed) {
      await supabase.from("synagogue_subscriptions").delete().eq("user_id", user.id).eq("synagogue_id", synaId);
      toast.success("Désabonné");
    } else {
      await supabase.from("synagogue_subscriptions").insert({ user_id: user.id, synagogue_id: synaId } as any);
      toast.success("⭐ Abonné !");
    }
    await fetchDirectory();
    await fetchContent();
    setSubscribing(null);
  };

  const handleSubscribePlace = async (place: { id: string; name: string; address?: string; lat: number; lon: number }) => {
    if (!user) { toast.error("Connectez-vous pour vous abonner"); return; }
    setSubscribing(place.id);
    const { error } = await supabase.rpc("subscribe_to_place", {
      _user_id: user.id,
      _place_name: place.name,
      _place_address: place.address || null,
      _place_lat: place.lat,
      _place_lng: place.lon,
      _google_place_id: place.id,
    });
    if (error) {
      console.error("subscribe_to_place error:", error);
      toast.error("Erreur lors de l'abonnement");
    } else {
      toast.success("⭐ Abonné !");
      setSubscribedPlaceNames(prev => new Set(prev).add(place.name));
      await fetchDirectory();
      await fetchContent();
    }
    setSubscribing(null);
  };

  const subscribedCount = directory.filter((d) => d.isSubscribed).length;
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const subscribedSynas = directory.filter(d => d.isSubscribed);

  const tabs = [
    { id: "wall" as const, icon: "📌", label: "Mur", count: 0 },
    { id: "synagogues" as const, icon: "🕍", label: "Proches", count: totalNearbyCount },
    { id: "horaires" as const, icon: "🕐", label: "Horaires", count: 0 },
    { id: "cours" as const, icon: "🎥", label: "Cours", count: cours.length },
    { id: "tehilim" as const, icon: "📜", label: "Tehilim", count: tehilimChains.length },
    { id: "annuaire" as const, icon: "📋", label: "Annuaire", count: directory.length },
    { id: "minyan" as const, icon: "🚨", label: "Urgence", count: minyans.length },
    { id: "events" as const, icon: "📅", label: "Événements", count: events.length },
    { id: "annonces" as const, icon: "📢", label: "Annonces", count: annonces.length },
    ...(subscribedSynas.length > 0 ? [{ id: "chat" as const, icon: "💬", label: "Chat", count: 0 }] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header – Ma Communauté */}
      <div
        className="mb-5 rounded-2xl border border-primary/15 p-6 text-center space-y-4"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <span className="block text-4xl">🏛️</span>
        <h3 className="font-display text-lg font-bold text-foreground">Ma Communauté</h3>
        <p className="text-xs text-muted-foreground">
          {subscribedCount > 0
            ? `Abonné à ${subscribedCount} synagogue${subscribedCount > 1 ? "s" : ""} — ${city.name}`
            : `${city.name} — Abonnez-vous à une synagogue pour recevoir ses actualités`}
        </p>
        {isPresident && (
          <button
            onClick={() => setShowCreateSyna(true)}
            className="inline-flex items-center gap-2 rounded-xl border-none px-4 py-2.5 text-xs font-bold text-primary-foreground cursor-pointer transition-all active:scale-95"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            ➕ Créer ma fiche synagogue
          </button>
        )}
      </div>

      <SynagogueFormSheet
        open={showCreateSyna}
        onOpenChange={setShowCreateSyna}
        onCreated={() => { void fetchDirectory(); toast.success("📤 Fiche envoyée — en attente de validation par un administrateur"); }}
      />

      {/* Tabs – h-scroll, aerated */}
      <div className="mb-5 overflow-x-auto rounded-2xl border border-border bg-muted/60 p-2 shadow-sm" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none px-4 py-2.5 text-xs font-medium transition-all cursor-pointer active:scale-95"
              style={{
                minHeight: "44px",
                background: tab === item.id ? "var(--gradient-gold)" : "transparent",
                color: tab === item.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: tab === item.id ? "var(--shadow-gold)" : "none",
              }}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
              {item.count > 0 && <span className="text-[10px] opacity-70">({item.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Mur tab — tableau d'affichage manuscrit */}
      {tab === "wall" && <SynagogueWall />}

      {/* Annuaire tab */}
      {tab === "annuaire" && (
        <div className="space-y-3">
          {/* Info cards for subscribed synagogues */}
          {subscribedSynas.filter(s => s.address || s.phone || s.email).map((syna) => (
            <SynaInfoCard key={`info-${syna.id}`} info={{ ...syna, id: syna.id }} />
          ))}
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-2xl">🏛️</div>
                   <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display text-sm font-bold text-foreground">{syna.name}</h4>
                      {syna.verified ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">✅</span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">⏳</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      👥 {syna.subscriber_count} abonné{syna.subscriber_count !== 1 ? "s" : ""}
                    </p>
                    {(syna.shacharit_time || syna.minha_time || syna.arvit_time) && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {syna.shacharit_time && <span className="text-[10px] font-bold text-primary/80">🌅 {syna.shacharit_time.slice(0, 5)}</span>}
                        {syna.minha_time && <span className="text-[10px] font-bold text-primary/80">🌇 {syna.minha_time.slice(0, 5)}</span>}
                        {syna.arvit_time && <span className="text-[10px] font-bold text-primary/80">🌙 {syna.arvit_time.slice(0, 5)}</span>}
                      </div>
                    )}
                  </div>
                  {syna.isSubscribed ? (
                    <button
                      onClick={() => handleSubscribe(syna.id)}
                      disabled={subscribing === syna.id}
                      className="shrink-0 rounded-xl border px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                    >
                      {subscribing === syna.id ? "…" : "Se désabonner"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(syna.id)}
                      disabled={subscribing === syna.id}
                      className="shrink-0 rounded-xl border-none px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", boxShadow: "var(--shadow-gold)" }}
                    >
                      {subscribing === syna.id ? "…" : "+ S'abonner"}
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Nearby official synagogues */}
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

          {/* Partner synagogues first */}
          {nearbyPartners.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">⭐ Partenaires ({nearbyPartners.length})</p>
              {nearbyPartners.map((syna, index) => {
                const distLabel = syna.dist < 1000 ? `${Math.round(syna.dist)} m` : `${(syna.dist / 1000).toFixed(1)} km`;
                const synaMinyans = minyans.filter(m => (m as any).synagogue_id === syna.id);
                return (
                  <motion.div
                    key={syna.id}
                    className="rounded-2xl border bg-card p-4"
                    style={{ boxShadow: "var(--shadow-card)", borderColor: "hsl(var(--gold) / 0.3)" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-2xl">🏛️</div>
                       <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h4 className="font-display text-sm font-bold leading-tight text-foreground">{syna.name}</h4>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}>⭐ Partenaire</span>
                            {syna.verified && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">✅</span>}
                          </div>
                          {directory.find(d => d.id === syna.id)?.isSubscribed ? (
                            <button
                              onClick={() => handleSubscribe(syna.id)}
                              disabled={subscribing === syna.id}
                              className="shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                            >
                              {subscribing === syna.id ? "…" : "Se désabonner"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSubscribe(syna.id)}
                              disabled={subscribing === syna.id}
                              className="shrink-0 rounded-xl border-none px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                              style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", boxShadow: "var(--shadow-gold)" }}
                            >
                              {subscribing === syna.id ? "…" : "+ S'abonner"}
                            </button>
                          )}
                        </div>
                        {syna.address && <p className="mt-1 text-[11px] text-muted-foreground">📍 {syna.address}</p>}
                        <span className="text-[11px] font-bold text-primary/80">📏 {distLabel}</span>
                        {(syna.shacharit_time || syna.minha_time || syna.arvit_time) && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {syna.shacharit_time && <span className="text-[10px] font-bold text-primary/80">🌅 {syna.shacharit_time.slice(0, 5)}</span>}
                            {syna.minha_time && <span className="text-[10px] font-bold text-primary/80">🌇 {syna.minha_time.slice(0, 5)}</span>}
                            {syna.arvit_time && <span className="text-[10px] font-bold text-primary/80">🌙 {syna.arvit_time.slice(0, 5)}</span>}
                          </div>
                        )}
                        {synaMinyans.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {synaMinyans.slice(0, 3).map(m => (
                              <a key={m.id} href={`/minyan/${m.id}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-[10px] font-bold text-foreground no-underline transition-all active:scale-95">
                                {OFFICE_LABELS[m.office_type] || m.office_type} {m.current_count}/{m.target_count}
                              </a>
                            ))}
                          </div>
                        )}
                        <VerifiedSuggestionsDisplay synagogueId={syna.id} />
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {syna.latitude && syna.longitude && (
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${syna.latitude},${syna.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all hover:scale-105 active:scale-95">
                              🧭 Itinéraire
                            </a>
                          )}
                          {syna.phone && (
                            <a href={`tel:${syna.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all active:scale-95">
                              📞 Appeler
                            </a>
                          )}
                          <a
                            href={`/don/${syna.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold no-underline transition-all active:scale-95"
                            style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", boxShadow: "var(--shadow-gold)" }}
                          >
                            💛 Faire un don
                          </a>
                          <button
                            onClick={() => setSuggestingSynaId(suggestingSynaId === syna.id ? null : syna.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary cursor-pointer transition-all active:scale-95 hover:bg-primary/10"
                          >
                            📝 Proposer des horaires
                          </button>
                        </div>
                        {suggestingSynaId === syna.id && (
                          <div className="mt-3">
                            <PrayerTimeSuggestionForm
                              synagogueId={syna.id}
                              synagogueName={syna.name}
                              onClose={() => setSuggestingSynaId(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}

          {/* Google Maps results */}
          {googleLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">🔍 Recherche des synagogues à proximité…</div>
          )}

          {!googleLoading && externalGoogleResults.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mt-2">🗺️ Autres synagogues à proximité ({externalGoogleResults.length})</p>
              {externalGoogleResults.map((gr, index) => (
                <motion.div
                  key={gr.id}
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (nearbyPartners.length + index) * 0.04 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold bg-muted text-muted-foreground">
                      🕍
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-sm font-bold leading-tight text-foreground">{gr.name}</h4>
                        {(subscribedPlaceNames.has(gr.name) || directory.some(d => d.isSubscribed && d.name === gr.name)) ? (
                          <button
                            onClick={() => handleSubscribePlace(gr)}
                            disabled={subscribing === gr.id}
                            className="shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                            style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                          >
                            {subscribing === gr.id ? "…" : "Se désabonner"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscribePlace(gr)}
                            disabled={subscribing === gr.id}
                            className="shrink-0 rounded-xl border-none px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                            style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", boxShadow: "var(--shadow-gold)" }}
                          >
                            {subscribing === gr.id ? "…" : "+ S'abonner"}
                          </button>
                        )}
                      </div>
                      {gr.address && <p className="mt-1 text-[11px] text-muted-foreground">📍 {gr.address}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-primary/80">📏 {!city._gps ? "≈ " : ""}{formatDistance(gr.distance)}</span>
                        {gr.travelDurationMinutes && (
                          <span className="text-[10px] text-muted-foreground">🚗 {formatTravelTime(gr.travelDurationMinutes)}</span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {gr.distanceSource === "road" ? "route" : "vol d'oiseau"}
                        </span>
                      </div>
                      <VerifiedSuggestionsDisplay placeId={gr.id} />

                      {/* CTA incitant à renseigner les horaires */}
                      {suggestingSynaId !== `gm-${gr.id}` && (
                        <div
                          className="mt-2.5 rounded-xl border border-primary/15 p-3 cursor-pointer transition-all active:scale-[0.98] hover:border-primary/30"
                          style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}
                          onClick={() => setSuggestingSynaId(`gm-${gr.id}`)}
                        >
                          <p className="text-[11px] font-bold text-foreground">🕐 Vous connaissez les horaires de tefila ?</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Renseignez Cha'harit, Min'ha ou Arvit pour aider la communauté !
                          </p>
                          <span
                            className="inline-block mt-1.5 rounded-lg px-3 py-1 text-[10px] font-bold"
                            style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
                          >
                            ✍️ Renseigner les horaires
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex gap-2 flex-wrap">
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${gr.lat},${gr.lon}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all hover:scale-105 active:scale-95">
                          🧭 Itinéraire
                        </a>
                        {gr.phone && (
                          <a href={`tel:${gr.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground no-underline transition-all active:scale-95">
                            📞 Appeler
                          </a>
                        )}
                        <button
                          onClick={() => toast.info("Cette synagogue n'a pas encore activé les dons en ligne. Contactez-la directement.")}
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                          style={{ background: "hsl(var(--gold) / 0.06)", borderColor: "hsl(var(--gold) / 0.2)", color: "hsl(var(--gold-matte))" }}
                        >
                          💛 Faire un don
                        </button>
                      </div>
                      {suggestingSynaId === `gm-${gr.id}` && (
                        <div className="mt-3">
                          <PrayerTimeSuggestionForm
                            synagogueName={gr.name}
                            placeId={gr.id}
                            placeName={gr.name}
                            onClose={() => setSuggestingSynaId(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {!googleLoading && !googleSearched && nearbyPartners.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">🏛️</span>
              <p className="mt-3 text-sm text-muted-foreground">Activez votre GPS pour trouver les synagogues autour de vous.</p>
            </div>
          )}

          {!googleLoading && googleSearched && nearbyPartners.length === 0 && externalGoogleResults.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">🏛️</span>
              <p className="mt-3 text-sm text-muted-foreground">Aucune synagogue trouvée dans un rayon de 100 km.</p>
            </div>
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
      {/* Horaires – prayer times from subscribed synagogues */}
      {tab === "horaires" && (
        <div className="space-y-3">
          {subscribedSynas.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">🕐</span>
              <p className="mt-3 text-sm text-muted-foreground">Abonnez-vous à une synagogue pour voir ses horaires.</p>
            </div>
          ) : subscribedSynas.map((syna, i) => (
            <motion.div key={syna.id} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xl">🏛️</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-bold text-foreground">{syna.name}</h4>
                  {syna.verified && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">✅ Vérifiée</span>
                  )}
                </div>
              </div>
              {(syna.shacharit_time || syna.minha_time || syna.arvit_time) ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Horaires de la semaine</p>
                  <div className="grid grid-cols-3 gap-2">
                    {syna.shacharit_time && (
                      <div className="rounded-xl border border-border bg-muted/50 p-3 text-center">
                        <span className="block text-lg mb-1">🌅</span>
                        <span className="block text-[10px] text-muted-foreground">Cha'harit</span>
                        <span className="block text-sm font-bold text-foreground mt-0.5">{syna.shacharit_time.slice(0, 5)}</span>
                      </div>
                    )}
                    {syna.minha_time && (
                      <div className="rounded-xl border border-border bg-muted/50 p-3 text-center">
                        <span className="block text-lg mb-1">🌇</span>
                        <span className="block text-[10px] text-muted-foreground">Min'ha</span>
                        <span className="block text-sm font-bold text-foreground mt-0.5">{syna.minha_time.slice(0, 5)}</span>
                      </div>
                    )}
                    {syna.arvit_time && (
                      <div className="rounded-xl border border-border bg-muted/50 p-3 text-center">
                        <span className="block text-lg mb-1">🌙</span>
                        <span className="block text-[10px] text-muted-foreground">Arvit</span>
                        <span className="block text-sm font-bold text-foreground mt-0.5">{syna.arvit_time.slice(0, 5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun horaire renseigné par le président.</p>
              )}

              {/* Verified community suggestions */}
              <VerifiedSuggestionsDisplay synagogueId={syna.id} />

              {/* Suggest button */}
              {user && (
                <div className="mt-3">
                  {suggestingSynaId === syna.id ? (
                    <PrayerTimeSuggestionForm
                      synagogueId={syna.id}
                      synagogueName={syna.name}
                      onClose={() => setSuggestingSynaId(null)}
                      onSubmitted={() => setSuggestingSynaId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setSuggestingSynaId(syna.id)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold border border-border bg-muted/30 text-foreground cursor-pointer transition-all hover:bg-muted active:scale-[0.98]"
                    >
                      ✏️ Proposer un horaire
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Tehilim chains */}
      {tab === "tehilim" && (
        <div className="space-y-3">
          {contentLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : tehilimChains.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">📜</span>
              <p className="mt-3 text-sm text-muted-foreground">
                {subscribedCount > 0 ? "Aucune chaîne de Tehilim active." : "Abonnez-vous pour voir les chaînes de Tehilim."}
              </p>
            </div>
          ) : tehilimChains.map((chain, i) => {
            const progress = chain.total_chapters > 0 ? Math.round((chain.completed_chapters / chain.total_chapters) * 100) : 0;
            return (
              <motion.div key={chain.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-sm font-bold text-foreground">{chain.title}</h4>
                    {chain.dedication && <p className="mt-0.5 text-[11px] text-muted-foreground italic">"{chain.dedication}"</p>}
                    {chain.dedication_type && (
                      <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}>
                        {DEDICATION_LABELS[chain.dedication_type] || chain.dedication_type}
                      </span>
                    )}
                  </div>
                  <a href={`/tehilim/${chain.id}`} className="shrink-0 rounded-xl border-none px-3 py-2 text-xs font-bold text-primary-foreground no-underline cursor-pointer transition-all active:scale-95" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
                    Participer
                  </a>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{chain.completed_chapters}/{chain.total_chapters} portions</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--gradient-gold)" }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Urgence Minyan */}
      {tab === "minyan" && (
        <div className="space-y-3">
          {contentLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : minyans.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-4xl">👥</span>
              <p className="mt-3 text-sm text-muted-foreground">
                {subscribedCount > 0 ? "Aucun minyan ouvert actuellement." : "Abonnez-vous pour voir les minyans."}
              </p>
            </div>
          ) : minyans.map((session, i) => {
            const progress = Math.min(100, Math.round((session.current_count / session.target_count) * 100));
            const isFull = session.current_count >= session.target_count;
            return (
              <motion.div key={session.id} className="rounded-2xl border bg-card p-4" style={{ boxShadow: "var(--shadow-card)", borderColor: isFull ? "hsl(var(--gold) / 0.3)" : "hsl(var(--border))" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">{OFFICE_LABELS[session.office_type] || session.office_type}</span>
                      {isFull && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}>✅ Complet</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      📅 {formatDate(session.office_date)} — 🕐 {session.office_time?.slice(0, 5)}
                    </p>
                  </div>
                  <a href={`/minyan/${session.id}`} className="shrink-0 rounded-xl border-none px-3 py-2 text-xs font-bold text-primary-foreground no-underline cursor-pointer transition-all active:scale-95" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
                    Rejoindre
                  </a>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{session.current_count}/{session.target_count} inscrits</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: isFull ? "hsl(var(--gold-matte))" : "var(--gradient-gold)" }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Chat */}
      {tab === "chat" && (
        <div className="space-y-3">
          {!chatSyna ? (
            <>
              <p className="text-sm text-muted-foreground text-center mb-3">Choisissez une synagogue pour discuter :</p>
              {subscribedSynas.map((syna) => (
                <button
                  key={syna.id}
                  onClick={() => setChatSyna({ id: syna.id, name: syna.name })}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer text-left"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xl">🏛️</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-sm font-bold text-foreground">{syna.name}</h4>
                    <p className="text-[10px] text-muted-foreground">💬 Ouvrir le chat</p>
                  </div>
                  <span className="text-xs text-muted-foreground">→</span>
                </button>
              ))}
            </>
          ) : (
            <div>
              <button
                onClick={() => setChatSyna(null)}
                className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3"
              >
                ← Retour aux synagogues
              </button>
              <SynagogueChat synagogueId={chatSyna.id} synagogueName={chatSyna.name} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default FideleSynagogueView;
