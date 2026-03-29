// ─── Counted persistence ───

function getCountedStorageKey(day: number): string {
  return `omer-counted-day-${day}`;
}

export function hasAlreadyCounted(day: number): boolean {
  try {
    const stored = localStorage.getItem(getCountedStorageKey(day));
    if (!stored) return false;
    const expiry = new Date(stored);
    return new Date() < expiry;
  } catch {
    return false;
  }
}

export function markAsCounted(day: number) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 30, 0, 0);
    localStorage.setItem(getCountedStorageKey(day), tomorrow.toISOString());
  } catch { /* silent */ }
}

// ─── Streak persistence ───

const STREAK_KEY = "omer-streak";
const STREAK_LAST_DAY_KEY = "omer-streak-last-day";

export interface StreakData {
  streak: number;
  lastDay: number;
}

export function getStreak(): StreakData {
  try {
    const streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");
    const lastDay = parseInt(localStorage.getItem(STREAK_LAST_DAY_KEY) || "0");
    return { streak: streak || 0, lastDay: lastDay || 0 };
  } catch {
    return { streak: 0, lastDay: 0 };
  }
}

export function updateStreak(currentDay: number): number {
  try {
    const { streak, lastDay } = getStreak();

    if (lastDay === currentDay) return streak; // already counted today

    let newStreak: number;
    if (lastDay === currentDay - 1) {
      // Consecutive day
      newStreak = streak + 1;
    } else {
      // Gap — reset
      newStreak = 1;
    }

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
