// Premium alarm audio with synthesized pleasant sounds and progressive fade-in
// Uses Web Audio API to generate musical, warm alarm tones

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

// ─── Musical note frequencies ───
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00,
};

// ─── Sound synthesis ───

function createNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  detune = 0,
): { osc: OscillatorNode; gain: GainNode } {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);

  // Smooth envelope: attack 0.05s, sustain, release 0.3s
  const attackEnd = startTime + 0.05;
  const releaseStart = startTime + duration - 0.3;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, attackEnd);
  gain.gain.setValueAtTime(volume, Math.max(attackEnd, releaseStart));
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.1);

  return { osc, gain };
}

function playHarpePhrase(ctx: AudioContext, masterGain: GainNode, startTime: number) {
  // Arpeggio: C-E-G-C-E-G-A-G (warm, ascending harp-like)
  const melody = [
    NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5,
    NOTES.E5, NOTES.G4, NOTES.A4, NOTES.G4,
  ];
  const noteDur = 0.6;
  melody.forEach((freq, i) => {
    const { gain } = createNote(ctx, freq, startTime + i * 0.35, noteDur, 0.25, "sine");
    // Add slight harmonic for warmth
    const { gain: g2 } = createNote(ctx, freq * 2, startTime + i * 0.35, noteDur * 0.5, 0.06, "sine");
    gain.connect(masterGain);
    g2.connect(masterGain);
  });
  return melody.length * 0.35 + noteDur; // total duration
}

function playPianoPhrase(ctx: AudioContext, masterGain: GainNode, startTime: number) {
  // Gentle chord progression: C-Am-F-G (each as broken chord)
  const chords = [
    [NOTES.C4, NOTES.E4, NOTES.G4],
    [NOTES.A4, NOTES.C5, NOTES.E5],
    [NOTES.F4, NOTES.A4, NOTES.C5],
    [NOTES.G4, NOTES.B4, NOTES.D5],
  ];
  let t = startTime;
  chords.forEach((chord) => {
    chord.forEach((freq, j) => {
      const { gain } = createNote(ctx, freq, t + j * 0.08, 1.2, 0.2, "sine");
      // Piano-like: add slight detuned second oscillator
      const { gain: g2 } = createNote(ctx, freq, t + j * 0.08, 1.2, 0.05, "triangle", 3);
      gain.connect(masterGain);
      g2.connect(masterGain);
    });
    t += 1.4;
  });
  return t - startTime + 0.5;
}

function playCristalPhrase(ctx: AudioContext, masterGain: GainNode, startTime: number) {
  // High, bell-like tones with reverb feel
  const melody = [
    NOTES.E5, NOTES.G5, NOTES.A5, NOTES.G5,
    NOTES.E5, NOTES.D5, NOTES.E5, NOTES.G5,
  ];
  const noteDur = 0.5;
  melody.forEach((freq, i) => {
    const { gain } = createNote(ctx, freq, startTime + i * 0.3, noteDur, 0.15, "sine");
    // Bell harmonic
    const { gain: g2 } = createNote(ctx, freq * 2.5, startTime + i * 0.3, noteDur * 0.3, 0.04, "sine");
    // Sub harmonic for depth
    const { gain: g3 } = createNote(ctx, freq * 0.5, startTime + i * 0.3, noteDur * 0.8, 0.08, "triangle");
    gain.connect(masterGain);
    g2.connect(masterGain);
    g3.connect(masterGain);
  });
  return melody.length * 0.3 + noteDur;
}

type PhrasePlayer = (ctx: AudioContext, masterGain: GainNode, startTime: number) => number;

const PHRASE_PLAYERS: Record<AlarmSound, PhrasePlayer> = {
  harpe: playHarpePhrase,
  piano: playPianoPhrase,
  cristal: playCristalPhrase,
};

// ─── Alarm with fade-in ───

export interface AlarmPlayer {
  stop: () => void;
}

const ALARM_FADE_SECONDS = 45;

export function startAlarm(
  type: AlarmSound,
  rings: number,
  onProgress?: (progress: number) => void,
): AlarmPlayer {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  // Linear fade-in over ALARM_FADE_SECONDS
  masterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + ALARM_FADE_SECONDS);
  masterGain.connect(ctx.destination);

  let stopped = false;
  let loopCount = 0;

  const totalDuration = rings * 30; // each ring cycle ~30s
  const startedAt = Date.now();

  const playPhrase = PHRASE_PLAYERS[type];

  const scheduleLoop = () => {
    if (stopped) return;

    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed > totalDuration) {
      ctx.close().catch(() => {});
      return;
    }

    onProgress?.(Math.min(elapsed / ALARM_FADE_SECONDS, 1));

    const phraseDuration = playPhrase(ctx, masterGain, ctx.currentTime + 0.05);
    loopCount++;

    // Schedule next phrase after current finishes + 1s pause
    setTimeout(() => scheduleLoop(), (phraseDuration + 1) * 1000);
  };

  const start = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  start.then(() => scheduleLoop());

  return {
    stop: () => {
      stopped = true;
      try {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        setTimeout(() => ctx.close().catch(() => {}), 400);
      } catch {
        ctx.close().catch(() => {});
      }
    },
  };
}

// ─── Preview (5s fade-in) ───

let previewCtx: AudioContext | null = null;
let previewStopped = false;

export function previewSound(type: AlarmSound) {
  stopPreview();
  previewStopped = false;

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  previewCtx = ctx;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 5); // 5s fade-in
  masterGain.connect(ctx.destination);

  const playPhrase = PHRASE_PLAYERS[type];

  const scheduleLoop = () => {
    if (previewStopped || ctx !== previewCtx) return;
    const dur = playPhrase(ctx, masterGain, ctx.currentTime + 0.05);
    setTimeout(() => scheduleLoop(), (dur + 0.5) * 1000);
  };

  const start = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  start.then(() => scheduleLoop());

  // Auto-stop after 8 seconds
  setTimeout(() => {
    if (ctx === previewCtx) stopPreview();
  }, 8000);
}

export function stopPreview() {
  previewStopped = true;
  if (previewCtx) {
    try {
      previewCtx.close().catch(() => {});
    } catch { /* already closed */ }
    previewCtx = null;
  }
}
