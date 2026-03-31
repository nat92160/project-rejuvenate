import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { getHebrewDateString } from "@/lib/hebcal";
import { fetchKosherZmanim, getMoladInfo, ZmanimMethod, MoladInfo } from "@/lib/kosher-zmanim";
import type { ZmanItem } from "@/lib/hebcal";
import SunArc from "./zmanim/SunArc";
import NextZmanHero from "./zmanim/NextZmanHero";
import ShemaProgress from "./zmanim/ShemaProgress";
import HalakhicDisclaimer from "./zmanim/HalakhicDisclaimer";

// ─── Group definitions ───

interface ZmanGroup {
  title: string;
  emoji: string;
  keys: string[];
}

const GROUPS: ZmanGroup[] = [
  {
    title: "Matin",
    emoji: "🌅",
    keys: ["Alot", "Michéyakir", "Nets", "Chéma", "Téfila"],
  },
  {
    title: "Après-midi",
    emoji: "☀️",
    keys: ["'Hatsot", "Min'ha", "Pélag"],
  },
  {
    title: "Soir",
    emoji: "🌙",
    keys: ["Chkia", "Tsét"],
  },
];

function assignGroup(label: string): number {
  for (let g = 0; g < GROUPS.length; g++) {
    if (GROUPS[g].keys.some(k => label.includes(k))) return g;
  }
  return 1; // default afternoon
}

// ─── Main widget ───

const ZmanimWidget = () => {
  const { city, manualAltitude, setManualAltitude } = useCity();
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateLabel, setDateLabel] = useState("");
  const [hebrewForDate, setHebrewForDate] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [method, setMethod] = useState<ZmanimMethod>("gra");
  const [molad, setMolad] = useState<MoladInfo | null>(null);
  const [dateKey, setDateKey] = useState(0);
  const [showTechnical, setShowTechnical] = useState(false);

  const effectiveAltitude = useMemo(
    () => (city.altitude && city.altitude > 0) ? city.altitude : manualAltitude,
    [city.altitude, manualAltitude]
  );

  const loadZmanim = useCallback((dateStr: string) => {
    setLoading(true);
    const d = new Date(dateStr + "T12:00:00");
    setDateLabel(
      d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );
    setHebrewForDate(getHebrewDateString(d));

    const data = fetchKosherZmanim({
      lat: city.lat,
      lng: city.lng,
      elevation: effectiveAltitude,
      tz: city.tz,
      name: city.name,
      date: d,
      method,
    });
    setZmanim(data);
    setLoading(false);

    const now = new Date();
    if (dateStr === now.toISOString().split("T")[0]) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      let found = false;
      for (const z of data) {
        if (z.time === "--:--") continue;
        const [h, m] = z.time.split(":").map(Number);
        if (h * 60 + m > currentTime) {
          setHighlight(z.label);
          found = true;
          break;
        }
      }
      if (!found) setHighlight(null);
    } else {
      setHighlight(null);
    }

    setMolad(getMoladInfo(d));
  }, [city, method, effectiveAltitude]);

  useEffect(() => {
    loadZmanim(date);
  }, [date, loadZmanim]);

  const changeDate = (offset: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
    setDateKey(k => k + 1);
  };

  const goToday = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setDateKey(k => k + 1);
  };

  const isToday = date === new Date().toISOString().split("T")[0];

  // Group zmanim
  const grouped = useMemo(() => {
    const groups: ZmanItem[][] = [[], [], []];
    for (const z of zmanim) {
      const g = assignGroup(z.label);
      groups[g].push(z);
    }
    return groups;
  }, [zmanim]);

  return (
    <motion.div
      className="rounded-2xl bg-card mb-4 border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      {/* Sun Arc Header */}
      {!loading && <SunArc zmanim={zmanim} isToday={isToday} />}

      <div className="px-5 pb-5">
        <HalakhicDisclaimer />
        {/* Title + Method toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display text-base font-bold text-foreground">
            ⏰ Zmanim
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMethod("gra")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                method === "gra"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              GR"A
            </button>
            <button
              onClick={() => setMethod("mga")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                method === "mga"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              MG"A
            </button>
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          <button
            onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-xs cursor-pointer transition-all hover:bg-muted active:scale-95"
          >
            ◀
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setDateKey(k => k + 1); }}
            className="px-3 py-2 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-xs cursor-pointer transition-all hover:bg-muted active:scale-95"
          >
            ▶
          </button>
          {!isToday && (
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Date display */}
        <p className="text-xs text-center text-muted-foreground capitalize mb-4">
          {dateLabel}
          {hebrewForDate && (
            <span className="font-hebrew text-primary/70 ml-2" style={{ direction: "rtl" }}>
              {hebrewForDate}
            </span>
          )}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Hero: Next Zman */}
              <NextZmanHero zmanim={zmanim} isToday={isToday} />

              {/* Shema Progress */}
              <ShemaProgress zmanim={zmanim} isToday={isToday} />

              {/* Grouped Zmanim */}
              {grouped.map((group, gi) => {
                if (group.length === 0) return null;
                const gInfo = GROUPS[gi];
                return (
                  <div key={gInfo.title} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <span className="text-sm">{gInfo.emoji}</span>
                      <span className="text-[10px] uppercase tracking-[2px] font-bold text-muted-foreground">
                        {gInfo.title}
                      </span>
                      <div className="flex-1 h-px bg-border ml-1" />
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border">
                      {group.map((z, i) => {
                        const isHighlighted = highlight === z.label;
                        return (
                          <motion.div
                            key={z.label}
                            className="flex items-center gap-3 py-2.5 px-3.5 transition-colors duration-150"
                            style={{
                              borderBottom: i !== group.length - 1 ? "1px solid hsl(var(--border))" : "none",
                              background: isHighlighted ? "hsl(var(--gold) / 0.06)" : undefined,
                              borderLeft: isHighlighted ? "3px solid hsl(var(--gold))" : "3px solid transparent",
                            }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <span
                              className="text-sm font-extrabold font-display tabular-nums"
                              style={{
                                minWidth: "50px",
                                color: isHighlighted ? "hsl(var(--gold-matte))" : "hsl(var(--primary))",
                              }}
                            >
                              {z.time}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-foreground">
                                {z.icon} {z.label}
                              </span>
                              <p className="text-[10px] mt-0.5 text-muted-foreground truncate">{z.description}</p>
                            </div>
                            {isHighlighted && (
                              <span
                                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}
                              >
                                Prochain
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Molad */}
        {molad && (
          <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-1.5">
              🌙 Molad du mois
            </div>
            <div className="text-sm text-foreground font-medium">
              <span className="font-bold">{molad.dayOfWeek}</span>{" "}
              à <span className="font-bold font-display">{molad.hours}h {String(molad.minutes).padStart(2, "0")}m</span>{" "}
              et <span className="font-bold font-display">{molad.chalakim}</span> 'halakim
            </div>
          </div>
        )}

        {/* Technical info accordion */}
        <div className="mt-3">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showTechnical ? "▲" : "▼"}</span>
            <span>Infos techniques</span>
          </button>

          <AnimatePresence>
            {showTechnical && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                  {/* Altitude */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">
                      🏔️ Altitude : <span className="font-bold text-foreground">{effectiveAltitude || 0}m</span>
                      {city.altitude && city.altitude > 0 && (
                        <span className="ml-1 text-primary/60">(GPS)</span>
                      )}
                    </span>
                    {(!city.altitude || city.altitude <= 0) && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={9000}
                          value={manualAltitude}
                          onChange={(e) => setManualAltitude(Math.max(0, Number(e.target.value) || 0))}
                          className="w-16 px-1.5 py-1 rounded-lg text-xs bg-card text-foreground border border-border text-center focus:outline-none focus:ring-1 focus:ring-ring/30"
                          placeholder="0"
                        />
                        <span className="text-[10px] text-muted-foreground">m</span>
                      </div>
                    )}
                  </div>

                  {/* Consistoire */}
                  <div className="text-center">
                    <a
                      href="https://www.consistoire.org/horaires-chabat-et-fetes/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary/60 hover:text-primary transition-colors"
                    >
                      📋 Horaires du Consistoire
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ZmanimWidget;
