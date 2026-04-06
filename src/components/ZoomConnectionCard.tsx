import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle, ExternalLink, Unplug } from "lucide-react";
import { ZOOM_REDIRECT_URI, generateCodeVerifier, generateCodeChallenge, storePkceVerifier } from "@/lib/zoom";

interface ZoomConnectionStatus {
  connected: boolean;
  zoomEmail?: string;
  expired?: boolean;
  loading: boolean;
}

export function useZoomConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ZoomConnectionStatus>({ connected: false, loading: true });

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      setStatus({ connected: false, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("zoom-user-oauth", {
        body: { action: "status", userId: user.id },
      });

      if (error || !data?.success) {
        setStatus({ connected: false, loading: false });
        return;
      }

      setStatus({
        connected: data.connected,
        zoomEmail: data.zoomEmail,
        expired: data.expired,
        loading: false,
      });
    } catch {
      setStatus({ connected: false, loading: false });
    }
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const startOAuth = useCallback(async () => {
    if (!user?.id) {
      toast.error("Veuillez vous connecter pour lier votre compte Zoom.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("zoom-user-oauth", {
        body: { action: "authorize", userId: user.id, redirectUri: ZOOM_REDIRECT_URI },
      });

      if (error || !data?.success) {
        toast.error("Impossible de démarrer la connexion Zoom.");
        return;
      }

      window.location.href = data.authUrl;
    } catch {
      toast.error("Erreur lors de la connexion Zoom.");
    }
  }, [user?.id]);

  const disconnect = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase.functions.invoke("zoom-user-oauth", {
        body: { action: "disconnect", userId: user.id },
      });
      setStatus({ connected: false, loading: false });
      toast.success("Compte Zoom déconnecté.");
    } catch {
      toast.error("Erreur lors de la déconnexion.");
    }
  }, [user?.id]);

  return { ...status, startOAuth, disconnect, refresh: checkStatus };
}

export const ZoomConnectionCard = () => {
  const { connected, zoomEmail, expired, loading, startOAuth, disconnect } = useZoomConnection();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Vérification Zoom...</span>
      </div>
    );
  }

  if (connected && !expired) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Zoom connecté</p>
            {zoomEmail && <p className="text-xs text-muted-foreground truncate">{zoomEmail}</p>}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Les réunions seront créées sur votre compte Zoom personnel. Aucun autre utilisateur ne peut accéder à vos données.
        </p>
        <button
          onClick={disconnect}
          className="flex items-center gap-1.5 text-xs font-medium text-destructive cursor-pointer bg-transparent border-none hover:underline"
        >
          <Unplug size={12} />
          Déconnecter Zoom
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">
          {expired ? "⚠️ Session Zoom expirée" : "🎥 Connecter votre Zoom"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {expired
            ? "Votre session Zoom a expiré. Reconnectez-vous pour continuer à créer des réunions automatiquement."
            : "Connectez votre compte Zoom personnel pour créer des réunions automatiquement. Vos identifiants restent privés et isolés."}
        </p>
      </div>
      <button
        onClick={startOAuth}
        className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none transition-all active:scale-[0.97] text-white"
        style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" }}
      >
        <ExternalLink size={14} className="inline mr-2 -mt-0.5" />
        {expired ? "Reconnecter Zoom" : "Connecter mon compte Zoom"}
      </button>
    </div>
  );
};
