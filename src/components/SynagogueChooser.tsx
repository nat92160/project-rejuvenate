import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { fetchNearbySynagogues, formatDistance, type SynagogueResult } from "@/lib/synagogues";
import { toast } from "sonner";
import { MapPin, Search, X, Navigation, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import PrayerTimeSuggestionForm from "./PrayerTimeSuggestionForm";

/* ── Types ── */
interface PartnerSyna {
  id: string;
  name: string;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  dist: number;
  source: "partner";
  updated_at?: string;
}

interface ExternalSyna {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  distance: number;
  phone?: string;
  travelDurationMinutes?: number;
  source: "google";
}

type SynaItem = PartnerSyna | ExternalSyna;
type FilterChip = "proche" | "verifie" | "ouvert";

/* ── Helpers ── */
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function getNextOffice(s: { shacharit_time?: string | null; minha_time?: string | null; arvit_time?: string | null }): { label: string; time: string } | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const offices = [
    { key: "shacharit_time" as const, label: "Cha'harit" },
    { key: "minha_time" as const, label: "Min'ha" },
    { key: "arvit_time" as const, label: "Arvit" },
  ];
  for (const o of offices) {
    const t = (s as any)[o.key] as string | null;
    if (t && t > hhmm) return { label: o.label, time: t };
  }
  for (const o of offices) {
    const t = (s as any)[o.key] as string | null;
    if (t) return { label: `${o.label} (demain)`, time: t };
  }
  return null;
}

function freshnessBadge(updatedAt?: string): { text: string; color: string } {
  if (!updatedAt) return { text: "Non vérifié", color: "hsl(var(--muted-foreground) / 0.5)" };
  const diff = Date.now() - new Date(updatedAt).getTime();
  const hours = diff / 3600000;
  if (hours < 24) return { text: `Vérifié il y a ${Math.max(1, Math.round(hours))}h`, color: "hsl(142 70% 45%)" };
  const days = Math.round(hours / 24);
  if (days <= 7) return { text: `Mis à jour il y a ${days}j`, color: "hsl(38 92% 50%)" };
  return { text: `Mis à jour il y a ${days}j`, color: "hsl(var(--muted-foreground) / 0.5)" };
}

/* ── Skeleton ── */
const CardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
    <div className="mt-3 h-10 rounded-xl bg-muted" />
  </div>
);

const MapView = ({ userLat, userLng }: {
  items: SynaItem[];
  onSelect: (id: string) => void;
  userLat: number;
  userLng: number;
}) => {
  const bbox = 0.015;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${userLng - bbox},${userLat - bbox},${userLng + bbox},${userLat + bbox}&layer=mapnik&marker=${userLat},${userLng}`;
  return (
    <iframe
      src={src}
      className="h-full w-full rounded-2xl border-0"
      style={{ minHeight: "250px" }}
      loading="lazy"
      title="Carte"
    />
  );
};

/* ── Main Component ── */
interface Props {
  onSelect?: () => void;
}

const SynagogueChooser = ({ onSelect }: Props) => {
  const { user } = useAuth();
  const { city, geolocate, isGeolocating } = useCity();
  const { subIds } = useSubscribedSynaIds();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("confirmed_synas_today") || "{}");
      if (stored.date === new Date().toDateString()) return new Set(stored.ids || []);
    } catch {}
    return new Set();
  });

  const markConfirmed = (id: string) => {
    setConfirmedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("confirmed_synas_today", JSON.stringify({ date: new Date().toDateString(), ids: [...next] }));
      return next;
    });
  };

  // Data
  const [partners, setPartners] = useState<PartnerSyna[]>([]);
  const [externals, setExternals] = useState<ExternalSyna[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const lat = city.lat;
    const lng = city.lng;

    const { data: allSynas } = await supabase
      .from("synagogue_profiles")
      .select("id, name, shacharit_time, minha_time, arvit_time, address, latitude, longitude, verified, updated_at")
      .neq("name", "");

    const dbPartners: PartnerSyna[] = (allSynas || [])
      .filter((s: any) => s.latitude && s.longitude)
      .map((s: any) => ({ ...s, dist: haversine(lat, lng, s.latitude, s.longitude), source: "partner" as const }))
      .filter((s) => s.dist <= 100000)
      .sort((a, b) => a.dist - b.dist);

    setPartners(dbPartners);

    try {
      const results = await fetchNearbySynagogues(lat, lng);
      const deduped = results
        .filter(r => r.distance <= 100000)
        .filter(r => !dbPartners.some(p => p.latitude && p.longitude && haversine(p.latitude, p.longitude, r.lat, r.lon) < 100))
        .map(r => ({ ...r, source: "google" as const }));
      setExternals(deduped);
    } catch { setExternals([]); }

    setLoading(false);
  }, [city.lat, city.lng]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Note: GPS prompt is handled centrally by triggerAutoGeo() in Index.tsx
  // to avoid duplicate browser geolocation prompts.

  const allItems: SynaItem[] = useMemo(() => {
    // Tri STRICT par distance — aucune priorité partenaire/Google
    const getDist = (s: SynaItem) => s.source === "partner" ? s.dist : s.distance;
    let list: SynaItem[] = [...partners, ...externals].sort((a, b) => getDist(a) - getDist(b));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.address && s.address.toLowerCase().includes(q)));
    }
    if (filters.includes("proche")) list = list.filter(s => getDist(s) <= 2000);
    if (filters.includes("verifie")) list = list.filter(s => s.source === "partner" && s.verified);
    if (filters.includes("ouvert")) list = list.filter(s => s.source === "partner" && getNextOffice(s) !== null);
    return list;
  }, [partners, externals, search, filters]);

  const toggleFilter = (f: FilterChip) => setFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubscribe = async (synaId: string) => {
    if (!user) { toast.error("Connectez-vous pour choisir une synagogue"); return; }
    setSubscribing(synaId);
    if (subIds.includes(synaId)) {
      await supabase.from("synagogue_subscriptions").delete().eq("user_id", user.id).eq("synagogue_id", synaId);
      toast.success("Désabonné de cette synagogue");
    } else {
      await supabase.from("synagogue_subscriptions").insert({ user_id: user.id, synagogue_id: synaId } as any);
      toast.success("🏛️ Abonné ! Vous recevrez les actualités de cette synagogue.");
    }
    setSubscribing(null);
    onSelect?.();
  };

  const [subscribedPlaceNames, setSubscribedPlaceNames] = useState<Set<string>>(new Set());

  const handleSubscribePlace = async (place: ExternalSyna) => {
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
    }
    setSubscribing(null);
    onSelect?.();
  };

  const isPlaceSubscribed = (item: SynaItem) => {
    if (item.source === "partner") return subIds.includes(item.id);
    return subscribedPlaceNames.has(item.name);
  };

  const scrollToCard = (id: string) => {
    setSelectedId(id);
    const el = document.getElementById(`syna-card-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const chipData: { id: FilterChip; label: string; icon: string }[] = [
    { id: "proche", label: "< 2 km", icon: "📍" },
    { id: "verifie", label: "Vérifié", icon: "✅" },
    { id: "ouvert", label: "Prochain office", icon: "🕐" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-3 -mx-5 px-5 pt-1">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou ville..."
            className="w-full h-11 pl-10 pr-10 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none cursor-pointer">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {chipData.map(c => (
            <button
              key={c.id}
              onClick={() => toggleFilter(c.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap border cursor-pointer transition-all active:scale-95"
              style={{
                background: filters.includes(c.id) ? "hsl(var(--gold) / 0.12)" : "hsl(var(--card))",
                borderColor: filters.includes(c.id) ? "hsl(var(--gold) / 0.3)" : "hsl(var(--border))",
                color: filters.includes(c.id) ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
              }}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
          {!city._gps && (
            <button
              onClick={geolocate}
              disabled={isGeolocating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap border border-primary/20 bg-primary/5 text-primary cursor-pointer transition-all active:scale-95"
            >
              <Navigation className="w-3 h-3" /> {isGeolocating ? "..." : "Ma position"}
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-[280px] rounded-2xl overflow-hidden border border-border">
        {loading ? (
          <div className="h-full rounded-2xl bg-muted/30 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : (
          <MapView items={allItems} onSelect={scrollToCard} userLat={city.lat} userLng={city.lng} />
        )}
      </div>

      {/* Results count + GPS accuracy notice */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? "Recherche en cours..." : `${allItems.length} synagogue${allItems.length > 1 ? "s" : ""} trouvée${allItems.length > 1 ? "s" : ""}`}
          </p>
          {city.name && <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{city.name}</span>}
        </div>
        {!city._gps && !loading && allItems.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
            style={{ background: "hsl(38 92% 50% / 0.08)", color: "hsl(38 92% 50%)" }}
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span>
              Distances approximatives (centre de {city.name?.replace("📍 ", "")}).{" "}
              <button
                onClick={geolocate}
                disabled={isGeolocating}
                className="font-bold underline cursor-pointer bg-transparent border-none p-0"
                style={{ color: "inherit" }}
              >
                {isGeolocating ? "Localisation..." : "Activer le GPS"}
              </button>{" "}
              pour des distances précises.
            </span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 pb-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : allItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">Aucune synagogue trouvée</p>
            <p className="text-xs text-muted-foreground mt-1">Essayez d'élargir votre recherche</p>
          </div>
        ) : (
          allItems.map(item => {
            const isPartner = item.source === "partner";
            const dist = isPartner ? item.dist : item.distance;
            const next = isPartner ? getNextOffice(item) : null;
            const fresh = isPartner ? freshnessBadge(item.updated_at) : null;
            const isSelected = selectedId === item.id;
            const isEditing = editingId === item.id || editingId === `gm-${item.id}`;
            const editKey = isPartner ? item.id : `gm-${item.id}`;
            const isMySyna = subIds.includes(item.id);

            // Check if stale (>7 days)
            const isStale = isPartner && item.updated_at
              ? (Date.now() - new Date(item.updated_at).getTime()) > 7 * 86400000
              : !isPartner;

            return (
              <motion.div
                key={item.id}
                id={`syna-card-${item.id}`}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border bg-card p-4 transition-all ${isSelected ? "border-primary/40 ring-2 ring-primary/10" : "border-border"}`}
                style={{ boxShadow: "var(--shadow-card)" }}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: "hsl(var(--gold) / 0.08)" }}>
                    🕍
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">{item.name}</h4>
                      {isPartner && item.verified && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 70% 45%)" }} />}
                      {isPartner && !item.verified && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Non vérifié</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold" style={{ color: "hsl(var(--gold-matte))" }}>
                        {!city._gps ? "≈ " : ""}{formatDistance(dist)}
                      </span>
                      {item.address && <span className="text-[11px] text-muted-foreground truncate">· {item.address}</span>}
                    </div>
                    {fresh && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: fresh.color }} />
                        <span className="text-[10px] font-medium" style={{ color: fresh.color }}>{fresh.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next office + Subscribe */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  {next ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--gold) / 0.04)" }}>
                      <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--gold-matte))" }} />
                      <span className="text-xs font-semibold text-foreground">{next.label}</span>
                      <span className="text-sm font-extrabold tabular-nums" style={{ color: "hsl(var(--gold-matte))" }}>{next.time}</span>
                    </div>
                  ) : <div />}

                  {isPlaceSubscribed(item) ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); isPartner ? handleSubscribe(item.id) : handleSubscribePlace(item as ExternalSyna); }}
                      disabled={subscribing === item.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-50"
                      style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                    >
                      {subscribing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Se désabonner"}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); isPartner ? handleSubscribe(item.id) : handleSubscribePlace(item as ExternalSyna); }}
                      disabled={subscribing === item.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-50 text-primary-foreground"
                      style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                    >
                      {subscribing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "+ S'abonner"}
                    </button>
                  )}
                </div>

                {/* Donation button — visible on all synagogues */}
                {isPartner ? (
                  <a
                    href={`/don/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold no-underline text-primary-foreground transition-all active:scale-[0.98]"
                    style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                  >
                    💛 Faire un don
                  </a>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Cette synagogue n'a pas encore activé les dons en ligne. Contactez-la directement.");
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all active:scale-[0.98]"
                    style={{ background: "hsl(var(--gold) / 0.06)", borderColor: "hsl(var(--gold) / 0.2)", color: "hsl(var(--gold-matte))" }}
                  >
                    💛 Faire un don
                  </button>
                )}


                {/* Edit horaires button */}
                {confirmedIds.has(editKey) ? (
                  <div className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "hsl(142 70% 45% / 0.08)", color: "hsl(142 70% 40%)", border: "1px solid hsl(142 70% 45% / 0.2)" }}>
                    ✅ Confirmé par vous aujourd'hui ✨
                  </div>
                ) : (
                  <div className="mt-3 space-y-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : editKey); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
                      style={
                        isMySyna
                          ? {
                              background: "hsl(var(--gold) / 0.1)",
                              borderColor: "hsl(var(--gold) / 0.3)",
                              color: "hsl(var(--gold-matte))",
                            }
                          : isStale
                            ? {
                                background: "hsl(var(--gold) / 0.06)",
                                borderColor: "hsl(var(--gold) / 0.2)",
                                color: "hsl(var(--gold-matte))",
                              }
                            : {
                                background: "transparent",
                                borderColor: "hsl(var(--border))",
                                color: "hsl(var(--muted-foreground))",
                              }
                      }
                    >
                      {isMySyna
                        ? "🏛️ Mettre à jour ma synagogue"
                        : isStale && next
                          ? `👥 Est-ce toujours à ${next.time} ?`
                          : isStale
                            ? "👥 Confirmer l'horaire pour la communauté"
                            : "🤍 Aider à mettre à jour"}
                    </button>
                    {isStale && (
                      <p className="text-[9px] text-center text-muted-foreground/60">⭐ Gagnez des points contributeur en confirmant</p>
                    )}
                  </div>
                )}

                {/* Inline suggestion form */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <PrayerTimeSuggestionForm
                        synagogueId={isPartner ? item.id : undefined}
                        synagogueName={item.name}
                        placeId={!isPartner ? item.id : undefined}
                        placeName={!isPartner ? item.name : undefined}
                        onClose={() => setEditingId(null)}
                        onSubmitted={() => { markConfirmed(editKey); fetchData(); }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default SynagogueChooser;
