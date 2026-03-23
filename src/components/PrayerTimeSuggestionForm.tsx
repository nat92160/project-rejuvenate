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

const OFFICES = [
  { value: "shacharit", label: "🌅 Cha'harit", desc: "Office du matin" },
  { value: "minha", label: "🌇 Min'ha", desc: "Office de l'après-midi" },
  { value: "arvit", label: "🌙 Arvit", desc: "Office du soir" },
];

function formatTimeDraft(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

const PrayerTimeSuggestionForm = ({ synagogueId, synagogueName, placeId, placeName, onClose, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [officeName, setOfficeName] = useState("shacharit");
  const [mode, setMode] = useState<"fixed" | "rule">("fixed");
  const [timeValue, setTimeValue] = useState("");
  const [timeRule, setTimeRule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestName, setGuestName] = useState("");
  const handleSubmit = async () => {
    if (mode === "fixed" && !timeValue) { toast.error("Saisissez une heure"); return; }
    if (mode === "rule" && !timeRule.trim()) { toast.error("Décrivez la règle horaire"); return; }
    if (!user && !guestName.trim()) { toast.error("Saisissez votre nom"); return; }

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

    const { error } = await (supabase as any)
      .from("prayer_time_suggestions")
      .insert({
        synagogue_id: synagogueId || null,
        place_id: placeId || null,
        place_name: placeName || null,
        user_id: user?.id || null,
        display_name: `${displayName}${!user ? " (invité)" : ""}`,
        office_name: officeName,
        time_value: mode === "fixed" ? timeValue : null,
        time_rule: mode === "rule" ? timeRule.trim() : null,
        status: "pending",
      });

    setSubmitting(false);

    if (error) {
      toast.error("Erreur lors de l'envoi");
      console.error(error);
      return;
    }

    toast.success("✅ Horaire proposé ! Il sera vérifié par le président ou l'administrateur.");
    onSubmitted?.();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
      style={{ boxShadow: "var(--shadow-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-foreground">📝 Proposer un horaire</h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none">✕</button>
      </div>

      <p className="text-[11px] text-muted-foreground">Pour <strong>{synagogueName}</strong></p>

      {/* Office selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Nom de l'office</label>
        <div className="flex gap-2">
          {OFFICES.map((o) => (
            <button
              key={o.value}
              onClick={() => setOfficeName(o.value)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all active:scale-95"
              style={officeName === o.value
                ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
                : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Type d'horaire</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("fixed")}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all"
            style={mode === "fixed"
              ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            🕐 Heure fixe
          </button>
          <button
            onClick={() => setMode("rule")}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all"
            style={mode === "rule"
              ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            📐 Règle
          </button>
        </div>
      </div>

      {/* Input */}
      {mode === "fixed" ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Heure (ex: 07:30)</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            value={timeValue}
            onChange={(e) => setTimeValue(formatTimeDraft(e.target.value))}
            className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-center text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Règle (ex: "15 min avant le coucher du soleil")</label>
          <textarea
            value={timeRule}
            onChange={(e) => setTimeRule(e.target.value)}
            placeholder="Décrivez la règle horaire…"
            rows={2}
            className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40 resize-none"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        {submitting ? "Envoi…" : "📤 Envoyer la proposition"}
      </button>
    </motion.div>
  );
};

export default PrayerTimeSuggestionForm;
