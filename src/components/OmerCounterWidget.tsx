import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, UserPlus, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getTodayOmerDay,
  getOmerPeriodDates,
  getWeeksAndDays,
  getOmerBlessing,
  getSefiratDay,
} from "@/components/omer/omerData";
import {
  hasAlreadyCountedAsync,
  hasAlreadyCountedLocal,
  markAsCounted,
  getStreakAsync,
  getStreakLocal,
  migrateLocalToDb,
  shareOmer,
} from "@/components/omer/omerStorage";
import OmerPostCountRitual from "@/components/omer/OmerPostCountRitual";
import OmerAdminSimulator from "@/components/omer/OmerAdminSimulator";

// Re-export for landing page
export { getTodayOmerDay };

function getStreakMessage(streak: number): string {
  if (streak >= 49) return "🏆 49 jours sans interruption ! Kol HaKavod !";
  if (streak >= 30) return `🔥 ${streak} jours consécutifs ! Incroyable !`;
  if (streak >= 14) return `🔥 ${streak} jours de suite ! Tu es un exemple !`;
  if (streak >= 7) return `🔥 ${streak} jours consécutifs ! Une semaine complète !`;
  if (streak >= 3) return `🔥 ${streak}ème jour consécutif ! Continue comme ça !`;
  if (streak === 2) return "🔥 2ème jour consécutif ! Belle série !";
  return "🌟 Bravo ! Mitsva accomplie pour ce soir.";
}

interface OmerCounterWidgetProps {
  showInviteBanner?: boolean;
}

const OmerCounterWidget = ({ showInviteBanner = false }: OmerCounterWidgetProps) => {
  const { user, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(showInviteBanner);
  const realOmerDay = useMemo(() => getTodayOmerDay(), []);
  const currentYear = new Date().getFullYear();
  const omerPeriod = useMemo(() => getOmerPeriodDates(currentYear), [currentYear]);
  const [counted, setCounted] = useState(false);
  const [streak, setStreak] = useState(0);

  // Admin simulation
  const [simulatedDay, setSimulatedDay] = useState<number | null>(null);
  const isSimulating = isAdmin && simulatedDay !== null;
  const omerDay = isSimulating ? simulatedDay : realOmerDay;

  // Load counted/streak state (async for DB users)
  useEffect(() => {
    if (!realOmerDay) return;
    const userId = user?.id ?? null;

    const load = async () => {
      const alreadyCounted = userId
        ? await hasAlreadyCountedAsync(realOmerDay, userId)
        : hasAlreadyCountedLocal(realOmerDay);
      setCounted(alreadyCounted);

      if (userId) {
        const s = await getStreakAsync(realOmerDay, userId);
        setStreak(s.lastDay >= realOmerDay - 1 ? s.streak : 0);
      } else {
        const { streak: s, lastDay } = getStreakLocal();
        if (lastDay >= realOmerDay - 1) setStreak(s);
      }
    };

    load();
  }, [realOmerDay, user?.id]);

  // Migrate localStorage → DB when user first logs in during Omer
  useEffect(() => {
    if (user?.id && realOmerDay) {
      migrateLocalToDb(user.id);
    }
  }, [user?.id, realOmerDay]);

  // Hide widget if not in omer period (unless admin can simulate)
  const canShowAdmin = isAdmin;
  if (!canShowAdmin && !isSimulating && (!omerDay || !omerPeriod)) return null;

  const effectiveDay = isSimulating ? simulatedDay! : (omerDay || (canShowAdmin ? 1 : null));
  if (!effectiveDay) return null;

  const { weeks, days } = getWeeksAndDays(effectiveDay);
  const progress = (effectiveDay / 49) * 100;
  const blessing = getOmerBlessing(effectiveDay);
  const sefira = getSefiratDay(effectiveDay);

  const handleCounted = async () => {
    if (!isSimulating && realOmerDay) {
      const newStreak = await markAsCounted(realOmerDay, user?.id ?? null);
      setStreak(newStreak);
    }
    setCounted(true);
    setExpanded(true);
  };

  const gradientStart = "hsl(var(--gold))";
  const gradientEnd = "hsl(var(--gold-matte))";

  return (
    <motion.div
      className="rounded-2xl mb-4 overflow-hidden border"
      style={{
        borderColor: "hsl(var(--gold) / 0.3)",
        boxShadow: "0 8px 32px hsl(var(--gold) / 0.12)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showInviteBanner && (
        <div
          className="px-5 py-3 text-center text-xs font-medium"
          style={{
            background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--primary) / 0.08))",
            color: "hsl(var(--foreground))",
          }}
        >
          ✨ Vous avez reçu ce rappel d'un ami. Ne manquez plus un seul soir : inscrivez-vous pour recevoir vos notifications personnalisées.
        </div>
      )}

      {/* Header */}
      <div
        className="p-5 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))",
        }}
      >
        {isAdmin && (
          <OmerAdminSimulator simulatedDay={simulatedDay} onSimulate={setSimulatedDay} />
        )}

        <div className="absolute top-2 left-4 text-lg opacity-30 animate-pulse">✨</div>
        <div className="absolute top-3 right-6 text-sm opacity-20 animate-pulse" style={{ animationDelay: "0.5s" }}>✨</div>
        <div className="absolute bottom-2 left-1/4 text-xs opacity-25 animate-pulse" style={{ animationDelay: "1s" }}>⭐</div>

        <button
          onClick={() => shareOmer(effectiveDay)}
          className="absolute top-4 right-4 p-2 rounded-full border-none cursor-pointer transition-all hover:scale-110 active:scale-95"
          style={{
            background: "hsl(var(--gold) / 0.15)",
            color: "hsl(var(--gold-matte))",
          }}
          title="Partager la Mitsva"
        >
          <Share2 size={16} />
        </button>

        <motion.div
          className="text-4xl mb-2"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          🌾
        </motion.div>

        <div className="text-[10px] uppercase tracking-[4px] font-bold text-muted-foreground mb-1">
          Séfirat HaOmer
        </div>

        <div className="flex items-center justify-center gap-2 my-3">
          <motion.div
            className="text-5xl font-extrabold font-display"
            style={{
              background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
          >
            {effectiveDay}
          </motion.div>

          {streak > 1 && !isSimulating && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 8, delay: 0.3 }}
            >
              <motion.div
                animate={{ y: [0, -3, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              >
                <Flame
                  size={28}
                  className="drop-shadow-lg"
                  style={{ color: "hsl(var(--gold))" }}
                  fill="hsl(var(--gold) / 0.3)"
                />
              </motion.div>
              <span
                className="text-[10px] font-extrabold -mt-1"
                style={{ color: "hsl(var(--gold-matte))" }}
              >
                ×{streak}
              </span>
            </motion.div>
          )}
        </div>

        <div className="text-xs font-bold text-foreground">
          {weeks > 0 ? (
            <span>
              {weeks} semaine{weeks > 1 ? "s" : ""}
              {days > 0 && ` et ${days} jour${days > 1 ? "s" : ""}`}
            </span>
          ) : (
            <span>{days} jour{days > 1 ? "s" : ""}</span>
          )}
        </div>

        <div
          className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "hsl(var(--gold) / 0.12)",
            color: "hsl(var(--gold-matte))",
          }}
        >
          {sefira.attribute} dans {sefira.within}
        </div>

        {isSimulating && (
          <div className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full inline-block"
            style={{ background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" }}>
            ⚙️ MODE SIMULATION
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 bg-card">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Progression</span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
            {effectiveDay}/49
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>

        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: 7 }).map((_, i) => {
            const dotDay = (weeks * 7) + i + 1;
            const isPast = dotDay < effectiveDay;
            const isCurrent = dotDay === effectiveDay;
            return (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: isCurrent ? "12px" : "8px",
                  height: isCurrent ? "12px" : "8px",
                  background: isCurrent
                    ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                    : isPast
                    ? "hsl(var(--gold) / 0.4)"
                    : "hsl(var(--muted))",
                  boxShadow: isCurrent ? "0 0 8px hsl(var(--gold) / 0.5)" : "none",
                }}
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            );
          })}
        </div>
      </div>

      {/* Count button or congratulations */}
      <div className="bg-card border-t border-border">
        {!counted ? (
          <div className="px-5 py-3 flex gap-2">
            <button
              onClick={handleCounted}
              className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                color: "hsl(var(--card))",
              }}
            >
              <Check size={14} className="inline mr-1.5 -mt-0.5" />
              J'ai compté ce soir
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 text-center space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-bold text-foreground"
            >
              {getStreakMessage(streak)}
            </motion.div>

            {streak > 1 && !user && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[11px] text-muted-foreground italic"
              >
                💡 Créez un compte pour sauvegarder votre série de {streak} jours sur tous vos appareils !
              </motion.div>
            )}

            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => shareOmer(effectiveDay)}
                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-all active:scale-[0.97]"
                style={{
                  borderColor: "hsl(var(--gold) / 0.3)",
                  color: "hsl(var(--gold-matte))",
                  background: "hsl(var(--gold) / 0.08)",
                }}
              >
                <Share2 size={12} className="inline mr-1.5 -mt-0.5" />
                Partager avec un ami
              </button>
              {!user && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                  className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    color: "hsl(var(--card))",
                  }}
                >
                  <UserPlus size={12} className="inline mr-1.5 -mt-0.5" />
                  {streak > 1
                    ? `Sauvegarder ma série de ${streak} jours`
                    : "M'inscrire pour ne pas oublier demain"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Blessing section */}
      <div className="bg-card border-t border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer border-none bg-transparent transition-all"
          style={{ color: "hsl(var(--gold-matte))" }}
        >
          {expanded ? "Masquer la Brakha ▲" : "📖 Voir la Brakha du Omer ▼"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              className="px-5 pb-5 space-y-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="p-4 rounded-xl text-right leading-relaxed"
                style={{
                  background: "hsl(var(--gold) / 0.05)",
                  fontFamily: "'David Libre', 'Frank Ruhl Libre', serif",
                  fontSize: "18px",
                  direction: "rtl",
                  color: "hsl(var(--foreground))",
                }}
              >
                {blessing.hebrew}
              </div>

              <div className="p-3 rounded-xl border border-border">
                <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Phonétique</div>
                <p className="text-sm italic text-foreground leading-relaxed">
                  {blessing.phonetic}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border">
                <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Traduction</div>
                <p className="text-sm text-foreground leading-relaxed">
                  {blessing.french}
                </p>
              </div>

              {showInviteBanner && !user && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                  className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    color: "hsl(var(--card))",
                    boxShadow: "0 4px 16px hsl(var(--gold) / 0.3)",
                  }}
                >
                  <UserPlus size={14} className="inline mr-2 -mt-0.5" />
                  M'inscrire aux rappels quotidiens
                </button>
              )}

              <div
                className="text-center text-[11px] italic text-muted-foreground p-3 rounded-xl"
                style={{ background: "hsl(var(--gold) / 0.04)" }}
              >
                💡 On compte le Omer chaque soir après la tombée de la nuit (Tsét HaKokhavim). Si on a oublié le soir, on peut compter le jour suivant sans Brakha.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(counted || expanded) && (
        <OmerPostCountRitual currentWeek={weeks} />
      )}
    </motion.div>
  );
};

export default OmerCounterWidget;
