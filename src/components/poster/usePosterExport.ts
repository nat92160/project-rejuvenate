import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG (x2 scale) and trigger download.
 * Temporarily resets any transform on the element so html2canvas captures at full size.
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }

  // Save and reset transform so html2canvas captures at native 1080px size
  const prevTransform = element.style.transform;
  const prevTransformOrigin = element.style.transformOrigin;
  element.style.transform = "none";
  element.style.transformOrigin = "";

  // Ensure element is visible for capture
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

    // Restore styles
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;
    element.style.position = prevPosition;
    element.style.left = prevLeft;
    element.style.top = prevTop;
    element.style.zIndex = prevZIndex;
    element.style.opacity = prevOpacity;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Affiche téléchargée !");
  } catch (err) {
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;
    element.style.position = prevPosition;
    element.style.left = prevLeft;
    element.style.top = prevTop;
    element.style.zIndex = prevZIndex;
    element.style.opacity = prevOpacity;
    console.error("PNG export error:", err);
    toast.error("Erreur lors du téléchargement");
  }
};
