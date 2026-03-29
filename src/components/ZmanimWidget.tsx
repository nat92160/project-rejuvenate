import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { getHebrewDateString } from "@/lib/hebcal";
import { fetchKosherZmanim, getMoladInfo, ZmanimMethod, MoladInfo } from "@/lib/kosher-zmanim";
import type { ZmanItem } from "@/lib/hebcal";

const ZmanimWidget = () => {
  const { city, manualAltitude } = useCity();
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateLabel, setDateLabel] = useState("");
  const [hebrewForDate, setHebrewForDate] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [method, setMethod] = useState<ZmanimMethod>("gra");
  const [molad, setMolad] = useState<MoladInfo | null>(null);

  const loadZmanim = useCallback((dateStr: string) => {
    setLoading(true);
    const d = new Date(dateStr + "T12:00:00");
    setDateLabel(
      d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );
    setHebrewForDate(getHebrewDateString(d));

    const effectiveAltitude = (city.altitude && city.altitude > 0) ? city.altitude : manualAltitude;

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

    // Highlight the next upcoming zman
    const now = new Date();
    if (dateStr === now.toISOString().split("T")[0]) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      for (const z of data) {
        if (z.time === "--:--") continue;
        const [h, m] = z.time.split(":").map(Number);
        if (h * 60 + m > currentTime) {
          setHighlight(z.label);
          break;
        }
      }
    } else {
      setHighlight(null);
    }

    // Molad
    setMolad(getMoladInfo(d));
  }, [city, method, manualAltitude]);

  useEffect(() => {
    loadZmanim(date);
  }, [date, loadZmanim]);

  const changeDate = (offset: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  const goToday = () => {
    setDate(new Date().toISOString().split("T")[0]);
  };

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        ⏰ Zmanim du jour
      </h3>

      {/* Method toggle */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={() => setMethod("gra")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            method === "gra"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          GR&quot;A
        </button>
        <button
          onClick={() => setMethod("mga")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            method === "mga"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          MG&quot;A
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-center gap-2.5 mt-4 mb-2 flex-wrap">
        <button
          onClick={() => changeDate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border text-sm cursor-pointer transition-all hover:border-primary/20 hover:bg-muted active:scale-95"
        >
          ◀
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <button
          onClick={() => changeDate(1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border text-sm cursor-pointer transition-all hover:border-primary/20 hover:bg-muted active:scale-95"
        >
          ▶
        </button>
        {!isToday && (
          <button
            onClick={goToday}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
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
        <div className="rounded-xl overflow-hidden border border-border">
          {zmanim.map((z, i) => {
            const isHighlighted = highlight === z.label;
            return (
              <motion.div
                key={z.label}
                className="flex items-center gap-3.5 py-3 px-4 transition-colors duration-150"
                style={{
                  borderBottom: i !== zmanim.length - 1 ? "1px solid hsl(var(--border))" : "none",
                  background: isHighlighted ? "hsl(var(--gold) / 0.06)" : undefined,
                  borderLeft: isHighlighted ? "3px solid hsl(var(--gold))" : "3px solid transparent",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <span
                  className="text-base font-extrabold font-display tabular-nums"
                  style={{
                    minWidth: "54px",
                    color: isHighlighted ? "hsl(var(--gold-matte))" : "hsl(var(--primary))",
                  }}
                >
                  {z.time}
                </span>
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${isHighlighted ? "text-foreground" : "text-foreground"}`}>
                    {z.icon} {z.label}
                  </span>
                  <p className="text-[11px] mt-0.5 text-muted-foreground">{z.description}</p>
                </div>
                {isHighlighted && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}>
                    Prochain
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Molad display */}
      {molad && (
        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border">
          <div className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-2">
            🌙 Molad du mois
          </div>
          <div className="text-sm text-foreground font-medium">
            <span className="font-bold">{molad.dayOfWeek}</span>{" "}
            à <span className="font-bold font-display">{molad.hours}h {String(molad.minutes).padStart(2, "0")}m</span>{" "}
            et <span className="font-bold font-display">{molad.chalakim}</span> 'halakim
          </div>
        </div>
      )}

      {/* Altitude info & manual input */}
      <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            🏔️ Calculé à <span className="font-bold text-foreground">{((city.altitude && city.altitude > 0) ? city.altitude : manualAltitude) || 0}m</span> d'altitude
            {city.altitude && city.altitude > 0 && (
              <span className="ml-1 text-primary/60">(GPS)</span>
            )}
          </span>
          {(!city.altitude || city.altitude <= 0) && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-muted-foreground">Alt. manuelle :</label>
              <input
                type="number"
                min={0}
                max={9000}
                value={manualAltitude}
                onChange={(e) => {
                  const { setManualAltitude } = useCity as any;
                }}
                className="w-16 px-1.5 py-1 rounded-lg text-xs bg-card text-foreground border border-border text-center focus:outline-none focus:ring-1 focus:ring-ring/30"
                placeholder="0"
              />
              <span className="text-[10px] text-muted-foreground">m</span>
            </div>
          )}
        </div>
      </div>

      {/* Consistoire link */}
      <div className="text-center mt-3">
        <a
          href="https://www.consistoire.org/horaires-chabat-et-fetes/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-primary/60 hover:text-primary transition-colors"
        >
          📋 Horaires du Consistoire
        </a>
      </div>
    </motion.div>
  );
};

export default ZmanimWidget;
