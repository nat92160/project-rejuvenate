import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { toast } from "sonner";
import { isNativePlatform } from "@/lib/capacitorPush";
import { shareText } from "@/lib/shareUtils";

export function getCerfaPdfUrl(token: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/generate-cerfa?token=${encodeURIComponent(token)}`;
}

/**
 * Public-facing URL (custom domain) used for sharing.
 * Hides the underlying Supabase host so recipients see the brand domain.
 */
export function getCerfaShareUrl(token: string) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://chabbat-chalom.com";
  return `${origin}/cerfa/${encodeURIComponent(token)}`;
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result = "data:application/pdf;base64,XXXX" → on garde uniquement la partie base64
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function shareCerfaPdfNative(token: string): Promise<boolean> {
  const blob = await fetchCerfaPdfBlob(token);
  const base64 = await blobToBase64(blob);
  const filename = makeCerfaFilename(token);

  // Écrit le PDF dans le cache de l'app pour obtenir une URI fichier partageable
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: "Reçu CERFA",
    text: "Voici votre reçu CERFA en PDF.",
    url: written.uri,
    dialogTitle: "Partager le CERFA",
  });
  return true;
}

async function shareCerfaPdfWeb(token: string): Promise<boolean> {
  // 1) Web Share API niveau fichier (iOS Safari, Chrome Android)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const blob = await fetchCerfaPdfBlob(token);
      const file = new File([blob], makeCerfaFilename(token), { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Reçu CERFA", files: [file] });
        return true;
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return false;
      // sinon on bascule sur le fallback lien
    }
  }

  // 2) Fallback : partage du lien public (custom domain) — masque l'URL Supabase
  const url = getCerfaShareUrl(token);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Reçu CERFA", text: "Voici votre reçu fiscal CERFA.", url });
      return true;
    } catch (error: any) {
      if (error?.name === "AbortError") return false;
    }
  }

  const shared = await shareText(url, "Reçu CERFA");
  if (shared) toast.success("Lien du CERFA prêt à être envoyé.");
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
    if (isNativePlatform()) {
      return await shareCerfaPdfNative(token);
    }
    return await shareCerfaPdfWeb(token);
  } catch (error) {
    console.error("shareCerfaPdf error:", error);
    toast.error("Impossible de générer le PDF du CERFA");
    return false;
  }
}
