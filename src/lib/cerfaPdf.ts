import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { isNativePlatform } from "@/lib/capacitorPush";
import { shareText } from "@/lib/shareUtils";

export function getCerfaPdfUrl(token: string) {
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

async function shareCerfaLink(token: string): Promise<boolean> {
  const url = getCerfaPdfUrl(token);

  if (isNativePlatform()) {
    await Share.share({
      title: "Reçu CERFA",
      text: "Voici le lien du reçu CERFA en PDF.",
      url,
      dialogTitle: "Partager le CERFA",
    });
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "Reçu CERFA",
        text: "Voici le lien du reçu CERFA en PDF.",
        url,
      });
      return true;
    } catch (error: any) {
      if (error?.name === "AbortError") return false;
    }
  }

  const shared = await shareText(url, "Reçu CERFA");
  if (shared) {
    toast.success("Lien du CERFA prêt à être envoyé.");
  }
  return shared;
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
    return await shareCerfaLink(token);
  } catch (error) {
    console.error("shareCerfaPdf error:", error);
    toast.error("Impossible de générer le PDF du CERFA");
    return false;
  }
}
