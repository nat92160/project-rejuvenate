import { toast } from "sonner";

/**
 * Public base URL for share links. On native iOS Capacitor, window.location.origin
 * returns "capacitor://localhost" which breaks shared links. Always use the public
 * domain so recipients open the real website / PWA.
 */
export const PUBLIC_BASE_URL = "https://www.chabbat-chalom.com";

export function buildShareUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${clean}`;
}

/**
 * Universal share helper: tries Web Share API, then clipboard, then manual fallback.
 * Always shows user feedback.
 */
export async function shareText(text: string, title?: string, url?: string): Promise<boolean> {
  // Detect desktop web (no native share sheet worth using) → copy link directly
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isStandalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as any).standalone);

  // 1) Try native Web Share API only on mobile / installed PWA
  if (typeof navigator !== "undefined" && navigator.share && (isMobile || isStandalone)) {
    try {
      await navigator.share(url ? { title, text, url } : { title, text });
      return true;
    } catch (err: any) {
      // User cancelled — not an error
      if (err?.name === "AbortError") return false;
      // Share failed, fall through to clipboard
    }
  }

  // 2) Clipboard: prefer copying just the URL when provided (web desktop UX)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const payload = url ? url : text;
      await navigator.clipboard.writeText(payload);
      toast.success(url ? "🔗 Lien copié !" : "📋 Copié dans le presse-papier !");
      return true;
    }
  } catch {
    // clipboard blocked (iframe, insecure context)
  }

  // 3) Last resort: textarea hack
  try {
    const textarea = document.createElement("textarea");
    textarea.value = url ? url : text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    toast.success(url ? "🔗 Lien copié !" : "📋 Copié dans le presse-papier !");
    return true;
  } catch {
    toast.error("Le partage n'est pas disponible sur cet appareil");
    return false;
  }
}
