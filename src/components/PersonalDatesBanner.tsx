import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PersonalDate {
  id: string;
  date_type: string;
  hebrew_name: string;
  civil_date: string | null;
  hebrew_date_day: number | null;
  hebrew_date_month: string | null;
  notes: string | null;
}

const TYPE_META: Record<string, { label: string; icon: string }> = {
  azkarot: { label: "Azkara", icon: "🕯️" },
  hachkaba: { label: "Hachkaba", icon: "🪦" },
  anniversaire: { label: "Anniversaire", icon: "🎂" },
  bar_mitsva: { label: "Bar/Bat Mitsva", icon: "📜" },
  autre: { label: "Date importante", icon: "📌" },
};

const HEBREW_MONTHS_HEB: Record<string, string> = {
  Nisan: "ניסן", Iyyar: "אייר", Sivan: "סיון", Tamuz: "תמוז",
  Av: "אב", Elul: "אלול", Tishrei: "תשרי", Cheshvan: "חשון",
  Kislev: "כסלו", Tevet: "טבת", Shvat: "שבט", Adar: "אדר", "Adar II": "אדר ב׳",
};

/** Compute next civil occurrence (this year or next year) for a stored civil_date, returning days-until and date label. */
const computeUpcoming = (d: PersonalDate): { daysUntil: number; nextDate: Date } | null => {
  if (!d.civil_date) return null;
  const [, mm, dd] = d.civil_date.split("-").map((s) => parseInt(s, 10));
  if (!mm || !dd) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), mm - 1, dd);
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
  const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
  return { daysUntil: diff, nextDate: next };
};

const PersonalDatesBanner = () => {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<{ d: PersonalDate; daysUntil: number; nextDate: Date }[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("dismissed_personal_dates") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("personal_dates").select("*").eq("user_id", user.id).then(({ data }) => {
      const list = ((data as PersonalDate[]) || [])
        .map((d) => {
          const u = computeUpcoming(d);
          return u ? { d, daysUntil: u.daysUntil, nextDate: u.nextDate } : null;
        })
        .filter((x): x is { d: PersonalDate; daysUntil: number; nextDate: Date } => x !== null && x.daysUntil >= 0 && x.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      setUpcoming(list);
    });
  }, [user]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    sessionStorage.setItem("dismissed_personal_dates", JSON.stringify(next));
  };

  const visible = upcoming.filter((x) => !dismissed.includes(x.d.id));
  if (!user || visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map(({ d, daysUntil, nextDate }) => {
        const meta = TYPE_META[d.date_type] || TYPE_META.autre;
        const dayLabel = daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? "Demain" : `Dans ${daysUntil} jours`;
        const dateStr = nextDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        const hebStr = d.hebrew_date_day && d.hebrew_date_month
          ? `${d.hebrew_date_day} ${HEBREW_MONTHS_HEB[d.hebrew_date_month] || d.hebrew_date_month}`
          : "";
        return (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 border flex items-start gap-3"
            style={{
              background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
              borderColor: "hsl(var(--gold) / 0.3)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <span className="text-2xl shrink-0">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.2)", color: "hsl(var(--gold-matte))" }}>
                  {meta.label}
                </span>
                <span className="text-[10px] font-bold text-foreground">{dayLabel}</span>
              </div>
              <p className="text-sm font-bold text-foreground mt-1 truncate">{d.hebrew_name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {dateStr}{hebStr ? ` • ${hebStr}` : ""}
              </p>
            </div>
            <button
              onClick={() => dismiss(d.id)}
              aria-label="Masquer"
              className="text-muted-foreground/60 hover:text-foreground bg-transparent border-none cursor-pointer text-lg leading-none px-1"
            >
              ×
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PersonalDatesBanner;