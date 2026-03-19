import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

type AlarmSound = "shofar" | "kinnor" | "classic";

const SOUNDS: { key: AlarmSound; label: string; emoji: string }[] = [
  { key: "shofar", label: "Shofar", emoji: "📯" },
  { key: "kinnor", label: "Kinnor (Harpe)", emoji: "🎵" },
  { key: "classic", label: "Classique", emoji: "🔔" },
];

function playSound(type: AlarmSound, count: number) {
  // Resume AudioContext for mobile browsers that require user gesture
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  
  resume.then(() => {
    const playOne = (i: number) => {
      if (i >= count) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (type === "shofar") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
      } else if (type === "kinnor") {
        osc.type = "sine";
        osc.frequency.value = 523;
      } else {
        osc.type = "square";
        osc.frequency.value = 880;
      }
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
      osc.onended = () => playOne(i + 1);
    };
    playOne(0);
  });
}

const AlarmWidget = () => {
  const [mode, setMode] = useState<"before" | "fixed">("before");
  const [offset, setOffset] = useState(30);
  const [fixedDate, setFixedDate] = useState("");
  const [fixedTime, setFixedTime] = useState("");
  const [sound, setSound] = useState<AlarmSound>("shofar");
  const [rings, setRings] = useState(3);
  const [alarmSet, setAlarmSet] = useState(false);
  const [alarmInfo, setAlarmInfo] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setAlarm = () => {
    let alarmTime: Date;

    if (mode === "before") {
      // Next Friday 18:45 minus offset
      const now = new Date();
      const day = now.getDay();
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const nextFriday = new Date(now);
      nextFriday.setDate(now.getDate() + daysUntilFriday);
      nextFriday.setHours(18, 45, 0, 0);
      alarmTime = new Date(nextFriday.getTime() - offset * 60000);
    } else {
      if (!fixedDate || !fixedTime) return;
      alarmTime = new Date(fixedDate + "T" + fixedTime + ":00");
    }

    const diff = alarmTime.getTime() - Date.now();
    if (diff <= 0) {
      setAlarmInfo("⚠️ L'heure choisie est déjà passée.");
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      playSound(sound, rings);
      setAlarmSet(false);
      setAlarmInfo("🔔 Réveil terminé !");
    }, diff);

    const alarmStr = alarmTime.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) + " à " + alarmTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const diffMin = Math.round(diff / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffM = diffMin % 60;
    const diffStr = diffH > 0 ? `${diffH}h${String(diffM).padStart(2, "0")}` : `${diffM} min`;

    setAlarmSet(true);
    setAlarmInfo(`🔔 Réveil programmé : ${alarmStr} (dans ${diffStr})`);
  };

  const stopAlarm = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setAlarmSet(false);
    setAlarmInfo("");
  };

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        ⏰ Réveil de Chabbat
      </h3>

      {/* Mode */}
      <div className="flex gap-2 mt-4 mb-5">
        {[
          { key: "before" as const, label: "Avant allumage" },
          { key: "fixed" as const, label: "Heure fixe" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
              mode === m.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "before" ? (
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
            Minutes avant l'allumage
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "hsl(var(--gold))" }}
            />
            <span className="text-sm font-bold text-primary min-w-[40px] text-center">{offset} min</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              value={fixedDate}
              onChange={(e) => setFixedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Heure</label>
            <input
              type="time"
              value={fixedTime}
              onChange={(e) => setFixedTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      )}

      {/* Sound */}
      <div className="mt-4">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Sonnerie</label>
        <div className="flex gap-2">
          {SOUNDS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSound(s.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                sound === s.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rings */}
      <div className="mt-4">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
          Nombre de sonneries : <span className="text-primary">{rings}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={rings}
          onChange={(e) => setRings(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "hsl(var(--gold))" }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 mt-5">
        <button
          onClick={() => playSound(sound, 1)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-card text-foreground border border-border cursor-pointer transition-all hover:border-primary/20 active:scale-95"
        >
          🔊 Test
        </button>
        <button
          onClick={alarmSet ? stopAlarm : setAlarm}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
          style={{
            background: alarmSet
              ? "linear-gradient(135deg, hsl(0 84% 60%), hsl(0 72% 51%))"
              : "var(--gradient-gold)",
            boxShadow: alarmSet ? "0 4px 24px -4px hsl(0 84% 60% / 0.3)" : "var(--shadow-gold)",
          }}
        >
          {alarmSet ? "⏹️ Arrêter le réveil" : "🔔 Activer le réveil"}
        </button>
      </div>

      {/* Status */}
      {alarmInfo && (
        <div
          className="mt-3 p-3 rounded-xl text-center text-xs font-semibold"
          style={{
            background: alarmSet
              ? "hsl(142 76% 36% / 0.08)"
              : "hsl(var(--gold) / 0.08)",
            color: alarmSet
              ? "hsl(142 71% 45%)"
              : "hsl(var(--gold-matte))",
          }}
        >
          {alarmInfo}
          {alarmSet && (
            <p className="text-[10px] text-muted-foreground mt-1 font-normal">
              ⚠️ Gardez cette page ouverte pour que le réveil fonctionne.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AlarmWidget;
