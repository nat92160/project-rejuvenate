import { useEffect, useRef, useState } from "react";
import OmerCounterWidget from "@/components/OmerCounterWidget";
import { getTodayOmerDay } from "@/components/omer/omerData";
import AuthModal from "@/components/AuthModal";

const OmerLanding = () => {
  const [showAuth, setShowAuth] = useState(false);
  const omerDay = getTodayOmerDay();
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const day = omerDay || "";
    document.title = `🌾 Comptez l'Omer – Jour ${day} | Chabbat Chalom`;

    const updateMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("og:title", `🌾 Comptez l'Omer aujourd'hui : Jour ${day}`);
    updateMeta("og:description", `C'est le ${day}ème jour du Omer ! Récitez la Brakha et validez votre compte ce soir.`);
    updateMeta("og:type", "website");
    updateMeta("og:url", window.location.href);
    updateMeta("og:image", "https://www.chabbat-chalom.com/omer-share.jpg");

    // Auto-scroll to widget
    setTimeout(() => {
      widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    const handler = () => setShowAuth(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, [omerDay]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
        {/* Minimal branding */}
        <div className="text-center mb-3">
          <p className="text-[10px] text-muted-foreground tracking-wide">Chabbat Chalom — Votre Synagogue en Temps Réel</p>
        </div>

        {/* Direct Omer widget */}
        <div ref={widgetRef}>
          <OmerCounterWidget showInviteBanner />
        </div>

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
