// Tiny chiptune synth: every sound is generated with WebAudio, no files.
import type Phaser from 'phaser';
import { save, store } from './save';
import { activeSeason } from './world/calendar';
import { MusicPlayer } from './music/player';
import { normalizeTrack, resolveTrack } from './music/tracks';

type Wave = OscillatorType;

// Music sits well under the sound effects. The volume settings (0-10) scale these down.
const MASTER_LEVEL = 0.5;
const SFX_LEVEL = 0.55;
const MUSIC_LEVEL = 0.3;
const level = (k: 'master' | 'music' | 'sfx') => (store.vol?.[k] ?? 10) / 10;

class Synth {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  noiseBuf!: AudioBuffer;
  muted = store.muted;
  private lastPlay: Record<string, number> = {};
  private musicTimer: number | undefined;
  private player: MusicPlayer | null = null;
  private track: string | null = null;
  private wanted: string | null = null;
  tempo = 1;

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_LEVEL * level('master');
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = SFX_LEVEL * level('sfx');
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = MUSIC_LEVEL * level('music');
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    // A track asked for before the first tap starts now.
    if (this.wanted && !this.player) this.playMusic(this.wanted);
  }

  setMuted(m: boolean) {
    this.muted = m;
    store.muted = m;
    save();
    this.applyVolume();
  }

  /** Apply store.vol and the mute switch to the running mix. */
  applyVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_LEVEL * level('master'), t, 0.02);
    this.sfxBus.gain.setTargetAtTime(SFX_LEVEL * level('sfx'), t, 0.02);
    this.musicBus.gain.setTargetAtTime(MUSIC_LEVEL * level('music'), t, 0.02);
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
  // Passing your best: a quick rising run that ends on a held high note.
  record() {
    [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.08, 'square', 0.16, undefined, i * 0.06));
    this.tone(1568, 0.3, 'square', 0.14, undefined, 0.24);
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

  // ---- music: data-driven songs (src/music), one per area plus a title theme ----

  /**
   * Play a track: 'title', 'area:<themeId>' or 'boss:<themeId>' (see areaTrack /
   * bossTrack; the old 'run' / 'boss' mean the street tracks). Asking for the track
   * that is already playing does nothing; another track fades the current one out.
   * Before the audio is unlocked by a tap, the wish is remembered and starts on unlock().
   */
  playMusic(id: string) {
    id = normalizeTrack(id);
    this.wanted = id;
    if (!this.ctx) return;
    if (this.track === id && this.player) return;
    this.fadeOutMusic();
    this.track = id;
    const season = id === 'title' ? activeSeason()?.id : null;
    const ctx = this.ctx;
    this.player = new MusicPlayer(ctx, this.musicBus, resolveTrack(id, season), this.noiseBuf, () => this.tempo);
    this.player.pump(ctx.currentTime + 0.15);
    if (this.musicTimer === undefined) this.musicTimer = window.setInterval(() => this.player?.pump(ctx.currentTime + 0.15), 40);
  }

  stopMusic() {
    this.fadeOutMusic();
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    this.track = null;
    this.wanted = null;
  }

  /** The track currently playing (normalised id), if any. */
  get currentTrack() {
    return this.track;
  }

  private fadeOutMusic() {
    const p = this.player;
    if (!p) return;
    this.player = null;
    p.fade(0.3);
    window.setTimeout(() => p.dispose(), 800);
  }
}

/**
 * For menu scenes: play the title theme (a no-op if it is already on) and unlock
 * audio on the first tap or key press, so the music can start before PLAY is hit.
 */
export function menuMusic(scene: Phaser.Scene) {
  sfx.playMusic('title');
  const unlock = () => sfx.unlock();
  scene.input.once('pointerup', unlock);
  scene.input.keyboard?.once('keydown', unlock);
}

/** Track id for an area theme's music. */
export function areaTrack(themeId: string) {
  return `area:${themeId}`;
}

/** Track id for the boss fight in an area theme. */
export function bossTrack(themeId: string) {
  return `boss:${themeId}`;
}

export const sfx = new Synth();
