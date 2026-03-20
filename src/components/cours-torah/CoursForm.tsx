import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ZoomAccountManager from "./ZoomAccountManager";

interface CoursFormProps {
  userId: string;
  onCreated: (cours: Record<string, unknown>) => void;
  onClose: () => void;
  initialCourseType?: "zoom" | "presentiel";
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Dimanche"];

const CoursForm = ({ userId, onCreated, onClose, initialCourseType = "zoom" }: CoursFormProps) => {
  const [courseType, setCourseType] = useState<"zoom" | "presentiel">(initialCourseType);
  const [zoomMode, setZoomMode] = useState<"instant" | "scheduled">("scheduled");
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Lundi");
  const [time, setTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [address, setAddress] = useState("");
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
        // Use the selected date, or compute next occurrence of the day
        let dateStr = scheduledDate;
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
      // If instant mode, no start_time → Zoom creates type=1 (instant)

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

    setSubmitting(true);

    let zoomLink = "";
    if (courseType === "zoom") {
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

    const insertPayload = {
      creator_id: userId,
      title: title.trim(),
      rav: teacher.trim(),
      day_of_week: day,
      course_time: time || "20:00",
      course_type: courseType,
      zoom_link: zoomLink,
      address: courseType === "presentiel" ? address.trim() : "",
      description: desc.trim(),
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
        ? zoomMode === "instant"
          ? "✅ Réunion Zoom instantanée créée !"
          : "✅ Réunion Zoom programmée avec succès !"
        : "Cours publié !");
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-5 mb-4 border border-border"
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
        <div className="grid grid-cols-2 gap-3">
          <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
            {DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>

        {courseType === "zoom" ? (
          <>
            {/* Zoom mode: instant vs scheduled */}
            <div className="flex rounded-lg overflow-hidden border border-[#2D8CFF]/30">
              <button
                onClick={() => setZoomMode("instant")}
                className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
                  zoomMode === "instant" ? "bg-[#2D8CFF] text-white" : "bg-card text-muted-foreground"
                }`}
              >
                ⚡ En direct
              </button>
              <button
                onClick={() => setZoomMode("scheduled")}
                className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
                  zoomMode === "scheduled" ? "bg-[#2D8CFF] text-white" : "bg-card text-muted-foreground"
                }`}
              >
                📅 Programmée
              </button>
            </div>

            {zoomMode === "scheduled" && (
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputClass}
                min={new Date().toISOString().split("T")[0]}
              />
            )}

            <div className="rounded-xl border border-[#2D8CFF]/20 bg-[#2D8CFF]/5 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-base">{zoomMode === "instant" ? "⚡" : "📅"}</span>
                <span>
                  {zoomMode === "instant"
                    ? <>La réunion Zoom sera <strong className="text-foreground">lancée immédiatement</strong> à la publication.</>
                    : <>La réunion Zoom sera <strong className="text-foreground">programmée</strong> à la date et heure choisies.</>
                  }
                </span>
              </p>
            </div>
          </>
        ) : (
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse du cours" className={inputClass} />
        )}

        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
          style={{ background: "var(--gradient-gold)" }}
        >
          {submitting
            ? courseType === "zoom"
              ? zoomMode === "instant" ? "⏳ Lancement Zoom..." : "⏳ Programmation Zoom..."
              : "Publication..."
            : courseType === "zoom"
              ? zoomMode === "instant" ? "⚡ Lancer en direct & Publier" : "📅 Programmer & Publier"
              : "Publier le cours"}
        </button>
      </div>
    </motion.div>
  );
};

export default CoursForm;
