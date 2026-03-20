import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG (x2 scale) and trigger download.
 * The element should be rendered in the DOM (can be hidden with opacity:0, z-index:-1).
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }

  // Temporarily make element visible for capture
  const prevStyle = element.style.cssText;
  element.style.cssText = "position:fixed;left:0;top:0;z-index:99999;opacity:1;pointer-events:none;";

  try {
    await new Promise(r => setTimeout(r, 50));
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F5F5F5",
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    element.style.cssText = prevStyle;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Affiche téléchargée !");
  } catch (err) {
    element.style.cssText = prevStyle;
    console.error("PNG export error:", err);
    toast.error("Erreur lors du téléchargement");
  }
};
