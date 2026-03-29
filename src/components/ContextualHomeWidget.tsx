import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { getHebrewDateString, fetchShabbatTimes } from "@/lib/hebcal";
import { fetchKosherZmanim, getMoladInfo, MoladInfo } from "@/lib/kosher-zmanim";
import type { ZmanItem } from "@/lib/hebcal";
import ShemaProgress from "./zmanim/ShemaProgress";

// ─── Helpers ───

function timeToMinutes(time: string): number | null {
  if (!time || time === "--:--") return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type WidgetMode = "shema" | "next-zman" | "friday" | "rest";

// ─── Compact Next Zman (inline version) ───

function CompactNextZman({ zmanim }: { zmanim: ZmanItem[] }) {
  const [countdown, setCountdown] = useState("");
  const [next, setNext] = useState<ZmanItem | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const curMin = now.getHours() * 60 + now.getMinutes();
      let found: ZmanItem | null = null;
      for (const z of zmanim) {
        const m = timeToMinutes(z.time);
        if (m !== null && m > curMin) { found = z; break; }
      }
      setNext(found);
      if (!found) { setCountdown(""); return; }

      const [h, m] = found.time.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setCountdown("Maintenant"); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(hrs > 0 ? `${hrs}h ${String(mins).padStart(2, "0")}m` : `${mins}m`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [zmanim]);

  if (!next) return null;

  const isEvening = next.label.includes("Chkia") || next.label.includes("Tsét") || next.label.includes("Min'ha");

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[2px] font-semibold text-muted-foreground mb-0.5">
          Prochain Zman
        </div>
        <div className="text-sm font-bold text-foreground truncate">
          {next.icon} {next.label}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-lg font-extrabold font-display tabular-nums"
          style={{ color: isEvening ? "hsl(220 60% 70%)" : "hsl(var(--gold-matte))" }}
        >
          {next.time}
        </div>
        {countdown && (
          <div className="text-[10px] font-bold tabular-nums" style={{ color: isEvening ? "hsl(220 40% 60%)" : "hsl(var(--gold) / 0.8)" }}>
            dans {countdown}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Friday Candles ───

function FridayCandles({ candleTime, havdalaTime }: { candleTime: string; havdalaTime: string | null }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!candleTime) return;
    const update = () => {
      const now = new Date();
      const [h, m] = candleTime.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setCountdown("Chabbat Chalom ! ✨"); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hrs}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [candleTime]);

  return (
    <div className="text-center">
      <div className="text-3xl mb-1.5">🕯️</div>
      <div className="text-[10px] uppercase tracking-[3px] font-bold text-muted-foreground mb-2">
        Chabbat Chalom
      </div>
      <div className="text-2xl font-extrabold font-display tabular-nums" style={{ color: "hsl(var(--gold-matte))" }}>
        {candleTime}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">Allumage des bougies</div>
      {countdown && !countdown.includes("Chalom") && (
        <div className="text-xs font-bold tabular-nums mt-2" style={{ color: "hsl(var(--gold) / 0.8)" }}>
          dans {countdown}
        </div>
      )}
      {countdown.includes("Chalom") && (
        <div className="text-sm font-bold mt-2" style={{ color: "hsl(var(--gold-matte))" }}>
          {countdown}
        </div>
      )}
      {havdalaTime && (
        <div className="mt-3 pt-2 border-t" style={{ borderColor: "hsl(var(--gold) / 0.15)" }}>
          <div className="text-[10px] text-muted-foreground">Havdala</div>
          <div className="text-base font-bold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
            {havdalaTime}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rest State ───

function RestState({ hebrewDate, molad }: { hebrewDate: string; molad: MoladInfo | null }) {
  return (
    <div className="text-center">
      {hebrewDate && (
        <div className="font-hebrew text-lg font-bold" style={{ direction: "rtl", color: "hsl(var(--gold-matte))" }}>
          {hebrewDate}
        </div>
      )}
      {molad && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="mr-1">🌙</span>
          Molad : <span className="font-semibold text-foreground">{molad.dayOfWeek}</span>{" "}
          {molad.hours}h{String(molad.minutes).padStart(2, "0")} · {molad.chalakim} 'halakim
        </div>
      )}
    </div>
  );
}

// ─── Main Widget ───

const ContextualHomeWidget = () => {
  const { city, manualAltitude } = useCity();
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [mode, setMode] = useState<WidgetMode>("rest");
  const [candleTime, setCandleTime] = useState<string | null>(null);
  const [havdalaTime, setHavdalaTime] = useState<string | null>(null);
  const [hebrewDate, setHebrewDate] = useState("");
  const [molad, setMolad] = useState<MoladInfo | null>(null);

  const effectiveAltitude = useMemo(
    () => (city.altitude && city.altitude > 0) ? city.altitude : manualAltitude,
    [city.altitude, manualAltitude]
  );

  useEffect(() => {
    const now = new Date();
    const day = now.getDay();
    const curMin = now.getHours() * 60 + now.getMinutes();

    // Hebrew date & Molad
    setHebrewDate(getHebrewDateString(now));
    setMolad(getMoladInfo(now));

    // Fetch zmanim via kosher-zmanim
    const data = fetchKosherZmanim({
      lat: city.lat,
      lng: city.lng,
      elevation: effectiveAltitude,
      tz: city.tz,
      name: city.name,
    });
    setZmanim(data);

    // Friday afternoon or Shabbat → candle mode
    if ((day === 5 && curMin >= 720) || day === 6) {
      fetchShabbatTimes(city).then((st) => {
        if (st) {
          setCandleTime(st.candleLighting);
          setHavdalaTime(st.havdalah);
          setMode("friday");
        }
      });
      return;
    }

    // Morning: check if before Sof Zman Shema
    const shemaItem = data.find(z => z.label.includes('Chéma') && z.label.includes('GR"A'));
    const shemaMin = shemaItem ? timeToMinutes(shemaItem.time) : null;
    if (shemaMin !== null && curMin < shemaMin && curMin >= 270) {
      setMode("shema");
      return;
    }

    // Check if any zman is within 60 minutes
    for (const z of data) {
      const m = timeToMinutes(z.time);
      if (m !== null && m > curMin && (m - curMin) <= 60) {
        setMode("next-zman");
        return;
      }
    }

    // Default: rest
    setMode("rest");
  }, [city, effectiveAltitude]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        className="rounded-2xl p-4 mb-4 border border-border/50 overflow-hidden"
        style={{
          background: mode === "friday"
            ? "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.03))"
            : "hsl(var(--card) / 0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor: mode === "friday" ? "hsl(var(--gold) / 0.25)" : undefined,
          boxShadow: mode === "friday"
            ? "0 4px 24px hsl(var(--gold) / 0.1)"
            : "0 2px 12px hsl(var(--foreground) / 0.04)",
        }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {mode === "friday" && candleTime && (
          <FridayCandles candleTime={candleTime} havdalaTime={havdalaTime} />
        )}

        {mode === "shema" && (
          <div>
            <div className="text-[10px] uppercase tracking-[3px] font-semibold text-muted-foreground mb-2">
              🌅 Boker Tov
            </div>
            <ShemaProgress zmanim={zmanim} isToday={true} />
            <div className="mt-2">
              <CompactNextZman zmanim={zmanim} />
            </div>
          </div>
        )}

        {mode === "next-zman" && (
          <CompactNextZman zmanim={zmanim} />
        )}

        {mode === "rest" && (
          <RestState hebrewDate={hebrewDate} molad={molad} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ContextualHomeWidget;
