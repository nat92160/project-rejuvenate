import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";
import { isNativePlatform, requestNativePushPermission, registerNativePush } from "@/lib/capacitorPush";

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

interface SubscribedSyna {
  id: string;
  synagogue_id: string;
  name: string;
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

/* ─── Notification Toggle Item ─── */
const NotifToggle = ({
  icon,
  label,
  description,
  enabled,
  loading,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="flex-1 min-w-0">
      <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
        {icon} {label}
      </h4>
      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
    </div>
    <button
      onClick={onToggle}
      disabled={loading}
      className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0"
      style={{ background: enabled ? "hsl(var(--gold))" : "hsl(var(--muted))" }}
    >
      <span
        className="absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  </div>
);

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

  // Subscribed synagogues
  const [subscribedSynas, setSubscribedSynas] = useState<SubscribedSyna[]>([]);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  // Notification preferences (stored in localStorage for now)
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("notif_prefs") || "{}");
    } catch {
      return {};
    }
  });
  const [pushLoading, setPushLoading] = useState(false);
  const native = isNativePlatform();
  const pushSupported = native || ("serviceWorker" in navigator && "PushManager" in window);
  const pushGranted = native || (pushSupported && "Notification" in window && Notification.permission === "granted");

  const toggleNotifPref = async (key: string) => {
    if (!pushGranted && !notifPrefs[key]) {
      setPushLoading(true);
      let permission: string;
      if (native) {
        const granted = await requestNativePushPermission();
        permission = granted ? "granted" : "denied";
      } else {
        permission = await Notification.requestPermission();
      }
      setPushLoading(false);
      if (permission !== "granted") {
        toast.error("Activez les notifications dans les réglages de votre appareil.");
        return;
      }
    }
    const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(newPrefs);
    localStorage.setItem("notif_prefs", JSON.stringify(newPrefs));
    toast.success(newPrefs[key] ? "✅ Notification activée" : "Notification désactivée");
  };

  // Fetch subscribed synagogues
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase
        .from("synagogue_subscriptions")
        .select("id, synagogue_id")
        .eq("user_id", user.id);

      if (subs && subs.length > 0) {
        const synaIds = subs.map((s: any) => s.synagogue_id);
        const { data: profiles } = await supabase
          .from("synagogue_profiles")
          .select("id, name")
          .in("id", synaIds);

        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
        setSubscribedSynas(subs.map((s: any) => ({
          id: s.id,
          synagogue_id: s.synagogue_id,
          name: nameMap.get(s.synagogue_id) || "Synagogue",
        })));
      } else {
        setSubscribedSynas([]);
      }
    })();
  }, [user]);

  const handleUnsubscribe = async (subId: string, synaName: string) => {
    setUnsubscribing(subId);
    await supabase.from("synagogue_subscriptions").delete().eq("id", subId);
    setSubscribedSynas(prev => prev.filter(s => s.id !== subId));
    toast.success(`Désabonné de ${synaName}`);
    setUnsubscribing(null);
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

  const handleShare = async (d: PersonalDate) => {
    const typeLabel = DATE_TYPES.find((t) => t.value === d.date_type)?.label || d.date_type;
    const hebStr = formatHebrewDate(d.hebrew_date_day, d.hebrew_date_month);
    const dateStr = d.civil_date
      ? new Date(d.civil_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const text = `${typeLabel} — ${d.hebrew_name}${hebStr ? `\n📜 ${hebStr}` : ""}${dateStr ? `\n📅 ${dateStr}` : ""}${d.notes ? `\n${d.notes}` : ""}\n\nPartagé via Chabbat Chalom`;

    await shareText(text, `${typeLabel} — ${d.hebrew_name}`);
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

      {/* ─── Mes Synagogues ─── */}
      <div className="rounded-2xl bg-card p-4 border border-border space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">🏛️ Mes Synagogues</h4>
        {subscribedSynas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun abonnement. Rendez-vous dans l'onglet <strong>Ma Communauté</strong> pour vous abonner.</p>
        ) : (
          <div className="space-y-2">
            {subscribedSynas.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">🕍</span>
                  <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                </div>
                <button
                  onClick={() => handleUnsubscribe(s.id, s.name)}
                  disabled={unsubscribing === s.id}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {unsubscribing === s.id ? "..." : "Se désabonner"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Notifications ─── */}
      <div className="rounded-2xl bg-card p-4 border border-border space-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
        <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2 mb-2">🔔 Mes Notifications</h4>

        <NotifToggle
          icon="🕯️"
          label="Allumage des bougies"
          description="Rappel 18 min avant l'allumage"
          enabled={!!notifPrefs.shabbat}
          loading={pushLoading}
          onToggle={() => toggleNotifPref("shabbat")}
        />

        <div className="border-t border-border" />

        <NotifToggle
          icon="🌾"
          label="Compte du Omer"
          description="Rappel chaque soir pour compter le Omer"
          enabled={!!notifPrefs.omer}
          loading={pushLoading}
          onToggle={() => toggleNotifPref("omer")}
        />

        <div className="border-t border-border" />

        <NotifToggle
          icon="🕐"
          label="Changement d'horaires"
          description="Prévenu quand les horaires de ma synagogue changent"
          enabled={!!notifPrefs.horaires}
          loading={pushLoading}
          onToggle={() => toggleNotifPref("horaires")}
        />

        <div className="border-t border-border" />

        <NotifToggle
          icon="📢"
          label="Alertes de ma synagogue"
          description="Annonces, événements et urgences communautaires"
          enabled={!!notifPrefs.alertes}
          loading={pushLoading}
          onToggle={() => toggleNotifPref("alertes")}
        />

        {!pushSupported && (
          <p className="text-[10px] text-destructive mt-2">⚠️ Notifications non supportées sur ce navigateur</p>
        )}
      </div>

      {/* ─── Dates personnelles ─── */}
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
