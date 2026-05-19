import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Droplets, Phone, MapPin, Save, CalendarDays, Trash2 } from "lucide-react";

interface Reservation {
  id: string;
  slot_date: string;
  slot_time: string;
  display_name: string;
  phone: string;
  notes: string;
  user_id: string;
}

const DAYS_FR = [
  { v: 0, label: "Dim" },
  { v: 1, label: "Lun" },
  { v: 2, label: "Mar" },
  { v: 3, label: "Mer" },
  { v: 4, label: "Jeu" },
  { v: 5, label: "Ven" },
  { v: 6, label: "Sam" },
];

const MikveManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [winterHours, setWinterHours] = useState("");
  const [summerHours, setSummerHours] = useState("");
  const [phone, setPhone] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [resvEnabled, setResvEnabled] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [slotCapacity, setSlotCapacity] = useState(1);
  const [openDays, setOpenDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [openStart, setOpenStart] = useState("19:00");
  const [openEnd, setOpenEnd] = useState("22:00");
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await (supabase
        .from("synagogue_profiles")
        .select("id, mikve_enabled, mikve_winter_hours, mikve_summer_hours, mikve_phone, mikve_maps_link, mikve_reservation_enabled, mikve_slot_duration_min, mikve_slot_capacity, mikve_open_days, mikve_open_start, mikve_open_end") as any)
        .eq("president_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const data = rows && rows[0];
      if (data) {
        setProfileId(data.id);
        setEnabled(data.mikve_enabled || false);
        setWinterHours(data.mikve_winter_hours || "");
        setSummerHours(data.mikve_summer_hours || "");
        setPhone(data.mikve_phone || "");
        setMapsLink(data.mikve_maps_link || "");
        setResvEnabled(!!data.mikve_reservation_enabled);
        setSlotDuration(data.mikve_slot_duration_min || 30);
        setSlotCapacity(data.mikve_slot_capacity || 1);
        setOpenDays(Array.isArray(data.mikve_open_days) ? data.mikve_open_days : [0, 1, 2, 3, 4]);
        setOpenStart((data.mikve_open_start || "19:00").slice(0, 5));
        setOpenEnd((data.mikve_open_end || "22:00").slice(0, 5));
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await (supabase
        .from("mikve_reservations")
        .select("id, slot_date, slot_time, display_name, phone, notes, user_id") as any)
        .eq("synagogue_id", profileId)
        .gte("slot_date", today)
        .order("slot_date", { ascending: true })
        .order("slot_time", { ascending: true });
      setReservations((data || []) as Reservation[]);
    })();
  }, [profileId, saving]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await (supabase
      .from("synagogue_profiles")
      .update({
        mikve_enabled: enabled,
        mikve_winter_hours: winterHours || null,
        mikve_summer_hours: summerHours || null,
        mikve_phone: phone || null,
        mikve_maps_link: mapsLink || null,
        mikve_reservation_enabled: resvEnabled,
        mikve_slot_duration_min: slotDuration,
        mikve_slot_capacity: slotCapacity,
        mikve_open_days: openDays,
        mikve_open_start: openStart,
        mikve_open_end: openEnd,
      } as any) as any)
      .eq("id", profileId);
    setSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Module Mikvé mis à jour ✓");
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("Supprimer cette réservation ?")) return;
    const { error } = await supabase.from("mikve_reservations").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    setReservations((prev) => prev.filter((r) => r.id !== id));
    toast.success("Réservation supprimée");
  };

  const toggleDay = (v: number) => {
    setOpenDays((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v].sort());
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>;
  if (!profileId) return <div className="text-center py-8 text-muted-foreground text-sm">Créez d'abord votre profil synagogue.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Droplets className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Mikvé</h3>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Activer le module Mikvé</p>
          <p className="text-xs text-muted-foreground">Visible par vos fidèles si activé</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">🧊 Horaires Hiver</Label>
            <Input placeholder="Ex: Dim-Jeu 19h-22h" value={winterHours} onChange={(e) => setWinterHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">☀️ Horaires Été</Label>
            <Input placeholder="Ex: Dim-Jeu 20h-23h" value={summerHours} onChange={(e) => setSummerHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone responsable</Label>
            <Input placeholder="06 xx xx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Lien Google Maps</Label>
            <Input placeholder="https://maps.google.com/..." value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
          </div>
        </div>
      )}

      {/* Reservations module */}
      {enabled && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Réservations en ligne</p>
                <p className="text-xs text-muted-foreground">Permettre aux fidèles de réserver un créneau</p>
              </div>
            </div>
            <Switch checked={resvEnabled} onCheckedChange={setResvEnabled} />
          </div>

          {resvEnabled && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Jours d'ouverture</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_FR.map((d) => {
                    const active = openDays.includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => toggleDay(d.v)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                          active ? "text-white border-transparent" : "bg-background text-muted-foreground border-border"
                        }`}
                        style={active ? { background: "var(--gradient-gold)" } : {}}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Début</Label>
                  <Input type="time" value={openStart} onChange={(e) => setOpenStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Fin</Label>
                  <Input type="time" value={openEnd} onChange={(e) => setOpenEnd(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Durée (min)</Label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                  >
                    {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} min</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Capacité / créneau</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>

      {/* Reservations list */}
      {resvEnabled && (
        <div className="space-y-3">
          <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Réservations à venir ({reservations.length})
          </h4>
          {reservations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune réservation pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {reservations.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{r.display_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.slot_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {r.slot_time.slice(0, 5)}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteReservation(r.id)}
                    className="p-2 rounded-lg text-destructive bg-destructive/10 border-none cursor-pointer"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MikveManager;
