import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Check, Loader2, X } from "lucide-react";

interface MikveConfig {
  mikve_reservation_enabled: boolean;
  mikve_slot_duration_min: number;
  mikve_slot_capacity: number;
  mikve_open_days: number[];
  mikve_open_start: string;
  mikve_open_end: string;
}

interface Reservation {
  id: string;
  slot_date: string;
  slot_time: string;
}

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const toHM = (t: string) => t.slice(0, 5);

const generateSlots = (startHM: string, endHM: string, duration: number) => {
  const [sh, sm] = startHM.split(":").map(Number);
  const [eh, em] = endHM.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out: string[] = [];
  for (let m = startMin; m + duration <= endMin; m += duration) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
  }
  return out;
};

interface Props {
  synagogueId: string;
}

const MikveBookingWidget = ({ synagogueId }: Props) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<MikveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [bookingSlot, setBookingSlot] = useState<{ date: string; time: string } | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase
        .from("synagogue_profiles")
        .select("mikve_reservation_enabled, mikve_slot_duration_min, mikve_slot_capacity, mikve_open_days, mikve_open_start, mikve_open_end") as any)
        .eq("id", synagogueId)
        .maybeSingle();
      setConfig(data as MikveConfig | null);
      setLoading(false);
    })();
  }, [synagogueId]);

  // Build next 14 days that match open_days
  const upcomingDates = useMemo(() => {
    if (!config) return [] as Date[];
    const set = new Set(config.mikve_open_days || []);
    const out: Date[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 21 && out.length < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (set.has(d.getDay())) out.push(d);
    }
    return out;
  }, [config]);

  const refreshData = async () => {
    if (!config || upcomingDates.length === 0) return;
    const from = upcomingDates[0].toISOString().slice(0, 10);
    const to = upcomingDates[upcomingDates.length - 1].toISOString().slice(0, 10);
    const [{ data: avail }, { data: mine }] = await Promise.all([
      (supabase.rpc as any)("get_mikve_availability", { _synagogue_id: synagogueId, _from: from, _to: to }),
      user
        ? (supabase.from("mikve_reservations").select("id, slot_date, slot_time") as any)
            .eq("synagogue_id", synagogueId)
            .gte("slot_date", from)
            .lte("slot_date", to)
        : Promise.resolve({ data: [] }),
    ]);
    const map = new Map<string, number>();
    (avail || []).forEach((r: any) => map.set(`${r.slot_date}|${toHM(r.slot_time)}`, Number(r.booked_count)));
    setAvailability(map);
    setMyReservations((mine || []) as Reservation[]);
  };

  useEffect(() => { void refreshData(); /* eslint-disable-next-line */ }, [config, upcomingDates.length, synagogueId, user?.id]);

  if (loading) {
    return <div className="text-center py-6 text-muted-foreground text-sm">Chargement…</div>;
  }
  if (!config?.mikve_reservation_enabled) return null;

  const selectedDate = upcomingDates[selectedDateIdx];
  const dateKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : "";
  const slots = generateSlots(config.mikve_open_start, config.mikve_open_end, config.mikve_slot_duration_min);
  const capacity = Math.max(1, config.mikve_slot_capacity);

  const isMine = (date: string, time: string) =>
    myReservations.some((r) => r.slot_date === date && toHM(r.slot_time) === toHM(time));

  const handleBook = async () => {
    if (!bookingSlot || !user) return;
    if (!bookingName.trim()) { toast.error("Votre prénom est requis"); return; }
    setSubmitting(true);
    // Une seule réservation active par utilisateur : on annule les précédentes
    await supabase
      .from("mikve_reservations")
      .delete()
      .eq("synagogue_id", synagogueId)
      .eq("user_id", user.id);
    const { error } = await (supabase.from("mikve_reservations").insert({
      synagogue_id: synagogueId,
      slot_date: bookingSlot.date,
      slot_time: bookingSlot.time,
      user_id: user.id,
      display_name: bookingName.trim(),
      phone: bookingPhone.trim(),
    }) as any);
    setSubmitting(false);
    if (error) { toast.error("Erreur lors de la réservation"); return; }
    toast.success("✓ Créneau réservé");
    // Notify president + adjoint (fire-and-forget)
    try {
      const { data: sp } = await (supabase
        .from("synagogue_profiles")
        .select("president_id, adjoint_id, name") as any)
        .eq("id", synagogueId)
        .maybeSingle();
      const targets = [sp?.president_id, sp?.adjoint_id].filter(Boolean) as string[];
      if (targets.length > 0) {
        const dateLabel = new Date(bookingSlot.date + "T00:00:00").toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long",
        });
        void supabase.functions.invoke("send-push", {
          body: {
            user_ids: targets,
            title: "🛁 Nouvelle réservation Mikvé",
            body: `${bookingName.trim()} — ${dateLabel} à ${toHM(bookingSlot.time)}${sp?.name ? ` (${sp.name})` : ""}`,
            sender_id: user.id,
          },
        });
      }
    } catch { /* silent */ }
    setBookingSlot(null);
    setBookingName("");
    setBookingPhone("");
    await refreshData();
  };

  const handleCancel = async (resId: string) => {
    if (!confirm("Annuler cette réservation ?")) return;
    const { error } = await supabase.from("mikve_reservations").delete().eq("id", resId);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Réservation annulée");
    await refreshData();
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h4 className="font-display text-base font-bold text-foreground">Réserver un créneau</h4>
      </div>

      {/* Date carousel */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {upcomingDates.map((d, i) => {
          const active = i === selectedDateIdx;
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDateIdx(i)}
              className={`shrink-0 snap-start rounded-2xl px-3 py-2 min-w-[68px] border transition-all ${
                active ? "text-white border-transparent" : "bg-card text-foreground border-border"
              }`}
              style={active ? { background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" } : {}}
            >
              <div className={`text-[10px] font-bold uppercase ${active ? "opacity-90" : "text-muted-foreground"}`}>
                {DAYS_FR[d.getDay()]}
              </div>
              <div className="text-lg font-display font-bold leading-tight">{d.getDate()}</div>
              <div className={`text-[10px] ${active ? "opacity-90" : "text-muted-foreground"}`}>
                {MONTHS_FR[d.getMonth()]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Slots grid */}
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucun créneau configuré.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((t) => {
            const booked = availability.get(`${dateKey}|${toHM(t)}`) || 0;
            const full = booked >= capacity;
            const mine = isMine(dateKey, t);
            const myRes = myReservations.find((r) => r.slot_date === dateKey && toHM(r.slot_time) === toHM(t));
            const othersBooked = booked > 0 && !mine;
            return (
              <button
                key={t}
                disabled={full && !mine}
                onClick={() => {
                  if (mine && myRes) return handleCancel(myRes.id);
                  if (!user) { toast.error("Connectez-vous pour réserver"); return; }
                  setBookingSlot({ date: dateKey, time: t });
                }}
                className={`relative rounded-xl py-3 px-2 text-sm font-bold border transition-all ${
                  mine
                    ? "border-transparent text-white"
                    : othersBooked && full
                      ? "border-transparent text-white cursor-not-allowed"
                      : othersBooked
                        ? "border-transparent text-white"
                        : "bg-card text-foreground border-border hover:border-primary/40 active:scale-95"
                }`}
                style={
                  mine
                    ? { background: "linear-gradient(135deg, #22c55e, #15803d)" }
                    : othersBooked
                      ? { background: "linear-gradient(135deg, #ef4444, #b91c1c)" }
                      : {}
                }
              >
                <div className="text-base">{toHM(t)}</div>
                <div className="text-[10px] mt-0.5 font-medium opacity-80">
                  {mine ? "✓ Vous" : othersBooked ? "Réservé" : "Libre"}
                </div>
                {mine && (
                  <X className="absolute top-1 right-1 w-3 h-3 opacity-80" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Les noms des autres participants restent confidentiels.
      </p>

      {/* Booking modal */}
      <AnimatePresence>
        {bookingSlot && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setBookingSlot(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card p-5 border border-border"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-foreground">Confirmer la réservation</h3>
                <button onClick={() => setBookingSlot(null)} className="text-muted-foreground p-1 border-none bg-transparent cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(bookingSlot.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à <span className="font-bold text-foreground">{toHM(bookingSlot.time)}</span>
              </p>
              <div className="space-y-3">
                <input
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="Prénom"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[48px]"
                  style={{ fontSize: "16px" }}
                  autoFocus
                />
                <input
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="Téléphone (optionnel)"
                  inputMode="tel"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[48px]"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <button
                onClick={handleBook}
                disabled={submitting}
                className="mt-4 w-full py-3 rounded-xl text-sm font-bold border-none cursor-pointer text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "var(--gradient-gold)" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? "Réservation…" : "Confirmer"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MikveBookingWidget;