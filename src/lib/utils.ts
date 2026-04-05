import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



/** Convert 1-based number to Hebrew letter (א‑ת then טו, טז style) */
export function toHebrewLetter(n: number): string {
  const ones  = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens  = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hunds = ["", "ק", "ר", "ש", "ת"];

  if (n <= 0) return "";
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;

  let result = (hunds[h] || "") + (tens[t] || "") + (ones[o] || "");
  // Special cases: 15 = טו, 16 = טז
  if (t === 1 && o === 5) result = (hunds[h] || "") + "טו";
  if (t === 1 && o === 6) result = (hunds[h] || "") + "טז";
  return result;
}

/**
 * Check if a verse is a pure instruction (only <small> tags with SHORT directive text).
 * Returns true only for genuine liturgical instructions like "say quietly", "stand", etc.
 * Long <small> blocks that contain actual prayer text should be rendered normally.
 * NOTE: <big><b>...</b></big> section titles are NOT instructions — they are handled
 * separately by isInternalSectionTitle in SiddourReader.
 */
export function isInstructionOnly(html: string): boolean {
  const stripped = html.trim();

  // Pure <small>...</small> — only if the plain-text content is short (a directive)
  if (stripped.startsWith("<small>") && stripped.endsWith("</small>")) {
    const inner = stripped.slice(7, -8);
    const plainText = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    // Short directives (≤120 chars) like "אומר בלחש" are instructions
    // Long text is actual prayer content wrapped in <small> by Sefaria
    if (plainText.length <= 120) return true;
  }
  return false;
}
