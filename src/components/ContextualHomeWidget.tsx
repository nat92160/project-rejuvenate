import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchZmanim, ZmanItem, fetchShabbatTimes } from "@/lib/hebcal";
import { HebrewCalendar, Location, Zmanim as HebcalZmanim, flags } from "@hebcal/core";
import { cityToLocation } from "@/lib/hebcal";

type ContextMode = "morning" | "friday" | "fast" | "default";

function getContextMode(city: any): ContextMode {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Friday afternoon or Shabbat
  if ((day === 5 && hour >= 12) || day === 6) return "friday";

  // Check if today is a fast day
  try {
    const location = cityToLocation(city);
    const events = HebrewCalendar.calendar({
      start: now,
      end: now,
      il: city.country === "IL",
    });
    for (const ev of events) {
      if (ev.getFlags() & (flags.MAJOR_FAST | flags.MINOR_FAST)) {
        return "fast";
      }
    }
  } catch { /* silent */ }

  // Morning
  if (hour >= 5 && hour < 12) return "morning";

  return "default";
}

function fmtTime(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const ContextualHomeWidget = () => {
  const { city } = useCity();
  const [mode, setMode] = useState<ContextMode>("default");
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [shabbatTime, setShabbatTime] = useState<string | null>(null);
  const [havdalaTime, setHavdalaTime] = useState<string | null>(null);
  const [fastEnd, setFastEnd] = useState<string | null>(null);
  const [fastStart, setFastStart] = useState<string | null>(null);
  const [fastName, setFastName] = useState<string>("");
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const m = getContextMode(city);
    setMode(m);

    if (m === "morning") {
      fetchZmanim(city).then(setZmanim);
    }

    if (m === "friday") {
      fetchShabbatTimes(city).then((data) => {
        if (data) {
          setShabbatTime(data.candleLighting);
          setHavdalaTime(data.havdalah);
        }
      });
    }

    if (m === "fast") {
      try {
        const now = new Date();
        const location = cityToLocation(city);
        const zman = new HebcalZmanim(location, now, false);
        const alot = zman.alotHaShachar();
        const tzeit = zman.tzeit();
        if (alot) setFastStart(fmtTime(alot));
        if (tzeit) setFastEnd(fmtTime(tzeit));

        const events = HebrewCalendar.calendar({ start: now, end: now, il: city.country === "IL" });
        for (const ev of events) {
          if (ev.getFlags() & (flags.MAJOR_FAST | flags.MINOR_FAST)) {
            setFastName(ev.getDesc());
            break;
          }
        }
      } catch { /* silent */ }
    }
  }, [city]);

  // Countdown timer for fast end
  useEffect(() => {
    if (mode !== "fast" || !fastEnd) return;
    const update = () => {
      const now = new Date();
      const [h, m] = fastEnd.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target.getTime() <= now.getTime()) {
        setCountdown("Terminé ✅");
        return;
      }
      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [mode, fastEnd]);

  if (mode === "default") return null;

  // ─── Morning: Shema time + key zmanim ───
  if (mode === "morning") {
    const shema = zmanim.find((z) => z.label.includes("Chéma (GR\"A)"));
    const shemaMGA = zmanim.find((z) => z.label.includes("Chéma (MG\"A)"));
    const tefila = zmanim.find((z) => z.label.includes("Téfila"));

    return (
      <motion.div
        className="rounded-2xl p-5 mb-4 border border-border"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
          boxShadow: "var(--shadow-card)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-[10px] uppercase tracking-[3px] font-semibold text-muted-foreground mb-3">
          🌅 Boker Tov — Zmanim du matin
        </div>
        <div className="space-y-3">
          {shemaMGA && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">📖 Chéma (MG"A)</span>
              <span className="text-lg font-bold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
                {shemaMGA.time}
              </span>
            </div>
          )}
          {shema && (
            <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: "hsl(var(--gold) / 0.08)" }}>
              <span className="text-sm font-bold text-foreground">📖 Chéma (GR"A)</span>
              <span className="text-xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
                {shema.time}
              </span>
            </div>
          )}
          {tefila && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">🙏 Fin Téfila</span>
              <span className="text-lg font-bold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
                {tefila.time}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ─── Friday: Shabbat countdown prominent ───
  if (mode === "friday") {
    return (
      <motion.div
        className="rounded-2xl p-6 mb-4 border text-center"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
          borderColor: "hsl(var(--gold) / 0.3)",
          boxShadow: "0 8px 32px hsl(var(--gold) / 0.15)",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-4xl mb-2">🕯️</div>
        <div className="text-[10px] uppercase tracking-[4px] font-bold text-muted-foreground mb-4">
          Chabbat Chalom
        </div>
        {shabbatTime && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">Allumage des bougies</div>
            <div className="text-3xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
              {shabbatTime}
            </div>
          </div>
        )}
        {havdalaTime && (
          <div className="pt-3 border-t" style={{ borderColor: "hsl(var(--gold) / 0.15)" }}>
            <div className="text-xs text-muted-foreground mb-1">Havdala</div>
            <div className="text-xl font-bold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
              {havdalaTime}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Fast day ───
  if (mode === "fast") {
    return (
      <motion.div
        className="rounded-2xl p-5 mb-4 border text-center"
        style={{
          background: "linear-gradient(135deg, hsl(0 70% 50% / 0.08), hsl(0 70% 50% / 0.02))",
          borderColor: "hsl(0 70% 50% / 0.25)",
          boxShadow: "var(--shadow-card)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-3xl mb-2">🕯️</div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {fastName || "Jour de Jeûne"}
        </div>

        <div className="flex justify-center gap-6 mb-4">
          {fastStart && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Début</div>
              <div className="text-lg font-bold font-display text-foreground">{fastStart}</div>
            </div>
          )}
          {fastEnd && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fin</div>
              <div className="text-lg font-bold font-display text-foreground">{fastEnd}</div>
            </div>
          )}
        </div>

        {countdown && countdown !== "Terminé ✅" && (
          <div className="p-3 rounded-xl" style={{ background: "hsl(0 70% 50% / 0.08)" }}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fin du jeûne dans</div>
            <div className="text-2xl font-extrabold font-display tabular-nums" style={{ color: "hsl(0 70% 50%)" }}>
              {countdown}
            </div>
          </div>
        )}
        {countdown === "Terminé ✅" && (
          <div className="text-lg font-bold" style={{ color: "hsl(120 60% 40%)" }}>
            ✅ Jeûne terminé — Bon appétit !
          </div>
        )}
      </motion.div>
    );
  }

  return null;
};

export default ContextualHomeWidget;
