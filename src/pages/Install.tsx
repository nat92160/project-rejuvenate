import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StarOfDavid from "@/components/StarOfDavid";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <StarOfDavid size={64} />
        </div>

        <h1 className="font-display text-3xl font-extrabold text-foreground">
          Chabbat <span className="text-primary">Chalom</span>
        </h1>

        {isInstalled ? (
          <div className="rounded-2xl border border-border bg-card p-8 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-4xl">✅</p>
            <p className="text-lg font-bold text-foreground">Application installée !</p>
            <p className="text-sm text-muted-foreground">
              Vous pouvez la retrouver sur votre écran d'accueil.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-8 py-3 rounded-full text-sm font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 text-primary-foreground border-none"
              style={{ background: "var(--gradient-gold)" }}
            >
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-4xl">📲</p>
            <p className="text-lg font-bold text-foreground">
              Installez l'application
            </p>
            <p className="text-sm text-muted-foreground">
              Accédez rapidement aux horaires, Zmanim et Tehilim depuis votre écran d'accueil.
            </p>

            {deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full py-3.5 rounded-full text-sm font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 text-primary-foreground border-none"
                style={{ background: "var(--gradient-gold)", boxShadow: "0 6px 24px hsl(var(--gold) / 0.35)" }}
              >
                📥 Installer maintenant
              </button>
            ) : isIOS ? (
              <div className="text-left space-y-3 bg-muted rounded-xl p-4">
                <p className="text-sm font-bold text-foreground">Sur iPhone / iPad :</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                  <li>Appuyez sur le bouton <strong className="text-foreground">Partager</strong> ↗️ en bas du navigateur</li>
                  <li>Faites défiler et tapez <strong className="text-foreground">« Sur l'écran d'accueil »</strong></li>
                  <li>Confirmez en appuyant <strong className="text-foreground">Ajouter</strong></li>
                </ol>
              </div>
            ) : (
              <div className="text-left space-y-3 bg-muted rounded-xl p-4">
                <p className="text-sm font-bold text-foreground">Sur Android :</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                  <li>Ouvrez le menu <strong className="text-foreground">⋮</strong> de votre navigateur</li>
                  <li>Tapez <strong className="text-foreground">« Installer l'application »</strong> ou <strong className="text-foreground">« Ajouter à l'écran d'accueil »</strong></li>
                </ol>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="mt-2 text-xs text-muted-foreground underline cursor-pointer bg-transparent border-none"
            >
              Continuer sans installer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
