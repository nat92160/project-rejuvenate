import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";

interface Campaign {
  id: string;
  refoua_id: string;
  created_by: string;
  title: string;
  prayer_type: string;
  days_count: number;
  slots_per_day: number;
  start_date: string;
}

interface Slot {
  id: string;
  campaign_id: string;
  day_number: number;
  slot_index: number;
  user_id: string;
  display_name: string;
}

interface Props {
  refouaId: string;
  hebrewName: string;
  motherName?: string;
  gender?: "ben" | "bat";
}

const PRAYER_TYPES = [
  { value: "tehilim_full", label: "📖 Tehilim complet" },
  { value: "nichmat", label: "✨ Nichmat Kol Hai" },
  { value: "psaumes_choisis", label: "📜 Psaumes choisis" },
  { value: "priere_libre", label: "🙏 Prière libre" },
];

const formatFrenchName = (
  name: string,
  gender: "ben" | "bat" = "ben",
  motherName?: string,
) => (motherName ? `${name} ${gender === "bat" ? "bat" : "ben"} ${motherName}` : name);

const RefouaCampaignPlanner = ({ refouaId, hebrewName, motherName, gender = "ben" }: Props) => {
  const { user } = useAuth();
  const fullName = formatFrenchName(hebrewName, gender, motherName);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [prayerType, setPrayerType] = useState("tehilim_full");
  const [daysCount, setDaysCount] = useState(7);
  const [slotsPerDay, setSlotsPerDay] = useState(10);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const load = async () => {
      const { data: camps } = await supabase
        .from("refoua_campaigns")
        .select("*")
        .eq("refoua_id", refouaId)
        .order("created_at", { ascending: false })
        .limit(1);
      const c = (camps as Campaign[] | null)?.[0] || null;
      setCampaign(c);
      if (c) {
        const { data: s } = await supabase
          .from("refoua_campaign_slots")
          .select("*")
          .eq("campaign_id", c.id);
        setSlots((s as Slot[]) || []);
      }
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`refoua-campaign-${refouaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "refoua_campaigns", filter: `refoua_id=eq.${refouaId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "refoua_campaign_slots" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refouaId]);

  const getDisplayName = async () => {
    if (!user) return "";
    const { data } = await supabase
      .from("profiles")
      .select("display_name, first_name")
      .eq("user_id", user.id)
      .maybeSingle();
    return (data?.first_name || data?.display_name || "Anonyme").toString();
  };

  const createCampaign = async () => {
    if (!user) {
      toast.error("Connectez-vous pour créer un programme");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("refoua_campaigns").insert({
      refoua_id: refouaId,
      created_by: user.id,
      prayer_type: prayerType,
      days_count: daysCount,
      slots_per_day: slotsPerDay,
      start_date: startDate,
      title: `Refoua ${fullName}`,
    } as any);
    setCreating(false);
    if (error) {
      toast.error("Erreur lors de la création");
      console.error(error);
    } else {
      toast.success("✅ Programme créé !");
    }
  };

  const claimSlot = async (dayNumber: number, slotIndex: number) => {
    if (!user) {
      toast.error("Connectez-vous pour participer");
      return;
    }
    if (!campaign) return;
    const defaultName = await getDisplayName();
    const input = window.prompt(
      `Prénom de la personne qui s'engage pour ce créneau (jour ${dayNumber}) :`,
      defaultName,
    );
    if (input === null) return; // cancelled
    const display_name = (input.trim() || defaultName || "Anonyme").slice(0, 60);
    const { error } = await supabase.from("refoua_campaign_slots").insert({
      campaign_id: campaign.id,
      day_number: dayNumber,
      slot_index: slotIndex,
      user_id: user.id,
      display_name,
    } as any);
    if (error) {
      toast.error("Créneau déjà pris");
      return;
    }
    // Lien avec le décompte du jour (refoua_actions)
    const dayDate = (() => {
      const d = new Date(campaign.start_date);
      d.setDate(d.getDate() + (dayNumber - 1));
      return d.toISOString().slice(0, 10);
    })();
    if (campaign.prayer_type === "tehilim_full") {
      const perSlot = Math.ceil(150 / campaign.slots_per_day);
      const start = (slotIndex - 1) * perSlot + 1;
      const end = Math.min(slotIndex * perSlot, 150);
      const rows = [];
      for (let n = start; n <= end; n++) {
        rows.push({
          refoua_id: campaign.refoua_id,
          user_id: user.id,
          display_name,
          action_type: "tehilim",
          psalm_number: n,
          action_date: dayDate,
        });
      }
      // Best-effort: insère ce qui peut l'être, ignore les conflits
      await supabase.from("refoua_actions").insert(rows as any);
      toast.success(`✅ ${display_name} — psaumes ${start} à ${end} comptabilisés`);
    } else {
      await supabase.from("refoua_actions").insert({
        refoua_id: campaign.refoua_id,
        user_id: user.id,
        display_name,
        action_type: "prayed",
        action_date: dayDate,
      } as any);
      toast.success(`✅ Créneau réservé pour ${display_name}`);
    }
  };

  const releaseSlot = async (slot: Slot) => {
    if (!user) return;
    const isOwner = slot.user_id === user.id;
    const isCreator = campaign?.created_by === user.id;
    if (!isOwner && !isCreator) return;
    await supabase.from("refoua_campaign_slots").delete().eq("id", slot.id);
    // Nettoyer les actions liées à ce créneau
    if (campaign) {
      const dayDate = (() => {
        const d = new Date(campaign.start_date);
        d.setDate(d.getDate() + (slot.day_number - 1));
        return d.toISOString().slice(0, 10);
      })();
      if (campaign.prayer_type === "tehilim_full") {
        const perSlot = Math.ceil(150 / campaign.slots_per_day);
        const start = (slot.slot_index - 1) * perSlot + 1;
        const end = Math.min(slot.slot_index * perSlot, 150);
        await supabase
          .from("refoua_actions")
          .delete()
          .eq("refoua_id", campaign.refoua_id)
          .eq("user_id", slot.user_id)
          .eq("action_date", dayDate)
          .gte("psalm_number", start)
          .lte("psalm_number", end);
      } else {
        await supabase
          .from("refoua_actions")
          .delete()
          .eq("refoua_id", campaign.refoua_id)
          .eq("user_id", slot.user_id)
          .eq("action_date", dayDate)
          .eq("action_type", "prayed");
      }
    }
  };

  const deleteCampaign = async () => {
    if (!campaign || !user || campaign.created_by !== user.id) return;
    if (!confirm("Supprimer ce programme et tous ses créneaux ?")) return;
    const { error } = await supabase.from("refoua_campaigns").delete().eq("id", campaign.id);
    if (error) toast.error("Erreur");
    else toast.success("Programme supprimé");
  };

  const formatDayDate = (dayNumber: number) => {
    if (!campaign) return "";
    const d = new Date(campaign.start_date);
    d.setDate(d.getDate() + (dayNumber - 1));
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  };

  const shareCampaign = async () => {
    const url = `${window.location.origin}/refoua/${refouaId}`;
    const prayerLabel = PRAYER_TYPES.find((p) => p.value === campaign?.prayer_type)?.label || "";
    const total = (campaign?.days_count || 0) * (campaign?.slots_per_day || 0);
    const text =
      `🙏 Programme de Refoua Chelema pour ${fullName}\n` +
      (prayerLabel ? `${prayerLabel}\n` : "") +
      `📅 ${campaign?.days_count} jours • 👥 ${campaign?.slots_per_day}/jour (${slots.length}/${total} réservés)\n\n` +
      `Réservez votre créneau ici :\n${url}`;
    await shareText(text, `Refoua Chelema – ${fullName}`);
  };

  const slotsByDay = new Map<number, Slot[]>();
  slots.forEach((s) => {
    const arr = slotsByDay.get(s.day_number) || [];
    arr.push(s);
    slotsByDay.set(s.day_number, arr);
  });

  if (loading) {
    return <div className="text-center py-4 text-xs text-muted-foreground">Chargement du programme...</div>;
  }

  // No campaign yet — show creation form
  if (!campaign) {
    return (
      <div className="space-y-3">
        <div
          className="rounded-xl p-4 border border-primary/15"
          style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
        >
          <p className="font-display text-sm font-bold text-foreground mb-1">
            🗓️ Organiser un programme de prière
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Définissez la durée et le nombre de participants par jour. Chacun pourra ensuite réserver un créneau dans le tableau interactif.
          </p>
        </div>

        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
              Type de prière
            </label>
            <select
              value={prayerType}
              onChange={(e) => setPrayerType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground"
              style={{ fontSize: "16px" }}
            >
              {PRAYER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                Nombre de jours
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={daysCount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") { setDaysCount("" as any); return; }
                const n = parseInt(v);
                if (!isNaN(n)) setDaysCount(Math.max(1, Math.min(60, n)));
              }}
              onBlur={(e) => {
                const n = parseInt(e.target.value);
                setDaysCount(isNaN(n) ? 1 : Math.max(1, Math.min(60, n)));
              }}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground"
                style={{ fontSize: "16px" }}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                Participants / jour
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={slotsPerDay}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") { setSlotsPerDay("" as any); return; }
                const n = parseInt(v);
                if (!isNaN(n)) setSlotsPerDay(Math.max(1, Math.min(500, n)));
              }}
              onBlur={(e) => {
                const n = parseInt(e.target.value);
                setSlotsPerDay(isNaN(n) ? 1 : Math.max(1, Math.min(500, n)));
              }}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2">
            Total : <strong className="text-foreground">{daysCount * slotsPerDay}</strong> créneaux disponibles
          </div>

          <button
            onClick={createCampaign}
            disabled={creating || !user}
            className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
            style={{ background: "var(--gradient-gold)" }}
          >
            {creating ? "Création..." : !user ? "Connectez-vous pour créer" : "🗓️ Créer le programme"}
          </button>
        </div>
      </div>
    );
  }

  // Campaign exists — show interactive table
  const totalSlots = campaign.days_count * campaign.slots_per_day;
  const filledCount = slots.length;
  const isCreator = !!user && campaign.created_by === user.id;
  const prayerLabel = PRAYER_TYPES.find((p) => p.value === campaign.prayer_type)?.label || campaign.prayer_type;

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[9px] uppercase tracking-[2px] font-bold text-muted-foreground">Programme actif</p>
            <p className="font-display text-sm font-bold text-foreground">{prayerLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={shareCampaign}
              className="text-[10px] font-bold text-primary-foreground border-none rounded-lg px-2.5 py-1 cursor-pointer"
              style={{ background: "var(--gradient-gold)" }}
              title="Partager le lien du programme"
            >
              📤 Partager
            </button>
            {isCreator && (
              <button
                onClick={deleteCampaign}
                className="text-[10px] text-destructive bg-transparent border border-destructive/30 rounded-lg px-2 py-1 cursor-pointer"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-foreground">
          <span>📅 {campaign.days_count} jours</span>
          <span>👥 {campaign.slots_per_day}/jour</span>
          <span className="text-primary font-bold">{filledCount}/{totalSlots}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${(filledCount / totalSlots) * 100}%`,
              background: "var(--gradient-gold)",
              transition: "width 0.5s",
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: campaign.days_count }, (_, i) => i + 1).map((dayNum) => {
          const daySlots = slotsByDay.get(dayNum) || [];
          const filledForDay = daySlots.length;
          const isComplete = filledForDay >= campaign.slots_per_day;

          return (
            <motion.div
              key={dayNum}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayNum * 0.02 }}
              className="rounded-xl bg-card border border-border p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Jour {dayNum}
                  </p>
                  <p className="text-xs font-semibold text-foreground capitalize">
                    {formatDayDate(dayNum)}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isComplete ? "hsl(var(--gold) / 0.2)" : "hsl(var(--muted))",
                    color: isComplete ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {filledForDay}/{campaign.slots_per_day} {isComplete && "✓"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Array.from({ length: campaign.slots_per_day }, (_, i) => i + 1).map((slotIdx) => {
                  const taken = daySlots.find((s) => s.slot_index === slotIdx);
                  const mine = !!taken && taken.user_id === user?.id;
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => (taken ? (mine || isCreator) && releaseSlot(taken) : claimSlot(dayNum, slotIdx))}
                      disabled={!!taken && !mine && !isCreator}
                      className="min-h-[42px] rounded-lg text-[10px] font-bold border px-1.5 py-1 cursor-pointer disabled:cursor-not-allowed text-left transition-all"
                      style={{
                        background: mine
                          ? "hsl(var(--gold) / 0.25)"
                          : taken
                          ? "hsl(var(--muted) / 0.6)"
                          : "hsl(var(--background))",
                        borderColor: mine ? "hsl(var(--gold))" : "hsl(var(--border))",
                        color: taken && !mine ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                        opacity: taken && !mine && !isCreator ? 0.7 : 1,
                      }}
                      title={taken ? (mine ? "Cliquez pour libérer" : `Pris par ${taken.display_name}`) : "Réserver"}
                    >
                      {taken ? (
                        <span className="block truncate">
                          {mine ? `✓ ${taken.display_name || "Vous"}` : taken.display_name || "Anonyme"}
                        </span>
                      ) : (
                        <span className="block text-muted-foreground">+ libre</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filledCount === totalSlots && (
        <div className="text-center py-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-bold text-primary">🎉 Programme complet !</p>
          <p className="text-[11px] text-muted-foreground mt-1">Que la guérison soit accordée à {fullName}</p>
        </div>
      )}
    </div>
  );
};

export default RefouaCampaignPlanner;