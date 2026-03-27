import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

type TimeMode = "fixed" | "zmanim";

const ZMANIM_RULES = [
  { label: "15 min avant Chki'a", value: "sunset-15" },
  { label: "30 min avant Chki'a", value: "sunset-30" },
  { label: "À la Chki'a", value: "sunset" },
  { label: "20 min après Chki'a", value: "sunset+20" },
  { label: "40 min après Chki'a", value: "sunset+40" },
  { label: "Au Ha'netz", value: "sunrise" },
  { label: "30 min avant Ha'netz", value: "sunrise-30" },
];

function formatTimeDraft(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function checkGuestRateLimit(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    const today = new Date().toDateString();
    return stored.filter((ts) => new Date(ts).toDateString() === today).length < MAX_PER_DAY;
  } catch { return true; }
}

function recordGuestSuggestion() {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    stored.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(stored.slice(-30)));
  } catch { /* ignore */ }
}

function getRemainingToday(): number {
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    const today = new Date().toDateString();
    return Math.max(0, MAX_PER_DAY - stored.filter((ts) => new Date(ts).toDateString() === today).length);
  } catch { return MAX_PER_DAY; }
}

const PrayerTimeSuggestionForm = ({ synagogueId, synagogueName, placeId, placeName, onClose, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [shacharit, setShacharit] = useState("");
  const [minha, setMinha] = useState("");
  const [arvit, setArvit] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Time mode per office
  const [shacharitMode, setShacharitMode] = useState<TimeMode>("fixed");
  const [minhaMode, setMinhaMode] = useState<TimeMode>("fixed");
  const [arvitMode, setArvitMode] = useState<TimeMode>("fixed");

  // Zmanim rules
  const [shacharitRule, setShacharitRule] = useState("");
  const [minhaRule, setMinhaRule] = useState("");
  const [arvitRule, setArvitRule] = useState("");

  const isGuest = !user;

  const handleSubmit = async () => {
    const hasFixed = (shacharitMode === "fixed" && shacharit) || (minhaMode === "fixed" && minha) || (arvitMode === "fixed" && arvit);
    const hasZmanim = (shacharitMode === "zmanim" && shacharitRule) || (minhaMode === "zmanim" && minhaRule) || (arvitMode === "zmanim" && arvitRule);
    if (!hasFixed && !hasZmanim) {
      toast.error("Saisissez au moins un horaire");
      return;
    }
    if (isGuest && !guestName.trim()) {
      toast.error("Saisissez votre nom");
      return;
    }
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
      { name: "shacharit", mode: shacharitMode, value: shacharit, rule: shacharitRule },
      { name: "minha", mode: minhaMode, value: minha, rule: minhaRule },
      { name: "arvit", mode: arvitMode, value: arvit, rule: arvitRule },
    ].filter((o) => (o.mode === "fixed" && o.value.trim()) || (o.mode === "zmanim" && o.rule));

    const rows = offices.map((o) => ({
      synagogue_id: synagogueId || null,
      place_id: placeId || null,
      place_name: placeName || null,
      user_id: user?.id || null,
      display_name: `${displayName}${suffix}`,
      office_name: o.name,
      time_value: o.mode === "fixed" ? o.value : null,
      time_rule: o.mode === "zmanim" ? o.rule : null,
      status: "pending",
    }));

    const { error } = await (supabase as any).from("prayer_time_suggestions").insert(rows);
    setSubmitting(false);

    if (error) {
      toast.error("Erreur lors de l'envoi");
      console.error(error);
      return;
    }

    if (isGuest) offices.forEach(() => recordGuestSuggestion());

    setSubmitted(true);
    onSubmitted?.();

    // Auto-close after celebration
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 4000);
  };

  const remaining = isGuest ? getRemainingToday() : Infinity;

  const fields = [
    { label: "🌅 Cha'harit", value: shacharit, set: setShacharit, mode: shacharitMode, setMode: setShacharitMode, rule: shacharitRule, setRule: setShacharitRule },
    { label: "🌇 Min'ha", value: minha, set: setMinha, mode: minhaMode, setMode: setMinhaMode, rule: minhaRule, setRule: setMinhaRule },
    { label: "🌙 Arvit", value: arvit, set: setArvit, mode: arvitMode, setMode: setArvitMode, rule: arvitRule, setRule: setArvitRule },
  ];

  // Thank you screen with gamification
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary/20 bg-card p-6 text-center space-y-3"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="text-5xl"
        >
          🎉
        </motion.div>
        <h4 className="font-display text-base font-bold text-foreground">Merci pour votre contribution !</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Vous aidez la communauté à prier à l'heure aujourd'hui.
        </p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: "hsl(var(--gold) / 0.1)", color: "hsl(var(--gold-matte))" }}
        >
          ⭐ Contributeur actif
        </div>
        <p className="text-[10px] text-muted-foreground">Vos horaires seront vérifiés par l'administrateur</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
      style={{ boxShadow: "var(--shadow-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-foreground">🤝 Aidez la communauté de {synagogueName} à être à l'heure</h4>
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

      {/* 3 office fields */}
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{field.label}</span>
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => field.setMode("fixed")}
                  className="px-2.5 py-1 text-[10px] font-medium border-none cursor-pointer transition-all"
                  style={{
                    background: field.mode === "fixed" ? "hsl(var(--gold) / 0.12)" : "transparent",
                    color: field.mode === "fixed" ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  Heure fixe
                </button>
                <button
                  onClick={() => field.setMode("zmanim")}
                  className="px-2.5 py-1 text-[10px] font-medium border-none cursor-pointer transition-all"
                  style={{
                    background: field.mode === "zmanim" ? "hsl(var(--gold) / 0.12)" : "transparent",
                    color: field.mode === "zmanim" ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  Selon Zmanim
                </button>
              </div>
            </div>

            {field.mode === "fixed" ? (
              <input
                type="time"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-left text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            ) : (
              <select
                value={field.rule}
                onChange={(e) => field.setRule(e.target.value)}
                className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 cursor-pointer"
              >
                <option value="">Choisir une règle…</option>
                {ZMANIM_RULES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
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
