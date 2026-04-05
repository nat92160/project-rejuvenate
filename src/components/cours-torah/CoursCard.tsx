import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";
import CardPosterTemplate, { type CardPosterContent } from "@/components/poster/CardPosterTemplate";
import type { SynaProfile } from "@/components/poster/MasterPosterTemplate";
import { sharePosterPng } from "@/components/poster/usePosterExport";
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
  synaProfile: SynaProfile;
  onDelete: (id: string) => void;
  specific_date?: string | null;
}

const dayColors: Record<string, string> = {
  Lundi: "#3b82f6", Mardi: "#8b5cf6", Mercredi: "#22c55e",
  Jeudi: "#f97316", Vendredi: "#ef4444", Dimanche: "#eab308",
};

const CoursCard = ({
  id, title, rav, day_of_week, course_time, zoom_link, description,
  course_type, address, cityName, isOwner, index, synaProfile, onDelete, specific_date,
}: CoursCardProps) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const isZoom = normalizeCourseType(course_type, zoom_link, address) === "zoom";
  const dotColor = dayColors[day_of_week] || "#94a3b8";

  const displayDate = specific_date
    ? new Date(specific_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : day_of_week;

  const posterContent: CardPosterContent = {
    topEmoji: isZoom ? "🎥" : "📍",
    badge: isZoom ? "COURS ZOOM" : "COURS PRÉSENTIEL",
    badgeColor: isZoom ? "#2D8CFF" : "#16a34a",
    title: title,
    description: rav || undefined,
    date: `${displayDate} à ${course_time?.slice(0, 5)}`,
    dateEmoji: "📅",
    details: [
      ...(isZoom && zoom_link ? [{ icon: "🎥", text: "Lien Zoom disponible" }] : []),
      ...(!isZoom && address ? [{ icon: "📍", text: address }] : []),
      ...(description ? [{ icon: "📝", text: description }] : []),
    ],
    accentColor: isZoom ? "#2D8CFF" : "#16a34a",
    bgColor: isZoom ? "#EFF6FF" : "#F0FDF4",
  };

  const handleExportPng = async () => {
    setExporting(true);
    await exportPosterPng(posterRef.current, `cours-${title.replace(/\s+/g, "-").toLowerCase()}.png`);
    setExporting(false);
  };

  const handleShare = async () => {
    let text = `📚 ${title}\n`;
    if (rav) text += `👨‍🏫 ${rav}\n`;
    text += `📅 ${displayDate} à ${course_time?.slice(0, 5)}\n`;
    if (isZoom && zoom_link) text += `\n🎥 Rejoindre : ${zoom_link}\n`;
    if (!isZoom && address) text += `\n📍 ${address}\n`;
    if (description) text += `\n${description}\n`;
    text += `\n✡️ Chabbat Chalom • ${cityName}`;
    await shareText(text, `📚 ${title}`);
  };

  const handleAction = () => {
    if (isZoom) {
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
      {/* Hidden poster for PNG export */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <CardPosterTemplate
          ref={posterRef}
          profile={{ name: synaProfile.name || "Chabbat Chalom", logo_url: synaProfile.logo_url, website: "chabbat-chalom.com" }}
          content={posterContent}
        />
      </div>

      {/* Visible card */}
      <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
            style={{
              background: isZoom ? "rgba(45,140,255,0.1)" : "rgba(34,197,94,0.1)",
              color: isZoom ? "#2D8CFF" : "#16a34a",
            }}
          >
            {isZoom ? "ZOOM" : "PRÉSENTIEL"}
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

        <button
          onClick={handleAction}
          className="mt-4 w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: isZoom
              ? "linear-gradient(135deg, #2D8CFF, #1a6fdd)"
              : "linear-gradient(135deg, #22c55e, #16a34a)",
            boxShadow: isZoom
              ? "0 4px 12px rgba(45,140,255,0.3)"
              : "0 4px 12px rgba(34,197,94,0.3)",
          }}
        >
          {isZoom ? "🎥  REJOINDRE LE COURS" : "📍  ITINÉRAIRE"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-2 px-1">
        <button
          onClick={handleExportPng}
          disabled={exporting}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-gold)" }}
        >
          {exporting ? "⏳ Génération..." : "📥 Générer l'Affiche Pro"}
        </button>
        <button
          onClick={handleShare}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground cursor-pointer hover:bg-muted"
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
