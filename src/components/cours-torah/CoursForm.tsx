import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CoursFormProps {
  userId: string;
  synagogueId?: string | null;
  onCreated: (cours: Record<string, unknown>) => void;
  onClose: () => void;
  initialCourseType?: "zoom" | "presentiel";
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[48px]";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Dimanche"];

const CoursForm = ({ userId, synagogueId, onCreated, onClose, initialCourseType = "zoom" }: CoursFormProps) => {
  const [courseType, setCourseType] = useState<"zoom" | "presentiel">(initialCourseType);
  const [zoomMode, setZoomMode] = useState<"instant" | "scheduled">("scheduled");
  const [zoomSource, setZoomSource] = useState<"auto" | "manual" | "personal">("auto");
  const [dateMode, setDateMode] = useState<"recurring" | "specific">("recurring");
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Lundi");
  const [time, setTime] = useState("");
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
  const [address, setAddress] = useState("");
  const [manualZoomLink, setManualZoomLink] = useState("");
  const [personalZoomLink, setPersonalZoomLink] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCourseType(initialCourseType);
  }, [initialCourseType]);

  const createZoomMeeting = async (meetingTitle: string, courseTime: string): Promise<string | null> => {
    try {
      const body: Record<string, unknown> = {
        action: "create-meeting",
        title: meetingTitle,
        timezone: "Europe/Paris",
        duration: 60,
      };

      if (zoomMode === "scheduled") {
        let dateStr = specificDate ? format(specificDate, "yyyy-MM-dd") : "";
        if (!dateStr) {
          const dayIndex = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].indexOf(day);
          const now = new Date();
          let daysUntil = dayIndex - now.getDay();
          if (daysUntil <= 0) daysUntil += 7;
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + daysUntil);
          dateStr = nextDate.toISOString().split("T")[0];
        }
        body.start_time = `${dateStr}T${courseTime || "20:00"}:00`;
      }

      const { data, error } = await supabase.functions.invoke("zoom-proxy", { body });

      if (error) {
        console.error("Zoom meeting creation error:", error);
        toast.error("Erreur lors de la création de la réunion Zoom");
        return null;
      }

      if (!data?.success) {
        console.error("Zoom API error:", data?.error);
        toast.error(data?.error || "Erreur Zoom API");
        return null;
      }

      return data.joinUrl;
    } catch (err) {
      console.error("Zoom creation failed:", err);
      toast.error("Impossible de créer la réunion Zoom");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    if (courseType === "presentiel" && !address.trim()) { toast.error("Adresse requise"); return; }
    if (courseType === "zoom" && zoomSource === "manual" && !manualZoomLink.trim()) {
      toast.error("Lien Zoom requis"); return;
    }
    if (courseType === "zoom" && zoomSource === "personal" && !personalZoomLink.trim()) {
      toast.error("Lien de salle personnelle requis"); return;
    }
    if (dateMode === "specific" && !specificDate) {
      toast.error("Veuillez choisir une date"); return;
    }

    setSubmitting(true);

    let zoomLink = "";
    if (courseType === "zoom") {
      if (zoomSource === "manual") {
        zoomLink = manualZoomLink.trim();
      } else if (zoomSource === "personal") {
        zoomLink = personalZoomLink.trim();
      } else {
        toast.info(zoomMode === "instant"
          ? "Création de la réunion Zoom instantanée..."
          : "Programmation de la réunion Zoom...");
        const link = await createZoomMeeting(title.trim(), time || "20:00");
        if (!link) {
          setSubmitting(false);
          return;
        }
        zoomLink = link;
      }
    }

    const dayOfWeek = dateMode === "specific" && specificDate
      ? ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][specificDate.getDay()]
      : day;

    const insertPayload = {
      creator_id: userId,
      title: title.trim(),
      rav: teacher.trim(),
      day_of_week: dayOfWeek,
      course_time: time || "20:00",
      course_type: courseType,
      zoom_link: zoomLink,
      address: courseType === "presentiel" ? address.trim() : "",
      description: desc.trim(),
      specific_date: dateMode === "specific" && specificDate ? format(specificDate, "yyyy-MM-dd") : null,
      ...(synagogueId ? { synagogue_id: synagogueId } : {}),
    };
    const { data, error } = await supabase
      .from("cours_zoom")
      .insert(insertPayload)
      .select()
      .single();

    if (error) toast.error("Erreur de publication");
    else if (data) {
      onCreated(data as Record<string, unknown>);
      onClose();
      toast.success(courseType === "zoom"
        ? zoomSource === "manual" || zoomSource === "personal"
          ? "✅ Cours Zoom publié avec votre lien !"
          : zoomMode === "instant"
            ? "✅ Réunion Zoom instantanée créée !"
            : "✅ Réunion Zoom programmée avec succès !"
        : "Cours publié !");
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-4 sm:p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border mb-4">
        <button
          onClick={() => setCourseType("zoom")}
          className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${
            courseType === "zoom" ? "text-white" : "bg-card text-muted-foreground"
          }`}
          style={courseType === "zoom" ? { background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" } : {}}
        >
          🎥 Zoom
        </button>
        <button
          onClick={() => setCourseType("presentiel")}
          className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${
            courseType === "presentiel" ? "text-white" : "bg-card text-muted-foreground"
          }`}
          style={courseType === "presentiel" ? { background: "linear-gradient(135deg, #22c55e, #16a34a)" } : {}}
        >
          📍 Présentiel
        </button>
      </div>

      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du cours" className={inputClass} />
        <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Nom du Rav" className={inputClass} />

        {/* Date mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-border">
          <button
            onClick={() => setDateMode("recurring")}
            className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
              dateMode === "recurring" ? "bg-foreground text-background" : "bg-card text-muted-foreground"
            }`}
          >
            🔁 Récurrent
          </button>
          <button
            onClick={() => setDateMode("specific")}
            className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
              dateMode === "specific" ? "bg-foreground text-background" : "bg-card text-muted-foreground"
            }`}
          >
            📅 Date précise
          </button>
        </div>

        {dateMode === "recurring" ? (
          <div className="grid grid-cols-1 gap-3">
            <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Heure" className={inputClass} />
          </div>
        ) : (
          <div className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    inputClass,
                    "flex items-center justify-between text-left",
                    !specificDate && "text-muted-foreground"
                  )}
                >
                  {specificDate ? format(specificDate, "EEEE d MMMM yyyy", { locale: fr }) : "Choisir une date"}
                  <CalendarIcon className="h-4 w-4 opacity-50 flex-shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={specificDate}
                  onSelect={setSpecificDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Heure" className={inputClass} />
          </div>
        )}

        {courseType === "zoom" ? (
          <>
            {/* Zoom source: auto / manual / personal */}
            <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#2D8CFF]/30">
              <button
                onClick={() => setZoomSource("auto")}
                className={`py-2.5 text-[10px] sm:text-[11px] font-bold border-none cursor-pointer transition-all leading-tight ${
                  zoomSource === "auto" ? "bg-[#2D8CFF] text-white" : "bg-card text-muted-foreground"
                }`}
              >
                🤖 Auto
              </button>
              <button
                onClick={() => setZoomSource("manual")}
                className={`py-2.5 text-[10px] sm:text-[11px] font-bold border-none cursor-pointer transition-all leading-tight ${
                  zoomSource === "manual" ? "bg-[#2D8CFF] text-white" : "bg-card text-muted-foreground"
                }`}
              >
                🔗 Lien
              </button>
              <button
                onClick={() => setZoomSource("personal")}
                className={`py-2.5 text-[10px] sm:text-[11px] font-bold border-none cursor-pointer transition-all leading-tight ${
                  zoomSource === "personal" ? "bg-[#2D8CFF] text-white" : "bg-card text-muted-foreground"
                }`}
              >
                🏠 Salle perso
              </button>
            </div>

            {zoomSource === "auto" ? (
              <>
                {/* Zoom mode: instant vs scheduled */}
                <div className="flex rounded-lg overflow-hidden border border-[#2D8CFF]/20">
                  <button
                    onClick={() => setZoomMode("instant")}
                    className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
                      zoomMode === "instant" ? "bg-[#2D8CFF]/80 text-white" : "bg-card text-muted-foreground"
                    }`}
                  >
                    ⚡ En direct
                  </button>
                  <button
                    onClick={() => setZoomMode("scheduled")}
                    className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
                      zoomMode === "scheduled" ? "bg-[#2D8CFF]/80 text-white" : "bg-card text-muted-foreground"
                    }`}
                  >
                    📅 Programmée
                  </button>
                </div>

                <div className="rounded-xl border border-[#2D8CFF]/20 bg-[#2D8CFF]/5 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{zoomMode === "instant" ? "⚡" : "📅"}</span>
                    <span>
                      {zoomMode === "instant"
                        ? <>La réunion sera <strong className="text-foreground">lancée immédiatement</strong> depuis le compte principal.</>
                        : <>La réunion sera <strong className="text-foreground">programmée</strong> depuis le compte principal.</>
                      }
                    </span>
                  </p>
                </div>
              </>
            ) : zoomSource === "manual" ? (
              <>
                <input
                  value={manualZoomLink}
                  onChange={(e) => setManualZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/123456789"
                  className={inputClass}
                />
                <div className="rounded-xl border border-[#2D8CFF]/20 bg-[#2D8CFF]/5 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-base flex-shrink-0">💡</span>
                    <span>
                      Collez le lien depuis <strong className="text-foreground">n'importe quel compte Zoom</strong>.
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <input
                  value={personalZoomLink}
                  onChange={(e) => setPersonalZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/1234567890 (votre ID personnel)"
                  className={inputClass}
                />
                <div className="rounded-xl border border-[#2D8CFF]/20 bg-[#2D8CFF]/5 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-base flex-shrink-0">🏠</span>
                    <span>
                      Votre <strong className="text-foreground">salle personnelle Zoom</strong> (PMI). Le même lien chaque semaine.
                    </span>
                  </p>
                </div>
              </>
            )}
          </>
        ) : (
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse du cours" className={inputClass} />
        )}

        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50 min-h-[48px]"
          style={{ background: "var(--gradient-gold)" }}
        >
          {submitting
            ? "⏳ Publication..."
            : courseType === "zoom"
              ? zoomSource === "manual" || zoomSource === "personal"
                ? "🔗 Publier avec le lien Zoom"
                : zoomMode === "instant" ? "⚡ Lancer en direct & Publier" : "📅 Programmer & Publier"
              : "Publier le cours"}
        </button>
      </div>
    </motion.div>
  );
};

export default CoursForm;
