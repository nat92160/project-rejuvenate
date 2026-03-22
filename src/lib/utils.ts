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
