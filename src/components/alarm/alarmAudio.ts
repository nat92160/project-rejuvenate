// Premium alarm audio with real music files and progressive fade-in

export type AlarmSound = "harpe" | "piano" | "cristal";

const SOUND_URLS: Record<AlarmSound, string> = {
  harpe: "https://assets.mixkit.co/music/preview/mixkit-dreamy-hope-42.mp3",
  piano: "https://assets.mixkit.co/music/preview/mixkit-morning-sunrise-24.mp3",
  cristal: "https://assets.mixkit.co/music/preview/mixkit-waking-up-31.mp3",
};

const SOUNDS: Record<AlarmSound, { label: string; emoji: string }> = {
  harpe: { label: "Harpe", emoji: "🎵" },
  piano: { label: "Piano", emoji: "🎹" },
  cristal: { label: "Cristallin", emoji: "✨" },
};

export const SOUND_LIST = Object.entries(SOUNDS).map(([key, v]) => ({
  key: key as AlarmSound,
  ...v,
}));

// ─── Fade-in engine using HTML5 Audio .volume ───

const ALARM_FADE_DURATION = 45; // seconds for 0→1 volume (real alarm)
const PREVIEW_FADE_DURATION = 5; // seconds for preview fade-in

function fadeIn(audio: HTMLAudioElement, duration: number, onProgress?: (p: number) => void): number {
  audio.volume = 0;
  const stepMs = 100; // update every 100ms
  const steps = (duration * 1000) / stepMs;
  let step = 0;

  const interval = window.setInterval(() => {
    step++;
    const progress = Math.min(step / steps, 1);
    audio.volume = progress;
    onProgress?.(progress);
    if (progress >= 1) clearInterval(interval);
  }, stepMs);

  return interval;
}

// ─── Alarm Player ───

export interface AlarmPlayer {
  stop: () => void;
}

export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const audio = new Audio(SOUND_URLS[type]);
  audio.loop = true;
  audio.volume = 0;

  let fadeInterval: number | null = null;
  let stopped = false;

  // Total alarm duration = rings * 30s (each "ring" cycle ~30s)
  const totalDuration = rings * 30;

  const play = async () => {
    try {
      await audio.play();
      fadeInterval = fadeIn(audio, ALARM_FADE_DURATION, onProgress);

      // Auto-stop after total duration
      setTimeout(() => {
        if (!stopped) {
          stop();
        }
      }, totalDuration * 1000);
    } catch {
      // Autoplay blocked — will retry on user interaction
    }
  };

  const stop = () => {
    stopped = true;
    if (fadeInterval) clearInterval(fadeInterval);
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
  };

  play();

  return { stop };
}

// ─── Preview (short fade-in for testing) ───

let previewAudio: HTMLAudioElement | null = null;
let previewFadeInterval: number | null = null;

export function previewSound(type: AlarmSound) {
  // Stop any existing preview
  stopPreview();

  previewAudio = new Audio(SOUND_URLS[type]);
  previewAudio.crossOrigin = "anonymous";
  previewAudio.volume = 0;

  previewAudio.addEventListener("error", (e) => {
    console.error("[AlarmAudio] Preview load error:", previewAudio?.error?.message, e);
  });

  previewAudio.addEventListener("canplaythrough", () => {
    console.log("[AlarmAudio] Preview ready, starting playback");
  });

  const play = async () => {
    if (!previewAudio) return;
    try {
      console.log("[AlarmAudio] Attempting preview for:", type, SOUND_URLS[type]);
      await previewAudio.play();
      console.log("[AlarmAudio] Preview playing successfully");
      previewFadeInterval = fadeIn(previewAudio, PREVIEW_FADE_DURATION);
      setTimeout(() => stopPreview(), 8000);
    } catch (err: any) {
      console.error("[AlarmAudio] Preview play failed:", err?.message || err);
    }
  };

  play();
}

export function stopPreview() {
  if (previewFadeInterval) {
    clearInterval(previewFadeInterval);
    previewFadeInterval = null;
  }
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    previewAudio.src = "";
    previewAudio = null;
  }
}
