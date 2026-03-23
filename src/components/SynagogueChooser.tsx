import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { fetchNearbySynagogues, formatDistance, type SynagogueResult } from "@/lib/synagogues";
import { toast } from "sonner";
import { MapPin, Search, X, Navigation, CheckCircle2, Clock, Loader2, Pencil } from "lucide-react";
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

/* ── Custom marker icon ── */
const synagogueIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(40,80%,42%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="font-size:14px;">🕍</span></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

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

/* ── Map recenter helper ── */
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 14); }, [lat, lng, map]);
  return null;
};

/* ── Map Component (Leaflet/OSM) ── */
const MapView = ({ items, onSelect, userLat, userLng }: {
  items: SynaItem[];
  onSelect: (id: string) => void;
  userLat: number;
  userLng: number;
}) => (
  <MapContainer
    center={[userLat, userLng]}
    zoom={14}
    className="h-full w-full rounded-2xl overflow-hidden"
    style={{ minHeight: "250px" }}
    zoomControl={false}
    attributionControl={false}
  >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <RecenterMap lat={userLat} lng={userLng} />

    {/* User position */}
    <CircleMarker center={[userLat, userLng]} radius={8} pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 1, weight: 3 }} />

    {/* Synagogue markers */}
    {items.map(item => {
      const lat = item.source === "partner" ? item.latitude! : item.lat;
      const lng = item.source === "partner" ? item.longitude! : item.lon;
      if (!lat || !lng) return null;
      const next = item.source === "partner" ? getNextOffice(item) : null;
      return (
        <Marker key={item.id} position={[lat, lng]} icon={synagogueIcon} eventHandlers={{ click: () => onSelect(item.id) }}>
          <Popup>
            <div style={{ fontFamily: "system-ui", padding: "2px 0" }}>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.name}</div>
              {next && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{next.label} · {next.time}</div>}
            </div>
          </Popup>
        </Marker>
      );
    })}
  </MapContainer>
);

/* ── Main Component ── */
interface Props {
  onSelect?: () => void;
}

const SynagogueChooser = ({ onSelect }: Props) => {
  const { user } = useAuth();
  const { city, geolocate, isGeolocating } = useCity();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      .filter((s) => s.dist <= 15000)
      .sort((a, b) => a.dist - b.dist);

    setPartners(dbPartners);

    try {
      const results = await fetchNearbySynagogues(lat, lng);
      const deduped = results
        .filter(r => r.distance <= 15000)
        .filter(r => !dbPartners.some(p => p.latitude && p.longitude && haversine(p.latitude, p.longitude, r.lat, r.lon) < 100))
        .map(r => ({ ...r, source: "google" as const }));
      setExternals(deduped);
    } catch { setExternals([]); }

    setLoading(false);
  }, [city.lat, city.lng]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allItems: SynaItem[] = useMemo(() => {
    let list: SynaItem[] = [...partners, ...externals];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.address && s.address.toLowerCase().includes(q)));
    }
    if (filters.includes("proche")) list = list.filter(s => (s.source === "partner" ? s.dist : s.distance) <= 2000);
    if (filters.includes("verifie")) list = list.filter(s => s.source === "partner" && s.verified);
    if (filters.includes("ouvert")) list = list.filter(s => s.source === "partner" && getNextOffice(s) !== null);
    list.sort((a, b) => (a.source === "partner" ? a.dist : a.distance) - (b.source === "partner" ? b.dist : b.distance));
    return list;
  }, [partners, externals, search, filters]);

  const toggleFilter = (f: FilterChip) => setFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubscribe = async (synaId: string) => {
    if (!user) { toast.error("Connectez-vous pour choisir une synagogue"); return; }
    setSubscribing(synaId);
    await supabase.from("synagogue_subscriptions").delete().eq("user_id", user.id);
    await supabase.from("synagogue_subscriptions").insert({ user_id: user.id, synagogue_id: synaId } as any);
    toast.success("🏛️ Synagogue définie ! Bienvenue dans votre communauté.");
    setSubscribing(null);
    onSelect?.();
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

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? "Recherche en cours..." : `${allItems.length} synagogue${allItems.length > 1 ? "s" : ""} trouvée${allItems.length > 1 ? "s" : ""}`}
        </p>
        {city.name && <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{city.name}</span>}
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
                      <span className="text-xs font-semibold" style={{ color: "hsl(var(--gold-matte))" }}>{formatDistance(dist)}</span>
                      {item.address && <span className="text-[11px] text-muted-foreground truncate">· {item.address}</span>}
                    </div>
                    {fresh && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: fresh.color }} />
                        <span className="text-[10px] font-medium" style={{ color: fresh.color }}>{fresh.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : editKey); }}
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-all active:scale-95"
                    style={{
                      background: isEditing ? "hsl(var(--gold) / 0.12)" : "hsl(var(--muted) / 0.5)",
                      borderColor: isEditing ? "hsl(var(--gold) / 0.3)" : "hsl(var(--border))",
                    }}
                    title="Modifier les horaires"
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: isEditing ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))" }} />
                  </button>
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

                  {isPartner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSubscribe(item.id); }}
                      disabled={subscribing === item.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all active:scale-95 text-primary-foreground shrink-0 disabled:opacity-50"
                      style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                    >
                      {subscribing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ma Synagogue"}
                    </button>
                  )}
                </div>

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
                        onSubmitted={() => fetchData()}
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
