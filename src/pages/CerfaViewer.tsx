import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCerfaPdfBlob, shareCerfaPdf } from "@/lib/cerfaPdf";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const CerfaViewer = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // URL directe vers l'edge function (utilisée pour iframe + lien "ouvrir")
  const directUrl = useMemo(
    () => (token ? `${SUPABASE_URL}/functions/v1/generate-cerfa?token=${encodeURIComponent(token)}` : null),
    [token],
  );

  useEffect(() => {
    if (!token) {
      setError("Reçu introuvable.");
      setLoading(false);
      return;
    }

    let activeUrl: string | null = null;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const blob = await fetchCerfaPdfBlob(token);
        if (controller.signal.aborted) return;
        activeUrl = URL.createObjectURL(blob);
        setBlobUrl(activeUrl);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("CERFA viewer error:", err);
        setError("Impossible d'afficher le reçu CERFA.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [token]);

  const handleOpenNewTab = () => {
    if (!directUrl) return;
    window.open(directUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (!token) return;
    setSharing(true);
    try {
      await shareCerfaPdf(token);
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="min-h-11 px-2 sm:px-4">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={loading || sharing}
              className="min-h-11"
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Share2 className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">Partager PDF</span>
            </Button>
            <Button onClick={handleOpenNewTab} disabled={!directUrl || loading} className="min-h-11">
              <ExternalLink className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ouvrir / Imprimer</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement du CERFA…</p>
          </div>
        ) : error || !directUrl ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error || "Reçu introuvable."}</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="min-h-11">
              Revenir
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Aperçu : iframe direct vers l'URL (plus fiable que blob: dans iframes imbriquées) */}
            <iframe
              ref={iframeRef}
              title="Reçu CERFA"
              src={blobUrl || directUrl}
              className="h-[calc(100vh-9rem)] min-h-[640px] w-full rounded-xl border border-border bg-white"
            />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>L'aperçu ne s'affiche pas&nbsp;?</span>
              <button
                onClick={handleOpenNewTab}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Ouvrir le PDF dans un nouvel onglet
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CerfaViewer;
