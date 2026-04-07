import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, UserPlus, Flame, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOmerPushSubscription } from "@/hooks/useOmerPushSubscription";
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
import OmerShareCard from "@/components/omer/OmerShareCard";

// Re-export for landing page
export { getTodayOmerDay };

function getStreakMessage(day: number): string {
  if (day >= 49) return "🏆 49ème jour ! Kol HaKavod, le compte est complet !";
  if (day >= 30) return `🔥 ${day}ème jour du Omer ! Bientôt Chavouot !`;
  if (day >= 14) return `🔥 ${day}ème jour du Omer ! Tu es un exemple !`;
  if (day >= 7) return `🔥 ${day}ème jour du Omer ! Continue comme ça !`;
  if (day >= 2) return `🔥 ${day}ème jour du Omer ! Belle série !`;
  return "🌟 Bravo ! Mitsva accomplie pour ce soir.";
}

interface OmerCounterWidgetProps {
  showInviteBanner?: boolean;
  isBeforeCountingTime?: boolean;
}

const OmerCounterWidget = ({ showInviteBanner = false, isBeforeCountingTime = false }: OmerCounterWidgetProps) => {
  const { user, isAdmin } = useAuth();
  const { isSubscribed: isPushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, supported: pushSupported } = useOmerPushSubscription();
  const [expanded, setExpanded] = useState(showInviteBanner);
  const realOmerDay = useMemo(() => getTodayOmerDay(), []);
  const currentYear = new Date().getFullYear();
  const omerPeriod = useMemo(() => getOmerPeriodDates(currentYear), [currentYear]);
  const [counted, setCounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  // Hide widget if not in omer period (unless admin can simulate or direct link)
  const canShowAdmin = isAdmin;
  const isDirectLink = showInviteBanner;
  if (!canShowAdmin && !isSimulating && !isDirectLink && (!omerDay || !omerPeriod)) return null;

  const effectiveDay = isSimulating ? simulatedDay! : (omerDay || (canShowAdmin || isDirectLink ? 1 : null));

  // If still no effective day (outside Omer, direct link fallback), show a "coming soon" state
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

      {isBeforeCountingTime && !counted && (
        <div
          className="px-5 py-2.5 text-center text-xs font-medium"
          style={{
            background: "linear-gradient(135deg, hsl(38 92% 50% / 0.12), hsl(38 92% 50% / 0.05))",
            color: "hsl(var(--foreground))",
          }}
        >
          ☀️ En journée, on peut lire le compte du Omer <strong>sans réciter la brakha</strong>. La brakha se dit le soir après la Shkiya.
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

        <div className="absolute top-3 right-3 flex gap-2 z-10">
          {pushSupported && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (isPushSubscribed) {
                  await unsubscribePush();
                  toast.success("🔕 Rappels désactivés");
                } else {
                  const ok = await subscribePush();
                  if (ok) toast.success("🔔 Vous recevrez un rappel chaque soir !");
                  else toast.error("Autorisez les notifications dans les réglages de votre appareil pour recevoir les rappels.");
                }
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-none cursor-pointer transition-all hover:scale-110 active:scale-95"
              style={{
                background: isPushSubscribed ? "hsl(var(--gold) / 0.3)" : "hsl(var(--gold) / 0.15)",
                color: "hsl(var(--gold-matte))",
              }}
              title={isPushSubscribed ? "Désactiver les rappels" : "Activer les rappels quotidiens"}
            >
              {isPushSubscribed ? <BellOff size={20} /> : <Bell size={20} />}
            </button>
          )}
          <button
            onClick={async () => {
              const shared = await shareOmer(effectiveDay, shareCardRef.current);
              if (shared) toast.success("Partage envoyé !");
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-none cursor-pointer transition-all hover:scale-110 active:scale-95"
            style={{
              background: "hsl(var(--gold) / 0.15)",
              color: "hsl(var(--gold-matte))",
            }}
            title="Partager la Mitsva"
          >
            <Share2 size={20} />
          </button>
        </div>

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
              {getStreakMessage(omerDay ?? 1)}
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
                onClick={async () => {
                  const shared = await shareOmer(effectiveDay, shareCardRef.current);
                  if (shared) toast.success("Partage envoyé !");
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all active:scale-[0.97]"
                style={{
                  borderColor: "hsl(var(--gold) / 0.3)",
                  color: "hsl(var(--gold-matte))",
                  background: "hsl(var(--gold) / 0.08)",
                }}
              >
                <Share2 size={12} className="inline mr-1.5 -mt-0.5" />
                Partager avec un ami
              </button>
              {!user && pushSupported && !isPushSubscribed && (
                <button
                  onClick={async () => {
                    const ok = await subscribePush();
                    if (ok) toast.success("🔔 Rappel activé ! Vous serez notifié chaque soir.");
                    else toast.error("Autorisez les notifications dans les réglages de votre appareil pour recevoir les rappels.");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    color: "hsl(var(--card))",
                  }}
                >
                  <Bell size={12} className="inline mr-1.5 -mt-0.5" />
                  🔔 Recevoir un rappel chaque soir
                </button>
              )}
              {!user && !pushSupported && (
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

      {/* Hidden card for share image generation — off-screen but visible for html2canvas */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <OmerShareCard ref={shareCardRef} day={effectiveDay} />
      </div>
    </motion.div>
  );
};

export default OmerCounterWidget;
