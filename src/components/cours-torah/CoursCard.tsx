import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";
import { normalizeCourseType } from "@/lib/courseType";

interface CoursCardProps {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  zoom_link: string;
  description: string;
  course_type: string;
  address: string;
  creator_id: string;
  cityName: string;
  isOwner: boolean;
  index: number;
  onDelete: (id: string) => void;
  specific_date?: string | null;
  replay_url?: string | null;
  replay_updated_at?: string | null;
  onSaveReplay?: (id: string, url: string) => Promise<void> | void;
}

const dayColors: Record<string, string> = {
  Lundi: "#3b82f6", Mardi: "#8b5cf6", Mercredi: "#22c55e",
  Jeudi: "#f97316", Vendredi: "#ef4444", Dimanche: "#eab308",
};

const dayIndex: Record<string, number> = {
  Dimanche: 0, Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6,
};

const CoursCard = ({
  id, title, rav, day_of_week, course_time, zoom_link, description,
  course_type, address, cityName, isOwner, index, onDelete, specific_date,
  replay_url, replay_updated_at, onSaveReplay,
}: CoursCardProps) => {
  const isZoom = normalizeCourseType(course_type, zoom_link, address) === "zoom";
  const dotColor = dayColors[day_of_week] || "#94a3b8";

  const displayDate = specific_date
    ? new Date(specific_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : day_of_week;

  // For one-off courses: past once the date has passed.
  // For recurring courses: compute the most recent past occurrence of (day_of_week + course_time).
  // The course is considered "past" (replay window) between that occurrence and the next one.
  const { isPast, lastOccurrenceDate } = (() => {
    const now = new Date();
    if (specific_date) {
      const d = new Date(specific_date + "T" + (course_time || "00:00:00"));
      return { isPast: d.getTime() < now.getTime(), lastOccurrenceDate: d };
    }
    const targetDay = dayIndex[day_of_week];
    if (targetDay === undefined) return { isPast: false, lastOccurrenceDate: null as Date | null };
    const [hh = "0", mm = "0"] = (course_time || "00:00").split(":");
    const d = new Date(now);
    d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    let diff = (now.getDay() - targetDay + 7) % 7;
    if (diff === 0 && d.getTime() > now.getTime()) diff = 7;
    d.setDate(d.getDate() - diff);
    return { isPast: true, lastOccurrenceDate: d };
  })();

  // Replay is "fresh" (still valid for current week) only if updated after the last occurrence.
  const replayFresh = (() => {
    if (!replay_url) return false;
    if (specific_date) return true; // one-off replays don't expire
    if (!replay_updated_at || !lastOccurrenceDate) return false;
    return new Date(replay_updated_at).getTime() >= lastOccurrenceDate.getTime();
  })();

  const showReplayButton = isPast && replayFresh;
  const showReplayInput = isOwner && !!onSaveReplay && (specific_date ? isPast : true);

  const [replayInput, setReplayInput] = useState(replay_url || "");
  const [savingReplay, setSavingReplay] = useState(false);

  const handleSaveReplay = async () => {
    if (!onSaveReplay) return;
    const url = replayInput.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Lien invalide (doit commencer par https://)");
      return;
    }
    setSavingReplay(true);
    try {
      await onSaveReplay(id, url);
      toast.success(url ? "✅ Replay enregistré" : "Replay supprimé");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
    setSavingReplay(false);
  };

  const handleShare = async () => {
    let text = `📚 ${title}\n`;
    if (rav) text += `👨‍🏫 ${rav}\n`;
    text += `📅 ${displayDate} à ${course_time?.slice(0, 5)}\n`;
    if (isPast && replay_url) text += `\n▶️ Replay : ${replay_url}\n`;
    else if (isZoom && zoom_link) text += `\n🎥 Rejoindre : ${zoom_link}\n`;
    else if (!isZoom && address) text += `\n📍 ${address}\n`;
    if (description) text += `\n${description}\n`;
    text += `\n✡️ Chabbat Chalom • ${cityName}`;
    await shareText(text, `📚 ${title}`);
  };

  const handleAction = () => {
    if (isPast && replay_url) {
      const href = replay_url.startsWith("http") ? replay_url : `https://${replay_url}`;
      window.open(href, "_blank", "noopener,noreferrer");
    } else if (isZoom) {
      const href = zoom_link?.startsWith("http") ? zoom_link : `https://${zoom_link}`;
      window.open(href, "_blank", "noopener,noreferrer");
    } else if (address) {
      const q = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Visible card */}
      <div
        className="rounded-2xl bg-card p-5 border border-border"
        style={{ boxShadow: "var(--shadow-card)", opacity: isPast && !replay_url ? 0.85 : 1 }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
            style={{
              background: isPast
                ? "rgba(120,120,120,0.12)"
                : isZoom ? "rgba(45,140,255,0.1)" : "rgba(34,197,94,0.1)",
              color: isPast ? "#6b7280" : isZoom ? "#2D8CFF" : "#16a34a",
            }}
          >
            {isPast ? "PASSÉ" : isZoom ? "ZOOM" : "PRÉSENTIEL"}
          </span>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{ background: `${dotColor}15`, color: dotColor }}
          >
            {specific_date ? displayDate : day_of_week}
          </span>
          <span className="text-xs font-bold text-foreground">{course_time?.slice(0, 5)}</span>
        </div>

        <h4 className="font-display text-base font-bold text-foreground leading-tight">{title}</h4>
        {rav && (
          <p className="text-xs font-medium mt-1" style={{ color: "hsl(var(--gold-matte))" }}>{rav}</p>
        )}
        {description && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{description}</p>
        )}
        {!isZoom && address && (
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <span>📍</span> {address}
          </p>
        )}

        {isPast && !showReplayButton ? (
          <div
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-center text-muted-foreground border border-border bg-muted/40"
          >
            {specific_date ? "⏳ Cours terminé" : "⏳ Cours de cette semaine terminé"}
            {isOwner ? " — ajoutez le replay ci-dessous" : ""}
          </div>
        ) : (
          <button
            onClick={handleAction}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: showReplayButton
                ? "linear-gradient(135deg, #DC2626, #991B1B)"
                : isZoom
                  ? "linear-gradient(135deg, #2D8CFF, #1a6fdd)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
              boxShadow: showReplayButton
                ? "0 4px 12px rgba(220,38,38,0.3)"
                : isZoom
                  ? "0 4px 12px rgba(45,140,255,0.3)"
                  : "0 4px 12px rgba(34,197,94,0.3)",
            }}
          >
            {showReplayButton ? "▶️  VOIR LE REPLAY" : isZoom ? "🎥  REJOINDRE LE COURS" : "📍  ITINÉRAIRE"}
          </button>
        )}

        {showReplayInput && (
          <div className="mt-3 rounded-xl border border-border bg-background p-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              ▶️ Lien du replay {!specific_date && "(remplacez chaque semaine)"}
            </label>
            <div className="flex gap-2">
              <input
                value={replayInput}
                onChange={(e) => setReplayInput(e.target.value)}
                placeholder="https://youtube.com/..."
                className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ fontSize: "16px" }}
              />
              <button
                onClick={handleSaveReplay}
                disabled={savingReplay || replayInput === (replay_url || "")}
                className="px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}
              >
                {savingReplay ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-2 px-1">
        <button
          onClick={handleShare}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          📤 Partager
        </button>
        {isOwner && (
          <button
            onClick={() => onDelete(id)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer hover:bg-destructive/20"
          >
            🗑️ Supprimer
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CoursCard;
