// Which song plays where: every area theme belongs to a family, and gets its own
// deterministic variation of that family's song. Bosses get a faster, darker take
// on their area's track.
import type { Drums, ScaleName, Song, Voice, Wave } from './types';
import { FAMILIES, TITLE, TITLE_CHRISTMAS, TITLE_HALLOWEEN, type Family } from './families';
import { MAJOR_PENT, formatNotes, hash, parseNotes, rng } from './theory';

// The first theme of each list plays its family song unchanged.
const MEMBERS: Record<Family, string[]> = {
  street: ['street', 'alley', 'garage', 'rooftops', 'subway', 'sewers', 'junkyard', 'night_market'],
  water: ['docks', 'riverbank', 'lakeside', 'beach', 'reef'],
  forest: ['woods', 'pines', 'autumn', 'bamboo'],
  country: ['farm', 'park', 'meadow', 'orchard', 'cornfield'],
  jungle: ['jungle', 'savanna'],
  swamp: ['swamp', 'mangrove'],
  desert: ['desert', 'canyon'],
  snow: ['tundra', 'glacier', 'crystal_caves'],
  whimsy: ['candy', 'mushroom', 'toybox'],
  spooky: ['haunted', 'boneyard'],
  heavy: ['lava', 'ruins', 'storm_peaks'],
  clockwork: ['clockwork'],
  synth: ['neon_city', 'cyber', 'space_station', 'alien', 'trash_dimension'],
  ethereal: ['dream', 'clouds', 'sky_temple', 'moon', 'void_rift'],
};

export const THEME_FAMILY: Record<string, Family> = {};
for (const [fam, ids] of Object.entries(MEMBERS) as [Family, string[]][]) for (const id of ids) THEME_FAMILY[id] = fam;

export function familyOf(themeId: string): Family {
  return THEME_FAMILY[themeId] ?? 'street';
}

// A few hand-picked twists on top of the automatic variation.
const TWEAKS: Record<string, Partial<Song>> = {
  sewers: { lp: 2200, echo: { time: 0.29, fb: 0.35, mix: 0.3 } },
  subway: { drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' } },
  night_market: { scale: 'mixolydian' },
  autumn: { scale: 'dorian' },
  bamboo: { snap: MAJOR_PENT, echo: { time: 0.45, fb: 0.25, mix: 0.2 } },
  reef: { lp: 2000 },
  canyon: { echo: { time: 0.45, fb: 0.4, mix: 0.35 } },
  crystal_caves: { scale: 'lydian' },
  boneyard: { scale: 'phrygian' },
  storm_peaks: { scale: 'harmonicMinor' },
  alien: { scale: 'phrygianDominant' },
  trash_dimension: { scale: 'dorian' },
  moon: { scale: 'mixolydian', drums: { k: 'x...............' } },
  void_rift: { scale: 'harmonicMinor', lp: 2600 },
};

const TRANSPOSE = [0, 2, -3, 3, -2, 5, -5, 1, 4];
const NUDGE = [0, 0.05, -0.04, 0.07, -0.06, 0.03, -0.07, 0.06, -0.02];
const SOFT: Wave[] = ['triangle', 'sine'];
const BUZZY: Wave[] = ['pulse25', 'square', 'pulse12'];

function clone(s: Song): Song {
  return JSON.parse(JSON.stringify(s)) as Song;
}

function barLen(s: Song) {
  return s.bar ?? 16;
}

function swapWave(v: Voice, pick: number): Voice {
  const pool = SOFT.includes(v.wave) ? SOFT : BUZZY.includes(v.wave) ? BUZZY : null;
  if (!pool) return v;
  const others = pool.filter((w) => w !== v.wave);
  return { ...v, wave: others[pick % others.length] };
}

// Nudge some melody notes up or down the scale; keeps the rhythm and each bar's downbeat.
function mutate(src: string, bar: number, seed: number, amount: number): string {
  const steps = parseNotes(src);
  const r = rng(seed);
  steps.forEach((n, i) => {
    if (!n || i % bar === 0) return;
    if (r() < amount) n.deg += [-2, -1, 1, 2][Math.floor(r() * 4)];
  });
  return formatNotes(steps);
}

function reverseBars(src: string, bar: number): string {
  const steps = src.replace(/\|/g, ' ').trim().split(/\s+/);
  if (steps.length % bar || steps.includes('-')) return src;
  const out: string[] = [];
  for (let i = 0; i < steps.length; i += bar) out.push(...steps.slice(i, i + bar).reverse());
  return out.join(' ');
}

/** The area's own track: its family song plus a deterministic twist. */
export function areaSong(themeId: string): Song {
  const fam = familyOf(themeId);
  const members = MEMBERS[fam];
  const known = members.indexOf(themeId);
  const i = known >= 0 ? known : 1 + (hash(themeId) % 8);
  const s = clone(FAMILIES[fam]);
  s.name = `${s.name}${i ? ` #${i + 1}` : ''}`;
  if (i > 0) {
    const h = hash(themeId);
    const bar = barLen(s);
    s.key += TRANSPOSE[i % TRANSPOSE.length];
    s.bpm = Math.round(s.bpm * (1 + NUDGE[i % NUDGE.length]));
    if (s.lead) s.lead = mutate(s.lead, bar, h, 0.22);
    if (s.counter) s.counter = mutate(s.counter, bar, h ^ 0x9e37, 0.15);
    s.v.lead = swapWave(s.v.lead, h >>> 3);
    if (s.v.arp && (h >>> 5) & 1) s.v.arp = swapWave(s.v.arp, h >>> 7);
    if (s.arp && (h >>> 9) & 1) s.arp = reverseBars(s.arp, bar);
    if ((h >>> 11) & 1 && s.drums.k && s.drums.k.length === bar) {
      // An extra pickup kick before the next bar.
      const k = s.drums.k.split('');
      k[bar - 2] = 'x';
      s.drums.k = k.join('');
    }
  }
  const tw = TWEAKS[themeId];
  if (tw) Object.assign(s, clone(tw as Song), tw.drums ? { drums: { ...s.drums, ...tw.drums } } : {});
  return s;
}

const DARK: ScaleName[] = ['harmonicMinor', 'phrygian', 'phrygianDominant'];

function mergeLane(a: string | undefined, b: string): string {
  if (!a) return b;
  const n = Math.max(a.length, b.length);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = a[i % a.length];
    out += x !== '.' ? x : b[i % b.length];
  }
  return out;
}

/** The boss take on an area's track: faster, minor and busier. */
export function bossSong(themeId: string): Song {
  const s = areaSong(themeId);
  const bar = barLen(s);
  const loop = bar * s.chords.length;
  s.name = `${s.name} (Boss)`;
  s.bpm = Math.min(Math.round(s.bpm * ((s.div ?? 4) === 3 ? 1.15 : 1.22)), 165);
  s.swing = Math.min(s.swing ?? 0, 0.04);
  if (DARK.includes(s.scale)) s.key += 1;
  else s.scale = 'harmonicMinor';
  delete s.snap;
  // End the loop on the dominant (a major V in harmonic minor) for tension.
  if (s.scale === 'harmonicMinor') s.chords[s.chords.length - 1] = 4;
  s.bass = bar === 12 ? '0 . 0 7 0 . 0 7 0 7 4 2' : '0 . 0 7 0 . 0 7 0 . 0 7 0 7 4 2';
  s.v.bass = s.v.bass.wave === 'sawtooth' ? { wave: 'sawtooth', vol: 0.15, gate: 0.6 } : { wave: 'square', vol: 0.15, gate: 0.55 };
  if (!BUZZY.includes(s.v.lead.wave) && s.v.lead.wave !== 'sawtooth') s.v.lead = { ...s.v.lead, wave: 'pulse25', vol: 0.11, decay: undefined };
  s.arp = bar === 12 ? '0 2 4 7 4 2 0 2 4 7 4 2' : '0 2 4 7 0 2 4 7 0 2 4 7 4 2 4 7';
  s.v.arp = { wave: 'pulse12', vol: 0.04, gate: 0.5, decay: 0.05, oct: 12 };
  delete s.pad;
  const d: Drums = s.drums;
  const four = bar === 12 ? 'X..x..X..x..' : 'X...x...X...x...';
  const back = bar === 12 ? '...x.....x..' : '....X.......X...';
  const hats = bar === 12 ? 'x.x.x.x.x.x.' : 'x.x.x.x.x.x.x.x.';
  s.drums = {
    k: mergeLane(d.k, four),
    s: mergeLane(d.s, back),
    h: mergeLane(d.h, hats),
    o: d.o,
    j: d.j,
    t: mergeLane('.'.repeat(loop - 8) + 'T.T.t.tt', d.t ?? '.'),
  };
  s.drumVol = Math.max(s.drumVol ?? 1, 0.9);
  if (s.echo) s.echo = { ...s.echo, mix: Math.min(s.echo.mix, 0.15), fb: Math.min(s.echo.fb, 0.25) };
  s.lp = Math.min((s.lp ?? 5200) + 800, 6000);
  return s;
}

export type Season = 'christmas' | 'halloween' | string | null | undefined;

export function titleSong(season?: Season): Song {
  if (season === 'christmas') return TITLE_CHRISTMAS;
  if (season === 'halloween') return TITLE_HALLOWEEN;
  return TITLE;
}

/** Normalise a track id ('run' / 'boss' are the old names for the street tracks). */
export function normalizeTrack(id: string): string {
  if (id === 'run') return 'area:street';
  if (id === 'boss') return 'boss:street';
  return id;
}

const cache = new Map<string, Song>();

/** 'title', 'title:<season>', 'area:<themeId>' or 'boss:<themeId>' -> a song. Unknown ids get the street track. */
export function resolveTrack(id: string, season?: Season): Song {
  id = normalizeTrack(id);
  if (id === 'title' && season) id = `title:${season}`;
  const hit = cache.get(id);
  if (hit) return hit;
  let s: Song;
  if (id === 'title') s = TITLE;
  else if (id.startsWith('title:')) s = titleSong(id.slice(6));
  else if (id.startsWith('boss:')) s = bossSong(id.slice(5));
  else if (id.startsWith('area:')) s = areaSong(id.slice(5));
  else s = areaSong('street');
  cache.set(id, s);
  return s;
}

export const ALL_THEME_IDS = Object.keys(THEME_FAMILY);
