import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CircularTimePicker from "./alarm/CircularTimePicker";
import NightModeOverlay from "./alarm/NightModeOverlay";
import { type AlarmSound, SOUND_LIST, startAlarm, previewSound, type AlarmPlayer } from "./alarm/alarmAudio";

const AlarmWidget = () => {
  const [hours, setHours] = useState(6);
  const [minutes, setMinutes] = useState(30);
  const [sound, setSound] = useState<AlarmSound>("harpe");
  const [rings, setRings] = useState(3);
  const [alarmSet, setAlarmSet] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [dawnProgress, setDawnProgress] = useState(0);
  const [alarmTime, setAlarmTime] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<AlarmPlayer | null>(null);
  const dawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      playerRef.current?.stop();
      if (dawnRef.current) clearInterval(dawnRef.current);
    };
  }, []);

  const handleTimeChange = useCallback((h: number, m: number) => {
    setHours(h);
    setMinutes(m);
  }, []);

  const activate = () => {
    // Build alarm time for today or tomorrow
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    setAlarmTime(target);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Trigger alarm
      setIsRinging(true);

      // Start dawn animation over 45 seconds
      const dawnDuration = 45000;
      const dawnStart = Date.now();
      dawnRef.current = setInterval(() => {
        const elapsed = Date.now() - dawnStart;
        const p = Math.min(1, elapsed / dawnDuration);
        setDawnProgress(p);
        if (p >= 1 && dawnRef.current) clearInterval(dawnRef.current);
      }, 100);

      // Start audio
      playerRef.current = startAlarm(sound, rings, (p) => {
        // Audio progress callback — could sync with dawn
      });

      // Auto-stop after all rings played
      const totalDuration = rings * 6 * 1000 + 2000;
      setTimeout(() => {
        stopAlarm();
      }, totalDuration);
    }, diff);

    setAlarmSet(true);
    setNightMode(true);
  };

  const stopAlarm = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    if (dawnRef.current) clearInterval(dawnRef.current);
    dawnRef.current = null;
    setAlarmSet(false);
    setNightMode(false);
    setIsRinging(false);
    setDawnProgress(0);
    setAlarmTime(null);
  };

  const diffMs = alarmTime ? Math.max(0, alarmTime.getTime() - Date.now()) : 0;
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);

  return (
    <>
      <NightModeOverlay
        active={nightMode}
        alarmTime={alarmTime}
        isRinging={isRinging}
        dawnProgress={dawnProgress}
        onStop={stopAlarm}
      />

      <motion.div
        className="rounded-3xl p-6 mb-4 border border-gold-DEFAULT/20"
        style={{
          background: "hsl(var(--card) / 0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "var(--shadow-card), inset 0 1px 0 hsl(40 80% 50% / 0.05)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-display text-lg font-bold text-foreground tracking-wide">
            ⏰ Réveil de Chabbat
          </h3>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Mode Vigilance · Réveil garanti
          </p>
        </div>

        {/* Time Picker */}
        <div className="flex justify-center mb-6">
          <CircularTimePicker hours={hours} minutes={minutes} onChange={handleTimeChange} />
        </div>

        {/* Sound selector */}
        <div className="mb-5">
          <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-2 block text-center">
            Sonnerie
          </label>
          <div className="flex gap-1.5 justify-center">
            {SOUND_LIST.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setSound(s.key);
                  previewSound(s.key);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                  sound === s.key
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
                style={sound === s.key ? { boxShadow: "var(--shadow-gold)" } : {}}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ring count — segmented control */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-2 block text-center">
            Nombre de sonneries
          </label>
          <div className="flex gap-1 justify-center bg-muted rounded-xl p-1 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRings(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                  rings === n
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Activate Button */}
        <AnimatePresence mode="wait">
          {!alarmSet ? (
            <motion.button
              key="activate"
              onClick={activate}
              className="w-full py-4 rounded-2xl text-sm font-bold text-primary-foreground border-none cursor-pointer relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-gold)",
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <motion.span
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "radial-gradient(circle at center, hsl(40 80% 70% / 0.3) 0%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                🕯️ Activer Vigilance Chabbat
              </span>
            </motion.button>
          ) : (
            <motion.button
              key="cancel"
              onClick={stopAlarm}
              className="w-full py-4 rounded-2xl text-sm font-bold border-none cursor-pointer"
              style={{
                background: "linear-gradient(135deg, hsl(0 84% 60%), hsl(0 72% 51%))",
                color: "white",
                boxShadow: "0 4px 24px -4px hsl(0 84% 60% / 0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              ⏹️ Annuler le réveil
            </motion.button>
          )}
        </AnimatePresence>

        {/* Status info */}
        {alarmSet && alarmTime && (
          <motion.div
            className="mt-4 p-3 rounded-xl text-center text-xs font-medium"
            style={{
              background: "hsl(142 76% 36% / 0.06)",
              color: "hsl(142 71% 40%)",
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <p>
              🔔 Réveil à {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
              {diffMs > 0 && (
                <span className="text-muted-foreground ml-1">
                  (dans {diffH > 0 ? `${diffH}h` : ""}{String(diffM).padStart(2, "0")}min)
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-normal">
              L'écran passera en mode nuit · Gardez l'app au premier plan
            </p>
          </motion.div>
        )}
      </motion.div>
    </>
  );
};

export default AlarmWidget;
