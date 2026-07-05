// Generated ringtone via Web Audio — no audio asset to load, so it can't 404
// or lag on slow networks. Browsers may block audio before any user gesture on
// the page, so start() is best-effort and callers shouldn't depend on it.
export class Ringtone {
  private ctx: AudioContext | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.ctx) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.ring();
      this.interval = setInterval(() => this.ring(), 4000);
    } catch {
      this.ctx = null;
    }
  }

  // Classic dual-tone ring (440Hz + 480Hz): 2s burst every 4s
  private ring() {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return;
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
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
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
