// Real MP3 alarm sounds with progressive fade-in.
// Files served from /sounds/*.mp3 (public/).

export type AlarmSound = "douce" | "classique" | "cristal";

interface SoundDef {
  label: string;
  emoji: string;
  url: string;
}

const SOUNDS: Record<AlarmSound, SoundDef> = {
  douce:     { label: "Harpe douce",  emoji: "🎵", url: "/sounds/douce.mp3" },
  classique: { label: "Classique",    emoji: "⏰", url: "/sounds/classique.mp3" },
  cristal:   { label: "Cristallin",   emoji: "✨", url: "/sounds/cristal.mp3" },
};

export const SOUND_LIST = (Object.entries(SOUNDS) as [AlarmSound, SoundDef][])
  .map(([key, v]) => ({ key, ...v }));

export interface AlarmPlayer {
  stop: () => void;
}

const FADE_IN_SECONDS = 30;
const RING_CYCLE_SECONDS = 30;

// ─── Main alarm (with fade-in) ───
export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const audio = new Audio(SOUNDS[type].url);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.05; // start quiet

  let stopped = false;
  const startedAt = Date.now();
  const totalDurationMs = rings * RING_CYCLE_SECONDS * 1000;

  // Fade-in via volume ramp every 200ms
  const fadeInterval = window.setInterval(() => {
    if (stopped) return;
    const elapsed = (Date.now() - startedAt) / 1000;
    const p = Math.min(1, elapsed / FADE_IN_SECONDS);
    audio.volume = Math.min(1, 0.05 + p * 0.95);
    onProgress?.(p);
    if (elapsed * 1000 > totalDurationMs) {
      cleanup();
    }
  }, 200);

  const cleanup = () => {
    stopped = true;
    clearInterval(fadeInterval);
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch { /* noop */ }
  };

  // Auto-stop safety
  const stopTimer = window.setTimeout(cleanup, totalDurationMs + 1000);

  // Try to play (must be in a user gesture)
  audio.play().catch((err) => {
    console.error("[alarm] play failed:", err);
  });

  return {
    stop: () => {
      clearTimeout(stopTimer);
      cleanup();
    },
  };
}

// ─── Preview (short, fade-in 2s, auto-stop ~6s) ───
let previewAudio: HTMLAudioElement | null = null;
let previewFade: number | null = null;
let previewStop: number | null = null;

export function previewSound(type: AlarmSound) {
  stopPreview();
  const audio = new Audio(SOUNDS[type].url);
  audio.loop = true;
  audio.volume = 0.1;
  previewAudio = audio;

  audio.play().catch((err) => {
    console.error("[alarm preview] play failed:", err);
  });

  const start = Date.now();
  previewFade = window.setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    const p = Math.min(1, elapsed / 2);
    if (previewAudio) previewAudio.volume = Math.min(0.7, 0.1 + p * 0.6);
  }, 100);

  previewStop = window.setTimeout(() => stopPreview(), 6000);
}

export function stopPreview() {
  if (previewFade) { clearInterval(previewFade); previewFade = null; }
  if (previewStop) { clearTimeout(previewStop); previewStop = null; }
  if (previewAudio) {
    try {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio.src = "";
    } catch { /* noop */ }
    previewAudio = null;
  }
}
