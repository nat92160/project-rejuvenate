import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { CityConfig } from "@/lib/cities";

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

function hebcalGeoParam(city: CityConfig): string {
  const gpsCity = city as CityConfig & { _gps?: boolean };
  if (gpsCity._gps) {
    return `geo=pos&latitude=${city.lat}&longitude=${city.lng}&tzid=${city.tz}`;
  }
  return `geo=geoname&geonameid=${city.geonameid}`;
}

const ShabbatSpeciauxWidget = () => {
  const { city } = useCity();
  const [shabbatot, setShabbatot] = useState<SpecialShabbat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const now = new Date();
    const year = now.getFullYear();
    const geoP = hebcalGeoParam(city);

    const fetchYear = (y: number) =>
      fetch(
        `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&month=x&maj=on&min=on&mod=on&nx=off&ss=on&mf=off&c=off&${geoP}&i=off`,
        { cache: "no-store" }
      ).then((r) => r.json());

    Promise.all([fetchYear(year), fetchYear(year + 1)])
      .then(([d1, d2]) => {
        if (cancelled) return;
        const items = [...(d1.items || []), ...(d2.items || [])];

        const allSpecial: SpecialShabbat[] = items
          .filter((item: any) => item.category === "holiday" && item.subcat === "shabbat")
          .map((item: any) => {
            const key = item.title.toLowerCase().trim();
            const info = SHABBAT_FR[key] || { name: item.title, emoji: "✡️" };
            const dt = new Date(item.date + "T12:00:00");
            const daysLeft = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
            return {
              title: info.name,
              hebrew: item.hebrew || "",
              date: item.date,
              dateFr: dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
              memo: item.memo || "",
              daysLeft,
              emoji: info.emoji,
            };
          })
          .filter((s: SpecialShabbat) => s.daysLeft >= -1)
          .sort((a: SpecialShabbat, b: SpecialShabbat) => a.daysLeft - b.daysLeft);

        // Deduplicate: keep only the nearest occurrence per Shabbat name
        const seen = new Set<string>();
        const results: SpecialShabbat[] = [];
        for (const s of allSpecial) {
          if (seen.has(s.title)) continue;
          seen.add(s.title);
          results.push(s);
          if (results.length >= 8) break;
        }

        setShabbatot(results);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
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
