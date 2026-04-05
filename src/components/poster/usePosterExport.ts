import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG (x2 scale) and trigger download.
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }
  const blob = await captureElementToBlob(element);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Affiche téléchargée !");
};

/**
 * Capture a ref element as PNG and share it via Web Share API.
 * Falls back to download if sharing is not supported.
 */
export const sharePosterPng = async (
  element: HTMLElement | null,
  filename: string,
  shareTitle?: string,
  shareText?: string,
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }
  const blob = await captureElementToBlob(element);
  if (!blob) return;

  const file = new File([blob], filename, { type: "image/png" });

  // Try native share with file
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        files: [file],
      });
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      // Fall through to download
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Affiche téléchargée !");
};

/**
 * Internal: capture element to PNG Blob
 */
async function captureElementToBlob(element: HTMLElement): Promise<Blob | null> {
  const prevTransform = element.style.transform;
  const prevTransformOrigin = element.style.transformOrigin;
  element.style.transform = "none";
  element.style.transformOrigin = "";

  const prevPosition = element.style.position;
  const prevLeft = element.style.left;
  const prevTop = element.style.top;
  const prevZIndex = element.style.zIndex;
  const prevOpacity = element.style.opacity;
  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.zIndex = "99999";
  element.style.opacity = "1";

  const restore = () => {
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;
    element.style.position = prevPosition;
    element.style.left = prevLeft;
    element.style.top = prevTop;
    element.style.zIndex = prevZIndex;
    element.style.opacity = prevOpacity;
  };

  try {
    await new Promise(r => setTimeout(r, 80));
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F5F5F5",
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });
    restore();

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  } catch (err) {
    restore();
    console.error("PNG capture error:", err);
    toast.error("Erreur lors de la génération");
    return null;
  }
}
