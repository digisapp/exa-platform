// Generated ringtone via Web Audio — no audio asset to load, so it can't 404
// or lag on slow networks.
//
// iOS Safari starts an AudioContext created outside a user gesture in the
// "suspended" state, and the incoming-call dialog mounts from a realtime
// event (not a gesture) — so we keep ONE shared AudioContext for the module
// and unlock (create/resume) it on the first user gesture via
// unlockRingtoneAudio(). Ring bursts then reuse the unlocked context. If it
// was never unlocked, ring() still tries resume() and otherwise stays silent,
// matching the old best-effort behavior.

let sharedCtx: AudioContext | null = null;

function getSharedContext(): AudioContext | null {
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctx();
  } catch {
    sharedCtx = null;
  }
  return sharedCtx;
}

/**
 * Call from a user-gesture handler (touchstart/pointerdown/click) to create
 * and resume the shared AudioContext so later rings are audible on iOS.
 * Safe to call repeatedly; never throws.
 */
export function unlockRingtoneAudio(): void {
  try {
    const ctx = getSharedContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Best-effort — audio unlock must never break the caller.
  }
}

export class Ringtone {
  private ctx: AudioContext | null = null;
  // Per-instance master gain so stop() can silence in-flight bursts without
  // closing the shared context (which other rings may reuse later).
  private master: GainNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.ctx) return;
    const ctx = getSharedContext();
    if (!ctx) return;
    try {
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.ring();
      this.interval = setInterval(() => this.ring(), 4000);
    } catch {
      this.master = null;
      this.ctx = null;
    }
  }

  // Classic dual-tone ring (440Hz + 480Hz): 2s burst every 4s
  private ring() {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return;
    if (ctx.state === "suspended") {
      // Only succeeds if a prior user gesture unlocked audio; if it stays
      // suspended we ring silently, as before (never throw from here).
      ctx.resume().then(
        () => {
          if (this.ctx === ctx && ctx.state === "running") this.scheduleBurst(ctx);
        },
        () => {}
      );
      return;
    }
    this.scheduleBurst(ctx);
  }

  private scheduleBurst(ctx: AudioContext) {
    const master = this.master;
    if (!master) return;
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(master);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.9);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
    }
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    // Silence any in-flight burst; keep the shared context open for reuse.
    try {
      this.master?.disconnect();
    } catch {
      // Already disconnected
    }
    this.master = null;
    this.ctx = null;
  }
}
