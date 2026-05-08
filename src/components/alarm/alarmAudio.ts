// Real melodic alarm sounds (Kevin MacLeod, CC-BY incompetech.com).
// Each "ring" = 1 lecture complète de la mélodie (~40s).
// L'alarme joue N fois la mélodie puis s'arrête automatiquement.
// Tant qu'elle joue, elle joue à plein volume après le fade-in.

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

const FADE_IN_SECONDS = 25;

export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const audio = new Audio(SOUNDS[type].url);
  audio.preload = "auto";
  audio.loop = false; // on gère le loop manuellement pour compter
  audio.volume = 0.05;

  let stopped = false;
  let played = 0;
  const startedAt = Date.now();

  // Fade-in volume progressif
  const fadeInterval = window.setInterval(() => {
    if (stopped) return;
    const elapsed = (Date.now() - startedAt) / 1000;
    const p = Math.min(1, elapsed / FADE_IN_SECONDS);
    audio.volume = Math.min(1, 0.05 + p * 0.95);
    onProgress?.(p);
    if (p >= 1) clearInterval(fadeInterval);
  }, 200);

  const onEnded = () => {
    if (stopped) return;
    played += 1;
    if (played >= rings) {
      cleanup();
      return;
    }
    // Relancer la mélodie suivante
    try {
      audio.currentTime = 0;
      audio.play().catch((err) => {
        if (err?.name !== "AbortError") console.error("[alarm] replay failed:", err);
      });
    } catch (err) {
      console.error("[alarm] replay error:", err);
    }
  };

  audio.addEventListener("ended", onEnded);

  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(fadeInterval);
    audio.removeEventListener("ended", onEnded);
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch { /* noop */ }
  };

  audio.play().catch((err) => {
    if (err?.name !== "AbortError") console.error("[alarm] play failed:", err);
  });

  return { stop: cleanup };
}

// ─── Preview (10s) ───
let previewAudio: HTMLAudioElement | null = null;
let previewStop: number | null = null;

export function previewSound(type: AlarmSound) {
  stopPreview();
  const audio = new Audio(SOUNDS[type].url);
  audio.loop = false;
  audio.volume = 0.5;
  previewAudio = audio;

  audio.play().catch((err) => {
    if (err?.name !== "AbortError") console.error("[alarm preview] play failed:", err);
  });

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
