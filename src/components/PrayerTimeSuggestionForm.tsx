import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  synagogueId?: string;
  synagogueName: string;
  placeId?: string;
  placeName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const RATE_LIMIT_KEY = "guest_suggestion_timestamps";
const MAX_PER_DAY = 2;

function formatTimeDraft(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function checkGuestRateLimit(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    const today = new Date().toDateString();
    const todayTimestamps = stored.filter((ts) => new Date(ts).toDateString() === today);
    return todayTimestamps.length < MAX_PER_DAY;
  } catch {
    return true;
  }
}

function recordGuestSuggestion() {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    stored.push(Date.now());
    // Keep only last 30 entries
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(stored.slice(-30)));
  } catch { /* ignore */ }
}

function getRemainingToday(): number {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    const today = new Date().toDateString();
    const todayCount = stored.filter((ts) => new Date(ts).toDateString() === today).length;
    return Math.max(0, MAX_PER_DAY - todayCount);
  } catch {
    return MAX_PER_DAY;
  }
}

const PrayerTimeSuggestionForm = ({ synagogueId, synagogueName, placeId, placeName, onClose, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [shacharit, setShacharit] = useState("");
  const [minha, setMinha] = useState("");
  const [arvit, setArvit] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isGuest = !user;

  const handleSubmit = async () => {
    if (!shacharit && !minha && !arvit) {
      toast.error("Saisissez au moins un horaire");
      return;
    }
    if (isGuest && !guestName.trim()) {
      toast.error("Saisissez votre nom");
      return;
    }

    // Rate limit for guests
    if (isGuest && !checkGuestRateLimit()) {
      toast.error(`Limite atteinte : ${MAX_PER_DAY} suggestions par jour maximum`);
      return;
    }

    setSubmitting(true);

    let displayName = "Invité";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", user.id)
        .single();
      displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.display_name || "Utilisateur";
    } else {
      displayName = guestName.trim();
    }

    const suffix = isGuest ? " (invité)" : "";
    const offices = [
      { name: "shacharit", value: shacharit },
      { name: "minha", value: minha },
      { name: "arvit", value: arvit },
    ].filter((o) => o.value.trim());

    const rows = offices.map((o) => ({
      synagogue_id: synagogueId || null,
      place_id: placeId || null,
      place_name: placeName || null,
      user_id: user?.id || null,
      display_name: `${displayName}${suffix}`,
      office_name: o.name,
      time_value: o.value,
      time_rule: null,
      status: "pending",
    }));

    const { error } = await (supabase as any)
      .from("prayer_time_suggestions")
      .insert(rows);

    setSubmitting(false);

    if (error) {
      toast.error("Erreur lors de l'envoi");
      console.error(error);
      return;
    }

    if (isGuest) {
      // Record each office as one suggestion for rate limiting
      offices.forEach(() => recordGuestSuggestion());
    }

    toast.success("✅ Horaires proposés ! Ils seront vérifiés par l'administrateur.");
    onSubmitted?.();
    onClose();
  };

  const remaining = isGuest ? getRemainingToday() : Infinity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
      style={{ boxShadow: "var(--shadow-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-foreground">📝 Proposer des horaires</h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none">✕</button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Pour <strong>{synagogueName}</strong>
        {isGuest && (
          <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
            Invité • {remaining} restante{remaining > 1 ? "s" : ""} aujourd'hui
          </span>
        )}
      </p>

      {/* Guest name */}
      {isGuest && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Votre nom</label>
          <input
            type="text"
            placeholder="Entrez votre nom…"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40"
          />
        </div>
      )}

      {/* 3 time fields */}
      <div className="space-y-3">
        {[
          { label: "🌅 Cha'harit", value: shacharit, set: setShacharit },
          { label: "🌇 Min'ha", value: minha, set: setMinha },
          { label: "🌙 Arvit", value: arvit, set: setArvit },
        ].map((field) => (
          <div key={field.label} className="flex items-center gap-3">
            <span className="text-xs font-bold w-28 shrink-0">{field.label}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="HH:MM"
              value={field.value}
              onChange={(e) => field.set(formatTimeDraft(e.target.value))}
              className="block h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-center text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40"
            />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Remplissez uniquement les horaires que vous connaissez
      </p>

      <button
        onClick={handleSubmit}
        disabled={submitting || (isGuest && remaining <= 0)}
        className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        {submitting ? "Envoi…" : "📤 Envoyer la suggestion"}
      </button>
    </motion.div>
  );
};

export default PrayerTimeSuggestionForm;
