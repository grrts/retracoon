import type { ScaleName } from './types';

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
};

export const MAJOR_PENT = [0, 2, 4, 7, 9];
export const MINOR_PENT = [0, 3, 5, 7, 10];

/** Semitones above the tonic for a scale degree (any integer). */
export function degToSemi(scale: number[], deg: number): number {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  return scale[deg - oct * n] + 12 * oct;
}

/** Snap a semitone offset down to the nearest allowed pitch class. */
export function snapSemi(semi: number, allowed: number[]): number {
  for (let d = 0; d < 12; d++) {
    const pc = (((semi - d) % 12) + 12) % 12;
    if (allowed.includes(pc)) return semi - d;
  }
  return semi;
}

export function midiToFreq(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export interface NoteEv {
  deg: number;
  acc: number;
  /** Length in steps (1 + following holds). */
  len: number;
}

/** Parse a note string into a per-step array (null = no new note on that step). */
export function parseNotes(src: string): (NoteEv | null)[] {
  const toks = src.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out: (NoteEv | null)[] = [];
  let last: NoteEv | null = null;
  for (const t of toks) {
    if (t === '.') {
      out.push(null);
      last = null;
    } else if (t === '-') {
      out.push(null);
      if (last) last.len++;
    } else {
      const m = /^(-?\d+)([#b]?)$/.exec(t);
      if (!m) throw new Error(`bad note token "${t}"`);
      last = { deg: parseInt(m[1], 10), acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0, len: 1 };
      out.push(last);
    }
  }
  return out;
}

/** Turn a per-step array back into a note string (used by the variation code). */
export function formatNotes(steps: (NoteEv | null)[]): string {
  const out: string[] = [];
  let hold = 0;
  for (const s of steps) {
    if (s) {
      out.push(`${s.deg}${s.acc > 0 ? '#' : s.acc < 0 ? 'b' : ''}`);
      hold = s.len - 1;
    } else if (hold > 0) {
      out.push('-');
      hold--;
    } else out.push('.');
  }
  return out.join(' ');
}

/** Small deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
