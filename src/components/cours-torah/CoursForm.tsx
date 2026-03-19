import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CoursFormProps {
  userId: string;
  onCreated: (cours: Record<string, unknown>) => void;
  onClose: () => void;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Dimanche"];

const CoursForm = ({ userId, onCreated, onClose }: CoursFormProps) => {
  const [courseType, setCourseType] = useState<"zoom" | "presentiel">("zoom");
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Lundi");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [address, setAddress] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    if (courseType === "zoom" && !link.trim()) { toast.error("Lien Zoom requis"); return; }
    if (courseType === "presentiel" && !address.trim()) { toast.error("Adresse requise"); return; }

    setSubmitting(true);
    const insertPayload = {
      creator_id: userId,
      title: title.trim(),
      rav: teacher.trim(),
      day_of_week: day,
      course_time: time || "20:00",
      zoom_link: courseType === "zoom" ? link.trim() : "",
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
      toast.success("Cours publié !");
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
            courseType === "zoom"
              ? "text-white"
              : "bg-card text-muted-foreground"
          }`}
          style={courseType === "zoom" ? { background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" } : {}}
        >
          🎥 Zoom
        </button>
        <button
          onClick={() => setCourseType("presentiel")}
          className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${
            courseType === "presentiel"
              ? "text-white"
              : "bg-card text-muted-foreground"
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
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Lien Zoom (https://...)" className={inputClass} />
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
          {submitting ? "Publication..." : "Publier le cours"}
        </button>
      </div>
    </motion.div>
  );
};

export default CoursForm;
