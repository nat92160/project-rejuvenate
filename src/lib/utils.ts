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
 * Check if a verse is a pure instruction (only <small> tags, no actual prayer text).
 * Returns true if the verse should be rendered as an instruction, not as prayer text.
 * Handles nested <small><small>...</small>...</small> and <big><b>...</b></big> title lines.
 */
export function isInstructionOnly(html: string): boolean {
  const stripped = html.trim();
  
  // Pure <big><b>title</b></big> — section header, treat as instruction
  if (/^<big><b>.*<\/b><\/big>$/.test(stripped)) return true;
  
  // Pure <small>...</small> with no text outside (may have nested small)
  if (stripped.startsWith("<small>") && stripped.endsWith("</small>")) {
    const inner = stripped.slice(7, -8);
    // Single small block (no nested closing tag before end)
    if (!inner.includes("</small>")) return true;
    // Nested: <small><small>marker</small> text</small> — NOT instruction, it's conditional
    // But <small><b>kedusha text...</b></small> IS instruction (Hazara)
    if (inner.startsWith("<b>") || inner.startsWith("<small>")) return true;
  }
  return false;
}
