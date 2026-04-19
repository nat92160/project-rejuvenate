import { toast } from "sonner";

function getCerfaPdfUrl(token: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/generate-cerfa?token=${encodeURIComponent(token)}`;
}

export async function fetchCerfaPdfBlob(token: string): Promise<Blob> {
  const response = await fetch(getCerfaPdfUrl(token), {
    headers: { Accept: "application/pdf" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  // S'assure du bon type
  if (blob.type && !blob.type.includes("pdf")) {
    return new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
  }
  return blob;
}

function makeCerfaFilename(token: string) {
  return `cerfa-${token.slice(0, 8)}.pdf`;
}

export async function downloadCerfaPdf(token: string): Promise<void> {
  try {
    const blob = await fetchCerfaPdfBlob(token);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeCerfaFilename(token);
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CERFA PDF téléchargé");
  } catch (error) {
    console.error("downloadCerfaPdf error:", error);
    toast.error("Impossible de générer le PDF du CERFA");
  }
}

export async function shareCerfaPdf(token: string): Promise<boolean> {
  try {
    const blob = await fetchCerfaPdfBlob(token);
    const file = new File([blob], makeCerfaFilename(token), { type: "application/pdf" });

    // 1) Tentative Web Share (mobile principalement)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "Reçu CERFA", files: [file] });
        return true;
      } catch (error: any) {
        if (error?.name === "AbortError") return false;
        // sinon on bascule sur le fallback
      }
    }

    // 2) Fallback web : ouvrir le PDF dans un nouvel onglet + le télécharger
    const url = URL.createObjectURL(blob);

    // Ouvrir dans un nouvel onglet (le président peut l'envoyer manuellement)
    const opened = window.open(url, "_blank", "noopener,noreferrer");

    // Téléchargement automatique en parallèle (au cas où le popup est bloqué)
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    if (opened) {
      toast.success("PDF ouvert et téléchargé. Vous pouvez le transférer au fidèle.");
    } else {
      toast.success("PDF téléchargé. Vous pouvez le transférer au fidèle.");
    }
    return true;
  } catch (error) {
    console.error("shareCerfaPdf error:", error);
    toast.error("Impossible de générer le PDF du CERFA");
    return false;
  }
}
