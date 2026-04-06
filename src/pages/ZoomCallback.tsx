import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { ZOOM_REDIRECT_URI } from "@/lib/zoom";

const ZOOM_CODE_KEY = "zoom_code_exchanged";

const ZoomCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    let redirectTimer: number | undefined;

    if (!code || !state) {
      setStatus("error");
      setMessage("Paramètres manquants. Veuillez réessayer la connexion Zoom.");
      return;
    }

    // Robust guard: use sessionStorage to prevent double exchange
    // (survives React remounts, strict mode, SW replays)
    const alreadyExchanged = sessionStorage.getItem(ZOOM_CODE_KEY);
    if (alreadyExchanged === code) {
      return;
    }
    sessionStorage.setItem(ZOOM_CODE_KEY, code);

    const exchangeCode = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("zoom-user-oauth", {
          body: { action: "callback", code, state, redirectUri: ZOOM_REDIRECT_URI },
        });

        if (error || !data?.success) {
          setStatus("error");
          const zoomDetails = data?.details ? " (Zoom: " + data.details + ")" : "";
          setMessage((data?.error || "Échec de la connexion Zoom.") + zoomDetails);
          return;
        }

        setStatus("success");
        setMessage(data.zoomEmail ? `Connecté en tant que ${data.zoomEmail}` : "Compte Zoom connecté !");
        sessionStorage.removeItem(ZOOM_CODE_KEY);
        redirectTimer = window.setTimeout(() => navigate("/", { replace: true }), 2000);
      } catch {
        setStatus("error");
        setMessage("Erreur inattendue. Veuillez réessayer.");
      }
    };

    void exchangeCode();

    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground">Connexion en cours...</p>
            <p className="text-sm text-muted-foreground">Échange des identifiants avec Zoom</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-bold text-foreground">✅ Zoom connecté !</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Redirection...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-bold text-foreground">Erreur de connexion</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none bg-primary text-primary-foreground"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ZoomCallback;
