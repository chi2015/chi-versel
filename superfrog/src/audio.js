// ============================================================================
// audio.js — tiny Web Audio SFX synth (no external audio assets)
// ============================================================================

const SFX = {
  ctx: null,

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  // Call once on first user gesture to unlock audio on mobile/Safari.
  unlock() {
    this._ensureCtx();
  },

  _tone(freq, duration, type, gainPeak, delay, glideTo) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak || 0.2, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  },

  jump() {
    this._tone(420, 0.14, 'square', 0.15, 0, 720);
  },
  coin() {
    this._tone(880, 0.08, 'square', 0.12, 0, 1320);
    this._tone(1320, 0.1, 'square', 0.1, 0.05);
  },
  hit() {
    this._tone(180, 0.22, 'sawtooth', 0.2, 0, 60);
  },
  stomp() {
    this._tone(300, 0.1, 'square', 0.18, 0, 120);
  },
  powerup() {
    this._tone(520, 0.09, 'square', 0.15, 0, 700);
    this._tone(700, 0.09, 'square', 0.15, 0.09, 1000);
    this._tone(1000, 0.12, 'square', 0.15, 0.18, 1400);
  },
  gameover() {
    this._tone(320, 0.3, 'sawtooth', 0.18, 0, 90);
  },
  win() {
    this._tone(660, 0.1, 'square', 0.15, 0);
    this._tone(880, 0.1, 'square', 0.15, 0.1);
    this._tone(1100, 0.2, 'square', 0.15, 0.2);
  },
};
