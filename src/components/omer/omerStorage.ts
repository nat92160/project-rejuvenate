import { supabase } from "@/integrations/supabase/client";

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
  return `Ce soir, c'est le ${day}${day === 1 ? "er" : "ème"} jour de l'Omer ! 🌾\n\nVoici la Brakha pour compter ce soir :\n${getShareUrl()}\n\nInscris-toi gratuitement pour recevoir ton rappel quotidien chaque soir à l'heure de la sortie des étoiles ! ✨`;
}

export async function shareOmer(day: number) {
  const text = getShareMessage(day);
  if (navigator.share) {
    try {
      await navigator.share({ title: `Omer – Jour ${day}`, text, url: getShareUrl() });
    } catch { /* user cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      alert("Message copié ! Collez-le dans WhatsApp ou Telegram.");
    } catch { /* silent */ }
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
