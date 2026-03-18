import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Patient {
  id: string;
  hebrew_name: string;
  mother_name: string;
  created_at: string;
  added_by: string | null;
}

const RefouaChelemaWidget = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [mother, setMother] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("refoua_chelema")
        .select("*")
        .order("created_at", { ascending: false });
      setPatients(data || []);
      setLoading(false);
    };
    fetchPatients();

    // Realtime
    const channel = supabase
      .channel("refoua-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "refoua_chelema" }, () => {
        fetchPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("refoua_chelema").insert({
      hebrew_name: name.trim(),
      mother_name: mother.trim(),
      added_by: user.id,
    }).select().single();

    if (data && !error) {
      setPatients((prev) => [data, ...prev]);
      setShowForm(false);
      setName("");
      setMother("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("refoua_chelema").delete().eq("id", id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            🙏 Refoua Chelema
          </h3>
          {user && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}
            >
              + Ajouter
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Liste des malades à mentionner pendant la prière
        </p>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="rounded-2xl bg-card p-5 mb-4 border border-primary/20"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom hébreu du malade"
              dir="rtl"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            <input
              value={mother}
              onChange={(e) => setMother(e.target.value)}
              placeholder="Prénom hébreu de la mère"
              dir="rtl"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !name.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}
            >
              {submitting ? "Ajout..." : "Ajouter à la liste"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun nom pour le moment.</p>
          {!user && <p className="text-xs text-muted-foreground/60 mt-2">Connectez-vous pour ajouter un nom.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p, i) => (
            <motion.div
              key={p.id}
              className="rounded-xl bg-card p-4 border border-border flex items-center justify-between"
              style={{ boxShadow: "var(--shadow-soft)" }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🕯️</span>
                <div>
                  <span className="font-hebrew text-base font-bold text-foreground" dir="rtl">
                    {p.hebrew_name} {p.mother_name ? `בן/בת ${p.mother_name}` : ""}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ajouté le {formatDate(p.created_at)}</p>
                </div>
              </div>
              {user && p.added_by === user.id && (
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-[10px] text-destructive bg-transparent border-none cursor-pointer hover:underline"
                >
                  🗑️
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Prayer text */}
      <div className="rounded-2xl bg-card p-5 mt-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="font-hebrew text-sm text-foreground leading-relaxed" dir="rtl">
          מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב הוּא יְבָרֵךְ וִירַפֵּא אֶת הַחוֹלִים
        </p>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Que le Tout-Puissant accorde une guérison complète à tous les malades
        </p>
      </div>
    </motion.div>
  );
};

export default RefouaChelemaWidget;
