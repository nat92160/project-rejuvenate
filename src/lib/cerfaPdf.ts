import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

function getCerfaHtmlUrl(token: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/generate-cerfa?token=${encodeURIComponent(token)}`;
}

async function buildCerfaPdfBlob(token: string): Promise<Blob> {
  const response = await fetch(getCerfaHtmlUrl(token), {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  if (!html.trim().startsWith("<!DOCTYPE html")) {
    throw new Error("Réponse CERFA invalide");
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = `${A4_HEIGHT_PX}px`;
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Impossible de charger le CERFA"));
      iframe.srcdoc = html;
    });

    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframe.contentDocument;
    if (!iframeWindow || !iframeDocument?.body) {
      throw new Error("Document CERFA introuvable");
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    if (iframeDocument.fonts?.ready) {
      await iframeDocument.fonts.ready;
    }

    const images = Array.from(iframeDocument.images || []);
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );

    iframeDocument.documentElement.style.background = "#ffffff";
    iframeDocument.body.style.background = "#ffffff";
    iframeDocument.body.style.margin = "0";
    iframeDocument.body.style.padding = "0";
    iframeDocument.body.style.width = `${A4_WIDTH_PX}px`;

    const canvas = await html2canvas(iframeDocument.body, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      width: A4_WIDTH_PX,
      height: iframeDocument.body.scrollHeight,
      windowWidth: A4_WIDTH_PX,
      windowHeight: Math.max(A4_HEIGHT_PX, iframeDocument.body.scrollHeight),
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let renderedHeight = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight, undefined, "FAST");
    renderedHeight -= pageHeight;

    while (renderedHeight > 0) {
      position = renderedHeight - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight, undefined, "FAST");
      renderedHeight -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}

function makeCerfaFilename(token: string) {
  return `cerfa-${token.slice(0, 8)}.pdf`;
}

export async function downloadCerfaPdf(token: string): Promise<void> {
  try {
    const blob = await buildCerfaPdfBlob(token);
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
    const blob = await buildCerfaPdfBlob(token);
    const file = new File([blob], makeCerfaFilename(token), { type: "application/pdf" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Reçu CERFA",
          files: [file],
        });
        return true;
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return false;
        }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Le partage PDF n'est pas disponible ici : le fichier a été téléchargé.");
    return false;
  } catch (error) {
    console.error("shareCerfaPdf error:", error);
    toast.error("Impossible de générer le PDF du CERFA");
    return false;
  }
}
