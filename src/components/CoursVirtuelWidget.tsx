import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";
import CoursCard from "./cours-torah/CoursCard";
import CoursForm from "./cours-torah/CoursForm";
import { normalizeCourseType } from "@/lib/courseType";

interface CoursItem {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  zoom_link: string;
  description: string;
  creator_id: string;
  course_type: string;
  address: string;
  specific_date: string | null;
}

const CoursVirtuelWidget = () => {
  const { city } = useCity();
  const { user, dbRole } = useAuth();
  const { profile: synaProfile, synagogueId } = useSynaProfile();
  const [cours, setCours] = useState<CoursItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "zoom" | "presentiel">("all");
  const isPresident = dbRole === "president";

  useEffect(() => {
    const fetchCours = async () => {
      const { data } = await supabase
        .from("cours_zoom")
        .select("*")
        .order("created_at", { ascending: false });
      setCours((data || []) as CoursItem[]);
      setLoading(false);
    };
    void fetchCours();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce cours ?")) return;
    const { error } = await supabase.from("cours_zoom").delete().eq("id", id);
    if (error) toast.error("Erreur de suppression");
    else {
      setCours((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cours supprimé");
    }
  };

  const filtered =
    filter === "all"
      ? cours
      : cours.filter((c) => normalizeCourseType(c.course_type, c.zoom_link, c.address) === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div
        className="rounded-2xl p-4 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Cours de Torah</h3>
            <p className="text-xs text-muted-foreground mt-1">Zoom et Présentiel</p>
          </div>
          {isPresident && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}
            >
              + Nouveau cours
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      {cours.length > 0 && (
        <div className="flex rounded-xl overflow-hidden border border-border mb-4">
          {(["all", "zoom", "presentiel"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-[11px] font-bold border-none cursor-pointer transition-all ${
                filter === f ? "bg-foreground text-background" : "bg-card text-muted-foreground"
              }`}
            >
              {f === "all" ? "Tous" : f === "zoom" ? "🎥 Zoom" : "📍 Présentiel"}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && user && (
          <CoursForm
            userId={user.id}
            synagogueId={synagogueId}
            initialCourseType={filter === "presentiel" ? "presentiel" : "zoom"}
            onCreated={(data) => setCours((prev) => [data as unknown as CoursItem, ...prev])}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun cours programmé.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c, i) => (
            <CoursCard
              key={c.id}
              {...c}
              cityName={city.name}
              isOwner={isPresident && user?.id === c.creator_id}
              index={i}
              synaProfile={synaProfile}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CoursVirtuelWidget;
