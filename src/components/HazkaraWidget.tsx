import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HDate, HebrewCalendar, flags } from "@hebcal/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isNativePlatform, requestNativePushPermission, registerNativePush } from "@/lib/capacitorPush";
import { sharePosterPng } from "@/components/poster/usePosterExport";

const HEBREW_MONTHS = [
  { value: "Nisan", label: "Nissan (ניסן)" },
  { value: "Iyyar", label: "Iyar (אייר)" },
  { value: "Sivan", label: "Sivan (סיון)" },
  { value: "Tamuz", label: "Tamouz (תמוז)" },
  { value: "Av", label: "Av (אב)" },
  { value: "Elul", label: "Eloul (אלול)" },
  { value: "Tishrei", label: "Tichri (תשרי)" },
  { value: "Cheshvan", label: "Hechvan (חשון)" },
  { value: "Kislev", label: "Kislev (כסלו)" },
  { value: "Tevet", label: "Tévet (טבת)" },
  { value: "Sh'vat", label: "Chevat (שבט)" },
  { value: "Adar I", label: "Adar I (אדר א׳)" },
  { value: "Adar II", label: "Adar II (אדר ב׳)" },
  { value: "Adar", label: "Adar (אדר)" },
];

const MONTH_FR: Record<string, string> = {
  Nisan: "Nissan", Iyyar: "Iyar", Sivan: "Sivan", Tamuz: "Tamouz",
  Av: "Av", Elul: "Eloul", Tishrei: "Tichri", Cheshvan: "Hechvan",
  Kislev: "Kislev", Tevet: "Tévet", "Sh'vat": "Chevat",
  "Adar I": "Adar I", "Adar II": "Adar II", Adar: "Adar",
};

function fmtFr(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtFrShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Helpers extraits pour réutilisation (records enregistrés) ───
type Yahrzeit = { hYear: number; greg: Date; hebrew: string; note?: string };

function computeYahrzeits(
  deathHDate: HDate,
  rite: "sefarade" | "ashkenaze",
  count: number = 6
): Yahrzeit[] {
  const currentHYear = new HDate().getFullYear();
  const startYear = Math.max(deathHDate.getFullYear() + 1, currentHYear);
  const out: Yahrzeit[] = [];

  for (let y = startYear; y < startYear + count; y++) {
    const isLeap = HDate.isLeapYear(y);
    const deathMonthName = deathHDate.getMonthName();
    let monthName = deathMonthName;
    let note: string | undefined;

    if (deathMonthName === "Adar") {
      if (isLeap) {
        monthName = "Adar II";
        note = "Année embolismique — Hazkara en Adar II";
      }
    } else if (deathMonthName === "Adar I") {
      if (!isLeap) monthName = "Adar";
    } else if (deathMonthName === "Adar II") {
      if (!isLeap) monthName = "Adar";
      else {
        monthName = rite === "sefarade" ? "Adar II" : "Adar I";
        note = rite === "sefarade"
          ? "Coutume séfarade — Hazkara en Adar II"
          : "Coutume ashkénaze — Hazkara en Adar I";
      }
    }

    let day = deathHDate.getDate();
    if (day === 30 && (monthName === "Cheshvan" || monthName === "Kislev")) {
      const monthNum = HDate.monthFromName(monthName);
      const daysInMonth = HDate.daysInMonth(monthNum, y);
      if (daysInMonth < 30) {
        day = 29;
        note = (note ? note + " · " : "") + "Mois court — observé le 29";
      }
    }

    try {
      const monthNum = HDate.monthFromName(monthName);
      const yzHd = new HDate(day, monthNum, y);
      let greg = yzHd.greg();

      const isChagDay = (d: Date) => {
        const evs = HebrewCalendar.calendar({ start: d, end: d, il: false });
        return evs.find((e) => e.getFlags() & flags.CHAG);
      };
      const isErevChag = (d: Date) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return !!isChagDay(next);
      };

      const originalChag = isChagDay(greg);
      let conflictReason: string | null = null;
      const dow0 = greg.getDay();
      if (originalChag) {
        conflictReason = `Tombe pendant ${originalChag.render("fr") || originalChag.getDesc()} — devancée avant la fête`;
      } else if (dow0 === 5 || dow0 === 6) {
        conflictReason = "Tombe vendredi soir / Chabbat — devancée au jeudi soir";
      }
      if (conflictReason) {
        const advanced = new Date(greg);
        for (let i = 0; i < 14; i++) {
          advanced.setDate(advanced.getDate() - 1);
          const d = advanced.getDay();
          if (d === 5 || d === 6) continue;
          if (isChagDay(advanced)) continue;
          if (isErevChag(advanced)) continue;
          break;
        }
        greg = advanced;
        note = (note ? note + " · " : "") + conflictReason;
      }

      out.push({ hYear: y, greg, hebrew: yzHd.renderGematriya(), note });
    } catch { /* skip */ }
  }
  return out;
}

interface HazkaraRecord {
  id: string;
  deceased_name: string;
  hebrew_day: number;
  hebrew_month: string;
  hebrew_year: number;
  rite: "sefarade" | "ashkenaze";
}

const HazkaraWidget = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"greg" | "heb">("greg");
  const [gregDate, setGregDate] = useState("");
  const [afterSunset, setAfterSunset] = useState(false);
  const [hebDay, setHebDay] = useState("1");
  const [hebMonth, setHebMonth] = useState("Tishrei");
  const [hebYear, setHebYear] = useState(new HDate().getFullYear().toString());
  const [rite, setRite] = useState<"sefarade" | "ashkenaze">("sefarade");
  const [deceasedName, setDeceasedName] = useState("");
  const [reminders, setReminders] = useState<Record<string, string>>({}); // observance_date -> id
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [records, setRecords] = useState<HazkaraRecord[]>([]);
  const [savingRecord, setSavingRecord] = useState(false);
  const [posterData, setPosterData] = useState<{ name: string; greg: Date; hebrew: string } | null>(null);
  const [sharingKey, setSharingKey] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const loadRecords = async () => {
    if (!user) { setRecords([]); return; }
    const { data } = await supabase
      .from("hazkara_records")
      .select("id, deceased_name, hebrew_day, hebrew_month, hebrew_year, rite")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRecords((data as any) || []);
  };
  useEffect(() => { loadRecords(); }, [user]);

  // Load existing reminders for this user
  useEffect(() => {
    if (!user) { setReminders({}); return; }
    (async () => {
      const { data } = await supabase
        .from("hazkara_reminders")
        .select("id, observance_date")
        .eq("user_id", user.id)
        .eq("sent", false);
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.observance_date] = r.id;
      setReminders(map);
    })();
  }, [user]);

  const ensurePushPermission = async () => {
    if (isNativePlatform()) {
      const granted = await requestNativePushPermission();
      if (granted) await registerNativePush();
      return granted;
    }
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  };

  const toggleReminder = async (greg: Date, hebrew: string) => {
    if (!user) {
      toast.error("Connectez-vous pour activer le rappel");
      return;
    }
    if (!deceasedName.trim()) {
      toast.error("Entrez le nom du défunt");
      return;
    }
    const yyyy = greg.getFullYear();
    const mm = String(greg.getMonth() + 1).padStart(2, "0");
    const dd = String(greg.getDate()).padStart(2, "0");
    const observance = `${yyyy}-${mm}-${dd}`;
    setSavingDate(observance);
    try {
      if (reminders[observance]) {
        await supabase.from("hazkara_reminders").delete().eq("id", reminders[observance]);
        const next = { ...reminders };
        delete next[observance];
        setReminders(next);
        toast.success("Rappel supprimé", { duration: 2000 });
      } else {
        const ok = await ensurePushPermission();
        if (!ok) {
          toast.error("Notifications refusées par le navigateur");
          return;
        }
        const { data, error } = await supabase
          .from("hazkara_reminders")
          .insert({
            user_id: user.id,
            deceased_name: deceasedName.trim(),
            observance_date: observance,
            hebrew_label: hebrew,
          })
          .select("id")
          .single();
        if (error) throw error;
        setReminders({ ...reminders, [observance]: data.id });
        toast.success("Rappel programmé la veille au soir", { duration: 2000 });
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSavingDate(null);
    }
  };

  const result = useMemo(() => {
    try {
      let deathHDate: HDate;

      if (mode === "greg") {
        if (!gregDate) return null;
        const [y, m, d] = gregDate.split("-").map(Number);
        if (!y || !m || !d) return null;
        const gd = new Date(y, m - 1, d);
        if (afterSunset) {
          // After sunset = next Hebrew day (use next civil day for conversion)
          gd.setDate(gd.getDate() + 1);
        }
        deathHDate = new HDate(gd);
      } else {
        const day = parseInt(hebDay);
        const year = parseInt(hebYear);
        if (!day || !year || day < 1 || day > 30) return null;
        // Get month number
        const isLeap = HDate.isLeapYear(year);
        let monthName = hebMonth;
        // Adar handling
        if (monthName === "Adar" && isLeap) monthName = "Adar II";
        if ((monthName === "Adar I" || monthName === "Adar II") && !isLeap) monthName = "Adar";
        try {
          const monthNum = HDate.monthFromName(monthName);
          deathHDate = new HDate(day, monthNum, year);
        } catch {
          return null;
        }
      }

      const hebrewLabel = `${deathHDate.getDate()} ${MONTH_FR[deathHDate.getMonthName()] || deathHDate.getMonthName()} ${deathHDate.getFullYear()}`;
      const hebrewGematria = deathHDate.renderGematriya();
      const yahrzeits = computeYahrzeits(deathHDate, rite, 6);
      return { hebrewLabel, hebrewGematria, deathHDate, yahrzeits };
    } catch {
      return null;
    }
  }, [mode, gregDate, afterSunset, hebDay, hebMonth, hebYear, rite]);

  const saveCurrentRecord = async () => {
    if (!user) { toast.error("Connectez-vous pour enregistrer"); return; }
    if (!result) { toast.error("Calculez d'abord la date"); return; }
    if (!deceasedName.trim()) { toast.error("Entrez le nom du défunt"); return; }
    setSavingRecord(true);
    try {
      const { error } = await supabase.from("hazkara_records").insert({
        user_id: user.id,
        deceased_name: deceasedName.trim(),
        hebrew_day: result.deathHDate.getDate(),
        hebrew_month: result.deathHDate.getMonthName(),
        hebrew_year: result.deathHDate.getFullYear(),
        rite,
      });
      if (error) throw error;
      toast.success("Défunt enregistré", { duration: 2000 });
      setDeceasedName("");
      await loadRecords();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSavingRecord(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Supprimer ce défunt et ses rappels ?")) return;
    await supabase.from("hazkara_records").delete().eq("id", id);
    await loadRecords();
    toast.success("Défunt supprimé", { duration: 2000 });
  };

  const sharePoster = async (name: string, greg: Date, hebrew: string, key: string) => {
    if (!name?.trim()) { toast.error("Nom du défunt requis"); return; }
    setSharingKey(key);
    setPosterData({ name: name.trim(), greg, hebrew });
    await new Promise((r) => setTimeout(r, 150));
    const yyyy = greg.getFullYear();
    const dateFr = greg.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await sharePosterPng(
      posterRef.current,
      `hazkara-${name.trim().replace(/\s+/g, "-")}-${yyyy}.png`,
      `Hazkara ${name.trim()} — ${dateFr}`,
      `🕯️ En mémoire de ${name.trim()}\nHazkara le ${dateFr}\nQue son âme soit liée au faisceau des vivants 🕊️`,
    );
    setSharingKey(null);
    setPosterData(null);
  };

  // Compute next yahrzeit per saved record
  const recordsWithNext = useMemo(() => {
    return records.map((r) => {
      try {
        const isLeap = HDate.isLeapYear(r.hebrew_year);
        let monthName = r.hebrew_month;
        if (monthName === "Adar" && isLeap) monthName = "Adar II";
        if ((monthName === "Adar I" || monthName === "Adar II") && !isLeap) monthName = "Adar";
        const monthNum = HDate.monthFromName(monthName);
        const deathHDate = new HDate(r.hebrew_day, monthNum, r.hebrew_year);
        const next = computeYahrzeits(deathHDate, r.rite, 1)[0];
        return { record: r, next };
      } catch {
        return { record: r, next: null as Yahrzeit | null };
      }
    });
  }, [records]);

  return (
    <motion.div
      className="rounded-2xl bg-card p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🕯️ Calcul de Hazkara (Yahrzeit)
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
        Calcul de la date hébraïque du décès et des prochaines azkarot. La hazkara est observée chaque année à la date hébraïque du décès.
      </p>

      {/* Mes défunts enregistrés */}
      {user && recordsWithNext.length > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-border" style={{ background: "hsl(var(--gold) / 0.04)" }}>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            🕯️ Mes défunts enregistrés
          </h4>
          <div className="space-y-2">
            {recordsWithNext.map(({ record, next }) => {
              const veille = next ? new Date(next.greg) : null;
              if (veille) veille.setDate(veille.getDate() - 1);
              const key = next
                ? `${next.greg.getFullYear()}-${String(next.greg.getMonth() + 1).padStart(2, "0")}-${String(next.greg.getDate()).padStart(2, "0")}`
                : "";
              const active = !!reminders[key];
              const loading = savingDate === key;
              return (
                <div
                  key={record.id}
                  className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border"
                  style={{ borderLeft: "3px solid hsl(var(--gold))" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{record.deceased_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {record.hebrew_day} {MONTH_FR[record.hebrew_month] || record.hebrew_month} {record.hebrew_year}
                    </p>
                    {next && veille && (
                      <div className="mt-1.5 text-[11px] leading-relaxed">
                        <p className="text-foreground capitalize">
                          🕯️ {fmtFrShort(veille)} au soir
                        </p>
                        <p className="text-foreground capitalize">
                          🪦 {fmtFrShort(next.greg)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {next && (
                      <button
                        onClick={() => {
                          setDeceasedName(record.deceased_name);
                          setTimeout(() => toggleReminder(next.greg, next.hebrew), 0);
                        }}
                        disabled={loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                        style={active
                          ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                          : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        }
                        title={active ? "Désactiver le rappel" : "Activer le rappel"}
                      >
                        {loading ? "…" : active ? "🔔" : "🔕"}
                      </button>
                    )}
                    {next && (
                      <button
                        onClick={() => sharePoster(record.deceased_name, next.greg, next.hebrew, `rec-${record.id}`)}
                        disabled={sharingKey === `rec-${record.id}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                        style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
                        title="Partager l'affiche sur WhatsApp"
                      >
                        {sharingKey === `rec-${record.id}` ? "…" : "📤"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-muted text-muted-foreground hover:text-destructive transition-all"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1.5 mt-4">
        <button
          onClick={() => setMode("greg")}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all"
          style={mode === "greg"
            ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
            : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
          }
        >
          📅 Date civile
        </button>
        <button
          onClick={() => setMode("heb")}
          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all"
          style={mode === "heb"
            ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
            : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
          }
        >
          ✡️ Date hébraïque
        </button>
      </div>

      {/* Inputs */}
      <div className="mt-4 p-4 rounded-xl border border-border space-y-3" style={{ background: "hsl(var(--muted))" }}>
        {mode === "greg" ? (
          <>
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">Date du décès (calendrier civil)</label>
              <input
                type="date"
                value={gregDate}
                onChange={(e) => setGregDate(e.target.value)}
                style={{ fontSize: "16px" }}
                className="w-full px-3 py-2 rounded-lg bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">Moment du décès</label>
              <div className="flex gap-1.5">
                {([
                  { id: false, label: "☀️ Jour", sub: "avant le coucher du soleil" },
                  { id: true, label: "🌙 Nuit", sub: "après le coucher du soleil" },
                ] as const).map((opt) => (
                  <button
                    key={String(opt.id)}
                    onClick={() => setAfterSunset(opt.id)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-xs font-bold border cursor-pointer transition-all text-left"
                    style={afterSunset === opt.id
                      ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" }
                      : { background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                    }
                  >
                    <div className="text-sm">{opt.label}</div>
                    <div className="text-[9px] font-normal opacity-80 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                {afterSunset
                  ? "→ Jour hébraïque suivant retenu automatiquement"
                  : "→ Jour hébraïque correspondant à la date civile"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Jour</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="30"
                  value={hebDay}
                  onChange={(e) => setHebDay(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="w-full px-2 py-2 rounded-lg bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Mois</label>
                <select
                  value={hebMonth}
                  onChange={(e) => setHebMonth(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="w-full px-2 py-2 rounded-lg bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {HEBREW_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Année hébraïque</label>
              <input
                type="number"
                inputMode="numeric"
                min="5000"
                max="6000"
                value={hebYear}
                onChange={(e) => setHebYear(e.target.value)}
                style={{ fontSize: "16px" }}
                className="w-full px-3 py-2 rounded-lg bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </>
        )}

        {/* Rite */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Rite (pour les années bissextiles)</label>
          <div className="flex gap-1.5">
            {([
              { id: "sefarade", label: "Séfarade" },
              { id: "ashkenaze", label: "Ashkénaze" },
            ] as const).map((r) => (
              <button
                key={r.id}
                onClick={() => setRite(r.id)}
                className="flex-1 px-2 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all"
                style={rite === r.id
                  ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" }
                  : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          <div className="p-4 rounded-xl border" style={{
            background: "hsl(var(--gold) / 0.06)",
            borderColor: "hsl(var(--gold) / 0.25)",
          }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date hébraïque du décès</p>
            <p className="text-base font-bold text-foreground">{result.hebrewLabel}</p>
            <p className="text-sm font-display text-foreground/70 mt-0.5" dir="rtl">{result.hebrewGematria}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prochaines azkarot</h4>
            {/* Nom défunt pour rappel */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                Nom du défunt (pour les rappels)
              </label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder="Ex : Avraham ben Yitzchak"
                style={{ fontSize: "16px" }}
                className="w-full px-3 py-2 rounded-lg bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                Cliquez sur 🔔 pour un rappel ponctuel, ou enregistrez le défunt pour le retrouver chaque année.
              </p>
              {user && (
                <button
                  onClick={saveCurrentRecord}
                  disabled={savingRecord || !deceasedName.trim()}
                  className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
                >
                  {savingRecord ? "Enregistrement…" : "💾 Enregistrer ce défunt"}
                </button>
              )}
            </div>
            {result.yahrzeits.map((y) => (
              <div
                key={y.hYear}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
                style={{ borderLeft: "3px solid hsl(var(--gold))" }}
              >
                <span className="text-base flex-shrink-0">🕯️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground capitalize">{fmtFr(y.greg)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5" dir="rtl">{y.hebrew}</p>
                  {(() => {
                    const veille = new Date(y.greg);
                    veille.setDate(veille.getDate() - 1);
                    return (
                      <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed">
                        <p className="text-foreground">
                          <span className="font-bold">🕯️ Bougie :</span>{" "}
                          <span className="capitalize">{fmtFrShort(veille)} au soir</span>{" "}
                          <span className="text-muted-foreground">(à la sortie des étoiles)</span>
                        </p>
                        <p className="text-foreground">
                          <span className="font-bold">🪦 Hazkara & cimetière :</span>{" "}
                          <span className="capitalize">{fmtFrShort(y.greg)}</span>
                        </p>
                      </div>
                    );
                  })()}
                  {y.note && (
                    <p className="text-[10px] text-muted-foreground italic mt-1">⚠️ {y.note}</p>
                  )}
                </div>
                {(() => {
                  const yyyy = y.greg.getFullYear();
                  const mm = String(y.greg.getMonth() + 1).padStart(2, "0");
                  const dd = String(y.greg.getDate()).padStart(2, "0");
                  const key = `${yyyy}-${mm}-${dd}`;
                  const active = !!reminders[key];
                  const loading = savingDate === key;
                  return (
                    <button
                      onClick={() => toggleReminder(y.greg, y.hebrew)}
                      disabled={loading}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base transition-all"
                      style={active
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                      }
                      title={active ? "Désactiver le rappel" : "Recevoir un rappel la veille"}
                    >
                      {loading ? "…" : active ? "🔔" : "🔕"}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <div className="mt-5 p-4 rounded-xl text-center border border-primary/15" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-xs font-bold text-primary mb-1.5">⚠️ Rappel important</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          La veille de la hazkara, allumez une bougie qui brûlera 24h. Consultez votre Rav pour les cas particuliers (1ère année, mois d'Adar en année embolismique, 30 Hechvan/Kislev).
        </p>
      </div>

      {/* Halakha guide */}
      <div className="mt-4 p-4 rounded-xl border border-border bg-card space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">📜 Règles essentielles</h4>

        <div className="text-[11px] text-muted-foreground leading-relaxed space-y-2">
          <p>
            <strong className="text-foreground">🕯️ Bougie :</strong> allumée la veille de la Hazkara <strong>à la sortie des étoiles</strong>, doit brûler 24h.
          </p>
          <p>
            <strong className="text-foreground">📅 Chabbat :</strong> si la Hazkara tombe un <strong>vendredi soir / Chabbat</strong>, la bougie est allumée le <strong>jeudi soir</strong> précédent à la sortie des étoiles.
          </p>
          <p>
            <strong className="text-foreground">🎉 Fêtes :</strong> si la Hazkara tombe pendant les fêtes, on <strong>devance</strong> la cérémonie avant les fêtes.
          </p>
          <p>
            <strong className="text-foreground">✡️ Adar II (année embolismique) :</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Niftar en Adar II → année non-embolismique : Hazkara en <strong>Adar</strong>.</li>
            <li>
              <strong>Séfaradim</strong> : Hazkara en <strong>Adar II</strong>, jeûne en Adar I (pour ceux qui jeûnent).
            </li>
            <li>
              <strong>Ashkénazim</strong> : Hazkara en <strong>Adar I</strong>.
            </li>
          </ul>
          <p>
            <strong className="text-foreground">🪦 Visite au cimetière :</strong> il est possible de se rendre sur la tombe chaque <strong>veille de Roch Hodech</strong>.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default HazkaraWidget;
