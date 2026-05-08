// Real melodic alarm sounds (Kevin MacLeod, CC-BY incompetech.com).
// Files in public/sounds/*.mp3 — gentle 40s loops.

export type AlarmSound = "meditation" | "carefree" | "brittle";

interface SoundDef {
  label: string;
  emoji: string;
  url: string;
}

const SOUNDS: Record<AlarmSound, SoundDef> = {
  meditation: { label: "Méditation",  emoji: "🎵", url: "/sounds/meditation.mp3" },
  carefree:   { label: "Sérénité",    emoji: "🌅", url: "/sounds/carefree.mp3" },
  brittle:    { label: "Lumière",     emoji: "✨", url: "/sounds/brittle.mp3" },
};

export const SOUND_LIST = (Object.entries(SOUNDS) as [AlarmSound, SoundDef][])
  .map(([key, v]) => ({ key, ...v }));

export interface AlarmPlayer {
  stop: () => void;
}

const FADE_IN_SECONDS = 30;
const RING_CYCLE_SECONDS = 30;

export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const audio = new Audio(SOUNDS[type].url);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.05;

  let stopped = false;
  const startedAt = Date.now();
  const totalDurationMs = rings * RING_CYCLE_SECONDS * 1000;

  const fadeInterval = window.setInterval(() => {
    if (stopped) return;
    const elapsed = (Date.now() - startedAt) / 1000;
    const p = Math.min(1, elapsed / FADE_IN_SECONDS);
    audio.volume = Math.min(1, 0.05 + p * 0.95);
    onProgress?.(p);
    if (elapsed * 1000 > totalDurationMs) cleanup();
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

  const stopTimer = window.setTimeout(cleanup, totalDurationMs + 1000);

  audio.play().catch((err) => console.error("[alarm] play failed:", err));

  return {
    stop: () => {
      clearTimeout(stopTimer);
      cleanup();
    },
  };
}

let previewAudio: HTMLAudioElement | null = null;
let previewStop: number | null = null;

export function previewSound(type: AlarmSound) {
  stopPreview();
  const audio = new Audio(SOUNDS[type].url);
  audio.loop = false;
  audio.volume = 0.5;
  previewAudio = audio;

  audio.play().catch((err) => console.error("[alarm preview] play failed:", err));

  // Play first 10 seconds of the melody
  previewStop = window.setTimeout(() => stopPreview(), 10000);
}

export function stopPreview() {
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
