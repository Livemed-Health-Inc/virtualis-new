/* A single restrained alert tone. Audio is primed on the first user gesture
   (browsers block it otherwise) and repeats only while something is waiting. */

let ctx: AudioContext | null = null;
let primed = false;

export function primeChime() {
  if (primed || typeof window === "undefined") return;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = ctx ?? new AC();
  ctx.resume().catch(() => {});
  primed = true;
}

export const chimePrimed = () => primed;

export function playChime() {
  if (!primed || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.setValueAtTime(1180, t + 0.16);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

/** Repeats the chime while `active` stays true; returns the stop function. */
export function startChimeLoop(intervalMs = 6000) {
  playChime();
  const id = setInterval(playChime, intervalMs);
  return () => clearInterval(id);
}
