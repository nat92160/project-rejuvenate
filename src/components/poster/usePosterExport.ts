import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG (x2 scale) and trigger download.
 * Temporarily moves the hidden poster on-screen for html2canvas to capture.
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }

  const wrapper = element.parentElement;
  const prevStyle = wrapper?.getAttribute("style") || "";
  if (wrapper) {
    wrapper.style.cssText = "position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;";
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F5F5F5",
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    if (wrapper) wrapper.style.cssText = prevStyle;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Affiche téléchargée !");
  } catch (err) {
    if (wrapper) wrapper.style.cssText = prevStyle;
    console.error("PNG export error:", err);
    toast.error("Erreur lors du téléchargement");
  }
};
