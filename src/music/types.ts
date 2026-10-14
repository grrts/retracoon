// Songs are plain data; src/music/player.ts turns them into WebAudio notes.
//
// Note strings: one token per step, separated by spaces ('|' is ignored, use it
// as a bar line). A token is a scale degree (0 = the key's tonic, 7 = an octave up
// in a 7-note scale, negatives go down) with an optional '#' or 'b', '.' for a rest,
// or '-' to hold the previous note one more step. Lead and counter degrees are
// relative to the key; bass, arp and pad degrees are relative to the bar's chord
// root (0 2 4 = a triad, 7 = the chord root an octave up). A string shorter than
// the loop repeats.
//
// Drum strings: one char per step, '.' = nothing, lower case = hit, upper case =
// accented hit. They repeat too, so a 16-step pattern loops every bar.

export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse25' | 'pulse12';

export type ScaleName =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'mixolydian'
  | 'lydian'
  | 'phrygian'
  | 'harmonicMinor'
  | 'phrygianDominant';

export interface Voice {
  wave: Wave;
  vol: number;
  /** Semitones from the key. Defaults: bass -12, lead +12, counter 0, arp +12, pad 0. */
  oct?: number;
  /** Fraction of the note's length that sounds (staccato < 1). Default 0.9. */
  gate?: number;
  /** Pluck: exponential decay time constant in seconds. Omitted = sustained. */
  decay?: number;
  /** Vibrato depth in cents. */
  vib?: number;
}

export interface Drums {
  k?: string; // kick
  s?: string; // snare
  h?: string; // closed hat
  o?: string; // open hat
  t?: string; // tom / conga / woodblock (upper case = higher)
  j?: string; // sleigh bell / shaker
}

export interface Song {
  name: string;
  /** Beats per minute. */
  bpm: number;
  /** Steps per beat: 4 = sixteenths, 3 = triplet / 6-8 feel. */
  div?: number;
  /** Steps per bar (default 16). */
  bar?: number;
  /** 0..0.4: how far off-beat steps are pushed late, as a fraction of a step. */
  swing?: number;
  /** MIDI note of the tonic in the pad octave (57 = A3). */
  key: number;
  scale: ScaleName;
  /** Optional pitch classes (0-11 from the key) the lead and counter snap down to (e.g. a pentatonic). */
  snap?: number[];
  /** Chord root scale degree for each bar; its length sets the loop length. */
  chords: number[];
  bass?: string;
  lead?: string;
  counter?: string;
  arp?: string;
  /** Hold a triad on every bar. */
  pad?: boolean;
  drums: Drums;
  v: { bass: Voice; lead: Voice; counter?: Voice; arp?: Voice; pad?: Voice };
  drumVol?: number;
  /** Low-pass cutoff for the whole track (Hz). Softens square waves on phone speakers. */
  lp?: number;
  echo?: { time: number; fb: number; mix: number };
}
