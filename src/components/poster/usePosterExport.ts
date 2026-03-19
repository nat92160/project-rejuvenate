import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG and trigger download.
 * Temporarily moves the element on-screen for html2canvas to capture it.
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) { toast.error("Affiche introuvable"); return; }

  // Temporarily make the hidden poster visible for capture
  const wrapper = element.parentElement;
  const prevWrapperStyle = wrapper?.getAttribute("style") || "";
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

    // Restore hidden state
    if (wrapper) wrapper.style.cssText = prevWrapperStyle;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Affiche téléchargée !");
  } catch (err) {
    // Restore hidden state on error
    if (wrapper) wrapper.style.cssText = prevWrapperStyle;
    console.error("PNG export error:", err);
    toast.error("Erreur lors du téléchargement");
  }
};
