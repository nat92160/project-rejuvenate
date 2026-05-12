import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin, BookOpen, Clock } from "lucide-react";
import { SIDDOUR_CATEGORIES, getOfficeMeta, detectOfficeNow, type OfficeMeta } from "@/lib/siddourCatalog";
import { useCity } from "@/hooks/useCity";
import { getHebrewDateString } from "@/lib/hebcal";
import { fetchKosherZmanim } from "@/lib/kosher-zmanim";
import type { ZmanItem } from "@/lib/hebcal";

interface Props {
  rite: "sefarade" | "ashkenaz";
  setRite: (r: "sefarade" | "ashkenaz") => void;
  onSelectOffice: (key: string) => void;
}

// Petit set de zmanim "essentiels" type Torah-Box
const ESSENTIAL_KEYS = [
  "Alot",
  "Michéyakir",
  "HaNets",
  "Chéma",
  "'Hatsot",
  "Min'ha Guédola",
  "Min'ha Kétana",
  "Chkia",
  "Tsét",
];

const SiddourHome = ({ rite, setRite, onSelectOffice }: Props) => {
  const { city } = useCity();
  const [showAll, setShowAll] = useState(false);

  const today = useMemo(() => new Date(), []);
  const hebrewDate = useMemo(() => {
    try { return getHebrewDateString(today); } catch { return ""; }
  }, [today]);

  const gregorian = useMemo(() => {
    try {
      return today.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch { return today.toDateString(); }
  }, [today]);

  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  useEffect(() => {
    if (!city) return;
    try {
      const z = fetchKosherZmanim({
        lat: city.lat,
        lng: city.lng,
        tz: city.tz,
        date: today,
      });
      const filtered = z.filter(item => ESSENTIAL_KEYS.some(k => item.label.includes(k)));
      setZmanim(filtered);
    } catch { setZmanim([]); }
  }, [city, today]);

  const detected = useMemo(() => detectOfficeNow(), []);
  const detectedMeta = getOfficeMeta(detected);

  // Liste linéaire des offices, façon Torah-Box (quotidien d'abord)
  const flatOffices: OfficeMeta[] = useMemo(() => {
    const ordered = [
      ...SIDDOUR_CATEGORIES.find(c => c.id === "daily")?.offices ?? [],
      ...SIDDOUR_CATEGORIES.find(c => c.id === "shabbat")?.offices ?? [],
      ...SIDDOUR_CATEGORIES.find(c => c.id === "brakhot")?.offices ?? [],
      ...SIDDOUR_CATEGORIES.find(c => c.id === "holidays")?.offices ?? [],
    ];
    return ordered;
  }, []);

  const visibleOffices = showAll ? flatOffices : flatOffices.slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
      {/* Bandeau "Livre de prière" type Torah-Box */}
      <div
        className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold tracking-wide flex items-center gap-2"
        style={{ background: "hsl(var(--primary))" }}
      >
        <BookOpen className="w-4 h-4" style={{ color: "hsl(var(--gold))" }} />
        Livre de prière
      </div>

      {/* Hero date */}
      <div
        className="rounded-2xl px-5 py-5 text-center"
        style={{
          background: "hsl(var(--gold) / 0.08)",
          border: "1px solid hsl(var(--gold) / 0.25)",
        }}
      >
        <div
          className="text-[11px] uppercase tracking-[0.2em] mb-1"
          style={{ color: "hsl(var(--gold-matte))" }}
        >
          Aujourd'hui
        </div>
        <div className="font-display text-lg sm:text-xl font-bold capitalize" style={{ color: "hsl(var(--primary))" }}>
          {gregorian}
        </div>
        {hebrewDate && (
          <div className="text-sm sm:text-base mt-1" style={{ color: "hsl(var(--gold-matte))" }}>
            {hebrewDate}
          </div>
        )}

        {detectedMeta && (
          <button
            onClick={() => onSelectOffice(detected)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition active:scale-95"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            {detectedMeta.icon} Continuer vers {detectedMeta.label}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sélecteur de rite */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full p-1 text-xs font-semibold"
          style={{ background: "hsl(var(--gold) / 0.1)", border: "1px solid hsl(var(--gold) / 0.25)" }}>
          {(["sefarade", "ashkenaz"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRite(r)}
              className="px-4 py-1.5 rounded-full transition-all"
              style={{
                background: rite === r ? "hsl(var(--primary))" : "transparent",
                color: rite === r ? "hsl(var(--primary-foreground))" : "hsl(var(--gold-matte))",
              }}
            >
              {r === "sefarade" ? "Séfarade" : "Ashkénaze"}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des offices façon Torah-Box */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: "hsl(var(--background) / 0.6)",
        border: "1px solid hsl(var(--gold) / 0.2)",
      }}>
        <ul className="divide-y" style={{ borderColor: "hsl(var(--gold) / 0.15)" }}>
          {visibleOffices.map(o => (
            <li key={o.key}>
              <button
                onClick={() => onSelectOffice(o.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[hsl(var(--gold)/0.08)] active:bg-[hsl(var(--gold)/0.12)] transition"
              >
                <span className="text-xl shrink-0" aria-hidden>📖</span>
                <span className="flex-1 min-w-0">
                  <span className="block uppercase text-[13px] tracking-wide font-bold" style={{ color: "hsl(var(--primary))" }}>
                    {o.label}
                  </span>
                  <span className="block text-[11px] mt-0.5 text-muted-foreground truncate">
                    {o.icon} {o.desc}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--gold-matte))" }} />
              </button>
            </li>
          ))}
        </ul>
        {flatOffices.length > 6 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="w-full px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-t"
            style={{
              borderColor: "hsl(var(--gold) / 0.2)",
              color: "hsl(var(--gold-matte))",
              background: "hsl(var(--gold) / 0.05)",
            }}
          >
            {showAll ? "− Réduire" : "+ Afficher plus"}
          </button>
        )}
      </div>

      {/* Mini Zmanim "Aujourd'hui à [ville]" */}
      {city && zmanim.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5" style={{
          background: "hsl(var(--background) / 0.6)",
          border: "1px solid hsl(var(--gold) / 0.2)",
        }}>
          <div className="flex items-center justify-center gap-2 pb-3 mb-3 border-b text-xs sm:text-sm font-semibold"
            style={{ borderColor: "hsl(var(--gold) / 0.25)", color: "hsl(var(--gold-matte))" }}>
            <Clock className="w-3.5 h-3.5" />
            Aujourd'hui à {city.name}
            <MapPin className="w-3 h-3 opacity-60" />
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {zmanim.map(z => (
              <li key={z.label} className="flex justify-between gap-2">
                <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: "hsl(var(--primary))" }}>
                  {z.time}
                </span>
                <span className="text-right text-muted-foreground truncate">{z.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SiddourHome;