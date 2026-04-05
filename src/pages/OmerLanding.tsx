import { useEffect, useRef, useState, useMemo } from "react";
import OmerCounterWidget from "@/components/OmerCounterWidget";
import { getTodayOmerDay, getOmerPeriodDates } from "@/components/omer/omerData";
import AuthModal from "@/components/AuthModal";
import { useOmerPushSubscription } from "@/hooks/useOmerPushSubscription";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const OmerPushButton = () => {
  const { isSubscribed, subscribe, unsubscribe, supported, loading } = useOmerPushSubscription();
  if (!supported || loading) return null;
  return (
    <button
      onClick={async () => {
        if (isSubscribed) {
          await unsubscribe();
          toast.success("🔕 Rappels désactivés");
        } else {
          const ok = await subscribe();
          if (ok) toast.success("🔔 Rappel activé !");
          else toast.error("Impossible d'activer les notifications");
        }
      }}
      className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none transition-all active:scale-[0.97]"
      style={{
        background: isSubscribed
          ? "hsl(var(--gold) / 0.15)"
          : "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-matte)))",
        color: isSubscribed ? "hsl(var(--gold-matte))" : "hsl(var(--card))",
      }}
    >
      <Bell size={14} className="inline mr-1.5 -mt-0.5" />
      {isSubscribed ? "🔕 Rappels activés" : "🔔 Recevoir un rappel chaque soir"}
    </button>
  );
};

const OmerLanding = () => {
  const [showAuth, setShowAuth] = useState(false);
  const omerDay = getTodayOmerDay();
  const widgetRef = useRef<HTMLDivElement>(null);
  const isOmerPeriod = omerDay !== null;

  const nextOmerStart = useMemo(() => {
    if (isOmerPeriod) return null;
    const year = new Date().getFullYear();
    const thisYear = getOmerPeriodDates(year);
    if (thisYear && thisYear.start > new Date()) return thisYear.start;
    const nextYear = getOmerPeriodDates(year + 1);
    return nextYear?.start ?? null;
  }, [isOmerPeriod]);

  useEffect(() => {
    const day = omerDay || "";
    document.title = isOmerPeriod
      ? `🌾 Comptez l'Omer – Jour ${day} | Chabbat Chalom`
      : `🌾 Séfirat HaOmer | Chabbat Chalom`;

    const updateMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("og:title", isOmerPeriod
      ? `🌾 Séfirat HaOmer — Jour ${day}/49 | Chabbat Chalom`
      : `🌾 Séfirat HaOmer — Chabbat Chalom`);
    updateMeta("og:description", isOmerPeriod
      ? `C'est le ${day}${day === 1 ? "er" : "ème"} jour du Omer ! Comptez ce soir avec la Brakha et ne manquez plus un seul jour grâce aux rappels gratuits.`
      : `Rejoignez des milliers de fidèles qui comptent ensemble chaque soir. Rappels gratuits à la sortie des étoiles.`);
    updateMeta("og:type", "website");
    updateMeta("og:url", window.location.href);
    updateMeta("og:image", "https://www.chabbat-chalom.com/omer-share.jpg");
    updateMeta("og:site_name", "Chabbat Chalom");

    // Twitter Card
    let twitterCard = document.querySelector('meta[name="twitter:card"]') as HTMLMetaElement | null;
    if (!twitterCard) {
      twitterCard = document.createElement("meta");
      twitterCard.setAttribute("name", "twitter:card");
      document.head.appendChild(twitterCard);
    }
    twitterCard.setAttribute("content", "summary_large_image");

    // Auto-scroll to widget
    setTimeout(() => {
      widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    const handler = () => setShowAuth(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, [omerDay, isOmerPeriod]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
        {/* Minimal branding */}
        <div className="text-center mb-3">
          <p className="text-[10px] text-muted-foreground tracking-wide">Chabbat Chalom — Votre Synagogue en Temps Réel</p>
        </div>

        {/* If NOT in Omer period, show a coming-soon card */}
        {!isOmerPeriod && (
          <div
            className="rounded-2xl border p-6 mb-4 text-center"
            style={{
              borderColor: "hsl(var(--gold) / 0.3)",
              background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
              boxShadow: "0 8px 32px hsl(var(--gold) / 0.1)",
            }}
          >
            <div className="text-4xl mb-3">🌾</div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Séfirat HaOmer
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              La période du Omer n'a pas encore commencé.
            </p>
            {nextOmerStart && (
              <p className="text-xs font-medium" style={{ color: "hsl(var(--gold-matte))" }}>
                🗓️ Début prévu le {nextOmerStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Inscrivez-vous pour recevoir un rappel dès le premier soir !
            </p>
            <OmerPushButton />
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
              className="mt-2 px-6 py-2 rounded-xl text-xs font-medium cursor-pointer border transition-all active:scale-[0.97]"
              style={{
                borderColor: "hsl(var(--gold) / 0.3)",
                color: "hsl(var(--gold-matte))",
                background: "hsl(var(--gold) / 0.08)",
              }}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Direct Omer widget — only show when in Omer period */}
        {isOmerPeriod && (
          <div ref={widgetRef}>
            <OmerCounterWidget showInviteBanner />
          </div>
        )}

        {/* Sticky bottom discovery banner */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
          <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Horaires · Tehilim · Minyanim</span>
            <a
              href="/"
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: "hsl(var(--gold) / 0.12)",
                color: "hsl(var(--gold-matte))",
              }}
            >
              Découvrir l'appli →
            </a>
          </div>
        </div>
      </div>

      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default OmerLanding;
