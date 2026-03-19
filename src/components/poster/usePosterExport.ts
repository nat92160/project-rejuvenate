import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture a ref element as a high-res PNG and trigger download.
 */
export const exportPosterPng = async (
  element: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!element) return;
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Affiche téléchargée !");
  } catch {
    toast.error("Erreur lors du téléchargement");
  }
};
