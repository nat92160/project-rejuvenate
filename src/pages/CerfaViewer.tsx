import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCerfaPdfBlob, shareCerfaPdf } from "@/lib/cerfaPdf";

const CerfaViewer = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

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
        setPdfUrl(activeUrl);
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

  const handlePrint = () => {
    if (!pdfUrl) return;
    // Ouvre le PDF dans un nouvel onglet pour impression native (plus fiable que iframe.print)
    const w = window.open(pdfUrl, "_blank");
    if (!w) {
      // Fallback : tente l'impression iframe
      iframeRef.current?.contentWindow?.print();
    }
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
              disabled={!pdfUrl || loading || sharing}
              className="min-h-11"
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Share2 className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">Partager PDF</span>
            </Button>
            <Button onClick={handlePrint} disabled={!pdfUrl || loading} className="min-h-11">
              <Printer className="h-4 w-4 sm:mr-2" />
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
        ) : error || !pdfUrl ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error || "Reçu introuvable."}</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="min-h-11">
              Revenir
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="CERFA"
            src={pdfUrl}
            className="h-[calc(100vh-7rem)] min-h-[640px] w-full rounded-xl border border-border bg-background"
          />
        )}
      </div>
    </main>
  );
};

export default CerfaViewer;
