import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { HebrewCalendar, flags } from '@hebcal/core';
import { cityToLocation } from "@/lib/hebcal";

interface SpecialShabbat {
  title: string;
  hebrew: string;
  date: string;
  dateFr: string;
  memo: string;
  daysLeft: number;
  emoji: string;
}

const SHABBAT_FR: Record<string, { name: string; emoji: string }> = {
  "shabbat shirah": { name: "Chabbat Chira", emoji: "🎵" },
  "shabbat shekalim": { name: "Chabbat Chékalim", emoji: "💰" },
  "shabbat zachor": { name: "Chabbat Zakhor", emoji: "📜" },
  "shabbat parah": { name: "Chabbat Para", emoji: "🐄" },
  "shabbat hachodesh": { name: "Chabbat HaHodech", emoji: "🌙" },
  "shabbat hagadol": { name: "Chabbat HaGadol", emoji: "✨" },
  "shabbat chazon": { name: "Chabbat 'Hazon", emoji: "👁️" },
  "shabbat nachamu": { name: "Chabbat Na'hamou", emoji: "💛" },
  "shabbat shuva": { name: "Chabbat Chouva", emoji: "🕊️" },
};

const ShabbatSpeciauxWidget = () => {
  const { city } = useCity();
  const [shabbatot, setShabbatot] = useState<SpecialShabbat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    try {
      const now = new Date();
      const il = city.country === 'IL';
      const location = cityToLocation(city);

      // Use SDK — fully offline, no API calls
      const events = HebrewCalendar.calendar({
        start: now,
        end: new Date(now.getTime() + 365 * 86400000),
        il,
        location,
      }).filter(ev => ev.getFlags() & flags.SPECIAL_SHABBAT);

      const seen = new Set<string>();
      const results: SpecialShabbat[] = [];

      for (const ev of events) {
        const desc = ev.getDesc();
        const key = desc.toLowerCase().trim();
        const info = SHABBAT_FR[key] || { name: desc, emoji: "✡️" };

        if (seen.has(info.name)) continue;
        seen.add(info.name);

        const greg = ev.getDate().greg();
        const daysLeft = Math.ceil((greg.getTime() - now.getTime()) / 86400000);

        results.push({
          title: info.name,
          hebrew: ev.render('he') || '',
          date: `${greg.getFullYear()}-${String(greg.getMonth() + 1).padStart(2, '0')}-${String(greg.getDate()).padStart(2, '0')}`,
          dateFr: greg.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          memo: ev.memo || '',
          daysLeft,
          emoji: info.emoji,
        });

        if (results.length >= 8) break;
      }

      setShabbatot(results);
    } catch {
      // silent
    }

    setLoading(false);
  }, [city]);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="rounded-2xl bg-card p-6 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
          ✨ Chabbatot Spéciaux
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Les Chabbatot à thème spécial de l'année
        </p>

        {loading ? (
          <div className="mt-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse bg-muted" />
            ))}
          </div>
        ) : shabbatot.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun Chabbat spécial à venir</p>
        ) : (
          <div className="mt-5 space-y-3">
            {shabbatot.map((s) => (
              <div
                key={s.date}
                className="p-4 rounded-xl border border-border transition-all hover:border-primary/15 hover:bg-muted/30"
                style={{ borderLeft: "3px solid hsl(var(--gold))" }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{s.title}</p>
                      {s.hebrew && (
                        <span className="font-hebrew text-sm text-primary/70" style={{ direction: "rtl" }}>
                          {s.hebrew}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground capitalize">{s.dateFr}</p>
                    {s.memo && (
                      <p className="text-[11px] mt-1.5 text-muted-foreground/70 line-clamp-2">{s.memo}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className="text-[11px] px-2.5 py-1 rounded-full font-bold border border-primary/20 text-primary"
                      style={{ background: "hsl(var(--gold) / 0.08)" }}
                    >
                      {s.daysLeft <= 0 ? "Aujourd'hui" : `${s.daysLeft}j`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ShabbatSpeciauxWidget;
