// Tiny chiptune synth: every sound is generated with WebAudio, no files.
import { save, store } from './save';

type Wave = OscillatorType;

class Synth {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  noiseBuf!: AudioBuffer;
  muted = store.muted;
  private lastPlay: Record<string, number> = {};
  private musicTimer: number | undefined;
  private step = 0;
  private nextTime = 0;
  private track: 'run' | 'boss' | null = null;
  tempo = 1;

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    store.muted = m;
    save();
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // Rate-limit identical sounds so 20 pebbles hitting at once don't clip.
  private gate(name: string, ms: number) {
    const now = performance.now();
    if ((this.lastPlay[name] ?? 0) + ms > now) return false;
    this.lastPlay[name] = now;
    return true;
  }

  private tone(freq: number, dur: number, wave: Wave, vol: number, slideTo?: number, when = 0, bus?: GainNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq = 2000, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(100, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot() {
    if (this.gate('shoot', 60)) this.tone(880 + Math.random() * 80, 0.05, 'square', 0.08, 440);
  }
  hit() {
    if (this.gate('hit', 35)) this.tone(300, 0.06, 'square', 0.18, 120);
  }
  crit() {
    if (this.gate('crit', 50)) this.tone(1400, 0.08, 'square', 0.15, 700);
  }
  kill() {
    if (!this.gate('kill', 40)) return;
    this.noise(0.18, 0.35, 3000);
    this.tone(220, 0.12, 'square', 0.15, 60);
  }
  hurt() {
    this.noise(0.3, 0.5, 1500);
    this.tone(180, 0.35, 'sawtooth', 0.3, 40);
  }
  dash() {
    this.tone(200, 0.15, 'triangle', 0.35, 900);
    this.noise(0.12, 0.15, 5000);
  }
  shock() {
    this.noise(0.35, 0.45, 800);
    this.tone(120, 0.3, 'square', 0.2, 40);
  }
  pickup() {
    this.tone(660, 0.07, 'square', 0.18);
    this.tone(990, 0.12, 'square', 0.18, undefined, 0.06);
  }
  heal() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.3, undefined, i * 0.06));
  }
  upgrade() {
    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.16, undefined, i * 0.05));
  }
  select() {
    this.tone(520, 0.05, 'square', 0.15, 780);
  }
  clear() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.16, undefined, i * 0.08));
  }
  warn() {
    for (let i = 0; i < 3; i++) {
      this.tone(440, 0.22, 'square', 0.16, 880, i * 0.5);
      this.tone(880, 0.22, 'square', 0.16, 440, i * 0.5 + 0.25);
    }
  }
  enemyShot() {
    if (this.gate('eshot', 90)) this.tone(500, 0.08, 'triangle', 0.18, 250);
  }
  thud() {
    if (this.gate('thud', 80)) this.noise(0.25, 0.4, 600);
  }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.4, 2500 - i * 300, i * 0.12);
    [784, 659, 523, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', 0.18, undefined, 0.8 + i * 0.1));
  }
  die() {
    this.stopMusic();
    [523, 440, 349, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'square', 0.22, undefined, i * 0.14));
    this.noise(0.5, 0.4, 1200);
  }

  // ---- music: a 32-step loop with bass, arp and hats ----
  playMusic(track: 'run' | 'boss') {
    if (!this.ctx) return;
    if (this.track === track && this.musicTimer !== undefined) return;
    this.stopMusic();
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    this.track = null;
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    const boss = this.track === 'boss';
    const stepDur = (boss ? 0.105 : 0.125) / this.tempo;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const s = this.step % 32;
      const when = this.nextTime - this.ctx.currentTime;
      // A minor-ish progression: Am F C G (boss: Am Bb Am E)
      const roots = boss ? [110, 116.5, 110, 82.4] : [110, 87.3, 130.8, 98];
      const root = roots[Math.floor(s / 8)];
      if (s % 2 === 0) this.tone(root, stepDur * 1.6, 'triangle', 0.5, undefined, when, this.musicBus);
      const arp = [1, 1.5, 2, 2.5198, 2, 1.5, 3, 2];
      if (!boss || s % 2 === 1) this.tone(root * 2 * arp[s % 8], stepDur * 0.9, 'square', 0.12, undefined, when, this.musicBus);
      if (s % 4 === 2 || (boss && s % 2 === 1)) this.hat(when);
      if (s % 8 === 0) this.kick(when);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private hat(when: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t);
    src.stop(t + 0.05);
  }

  private kick(when: number) {
    this.tone(150, 0.12, 'sine', 0.7, 40, when, this.musicBus);
  }
}

export const sfx = new Synth();
