// Web Audio API alarm sounds with progressive fade-in

export type AlarmSound = "harpe" | "piano" | "cristal";

const SOUNDS: Record<AlarmSound, { label: string; emoji: string }> = {
  harpe: { label: "Harpe", emoji: "🎵" },
  piano: { label: "Piano", emoji: "🎹" },
  cristal: { label: "Cristallin", emoji: "✨" },
};

export const SOUND_LIST = Object.entries(SOUNDS).map(([key, v]) => ({
  key: key as AlarmSound,
  ...v,
}));

const FADE_DURATION = 30; // seconds for 0→1 volume

function playOnce(ctx: AudioContext, type: AlarmSound, startGain: number, duration: number) {
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(startGain, 0.01), t + Math.min(FADE_DURATION, duration));
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  if (type === "harpe") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.linearRampToValueAtTime(523, t + duration * 0.33);
    osc.frequency.linearRampToValueAtTime(659, t + duration * 0.66);
    osc.frequency.linearRampToValueAtTime(784, t + duration);
  } else if (type === "piano") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.setValueAtTime(659.25, t + duration * 0.33);
    osc.frequency.setValueAtTime(783.99, t + duration * 0.66);
    // add second oscillator for warmth
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(261.63, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.exponentialRampToValueAtTime(startGain * 0.4, t + Math.min(FADE_DURATION, duration));
    g2.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + duration);
  } else {
    // cristal
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1047, t);
    osc.frequency.setValueAtTime(1175, t + duration * 0.25);
    osc.frequency.setValueAtTime(1319, t + duration * 0.5);
    osc.frequency.setValueAtTime(1568, t + duration * 0.75);
  }

  osc.connect(gain);
  osc.start(t);
  osc.stop(t + duration);
  return { osc, gain };
}

export interface AlarmPlayer {
  stop: () => void;
}

/**
 * Play alarm with progressive fade-in over `rings` loops.
 * Each loop is 5s of sound + 1s silence. Total ≈ rings * 6s.
 * onProgress(0..1) called as volume ramps.
 */
export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let stopped = false;
  let currentLoop = 0;

  const loopDuration = 5; // seconds per ring
  const pause = 1; // seconds between rings

  const playLoop = () => {
    if (stopped || currentLoop >= rings) {
      ctx.close().catch(() => {});
      return;
    }

    const progress = (currentLoop + 1) / rings;
    const vol = 0.05 + 0.95 * progress; // ramp from 5% to 100%
    onProgress?.(progress);

    playOnce(ctx, type, vol, loopDuration);
    currentLoop++;

    setTimeout(() => playLoop(), (loopDuration + pause) * 1000);
  };

  // Resume if suspended (iOS)
  const start = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  start.then(() => playLoop());

  return {
    stop: () => {
      stopped = true;
      ctx.close().catch(() => {});
    },
  };
}

/** Play a single short preview */
export function previewSound(type: AlarmSound) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const start = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  start.then(() => {
    playOnce(ctx, type, 0.3, 3);
    setTimeout(() => ctx.close().catch(() => {}), 4000);
  });
}
