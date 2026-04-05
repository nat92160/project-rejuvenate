import { toast } from "sonner";

/**
 * Universal share helper: tries Web Share API, then clipboard, then manual fallback.
 * Always shows user feedback.
 */
export async function shareText(text: string, title?: string): Promise<boolean> {
  // 1) Try native Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (err: any) {
      // User cancelled — not an error
      if (err?.name === "AbortError") return false;
      // Share failed, fall through to clipboard
    }
  }

  // 2) Clipboard fallback
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success("📋 Copié dans le presse-papier !");
      return true;
    }
  } catch {
    // clipboard blocked (iframe, insecure context)
  }

  // 3) Last resort: textarea hack
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    toast.success("📋 Copié dans le presse-papier !");
    return true;
  } catch {
    toast.error("Le partage n'est pas disponible sur cet appareil");
    return false;
  }
}
