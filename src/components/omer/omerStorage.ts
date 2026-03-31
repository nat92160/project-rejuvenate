import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";

// ─── Counted persistence (hybrid: DB for auth, localStorage for guests) ───

function getCountedStorageKey(day: number): string {
  return `omer-counted-day-${day}`;
}

/** Check if the user already counted a given Omer day */
export async function hasAlreadyCountedAsync(day: number, userId?: string | null): Promise<boolean> {
  if (userId) {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("omer_counts")
      .select("id")
      .eq("user_id", userId)
      .eq("omer_year", year)
      .eq("day_number", day)
      .maybeSingle();
    return !!data;
  }
  // Guest fallback: localStorage
  return hasAlreadyCountedLocal(day);
}

/** Synchronous localStorage check (for guests / initial render) */
export function hasAlreadyCountedLocal(day: number): boolean {
  try {
    const stored = localStorage.getItem(getCountedStorageKey(day));
    if (!stored) return false;
    const expiry = new Date(stored);
    return new Date() < expiry;
  } catch {
    return false;
  }
}

/** Mark a day as counted */
export async function markAsCounted(day: number, userId?: string | null): Promise<number> {
  if (userId) {
    // Compute streak from DB
    const year = new Date().getFullYear();
    const streak = await computeDbStreak(day, userId, year);

    await supabase.from("omer_counts").upsert(
      { user_id: userId, omer_year: year, day_number: day, streak },
      { onConflict: "user_id,omer_year,day_number" }
    );
    return streak;
  }

  // Guest: localStorage
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 30, 0, 0);
    localStorage.setItem(getCountedStorageKey(day), tomorrow.toISOString());
  } catch { /* silent */ }
  return updateStreakLocal(day);
}

// ─── DB streak computation ───

async function computeDbStreak(currentDay: number, userId: string, year: number): Promise<number> {
  // Get the previous day's record
  if (currentDay <= 1) return 1;

  const { data } = await supabase
    .from("omer_counts")
    .select("streak")
    .eq("user_id", userId)
    .eq("omer_year", year)
    .eq("day_number", currentDay - 1)
    .maybeSingle();

  return data ? data.streak + 1 : 1;
}

/** Get current streak for a logged-in user */
export async function getStreakAsync(currentDay: number, userId: string): Promise<{ streak: number; lastDay: number }> {
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("omer_counts")
    .select("day_number, streak")
    .eq("user_id", userId)
    .eq("omer_year", year)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { streak: 0, lastDay: 0 };
  return { streak: data.streak, lastDay: data.day_number };
}

// ─── Guest localStorage streak ───

const STREAK_KEY = "omer-streak";
const STREAK_LAST_DAY_KEY = "omer-streak-last-day";

export interface StreakData {
  streak: number;
  lastDay: number;
}

export function getStreakLocal(): StreakData {
  try {
    const streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");
    const lastDay = parseInt(localStorage.getItem(STREAK_LAST_DAY_KEY) || "0");
    return { streak: streak || 0, lastDay: lastDay || 0 };
  } catch {
    return { streak: 0, lastDay: 0 };
  }
}

function updateStreakLocal(currentDay: number): number {
  try {
    const { streak, lastDay } = getStreakLocal();
    if (lastDay === currentDay) return streak;
    const newStreak = lastDay === currentDay - 1 ? streak + 1 : 1;
    localStorage.setItem(STREAK_KEY, String(newStreak));
    localStorage.setItem(STREAK_LAST_DAY_KEY, String(currentDay));
    return newStreak;
  } catch {
    return 1;
  }
}

// ─── Share helper ───

export function getShareUrl(): string {
  return `${window.location.origin}/omer`;
}

export function getShareMessage(day: number): string {
  const { weeks, days } = getWeeksAndDays(day);
  const sefira = getSefiratDay(day);

  const weekStr = weeks > 0
    ? `${weeks} semaine${weeks > 1 ? "s" : ""}${days > 0 ? ` et ${days} jour${days > 1 ? "s" : ""}` : ""}`
    : `${days} jour${days > 1 ? "s" : ""}`;

  return [
    `🌾 *Séfirat HaOmer — Jour ${day}/49*`,
    `📅 ${weekStr}`,
    `✨ _${sefira.attribute} dans ${sefira.within}_`,
    ``,
    `Ne manque pas le compte de ce soir !`,
    `👉 ${getShareUrl()}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📲 *Chabbat Chalom* — L'app qui connecte ta synagogue`,
    `Horaires · Tehilim · Minyanim · Rappels`,
    `🔔 Inscris-toi gratuitement pour recevoir ton rappel chaque soir à la sortie des étoiles !`,
  ].join("\n");
}

function getWeeksAndDays(day: number): { weeks: number; days: number } {
  return { weeks: Math.floor(day / 7), days: day % 7 };
}

function getSefiratDay(day: number): { attribute: string; within: string } {
  const SEFIROT = ["Hessed", "Gvoura", "Tiféret", "Nétsa'h", "Hod", "Yessod", "Malkhout"];
  if (day < 1 || day > 49) return { attribute: "", within: "" };
  const weekIdx = Math.floor((day - 1) / 7);
  const dayIdx = (day - 1) % 7;
  return { attribute: SEFIROT[dayIdx], within: SEFIROT[weekIdx] };
}

export async function shareOmer(day: number, cardElement?: HTMLElement | null) {
  const text = getShareMessage(day);
  const title = `🌾 Omer Jour ${day} — Chabbat Chalom`;

  // Generate image from a cloned card off-screen (prevents visible blue flash)
  let imageFile: File | undefined;
  if (cardElement) {
    const clone = cardElement.cloneNode(true) as HTMLElement;
    const mount = document.createElement("div");
    mount.setAttribute("aria-hidden", "true");
    mount.style.position = "fixed";
    mount.style.left = "-10000px";
    mount.style.top = "0";
    mount.style.pointerEvents = "none";
    mount.style.opacity = "1";
    mount.style.zIndex = "-1";

    // Ensure clone has stable dimensions for capture
    clone.style.position = "relative";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.opacity = "1";

    mount.appendChild(clone);
    document.body.appendChild(mount);

    try {
      await new Promise((r) => setTimeout(r, 30));
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0A1628",
        logging: false,
        width: clone.scrollWidth || 540,
        height: clone.scrollHeight || 720,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (blob) {
        imageFile = new File([blob], `omer-jour-${day}.jpg`, { type: "image/jpeg" });
      }
    } catch {
      /* image generation failed, continue with text only */
    } finally {
      mount.remove();
    }
  }

  if (navigator.share) {
    // 1) Prefer share with image file when supported
    if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
      try {
        await navigator.share({ title, text, files: [imageFile] });
        return;
      } catch {
        // fall through to text/url share
      }
    }

    // 2) Fallback to text/url share
    try {
      await navigator.share({ title, text, url: getShareUrl() });
      return;
    } catch {
      // continue to manual fallback
    }
  }

  // 3) Final fallback: download image + open WhatsApp share URL
  if (imageFile) {
    const url = URL.createObjectURL(imageFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omer-jour-${day}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  // Use same-tab navigation to avoid popup blockers after async capture
  try {
    window.location.assign(whatsappUrl);
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      alert("Partage bloqué par le navigateur : message copié dans le presse-papiers.");
    } catch {
      alert("Impossible de partager automatiquement. Copiez le message manuellement.");
    }
  }
}

// ─── Migration helper: push localStorage data to DB on first login ───

export async function migrateLocalToDb(userId: string) {
  const year = new Date().getFullYear();
  const rows: { user_id: string; omer_year: number; day_number: number; streak: number }[] = [];

  for (let d = 1; d <= 49; d++) {
    if (hasAlreadyCountedLocal(d)) {
      rows.push({ user_id: userId, omer_year: year, day_number: d, streak: 1 });
    }
  }

  if (rows.length === 0) return;

  // Recompute streaks
  rows.sort((a, b) => a.day_number - b.day_number);
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) { rows[i].streak = 1; continue; }
    rows[i].streak = rows[i].day_number === rows[i - 1].day_number + 1
      ? rows[i - 1].streak + 1 : 1;
  }

  await supabase.from("omer_counts").upsert(rows, { onConflict: "user_id,omer_year,day_number" });
}
