import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PersonalDate {
  id: string;
  date_type: string;
  hebrew_name: string;
  civil_date: string | null;
  hebrew_date_day: number | null;
  hebrew_date_month: string | null;
  notes: string;
  created_at: string;
}

const DATE_TYPES = [
  { value: "azkarot", label: "Azkarot", icon: "🕯️" },
  { value: "hachkaba", label: "Hachkaba", icon: "🪦" },
  { value: "anniversaire", label: "Anniversaire", icon: "🎂" },
  { value: "bar_mitsva", label: "Bar/Bat Mitsva", icon: "📜" },
  { value: "autre", label: "Autre", icon: "📌" },
];

const EspacePersonnelWidget = () => {
  const { user } = useAuth();
  const [dates, setDates] = useState<PersonalDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("azkarot");
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("personal_dates")
      .select("*")
      .eq("user_id", user.id)
      .order("civil_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("Erreur chargement des dates");
        setDates((data as PersonalDate[]) || []);
        setLoading(false);
      });
  }, [user]);

  const handleAdd = async () => {
    if (!user || !formName.trim()) { toast.error("Entrez un nom"); return; }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("personal_dates")
      .insert({
        user_id: user.id,
        date_type: formType,
        hebrew_name: formName.trim(),
        civil_date: formDate || null,
        notes: formNotes.trim(),
      } as never)
      .select()
      .single();

    if (error) toast.error("Erreur");
    else {
      setDates((prev) => [data as PersonalDate, ...prev]);
      setShowForm(false);
      setFormName("");
      setFormDate("");
      setFormNotes("");
      toast.success("✅ Date ajoutée !");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("personal_dates").delete().eq("id", id);
    setDates((prev) => prev.filter((d) => d.id !== id));
    toast.success("Date supprimée");
  };

  const handleShare = (d: PersonalDate) => {
    const typeLabel = DATE_TYPES.find((t) => t.value === d.date_type)?.label || d.date_type;
    const dateStr = d.civil_date
      ? new Date(d.civil_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const text = `${typeLabel} — ${d.hebrew_name}${dateStr ? `\n📅 ${dateStr}` : ""}${d.notes ? `\n${d.notes}` : ""}\n\nPartagé via Chabbat Chalom`;

    if (navigator.share) {
      navigator.share({ title: `${typeLabel} — ${d.hebrew_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copié dans le presse-papier !");
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🔒</span>
        <p className="text-sm text-muted-foreground mt-3">Connectez-vous pour accéder à votre espace personnel.</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-4 mb-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">🕯️ Mes Dates Personnelles</h3>
            <p className="text-xs text-muted-foreground mt-1">Azkarot, Hachkaba, Anniversaires...</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
            {showForm ? "✕" : "+ Ajouter"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {DATE_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setFormType(t.value)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold border-none cursor-pointer transition-all"
                    style={{
                      background: formType === t.value ? "hsl(var(--gold) / 0.15)" : "hsl(var(--muted) / 0.5)",
                      color: formType === t.value ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nom hébraïque (ex: Yaakov ben Avraham)" className={inputClass} />
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} style={{ minHeight: "48px" }} />
              <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes (optionnel)" className={inputClass} />
              <button onClick={handleAdd} disabled={submitting || !formName.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : dates.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-4xl">📅</span>
          <p className="text-sm text-muted-foreground mt-3">Aucune date personnelle enregistrée.</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez vos Azkarot et dates importantes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((d, i) => {
            const typeInfo = DATE_TYPES.find((t) => t.value === d.date_type);
            return (
              <motion.div key={d.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeInfo?.icon || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-sm font-bold text-foreground">{d.hebrew_name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{typeInfo?.label}</p>
                    {d.civil_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📅 {new Date(d.civil_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    {d.notes && <p className="text-xs text-muted-foreground/80 mt-1 italic">{d.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pl-9">
                  <button onClick={() => handleShare(d)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
                    📤 Partager
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer">
                    🗑️
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default EspacePersonnelWidget;
