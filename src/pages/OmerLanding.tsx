import { useEffect } from "react";
import OmerCounterWidget from "@/components/OmerCounterWidget";
import { getTodayOmerDay } from "@/components/OmerCounterWidget";
import AuthModal from "@/components/AuthModal";
import { useState } from "react";

const OmerLanding = () => {
  const [showAuth, setShowAuth] = useState(false);
  const omerDay = getTodayOmerDay();

  useEffect(() => {
    // Update page title for SEO
    const day = omerDay || "";
    document.title = `Compte du Omer – Jour ${day} | Chabbat Chalom`;

    // Update OG meta tags dynamically
    const updateMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("og:title", `Compte du Omer 2026 – Jour ${day} 🌾`);
    updateMeta("og:description", `C'est le ${day}ème jour de l'Omer ! Découvrez la Brakha et inscrivez-vous pour recevoir votre rappel quotidien.`);
    updateMeta("og:type", "website");
    updateMeta("og:url", window.location.href);

    // Listen for auth modal trigger
    const handler = () => setShowAuth(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, [omerDay]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        {/* App branding */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🌾</div>
          <h1 className="font-display text-xl font-bold text-foreground">Séfirat HaOmer</h1>
          <p className="text-xs text-muted-foreground mt-1">Chabbat Chalom — Votre Synagogue en Temps Réel</p>
        </div>

        {/* Omer widget with invite banner */}
        <OmerCounterWidget showInviteBanner />

        {/* Bottom CTA */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Rejoignez des milliers de fidèles qui comptent ensemble chaque soir.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold transition-all border"
            style={{
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          >
            Découvrir l'application →
          </a>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default OmerLanding;