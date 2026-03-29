import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
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

interface PmiInfo {
  pmi: number | null;
  personalMeetingUrl: string | null;
  displayName: string;
  source?: string;
}

const getPmiHelperMessage = (message?: string) => {
  if (message?.includes("does not contain scopes")) {
    return "Zoom ne renvoie pas encore l’aperçu de votre salle perso avec le token actuel. Vous pouvez quand même activer cette option et publier.";
  }

  return message || "Impossible de récupérer votre salle personnelle pour le moment.";
};

const CoursForm = forwardRef<HTMLDivElement, CoursFormProps>(({ userId, synagogueId, onCreated, onClose, initialCourseType = "zoom" }, ref) => {
  const [courseType, setCourseType] = useState<"zoom" | "presentiel">(initialCourseType);
  const [zoomMode, setZoomMode] = useState<"instant" | "scheduled">("scheduled");
  const [zoomSource, setZoomSource] = useState<"auto" | "manual">("auto");
  const [usePmi, setUsePmi] = useState(false);
  const [pmiInfo, setPmiInfo] = useState<PmiInfo | null>(null);
  const [loadingPmi, setLoadingPmi] = useState(false);
  const [pmiError, setPmiError] = useState("");
  const pmiFetchedRef = useRef(false);
  const [dateMode, setDateMode] = useState<"recurring" | "specific">("recurring");
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("Lundi");
  const [time, setTime] = useState("");
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
  const [address, setAddress] = useState("");
  const [manualZoomLink, setManualZoomLink] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCourseType(initialCourseType);
  }, [initialCourseType]);

  const fetchPmi = useCallback(async (force = false) => {
    if (loadingPmi) return;
    if (!force && pmiFetchedRef.current) return;

    pmiFetchedRef.current = true;
    setLoadingPmi(true);
    setPmiError("");

    try {
      const { data, error } = await supabase.functions.invoke("zoom-user-oauth", { body: { action: "get-pmi", userId } });

      if (error || !data?.success) {
        setPmiInfo(null);
        setPmiError(getPmiHelperMessage(data?.error));
        return;
      }

      if (!data?.pmi || !data?.personalMeetingUrl) {
        setPmiInfo(null);
        setPmiError(data?.message || "Salle perso activable, mais Zoom n’a pas renvoyé l’aperçu de l’ID.");
        return;
      }

      setPmiInfo({
        pmi: data.pmi,
        personalMeetingUrl: data.personalMeetingUrl,
        displayName: data.displayName,
        source: data.source,
      });
    } catch {
      setPmiInfo(null);
      setPmiError(getPmiHelperMessage());
    } finally {
      setLoadingPmi(false);
    }
  }, [loadingPmi]);

  useEffect(() => {
    if (courseType === "zoom" && zoomSource === "auto" && usePmi) {
      fetchPmi();
    }
  }, [courseType, zoomSource, usePmi, fetchPmi]);

  const createZoomMeeting = async (meetingTitle: string, courseTime: string): Promise<string | null> => {
    try {
      const body: Record<string, unknown> = {
        action: "create-meeting",
        userId, // Per-user OAuth: meeting created on THEIR account
        title: meetingTitle,
        timezone: "Europe/Paris",
        duration: 60,
        usePmi,
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

      const { data, error } = await supabase.functions.invoke("zoom-user-oauth", { body });

      if (error) {
        console.error("Zoom meeting creation error:", error);
        toast.error("Erreur lors de la création de la réunion Zoom");
        return null;
      }

      if (!data?.success) {
        console.error("Zoom API error:", data?.error);
        if (data?.error?.includes("non connecté") || data?.error?.includes("expirée")) {
          toast.error("Veuillez connecter votre compte Zoom dans les paramètres avant de créer un cours automatique.");
        } else {
          toast.error(data?.error || "Erreur Zoom API");
        }
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
    if (dateMode === "specific" && !specificDate) {
      toast.error("Veuillez choisir une date"); return;
    }

    setSubmitting(true);

    let zoomLink = "";
    if (courseType === "zoom") {
      if (zoomSource === "manual") {
        zoomLink = manualZoomLink.trim();
      } else {
        toast.info(
          usePmi
            ? zoomMode === "instant"
              ? "Activation de votre salle personnelle Zoom..."
              : "Programmation avec votre salle personnelle Zoom..."
            : zoomMode === "instant"
              ? "Création de la réunion Zoom instantanée..."
              : "Programmation de la réunion Zoom..."
        );
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
        ? zoomSource === "manual"
          ? "✅ Cours Zoom publié avec votre lien !"
          : usePmi
            ? zoomMode === "instant"
              ? "✅ Salle personnelle Zoom activée !"
              : "✅ Réunion programmée avec votre salle personnelle !"
            : zoomMode === "instant"
              ? "✅ Réunion Zoom instantanée créée !"
              : "✅ Réunion Zoom programmée avec succès !"
        : "Cours publié !");
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      ref={ref}
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
          <div className="space-y-3">
            <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <div className="relative">
              <label className="absolute left-4 top-1 text-[10px] text-muted-foreground font-medium">Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} pt-5`} />
            </div>
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
            <div className="relative">
              <label className="absolute left-4 top-1 text-[10px] text-muted-foreground font-medium">Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} pt-5`} />
            </div>
          </div>
        )}

        {courseType === "zoom" ? (
          <>
            {/* Zoom source: auto / manual */}
            <div className="flex rounded-xl overflow-hidden border border-primary/30">
              <button
                onClick={() => setZoomSource("auto")}
                className={`flex-1 py-2.5 text-[11px] font-bold border-none cursor-pointer transition-all ${
                  zoomSource === "auto" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                🤖 Automatique
              </button>
              <button
                onClick={() => { setZoomSource("manual"); setUsePmi(false); }}
                className={`flex-1 py-2.5 text-[11px] font-bold border-none cursor-pointer transition-all ${
                  zoomSource === "manual" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                🔗 Lien manuel
              </button>
            </div>

            {zoomSource === "auto" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">🏠 Salle personnelle Zoom</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Activez ou non votre salle personnelle au moment de la programmation.
                      </p>
                    </div>
                    {loadingPmi && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = !usePmi;
                      setUsePmi(nextValue);

                      if (nextValue && !pmiFetchedRef.current) {
                        void fetchPmi();
                      }
                    }}
                    className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-3 text-left transition-all cursor-pointer hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">Utiliser l&apos;ID de réunion personnelle</p>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {pmiInfo?.pmi
                            ? `ID : ${pmiInfo.pmi}${pmiInfo.displayName ? ` — ${pmiInfo.displayName}` : ""}${pmiInfo.source === "scheduled_meetings" ? " — détecté automatiquement" : ""}`
                            : usePmi && loadingPmi
                              ? "Recherche de votre ID personnel…"
                              : usePmi
                                ? pmiError || "Salle personnelle activée."
                                : "Activez cette option pour utiliser votre salle personnelle lors de la programmation."}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative h-7 w-12 flex-shrink-0 rounded-full transition-colors",
                          usePmi ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
                            usePmi ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </span>
                    </div>
                  </button>

                  <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {pmiInfo?.pmi
                        ? "Si cette option est activée, le cours sera programmé avec votre salle personnelle Zoom."
                        : usePmi && loadingPmi
                          ? "Nous vérifions actuellement votre salle personnelle Zoom."
                          : usePmi
                            ? pmiError || "La salle personnelle sera utilisée à la publication."
                            : "Activez cette option si vous voulez publier avec votre salle personnelle Zoom."}
                    </p>
                    {!loadingPmi && usePmi && pmiError && (
                      <button
                        type="button"
                        onClick={() => {
                          pmiFetchedRef.current = false;
                          fetchPmi(true);
                        }}
                        className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-bold text-foreground cursor-pointer"
                      >
                        Réessayer
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <>
                <input
                  value={manualZoomLink}
                  onChange={(e) => setManualZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/123456789"
                  className={inputClass}
                />
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-base flex-shrink-0">💡</span>
                    <span>
                      Collez le lien depuis <strong className="text-foreground">n'importe quel compte Zoom</strong>.
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
              ? zoomSource === "manual"
                ? "🔗 Publier avec le lien Zoom"
                : usePmi
                  ? "🏠 Publier avec la salle perso"
                  : zoomMode === "instant" ? "⚡ Lancer en direct & Publier" : "📅 Programmer & Publier"
              : "Publier le cours"}
        </button>
      </div>
    </motion.div>
  );
});

CoursForm.displayName = "CoursForm";

export default CoursForm;
