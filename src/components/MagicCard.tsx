import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ComplexZmanimCalendar, GeoLocation } from "kosher-zmanim";
import { useCity } from "@/hooks/useCity";
import { fetchZmanim, fetchShabbatTimes, fetchMinhaTime, type ZmanItem, type ShabbatTimes } from "@/lib/hebcal";
import { HebrewCalendar, Zmanim as HebcalZmanim, flags } from "@hebcal/core";
import { cityToLocation } from "@/lib/hebcal";

type CardMode = "morning" | "afternoon" | "evening" | "friday" | "shabbat" | "fast";

function getCardMode(city: any): CardMode {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Shabbat (Saturday before havdalah)
  if (day === 6 && hour < 22) return "shabbat";
  // Friday afternoon
  if (day === 5 && hour >= 12) return "friday";

  // Fast day check
  try {
    const events = HebrewCalendar.calendar({ start: now, end: now, il: city.country === "IL" });
    for (const ev of events) {
      if (ev.getFlags() & (flags.MAJOR_FAST | flags.MINOR_FAST)) return "fast";
    }
  } catch { /* silent */ }

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

function fmtTime(d: unknown): string {
  if (!d) return "--:--";

  if (typeof d === "object" && d !== null) {
    const maybeLuxon = d as { toJSDate?: () => Date };
    if (typeof maybeLuxon.toJSDate === "function") {
      const jsDate = maybeLuxon.toJSDate();
      if (isNaN(jsDate.getTime())) return "--:--";
      return jsDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getFastEndTime(city: { name: string; lat: number; lng: number; tz: string }, date: Date): string | null {
  try {
    if ((city.lat === 0 && city.lng === 0) || !Number.isFinite(city.lat) || !Number.isFinite(city.lng)) {
      return null;
    }

    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(date);

    return fmtTime(czc.getSunsetOffsetByDegrees(97.08));
  } catch {
    return null;
  }
}

interface MagicCardProps {
  onNavigate: (tab: string) => void;
}

const MagicCard = ({ onNavigate }: MagicCardProps) => {
  const { city } = useCity();
  const [mode, setMode] = useState<CardMode>("morning");
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [shabbatData, setShabbatData] = useState<ShabbatTimes | null>(null);
  const [minhaTime, setMinhaTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [fastEnd, setFastEnd] = useState<string | null>(null);
  const [fastName, setFastName] = useState("");
  const [tzeit, setTzeit] = useState<string | null>(null);

  useEffect(() => {
    const m = getCardMode(city);
    setMode(m);

    if (m === "morning") fetchZmanim(city).then(setZmanim);
    if (m === "afternoon") fetchMinhaTime(city).then(setMinhaTime);
    if (m === "friday" || m === "shabbat") {
      fetchShabbatTimes(city).then((d) => d && setShabbatData(d));
    }
    if (m === "evening") {
      try {
        const location = cityToLocation(city);
        const z = new HebcalZmanim(location, new Date(), false);
        setTzeit(fmtTime(z.tzeit()));
      } catch { /* silent */ }
    }
    if (m === "fast") {
      try {
        const now = new Date();
        setFastEnd(getFastEndTime(city, now));
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

  // Fast countdown
  useEffect(() => {
    if (mode !== "fast" || !fastEnd) return;
    const update = () => {
      const now = new Date();
      const [h, m] = fastEnd.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target.getTime() <= now.getTime()) { setCountdown("Terminé ✅"); return; }
      const diff = target.getTime() - now.getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${hrs}h${String(mins).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [mode, fastEnd]);

  const cardStyle = "rounded-2xl p-5 mb-4 border border-border bg-card";
  const cardShadow = { boxShadow: "var(--shadow-card)" };

  // ─── Morning ───
  if (mode === "morning") {
    const shema = zmanim.find((z) => z.label.includes('Chéma (GR"A)'));
    return (
      <motion.div className={cardStyle} style={cardShadow} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌅</span>
          <div>
            <div className="text-[10px] uppercase tracking-[3px] font-semibold text-muted-foreground">Boker Tov</div>
            <div className="text-xs text-muted-foreground">{city.name}</div>
          </div>
        </div>
        {shema && (
          <div className="flex justify-between items-center p-3 rounded-xl mb-3" style={{ background: "hsl(var(--gold) / 0.06)" }}>
            <span className="text-sm font-semibold text-foreground">📖 Fin du Chéma</span>
            <span className="text-xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>{shema.time}</span>
          </div>
        )}
        <button
          onClick={() => onNavigate("siddour")}
          className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98] border-none text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          🙏 Ouvrir Cha'harit
        </button>
      </motion.div>
    );
  }

  // ─── Afternoon ───
  if (mode === "afternoon") {
    return (
      <motion.div className={cardStyle} style={cardShadow} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">☀️</span>
          <div>
            <div className="text-[10px] uppercase tracking-[3px] font-semibold text-muted-foreground">Cet après-midi</div>
            <div className="text-xs text-muted-foreground">{city.name}</div>
          </div>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl mb-3" style={{ background: "hsl(var(--gold) / 0.06)" }}>
          <span className="text-sm font-semibold text-foreground">🕐 Prochain Min'ha</span>
          <span className="text-xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>{minhaTime || "--:--"}</span>
        </div>
        <button
          onClick={() => onNavigate("siddour")}
          className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98] border-none text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          🙏 Ouvrir Min'ha
        </button>
      </motion.div>
    );
  }

  // ─── Evening ───
  if (mode === "evening") {
    return (
      <motion.div className={cardStyle} style={cardShadow} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌙</span>
          <div>
            <div className="text-[10px] uppercase tracking-[3px] font-semibold text-muted-foreground">Bonsoir</div>
            <div className="text-xs text-muted-foreground">{city.name}</div>
          </div>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl mb-3" style={{ background: "hsl(var(--gold) / 0.06)" }}>
          <span className="text-sm font-semibold text-foreground">⭐ Tsét haKokhavim</span>
          <span className="text-xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>{tzeit || "--:--"}</span>
        </div>
        <button
          onClick={() => onNavigate("siddour")}
          className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98] border-none text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          🙏 Ouvrir Arvit
        </button>
      </motion.div>
    );
  }

  // ─── Friday ───
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
        {shabbatData?.candleLighting && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Allumage des bougies</div>
            <div className="text-3xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
              {shabbatData.candleLighting}
            </div>
          </div>
        )}
        {shabbatData?.havdalah && (
          <div className="pt-3 border-t" style={{ borderColor: "hsl(var(--gold) / 0.15)" }}>
            <div className="text-xs text-muted-foreground mb-1">Havdala</div>
            <div className="text-lg font-bold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
              {shabbatData.havdalah}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Shabbat ───
  if (mode === "shabbat") {
    return (
      <motion.div
        className="rounded-2xl p-6 mb-4 border text-center"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.03))",
          borderColor: "hsl(var(--gold) / 0.2)",
          boxShadow: "var(--shadow-card)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-4xl mb-2">✨</div>
        <div className="text-[10px] uppercase tracking-[4px] font-bold text-muted-foreground mb-2">
          Bon Chabbat
        </div>
        {shabbatData?.parasha && (
          <div className="text-sm font-semibold text-foreground mb-1">{shabbatData.parasha}</div>
        )}
        {shabbatData?.havdalah && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "hsl(var(--gold) / 0.15)" }}>
            <div className="text-xs text-muted-foreground mb-1">Sortie de Chabbat</div>
            <div className="text-2xl font-extrabold font-display" style={{ color: "hsl(var(--gold-matte))" }}>
              {shabbatData.havdalah}
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
          background: "linear-gradient(135deg, hsl(var(--destructive) / 0.08), hsl(var(--destructive) / 0.02))",
          borderColor: "hsl(var(--destructive) / 0.25)",
          boxShadow: "var(--shadow-card)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-3xl mb-2">🕯️</div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {fastName || "Jour de Jeûne"}
        </div>
        {fastEnd && countdown !== "Terminé ✅" && (
          <div className="p-3 rounded-xl" style={{ background: "hsl(var(--destructive) / 0.08)" }}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fin du jeûne</div>
            <div className="text-2xl font-extrabold font-display" style={{ color: "hsl(var(--destructive))" }}>
              {fastEnd} <span className="text-sm font-medium text-muted-foreground">({countdown})</span>
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

export default MagicCard;
