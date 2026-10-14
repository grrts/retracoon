// Hand-made songs: one per area "family", plus the title theme and its holiday
// versions. Every area's track is derived from its family song (see tracks.ts).
import type { Song } from './types';
import { MINOR_PENT } from './theory';

export type Family =
  | 'street'
  | 'water'
  | 'forest'
  | 'country'
  | 'jungle'
  | 'swamp'
  | 'desert'
  | 'snow'
  | 'whimsy'
  | 'spooky'
  | 'heavy'
  | 'clockwork'
  | 'synth'
  | 'ethereal';

// Trash-street funk: A dorian, swung sixteenths, a busy bass and guitar-ish stabs.
const street: Song = {
  name: 'Alley Cat Strut',
  bpm: 104,
  swing: 0.16,
  key: 57,
  scale: 'dorian',
  chords: [0, 3, 0, 6],
  bass: '0 . . 0 . . 7 . . 0 . 0 6 . 4 .',
  arp: '. . 2 . . . 4 . . . 2 . . 4 . .',
  lead: [
    '. . 4 . 6 . 7 . . 6 . 4 . . 2 .',
    '. . 5 . 7 . 8 . . 7 . 5 . 3 . .',
    '. . 4 . 6 . 7 . 9 . 7 . 6 . 4 .',
    '6 . 4 . 3 . 1 - - . 3 . 4 - - .',
  ].join(' | '),
  drums: {
    k: 'x.....x...x.....',
    s: '....x.......x...',
    h: 'x.x.x.xxx.x.x.xx',
  },
  v: {
    bass: { wave: 'square', vol: 0.2, gate: 0.6 },
    lead: { wave: 'pulse25', vol: 0.12, gate: 0.8 },
    arp: { wave: 'pulse12', vol: 0.06, gate: 0.4, oct: 12 },
  },
  lp: 5200,
};

// Docks, rivers, beaches: breezy D major, half-time drums, rippling arp.
const water: Song = {
  name: 'Low Tide',
  bpm: 96,
  swing: 0.1,
  key: 62,
  scale: 'major',
  chords: [0, 4, 5, 3],
  bass: '0 . . . 4 . . 0 . . 7 . 4 . . .',
  arp: '0 4 7 4 9 4 7 4 0 4 7 4 9 4 7 4',
  pad: true,
  lead: [
    '4 - - . 2 . 4 . 7 - - - 6 . 4 .',
    '4 - - . 1 . 2 . 4 - - - - - . .',
    '5 - - . 4 . 2 . 4 - - . 2 . 1 .',
    '0 - - . 1 . 2 . 3 - - - 1 - . .',
  ].join(' | '),
  drums: {
    k: 'x.......x.......',
    s: '........x.......',
    h: '..x...x...x...x.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.34 },
    lead: { wave: 'triangle', vol: 0.2, vib: 8 },
    arp: { wave: 'pulse25', vol: 0.045, gate: 0.5, decay: 0.12, oct: 0 },
    pad: { wave: 'sine', vol: 0.035 },
  },
  drumVol: 0.7,
  echo: { time: 0.375, fb: 0.3, mix: 0.25 },
};

// Woods: a folksy G major jig in 6/8.
const forest: Song = {
  name: 'Under The Pines',
  bpm: 100,
  div: 3,
  bar: 12,
  key: 55,
  scale: 'major',
  chords: [0, 3, 4, 0],
  bass: '0 . . 4 . . 0 . . 4 . .',
  lead: [
    '4 . 2 0 . 2 4 . 7 6 . 4',
    '7 . 5 3 . 5 7 . 8 9 . 7',
    '8 . 6 4 . 6 8 . 9 8 . 6',
    '7 . 4 2 . 1 0 - - . . .',
  ].join(' | '),
  counter: [
    '. . . . . . . . . . . .',
    '. . . . . . 3 - - 5 - -',
    '. . . . . . 4 - - 6 - -',
    '2 - - 1 - - . . . . . .',
  ].join(' | '),
  drums: {
    k: 'x.....x.....',
    h: '..x..x..x..x',
    t: '...t.....tt.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.34, gate: 0.7 },
    lead: { wave: 'pulse25', vol: 0.12, gate: 0.85, vib: 6 },
    counter: { wave: 'triangle', vol: 0.12, oct: 12 },
  },
  drumVol: 0.7,
  lp: 5000,
};

// Farms and parks: bouncy C major with oom-pah bass and banjo-ish off-beats.
const country: Song = {
  name: 'Hay Bale Hop',
  bpm: 126,
  key: 60,
  scale: 'major',
  chords: [0, 3, 0, 4],
  bass: '0 . . . 4 . . . 0 . . . 4 . 2 .',
  arp: '. . 2 4 . . 2 4 . . 2 4 . . 2 4',
  lead: [
    '4 . 4 . 2 . 4 . 7 . . . 4 . . .',
    '5 . 5 . 3 . 5 . 7 . 5 . 3 . . .',
    '4 . 4 . 7 . 4 . 2 . 1 . 0 . 2 .',
    '1 . 1 . 4 . 1 . 2 . 1 . -1 . . .',
  ].join(' | '),
  drums: {
    k: 'x.......x.......',
    s: '....x.......x...',
    h: '..x...x...x...x.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.36, gate: 0.6 },
    lead: { wave: 'square', vol: 0.1, gate: 0.7 },
    arp: { wave: 'pulse12', vol: 0.05, gate: 0.35, decay: 0.06 },
  },
  lp: 4800,
};

// Jungle / savanna: congas everywhere, marimba-ish minor pentatonic calls.
const jungle: Song = {
  name: 'Canopy Drums',
  bpm: 112,
  swing: 0.08,
  key: 52,
  scale: 'minor',
  snap: MINOR_PENT,
  chords: [0, 0, 5, 6],
  bass: '0 . . 0 . . 0 . 3 . . 4 . . 6 .',
  lead: [
    '7 . . 9 . 7 . 4 . . . . 7 . 4 .',
    '3 . 4 . . . 2 . 0 - - . . . . .',
    '7 . . 9 . 11 . 9 . 7 . . 4 . . .',
    '8 . 7 . 4 . 3 . 4 - - - . . . .',
  ].join(' | '),
  counter: '. . . . . . . . . . . . . . . . | . . . . . . . . . . 7 . 9 . 11 . | . . . . . . . . . . . . . . . . | . . . . . . . . 11 . 9 . 7 . . .',
  drums: {
    k: 'x..x..x...x..x..',
    s: '....x.......x...',
    h: 'x.xx.xx.x.xx.xx.',
    t: '..t.tT..t.T.t.T.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.36, gate: 0.6 },
    lead: { wave: 'triangle', vol: 0.24, decay: 0.14, oct: 12 },
    counter: { wave: 'pulse25', vol: 0.06, decay: 0.08, oct: 12 },
  },
  drumVol: 0.9,
};

// Swamp: slow, swung, bluesy D minor with a murky low-pass.
const swamp: Song = {
  name: 'Bayou Blues',
  bpm: 76,
  swing: 0.25,
  key: 50,
  scale: 'minor',
  chords: [0, 0, 3, 4],
  bass: '0 - - . . . 0 . 2 - - . 3 . 4 .',
  pad: true,
  lead: [
    '. . . . 4 - - - 3 . 2 . 0 - - -',
    '- - . . 2 . 3 . 4b . 4 . 2 - - -',
    '. . . . 3 - - - 5 . 3 . 2 - - -',
    '. . 4 . 6 . 4 . 2 - - - 1 - 0 .',
  ].join(' | '),
  drums: {
    k: 'x.........x.....',
    s: '........x.......',
    h: '....x.......x...',
    t: '..............t.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.38 },
    lead: { wave: 'square', vol: 0.11, vib: 18, oct: 12 },
    pad: { wave: 'triangle', vol: 0.04 },
  },
  drumVol: 0.75,
  lp: 2400,
};

// Desert / canyon: E phrygian dominant, darbuka-style hand drums, wavering lead.
const desert: Song = {
  name: 'Mirage Bazaar',
  bpm: 100,
  key: 52,
  scale: 'phrygianDominant',
  chords: [0, 1, 0, 6],
  bass: '0 . 0 . 4 . 0 . 1 . 0 . 4 . 0 .',
  lead: [
    '0 . 1 . 2 . 3 . 4 - 3 2 1 . 0 .',
    '1 . 2 . 3 . 5 . 4 - - . 3 . 1 .',
    '4 . 5 4 3 . 2 . 3 . 2 1 0 - - .',
    '-1 . 0 . 1 . 2 . 1 - - - 0 - - .',
  ].join(' | '),
  pad: true,
  drums: {
    k: 'x.....x...x.....',
    h: 'x...x...x...x...',
    t: '..t.T..t..T.t.T.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.34, gate: 0.7 },
    lead: { wave: 'pulse25', vol: 0.12, vib: 22, oct: 12 },
    pad: { wave: 'sine', vol: 0.03, oct: -12 },
  },
  lp: 4500,
};

// Tundra / glacier: sparse bells over long notes, lots of echo.
const snow: Song = {
  name: 'Frostbite',
  bpm: 84,
  key: 64,
  scale: 'major',
  chords: [0, 5, 3, 4],
  bass: '0 - - - . . . . 4 - - - . . . .',
  arp: '0 . . 4 . . 7 . . 9 . . 7 . . .',
  lead: [
    '4 - - - . . 2 . 4 - - - 7 - - -',
    '5 - - - . . 4 . 2 - - - - - - -',
    '3 - - - . . 5 . 7 - - - 8 - 7 -',
    '6 - - - - - 4 . 1 - - - - - - -',
  ].join(' | '),
  drums: {
    k: 'x...............',
    h: '........x.......',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.3, oct: -24 },
    lead: { wave: 'triangle', vol: 0.17, vib: 6 },
    arp: { wave: 'sine', vol: 0.12, decay: 0.3, oct: 12 },
  },
  drumVol: 0.5,
  echo: { time: 0.536, fb: 0.38, mix: 0.35 },
};

// Mushrooms, candy, toys: bouncy, cheeky chromatic steps and woodblocks.
const whimsy: Song = {
  name: 'Gumdrop Parade',
  bpm: 132,
  swing: 0.2,
  key: 58,
  scale: 'major',
  chords: [0, 5, 1, 4],
  bass: '0 . 4 . 7 . 4 . 0 . 4 . 7 . 6 .',
  lead: [
    '4 . 3# 4 . 7 . . 6 . 5 . 4 . . .',
    '5 . 4# 5 . 9 . . 7 . 5 . 4 . . .',
    '3 . 4 . 5 . 6 . 8 . 7 . 5 . 3 .',
    '4 . . 2 . . 1 . 4 - - . 7 . . .',
  ].join(' | '),
  arp: '7 . . . . . . . 9 . . . . . . .',
  drums: {
    k: 'x...x...x...x...',
    h: '..x...x...x...x.',
    t: '...T...T...T..TT',
  },
  v: {
    bass: { wave: 'square', vol: 0.15, gate: 0.4 },
    lead: { wave: 'pulse25', vol: 0.12, gate: 0.7 },
    arp: { wave: 'sine', vol: 0.1, decay: 0.15, oct: 12 },
  },
  drumVol: 0.75,
  lp: 5500,
};

// Haunted / boneyard: a D harmonic-minor waltz, theremin lead and xylophone bones.
const spooky: Song = {
  name: 'Graveyard Waltz',
  bpm: 92,
  bar: 12,
  swing: 0.06,
  key: 50,
  scale: 'harmonicMinor',
  chords: [0, 5, 3, 4],
  bass: '0 . . . 4 . . . 4 . . .',
  arp: '. . . . 7 . 9 . 11 . 9 .',
  lead: [
    '7 - - - 6 - 5 - 4 - - -',
    '5 - - - 4 - 2 - 0 - - -',
    '3 - - - 5 - 7 - 8 - 7 -',
    '6 - - - 4 - 1 - 6 - - -',
  ].join(' | '),
  drums: {
    k: 'x...........',
    h: '....x...x...',
    t: '..........t.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.36, gate: 0.6 },
    lead: { wave: 'sine', vol: 0.22, vib: 30, oct: 12 },
    arp: { wave: 'triangle', vol: 0.12, decay: 0.07, oct: 0 },
  },
  drumVol: 0.6,
  echo: { time: 0.49, fb: 0.32, mix: 0.3 },
};

// Lava / ruins / storms: an E phrygian chugging riff.
const heavy: Song = {
  name: 'Magma Riff',
  bpm: 120,
  key: 52,
  scale: 'phrygian',
  chords: [0, 0, 1, 6],
  bass: '0 0 . 0 0 . 1 0 0 0 . 0 7 . 6 .',
  lead: [
    '0 - - - 1 - - - 0 - - . 3 - 2 -',
    '0 - - - . . . . 4 - 3 - 1 - - -',
    '1 - - - 2 - - - 1 - - . 5 - 4 -',
    '3 - - - 2 - 1 - -1 - - - - - - -',
  ].join(' | '),
  drums: {
    k: 'x.x...x.x.x...x.',
    s: '....x.......x...',
    h: 'x.x.x.x.x.x.x.x.',
    t: '.'.repeat(56) + 'T.T.t.t.',
  },
  v: {
    bass: { wave: 'sawtooth', vol: 0.17, gate: 0.7 },
    lead: { wave: 'square', vol: 0.11, vib: 10, oct: 12 },
  },
  lp: 3200,
};

// Clockwork: straight sixteenths, ticking arp, tick-tock woodblocks.
const clockwork: Song = {
  name: 'Gear Train',
  bpm: 108,
  key: 60,
  scale: 'harmonicMinor',
  chords: [0, 5, 3, 4],
  bass: '0 . 0 . 0 . 0 . 4 . 4 . 4 . 4 .',
  arp: '0 4 7 4 0 4 7 4 0 4 7 4 0 4 7 4',
  lead: [
    '7 . 6 . 7 . 4 . 2 . 4 . 7 . . .',
    '7 . 5 . 7 . 2 . 0 . 2 . 5 . . .',
    '8 . 7 . 8 . 5 . 3 . 5 . 8 . . .',
    '6 . 4 . 6 . 8 . 11 . . . 6 . . .',
  ].join(' | '),
  drums: {
    k: 'x.......x.......',
    h: 'x.x.x.x.x.x.x.x.',
    t: 'T...t...T...t...',
  },
  v: {
    bass: { wave: 'square', vol: 0.15, gate: 0.4 },
    lead: { wave: 'square', vol: 0.1, gate: 0.6, oct: 12 },
    arp: { wave: 'pulse12', vol: 0.045, decay: 0.04, oct: 0 },
  },
  drumVol: 0.7,
  lp: 5000,
};

// Neon / cyber / space: synthwave in A minor, pumping eighths and an echoing arp.
const synth: Song = {
  name: 'Neon Dumpster',
  bpm: 112,
  key: 57,
  scale: 'minor',
  chords: [0, 5, 2, 6],
  bass: '0 . 0 . 0 . 0 . 0 . 0 . 7 . 0 .',
  arp: '0 2 4 7 4 2 0 2 4 7 9 7 4 2 0 2',
  pad: true,
  lead: [
    '4 - - - - - 2 - 4 - 7 - 6 - 4 -',
    '5 - - - - - 4 - 2 - - - 0 - - -',
    '4 - - - - - 2 - 4 - 9 - 7 - 6 -',
    '6 - - - 4 - 3 - 1 - - - - - - -',
  ].join(' | '),
  drums: {
    k: 'x...x...x...x...',
    s: '....X.......X...',
    h: '..x...x...x...x.',
  },
  v: {
    bass: { wave: 'sawtooth', vol: 0.16, gate: 0.7 },
    lead: { wave: 'sawtooth', vol: 0.1, vib: 12, oct: 12 },
    arp: { wave: 'pulse25', vol: 0.04, gate: 0.5, decay: 0.08, oct: 12 },
    pad: { wave: 'triangle', vol: 0.04 },
  },
  lp: 3800,
  echo: { time: 0.402, fb: 0.3, mix: 0.25 },
};

// Dream / clouds / sky: C lydian, long sine notes, harp-like arp, deep echo.
const ethereal: Song = {
  name: 'Cloud Nap',
  bpm: 80,
  key: 60,
  scale: 'lydian',
  chords: [0, 1, 5, 4],
  bass: '0 - - - - - - - 4 - - - - - - -',
  arp: '0 4 7 9 11 9 7 4 0 4 7 9 11 9 7 4',
  pad: true,
  lead: [
    '4 - - - - - - - 6 - 7 - 8 - - -',
    '8 - - - - - - - 5 - - - 3 - - -',
    '5 - - - - - 4 - 2 - - - 4 - - -',
    '6 - - - - - - - 4 - - - - - - -',
  ].join(' | '),
  drums: {
    k: 'x...............',
    h: '........x.......',
  },
  v: {
    bass: { wave: 'sine', vol: 0.22 },
    lead: { wave: 'sine', vol: 0.18, vib: 12, oct: 12 },
    arp: { wave: 'triangle', vol: 0.07, decay: 0.25, oct: 0 },
    pad: { wave: 'sine', vol: 0.035 },
  },
  drumVol: 0.45,
  echo: { time: 0.5625, fb: 0.4, mix: 0.3 },
};

export const FAMILIES: Record<Family, Song> = {
  street,
  water,
  forest,
  country,
  jungle,
  swamp,
  desert,
  snow,
  whimsy,
  spooky,
  heavy,
  clockwork,
  synth,
  ethereal,
};

// ---------------------------------------------------------------- title theme

const titleLead = [
  '4 . 4 2 . 0 . 2 4 . 7 . 6 . 4 .',
  '3 . 3 5 . 7 . 5 3 - - . 1 . 0 .',
  '2 . 2 4 . 6 . 7 9 . 7 . 6 . 4 .',
  '6 - - . 4 . 3 . 1 - - - . . . .',
  '7 . 7 9 . 7 . 4 6 . 7 . 9 . 11 .',
  '10 . 10 9 . 7 . 5 7 - - . 5 . 3 .',
  '4 . 4 6 . 7 . 9 7 . 6 . 4 . 2 .',
  '4 - - . 6 . 4 . 3 - 1 - 0 . . .',
].join(' | ');

// "Retracoon": the game's theme song. Funky, swung A dorian, a hook you can hum.
export const TITLE: Song = {
  name: 'Retracoon',
  bpm: 116,
  swing: 0.14,
  key: 57,
  scale: 'dorian',
  chords: [0, 3, 2, 6, 0, 3, 2, 4],
  bass: '0 . . 0 . 0 7 . . 0 . 0 4 . 6 .',
  arp: '. . 2 . . . 4 . . . 2 . . 4 . .',
  lead: titleLead,
  counter: '. . . . . . . . . . . . . . . . | '.repeat(4) + [
    '0 - - - - - - - 2 - - - - - - -',
    '3 - - - - - - - 1 - - - - - - -',
    '2 - - - - - - - 4 - - - - - - -',
    '1 - - - - - - - -1 - - - - - - -',
  ].join(' | '),
  drums: {
    k: 'x.....x...x.....',
    s: '....x.......x..x',
    h: 'x.xxx.x.x.xxx.x.',
    o: '..............o.',
  },
  v: {
    bass: { wave: 'square', vol: 0.19, gate: 0.55 },
    lead: { wave: 'pulse25', vol: 0.12, gate: 0.8, vib: 5 },
    counter: { wave: 'triangle', vol: 0.12, oct: 12 },
    arp: { wave: 'pulse12', vol: 0.055, gate: 0.4, oct: 12 },
  },
  lp: 5200,
};

// Christmas: sleigh bells and a public-domain "Jingle Bells" chorus over the
// title's groove, in C major.
export const TITLE_CHRISTMAS: Song = {
  name: 'Jingle Coon',
  bpm: 132,
  swing: 0.1,
  key: 60,
  scale: 'major',
  chords: [0, 0, 0, 0, 3, 0, 1, 4],
  bass: '0 . . . 4 . . . 0 . . . 4 . 2 .',
  arp: '. . 2 4 . . 2 4 . . 2 4 . . 2 4',
  lead: [
    '2 . . . 2 . . . 2 - - - - - . .',
    '2 . . . 2 . . . 2 - - - - - . .',
    '2 . . . 4 . . . 0 - - - - . 1 .',
    '2 - - - - - - - - - - - - - . .',
    '3 . . . 3 . . . 3 - - - - . 3 .',
    '3 . . . 2 . . . 2 . . . 2 . 2 .',
    '2 . . . 1 . . . 1 . . . 2 . . .',
    '1 - - - - - . . 4 - - - - - . .',
  ].join(' | '),
  counter: [
    '7 . . . . . . . 4 . . . . . . .',
    '7 . . . . . . . 9 . . . . . . .',
    '7 . . . . . . . 4 . . . . . . .',
    '7 . . . 6 . . . 4 . . . 2 . . .',
  ].join(' | '),
  drums: {
    k: 'x.......x.......',
    s: '....x.......x...',
    j: 'x.x.x.x.x.x.x.x.',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.36, gate: 0.6 },
    lead: { wave: 'square', vol: 0.11, gate: 0.85 },
    counter: { wave: 'sine', vol: 0.11, decay: 0.3, oct: 24 },
    arp: { wave: 'pulse12', vol: 0.045, gate: 0.35, decay: 0.06 },
  },
  lp: 5200,
};

// Halloween: the theme gone spooky: harmonic minor, slower, a wobbly theremin
// lead, organ pad and echo.
export const TITLE_HALLOWEEN: Song = {
  ...TITLE,
  name: 'Retracoon (Spooky)',
  bpm: 100,
  swing: 0.18,
  key: 50,
  scale: 'harmonicMinor',
  chords: [0, 3, 5, 4, 0, 3, 5, 4],
  pad: true,
  drums: {
    k: 'x.........x.....',
    s: '........x.......',
    h: '..x...x...x...x.',
    t: '.'.repeat(120) + 'T.t.t...',
  },
  v: {
    bass: { wave: 'triangle', vol: 0.36, gate: 0.6 },
    lead: { wave: 'sine', vol: 0.2, vib: 32, oct: 12 },
    counter: { wave: 'triangle', vol: 0.12, decay: 0.08, oct: 12 },
    arp: { wave: 'pulse12', vol: 0.045, gate: 0.4, oct: 12 },
    pad: { wave: 'square', vol: 0.025 },
  },
  echo: { time: 0.45, fb: 0.32, mix: 0.3 },
  lp: 3500,
};

