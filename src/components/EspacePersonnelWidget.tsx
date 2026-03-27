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

const HEBREW_MONTHS = [
  "Nisan", "Iyyar", "Sivan", "Tamuz", "Av", "Elul",
  "Tishrei", "Cheshvan", "Kislev", "Tevet", "Shvat", "Adar", "Adar II",
];

const HEBREW_MONTHS_HEB: Record<string, string> = {
  Nisan: "ניסן", Iyyar: "אייר", Sivan: "סיון", Tamuz: "תמוז",
  Av: "אב", Elul: "אלול", Tishrei: "תשרי", Cheshvan: "חשון",
  Kislev: "כסלו", Tevet: "טבת", Shvat: "שבט", Adar: "אדר", "Adar II": "אדר ב׳",
};

async function hebrewToGregorian(hd: number, hm: string, hy: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.hebcal.com/converter?cfg=json&h2g=1&hd=${hd}&hm=${encodeURIComponent(hm)}&hy=${hy}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.gy) {
      const m = String(data.gm).padStart(2, "0");
      const d = String(data.gd).padStart(2, "0");
      return `${data.gy}-${m}-${d}`;
    }
    return null;
  } catch {
    return null;
  }
}

function formatHebrewDate(day: number | null, month: string | null): string {
  if (!day || !month) return "";
  const hebMonth = HEBREW_MONTHS_HEB[month] || month;
  return `${day} ${hebMonth}`;
}

const EspacePersonnelWidget = () => {
  const { user } = useAuth();
  const [dates, setDates] = useState<PersonalDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("azkarot");
  const [formName, setFormName] = useState("");
  const [formDay, setFormDay] = useState(1);
  const [formMonth, setFormMonth] = useState("Tishrei");
  const [formYear, setFormYear] = useState(5786);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Push notification toggle
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (pushSupported && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  const togglePush = async () => {
    if (!pushSupported) {
      toast.error("Les notifications ne sont pas supportées sur ce navigateur.");
      return;
    }
    setPushLoading(true);
    try {
      if (pushEnabled) {
        toast.info("Pour désactiver, modifiez les permissions dans les réglages de votre navigateur.");
      } else {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setPushEnabled(true);
          toast.success("✅ Alertes allumage activées !");
        } else {
          toast.error("Permission refusée. Activez les notifications dans les réglages du navigateur.");
        }
      }
    } catch {
      toast.error("Erreur lors de l'activation.");
    }
    setPushLoading(false);
  };

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

    // Convert Hebrew date to civil for storage
    const civilDate = await hebrewToGregorian(formDay, formMonth, formYear);

    const { data, error } = await supabase
      .from("personal_dates")
      .insert({
        user_id: user.id,
        date_type: formType,
        hebrew_name: formName.trim(),
        civil_date: civilDate,
        hebrew_date_day: formDay,
        hebrew_date_month: formMonth,
        notes: formNotes.trim(),
      } as never)
      .select()
      .single();

    if (error) toast.error("Erreur");
    else {
      const newDate = data as PersonalDate;
      setDates((prev) => [newDate, ...prev]);
      setShowForm(false);
      setFormName("");
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
    const hebStr = formatHebrewDate(d.hebrew_date_day, d.hebrew_date_month);
    const dateStr = d.civil_date
      ? new Date(d.civil_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const text = `${typeLabel} — ${d.hebrew_name}${hebStr ? `\n📜 ${hebStr}` : ""}${dateStr ? `\n📅 ${dateStr}` : ""}${d.notes ? `\n${d.notes}` : ""}\n\nPartagé via Chabbat Chalom`;

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

  const selectClass = "w-full px-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Push Notification Toggle */}
      <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">🔔 Alerte Allumage</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recevoir un rappel 18 min avant l'allumage des bougies</p>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0"
            style={{ background: pushEnabled ? "hsl(var(--gold))" : "hsl(var(--muted))" }}
          >
            <span
              className="absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: pushEnabled ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        {!pushSupported && (
          <p className="text-[10px] text-destructive mt-2">⚠️ Notifications non supportées sur ce navigateur</p>
        )}
      </div>

      {/* Header */}
      <div className="rounded-2xl p-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
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

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 border border-primary/20 overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-4">
              {/* Type selector */}
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

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nom hébraïque</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Yaakov ben Avraham"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ minHeight: "48px" }}
                />
              </div>

              {/* Hebrew date selectors */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">📜 Date hébraïque</label>
                <div className="mobile-form-grid-3 gap-2">
                  <div className="min-w-0">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Jour</label>
                    <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className={selectClass} style={{ minHeight: "48px" }}>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Mois</label>
                    <select value={formMonth} onChange={(e) => setFormMonth(e.target.value)} className={selectClass} style={{ minHeight: "48px" }}>
                      {HEBREW_MONTHS.map((m) => (
                        <option key={m} value={m}>{HEBREW_MONTHS_HEB[m] || m} ({m})</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Année</label>
                    <select value={formYear} onChange={(e) => setFormYear(Number(e.target.value))} className={selectClass} style={{ minHeight: "48px" }}>
                      {Array.from({ length: 50 }, (_, i) => 5760 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Notes (optionnel)</label>
                <input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ minHeight: "48px" }}
                />
              </div>

              {/* Submit */}
              <button onClick={handleAdd} disabled={submitting || !formName.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dates list */}
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
            const hebStr = formatHebrewDate(d.hebrew_date_day, d.hebrew_date_month);
            return (
              <motion.div key={d.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeInfo?.icon || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-sm font-bold text-foreground">{d.hebrew_name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{typeInfo?.label}</p>
                    {hebStr && (
                      <p className="text-xs font-semibold mt-1" style={{ color: "hsl(var(--gold-matte))" }}>
                        📜 {hebStr}
                      </p>
                    )}
                    {d.civil_date && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
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
