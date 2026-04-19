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

    // Masque les éléments .no-print (bouton imprimer, hints) qui ne doivent pas
    // apparaître dans le PDF et qui faussent la hauteur capturée.
    const hideStyle = iframeDocument.createElement("style");
    hideStyle.textContent = `.no-print { display: none !important; }`;
    iframeDocument.head.appendChild(hideStyle);

    // PDF-safe overrides: police système stable, kerning/ligatures désactivés,
    // espacement neutre — évite le chevauchement de lettres avec html2canvas.
    const styleFix = iframeDocument.createElement("style");
    styleFix.textContent = `
      * {
        font-family: Arial, Helvetica, "Liberation Sans", sans-serif !important;
        font-kerning: none !important;
        font-feature-settings: "kern" 0, "liga" 0, "calt" 0 !important;
        font-variant-ligatures: none !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
        text-rendering: geometricPrecision !important;
        -webkit-font-smoothing: antialiased !important;
      }
      body { font-size: 11px !important; line-height: 1.4 !important; }
    `;
    iframeDocument.head.appendChild(styleFix);

    // Laisse le navigateur recalculer la mise en page après injection du style
    await new Promise((resolve) => setTimeout(resolve, 150));

    // On cible précisément le cadre CERFA (.frame) pour ignorer les marges du body
    // et capturer uniquement le contenu utile, sans bandes blanches.
    const frame = iframeDocument.querySelector(".frame") as HTMLElement | null;
    const target = frame || iframeDocument.body;

    const rect = target.getBoundingClientRect();
    const contentWidth = Math.ceil(rect.width) || A4_WIDTH_PX;
    const contentHeight = Math.ceil(
      Math.max(target.scrollHeight, rect.height),
    );

    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: contentWidth,
      height: contentHeight,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Marge périphérique pour ne pas coller au bord et garder un rendu pro
    const margin = 6; // mm
    const usableWidth = pageWidth - margin * 2;

    // Hauteur réelle du contenu une fois ajusté à la largeur utile
    const fittedHeight = (canvas.height * usableWidth) / canvas.width;

    if (fittedHeight <= pageHeight - margin * 2) {
      // Tient sur 1 page : on centre verticalement (look "carte fiscale")
      const top = Math.max(margin, (pageHeight - fittedHeight) / 2);
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin,
        top,
        usableWidth,
        fittedHeight,
        undefined,
        "FAST",
      );
    } else {
      // Trop grand : on pagine proprement
      const imgData = canvas.toDataURL("image/png");
      let remaining = fittedHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, fittedHeight, undefined, "FAST");
      remaining -= pageHeight - margin * 2;

      while (remaining > 0) {
        position = margin + remaining - fittedHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, usableWidth, fittedHeight, undefined, "FAST");
        remaining -= pageHeight - margin * 2;
      }
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
