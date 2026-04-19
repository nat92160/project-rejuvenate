import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCerfaPdfBlob, shareCerfaPdf } from "@/lib/cerfaPdf";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const CerfaViewer = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Reçu introuvable.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const blob = await fetchCerfaPdfBlob(token);
        if (controller.signal.aborted) return;
        setPdfBlob(blob);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("CERFA viewer error:", err);
        setError("Impossible d'afficher le reçu CERFA.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!pdfBlob || !pagesRef.current) return;

    let cancelled = false;
    const container = pagesRef.current;

    (async () => {
      try {
        setRendering(true);
        container.innerHTML = "";

        const pdfData = await pdfBlob.arrayBuffer();
        if (cancelled) return;

        const loadingTask = getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }

        const containerWidth = Math.max(Math.min(container.clientWidth || 900, 1100), 280);
        const dpr = window.devicePixelRatio || 1;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const displayScale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: displayScale });

          const pageShell = document.createElement("div");
          pageShell.className =
            "overflow-hidden rounded-xl border border-border bg-white shadow-sm";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "block w-full h-auto";

          pageShell.appendChild(canvas);
          container.appendChild(pageShell);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
          }).promise;
        }
      } catch (err) {
        console.error("CERFA render error:", err);
        if (!cancelled) {
          setError("L'aperçu PDF ne peut pas être affiché ici.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [pdfBlob]);

  const handleOpenNewTab = () => {
    if (!pdfBlob) return;
    const blobUrl = URL.createObjectURL(pdfBlob);
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      window.location.assign(blobUrl);
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
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
        ) : error || !pdfBlob ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error || "Reçu introuvable."}</p>
            <Button variant="outline" onClick={handleOpenNewTab} className="min-h-11" disabled={!pdfBlob}>
              Ouvrir le PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rendering && (
              <div className="flex min-h-[20vh] items-center justify-center gap-3 rounded-xl border border-border bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Préparation de l'aperçu…</p>
              </div>
            )}
            <div ref={pagesRef} className="space-y-4" />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>L'aperçu ne s'affiche pas ?</span>
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
