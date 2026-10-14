// Plays one Song on a WebAudio context with a schedule-ahead loop: call pump()
// every few tens of ms with "schedule everything before this time".
import type { Song, Voice, Wave } from './types';
import { SCALES, degToSemi, midiToFreq, parseNotes, snapSemi, type NoteEv } from './theory';

type VoiceName = 'bass' | 'lead' | 'counter' | 'arp';
const DEFAULT_OCT: Record<VoiceName | 'pad', number> = { bass: -12, lead: 12, counter: 0, arp: 12, pad: 0 };

const pulseCache = new WeakMap<BaseAudioContext, Partial<Record<Wave, PeriodicWave>>>();

function pulseWave(ctx: BaseAudioContext, duty: number) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
  }
  return ctx.createPeriodicWave(real, imag);
}

function setWave(ctx: BaseAudioContext, o: OscillatorNode, w: Wave) {
  if (w !== 'pulse25' && w !== 'pulse12') {
    o.type = w;
    return;
  }
  let c = pulseCache.get(ctx);
  if (!c) pulseCache.set(ctx, (c = {}));
  o.setPeriodicWave((c[w] ??= pulseWave(ctx, w === 'pulse25' ? 0.25 : 0.125)));
}

export function makeNoise(ctx: BaseAudioContext, seconds = 0.5) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class MusicPlayer {
  readonly out: GainNode;
  private mix: GainNode;
  private lfos: OscillatorNode[] = [];
  private vib: Partial<Record<VoiceName | 'pad', GainNode>> = {};
  private notes: Record<VoiceName, (NoteEv | null)[]>;
  private scale: number[];
  private loop: number;
  private bar: number;
  private step = 0;
  private nextTime: number;
  private done = false;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    readonly song: Song,
    private noise: AudioBuffer,
    private tempo: () => number = () => 1,
    start = ctx.currentTime + 0.06,
  ) {
    this.bar = song.bar ?? 16;
    this.loop = this.bar * song.chords.length;
    this.scale = SCALES[song.scale];
    this.notes = {
      bass: song.bass ? parseNotes(song.bass) : [],
      lead: song.lead ? parseNotes(song.lead) : [],
      counter: song.counter ? parseNotes(song.counter) : [],
      arp: song.arp ? parseNotes(song.arp) : [],
    };
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, start - 0.05);
    this.out.gain.linearRampToValueAtTime(1, start + 0.08);
    this.out.connect(dest);
    this.mix = ctx.createGain();
    this.mix.gain.value = 0.85;
    let tail: AudioNode = this.mix;
    if (song.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = song.lp;
      f.Q.value = 0.5;
      tail.connect(f);
      tail = f;
    }
    tail.connect(this.out);
    if (song.echo) {
      const dl = ctx.createDelay(1.5);
      dl.delayTime.value = song.echo.time;
      const fb = ctx.createGain();
      fb.gain.value = Math.min(song.echo.fb, 0.6);
      const wet = ctx.createGain();
      wet.gain.value = song.echo.mix;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2500;
      tail.connect(dl);
      dl.connect(damp).connect(fb).connect(dl);
      damp.connect(wet).connect(this.out);
    }
    for (const name of ['bass', 'lead', 'counter', 'arp', 'pad'] as const) {
      const v = song.v[name];
      if (!v?.vib) continue;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const g = ctx.createGain();
      g.gain.value = v.vib;
      lfo.connect(g);
      lfo.start(start);
      this.lfos.push(lfo);
      this.vib[name] = g;
    }
    this.nextTime = start;
  }

  get stepDur() {
    return 60 / (this.song.bpm * this.tempo()) / (this.song.div ?? 4);
  }

  /** Schedule every step that starts before `until` (context time). */
  pump(until: number) {
    if (this.done) return;
    const s = this.song;
    // After a long stall (tab in the background) skip ahead rather than burst.
    if (this.nextTime < this.ctx.currentTime - 0.25) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < until) {
      const dur = this.stepDur;
      const i = this.step % this.loop;
      const chord = s.chords[Math.floor(i / this.bar)];
      const t = this.nextTime + (i % 2 === 1 ? (s.swing ?? 0) * dur : 0);
      this.voice('bass', i, chord, t, dur);
      this.voice('arp', i, chord, t, dur);
      this.voice('counter', i, 0, t, dur);
      this.voice('lead', i, 0, t, dur);
      if (s.pad && s.v.pad && i % this.bar === 0) {
        const v = s.v.pad;
        for (const d of [0, 2, 4]) this.note(v, 'pad', this.midi(chord + d, 0, v.oct ?? DEFAULT_OCT.pad, false), t, this.bar * dur * 0.97);
      }
      this.drums(i, t);
      this.nextTime += dur;
      this.step++;
    }
  }

  /** Fade out and stop scheduling. */
  fade(seconds = 0.3) {
    this.done = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + seconds);
    this.stopLfos(now + seconds + 0.6);
  }

  dispose() {
    this.done = true;
    this.stopLfos(this.ctx.currentTime);
    this.out.disconnect();
  }

  private stopLfos(at: number) {
    for (const l of this.lfos) l.stop(at);
    this.lfos = [];
  }

  private midi(deg: number, acc: number, oct: number, melodic: boolean) {
    let semi = degToSemi(this.scale, deg) + acc;
    if (melodic && this.song.snap) semi = snapSemi(semi, this.song.snap);
    return this.song.key + oct + semi;
  }

  private voice(name: VoiceName, i: number, chord: number, t: number, dur: number) {
    const arr = this.notes[name];
    const v = this.song.v[name];
    if (!arr.length || !v) return;
    const ev = arr[i % arr.length];
    if (!ev) return;
    const melodic = name === 'lead' || name === 'counter';
    const m = this.midi(chord + ev.deg, ev.acc, v.oct ?? DEFAULT_OCT[name], melodic);
    this.note(v, name, m, t, ev.len * dur * (v.gate ?? 0.9));
  }

  private note(v: Voice, name: VoiceName | 'pad', midi: number, t: number, len: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    setWave(ctx, o, v.wave);
    o.frequency.setValueAtTime(midiToFreq(midi), t);
    const vib = this.vib[name];
    if (vib) vib.connect(o.detune);
    const g = ctx.createGain();
    const p = g.gain;
    const end = t + Math.max(len, 0.03);
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(v.vol, t + 0.005);
    if (v.decay) p.setTargetAtTime(0, t + 0.005, v.decay);
    else p.setTargetAtTime(v.vol * 0.7, t + 0.005, 0.1);
    p.setTargetAtTime(0, end, 0.02);
    o.connect(g).connect(this.mix);
    o.start(t);
    o.stop(end + 0.15);
  }

  private drums(i: number, t: number) {
    const d = this.song.drums;
    const dv = this.song.drumVol ?? 1;
    const hit = (lane?: string) => {
      if (!lane) return '.';
      return lane[i % lane.length];
    };
    let c = hit(d.k);
    if (c !== '.') this.kick(t, (c === 'X' ? 0.55 : 0.45) * dv);
    c = hit(d.s);
    if (c !== '.') this.snare(t, (c === 'X' ? 0.28 : 0.2) * dv);
    c = hit(d.h);
    if (c !== '.') this.hiss(t, 0.035, 7000, (c === 'X' ? 0.1 : 0.065) * dv, 'highpass');
    c = hit(d.o);
    if (c !== '.') this.hiss(t, 0.16, 6000, 0.06 * dv, 'highpass');
    c = hit(d.t);
    if (c !== '.') this.tom(t, c === 'T' ? 330 : 200, 0.22 * dv);
    c = hit(d.j);
    if (c !== '.') {
      this.hiss(t, 0.07, 9000, (c === 'J' ? 0.09 : 0.06) * dv, 'highpass');
      this.hiss(t + 0.012, 0.05, 5200, 0.04 * dv, 'bandpass');
    }
  }

  private kick(t: number, vol: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.mix);
    o.start(t);
    o.stop(t + 0.16);
  }

  private tom(t: number, f: number, vol: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.mix);
    o.start(t);
    o.stop(t + 0.16);
  }

  private snare(t: number, vol: number) {
    this.hiss(t, 0.12, 1800, vol, 'bandpass');
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(this.mix);
    o.start(t);
    o.stop(t + 0.1);
  }

  private hiss(t: number, dur: number, freq: number, vol: number, type: BiquadFilterType) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    // Start at a different spot each time so repeated hits don't sound identical.
    const off = (this.step * 0.0371) % Math.max(0.01, this.noise.duration - dur - 0.01);
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.mix);
    src.start(t, off);
    src.stop(t + dur + 0.02);
  }
}
