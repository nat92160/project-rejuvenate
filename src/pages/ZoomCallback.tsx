import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ZoomCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setStatus("error");
      setMessage("Paramètres manquants. Veuillez réessayer la connexion Zoom.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/zoom-callback`;

        const { data, error } = await supabase.functions.invoke("zoom-user-oauth", {
          body: { action: "callback", code, state, redirectUri },
        });

        if (error || !data?.success) {
          setStatus("error");
          setMessage(data?.error || "Échec de la connexion Zoom.");
          return;
        }

        setStatus("success");
        setMessage(data.zoomEmail ? `Connecté en tant que ${data.zoomEmail}` : "Compte Zoom connecté !");

        // Redirect home after 2s
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } catch {
        setStatus("error");
        setMessage("Erreur inattendue. Veuillez réessayer.");
      }
    };

    exchangeCode();
  }, [searchParams, navigate, user?.id]);

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
