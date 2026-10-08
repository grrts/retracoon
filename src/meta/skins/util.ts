// Helpers for building skins: fur colour sets, patterns generated from the base pose,
// and outfit pieces cut to the raccoon's silhouette.
import { COON_BASE, COON_W, COON_H, ANCHORS, DEFAULT_FUR, type AnchorKey } from '../../gfx/coon';
import { PAL } from '../../gfx/palette';
import type { Gear } from '../../content/types';
import type { SkinDef } from '../types';

export type Fur = SkinDef['fur'];

// ---------------------------------------------------------------- colours

const toRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const toHex = (r: number[]) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Accepts a palette key or a hex colour.
export const col = (c: string) => (c.startsWith('#') ? c : PAL[c]);

export function mix(a: string, b: string, t: number) {
  const x = toRgb(col(a));
  const y = toRgb(col(b));
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

// Fur from explicit colours (palette keys or hex).
export function fur(c1: string, c2: string, c3: string, c4 = '#f4f4f4', p: string = DEFAULT_FUR.p): Fur {
  return { '1': col(c1), '2': col(c2), '3': col(c3), '4': col(c4), p: col(p) };
}

// Fur derived from a single main colour: darker mask, lighter belly, near-white brows.
export function tone(main: string, dark = 0.55, light = 0.45, p?: string): Fur {
  return {
    '1': col(main),
    '2': mix(main, '#1a1c2c', dark),
    '3': mix(main, '#ffffff', light),
    '4': mix(main, '#ffffff', 0.85),
    p: p ? col(p) : mix(main, '#f5a5b8', 0.6),
  };
}

// ---------------------------------------------------------------- patterns

export const isFur = (c: string | undefined) => c === '1' || c === '2' || c === '3' || c === '4';
export const baseAt = (x: number, y: number) => COON_BASE[y]?.[x] ?? '.';

// Body regions in base coordinates.
export const inHead = (x: number, y: number) => x >= 15 && y <= 11;
export const inTail = (x: number, y: number) => x <= 10 && y >= 4 && y <= 14;
export const inLegs = (_x: number, y: number) => y >= 21;
export const inBody = (x: number, y: number) => !inHead(x, y) && !inTail(x, y) && !inLegs(x, y);

export type PatFn = (x: number, y: number, c: string) => string | false | null | undefined | 0;

// A full-size pattern map: `fn` is asked for every fur pixel of the base pose.
export function pat(fn: PatFn): string[] {
  const out: string[] = [];
  for (let y = 0; y < COON_H; y++) {
    let row = '';
    for (let x = 0; x < COON_W; x++) {
      const c = baseAt(x, y);
      // legs below row 21 are swapped out in the walk frames, so patterns skip them
      const v = isFur(c) && y <= 21 ? fn(x, y, c) : '';
      row += v ? v : '.';
    }
    out.push(row);
  }
  return out;
}

// Layer several pattern functions; later ones win.
export const layer =
  (...fns: PatFn[]): PatFn =>
  (x, y, c) => {
    let r: string | false | null | undefined | 0 = undefined;
    for (const f of fns) {
      const v = f(x, y, c);
      if (v) r = v;
    }
    return r;
  };

// Deterministic pseudo random 0..1 per pixel.
export function rnd(x: number, y: number, seed = 1) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Restrict a pattern function to some channels / a region.
export const only =
  (chans: string, f: PatFn, region?: (x: number, y: number) => boolean): PatFn =>
  (x, y, c) =>
    chans.includes(c) && (!region || region(x, y)) ? f(x, y, c) : undefined;

export const fill = (k: string): PatFn => () => k;
export const stripesV = (k: string, period: number, width = 1, off = 0): PatFn => (x) => ((x + off) % period < width ? k : undefined);
export const stripesH = (k: string, period: number, width = 1, off = 0): PatFn => (_x, y) => ((y + off) % period < width ? k : undefined);
export const diag = (k: string, period: number, width = 1, dir = 1): PatFn => (x, y) =>
  (((x + dir * y) % period) + period) % period < width ? k : undefined;
export const checker = (a: string, b: string | undefined, size = 2): PatFn => (x, y) =>
  (Math.floor(x / size) + Math.floor(y / size)) % 2 ? a : b;
// Sprinkle single pixels.
export const dots = (k: string, density: number, seed = 1): PatFn => (x, y) => (rnd(x, y, seed) < density ? k : undefined);
// Blobs: cells of `size` px are filled when their hash is under `density`.
export const blobs = (k: string, density: number, size = 3, seed = 1, jitter = true): PatFn => (x, y) => {
  const cx = Math.floor(x / size);
  const cy = Math.floor(y / size);
  if (rnd(cx, cy, seed) >= density) return undefined;
  // round off corners for a softer blob
  if (jitter && size > 2) {
    const ix = x % size;
    const iy = y % size;
    const corner = (ix === 0 || ix === size - 1) && (iy === 0 || iy === size - 1);
    if (corner) return undefined;
  }
  return k;
};
// Rosettes/rings: blob outline in k1, centre in k2.
export const rosettes = (ring: string, centre: string | undefined, density: number, seed = 1): PatFn => (x, y) => {
  const cx = Math.floor(x / 4);
  const cy = Math.floor(y / 4);
  if (rnd(cx, cy, seed) >= density) return undefined;
  const ix = (x % 4) - 1.5;
  const iy = (y % 4) - 1.5;
  const d = Math.abs(ix) + Math.abs(iy);
  if (d >= 3) return undefined;
  return d >= 2 ? ring : centre;
};
// Vertical gradient through keys (top to bottom).
export const gradV = (keys: (string | undefined)[], y0 = 0, y1 = COON_H - 1): PatFn => (_x, y) =>
  keys[Math.max(0, Math.min(keys.length - 1, Math.floor(((y - y0) / (y1 - y0 + 1)) * keys.length)))];
// Horizontal gradient through keys (left to right).
export const gradH = (keys: (string | undefined)[], x0 = 0, x1 = 34): PatFn => (x) =>
  keys[Math.max(0, Math.min(keys.length - 1, Math.floor(((x - x0) / (x1 - x0 + 1)) * keys.length)))];
// Diagonal bands.
export const gradD = (keys: (string | undefined)[], scale = 4): PatFn => (x, y) => keys[(((Math.floor((x + y) / scale)) % keys.length) + keys.length) % keys.length];
// Wavy horizontal stripes.
export const waves = (k: string, period: number, amp = 1, len = 6): PatFn => (x, y) =>
  (((y + Math.round(Math.sin((x / len) * Math.PI) * amp)) % period) + period) % period === 0 ? k : undefined;
// Zigzag stripes.
export const zigzag = (k: string, period: number, w = 4): PatFn => (x, y) => {
  const z = Math.abs((x % (w * 2)) - w);
  return (((y + z) % period) + period) % period === 0 ? k : undefined;
};
// Tiger-like broken vertical stripes.
export const tigerStripes = (k: string, period = 4, seed = 3): PatFn => (x, y) => {
  const lean = Math.floor(y / 3);
  const band = (x + lean) % period === 0;
  if (!band) return undefined;
  return rnd(Math.floor((x + lean) / period), Math.floor(y / 4), seed) < 0.78 ? k : undefined;
};
// Map channels to keys: e.g. remap({ '3': 'w', '2': 'k' }).
export const remap = (m: Record<string, string>): PatFn => (_x, _y, c) => m[c];
// Inside an ellipse.
export const ellipse = (k: string, cx: number, cy: number, rx: number, ry: number): PatFn => (x, y) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 ? k : undefined;
export const region = (k: string | PatFn, test: (x: number, y: number) => boolean): PatFn => (x, y, c) =>
  test(x, y) ? (typeof k === 'string' ? k : k(x, y, c)) : undefined;

// ---------------------------------------------------------------- outfit pieces

// Place hand-drawn rows so their top-left lands on base pixel (bx, by).
export function at(anchor: AnchorKey, bx: number, by: number, rows: string[], opts: { behind?: boolean; alt?: string[] } = {}): Gear {
  const a = ANCHORS[anchor];
  const w = Math.max(...rows.map((r) => r.length), ...(opts.alt ?? []).map((r) => r.length));
  const pad = (rr: string[]) => rr.map((r) => r.padEnd(w, '.'));
  const g: Gear = { anchor, rows: pad(rows), x: bx - a.x, y: by - a.y };
  if (opts.behind) g.behind = true;
  if (opts.alt) g.alt = pad(opts.alt);
  return g;
}

// Cut a piece to the silhouette: `fn` gets every base pixel (fur and outline) and returns
// a palette key (or nothing). Outline pixels of the base stay 'k' unless fn says otherwise.
export function cut(anchor: AnchorKey, fn: (x: number, y: number, c: string) => string | undefined | false): Gear {
  const px: [number, number, string][] = [];
  for (let y = 0; y < COON_H; y++)
    for (let x = 0; x < COON_W; x++) {
      const c = baseAt(x, y);
      if (c === '.') continue;
      const v = fn(x, y, c);
      if (v) px.push([x, y, v]);
    }
  const x0 = Math.min(...px.map((p) => p[0]));
  const y0 = Math.min(...px.map((p) => p[1]));
  const x1 = Math.max(...px.map((p) => p[0]));
  const y1 = Math.max(...px.map((p) => p[1]));
  const rows = Array.from({ length: y1 - y0 + 1 }, () => Array(x1 - x0 + 1).fill('.'));
  for (const [x, y, v] of px) rows[y - y0][x - x0] = v;
  return at(anchor, x0, y0, rows.map((r) => r.join('')));
}

export interface SuitOpts {
  main: string; // torso colour
  belly?: string; // colour over the light belly fur ('' leaves the belly uncovered)
  top?: number; // first row (default 13)
  bottom?: number; // last row (default 20)
  left?: number; // first column (default: the whole torso behind the tail)
  deco?: (x: number, y: number, c: string) => string | undefined; // extra detail on top
  collar?: string; // outline colour of the neckline (default k)
}

// A shirt / suit / armour cut to the torso.
export function suit(o: SuitOpts): Gear {
  const top = o.top ?? 13;
  const bottom = o.bottom ?? 20;
  const left = o.left ?? 0;
  const covers = (x: number, y: number) => y >= top && y <= bottom && x >= left && !inHead(x, y) && !inTail(x, y);
  return cut('body', (x, y, c) => {
    if (!covers(x, y)) return undefined;
    if (c === 'k') return 'k';
    const d = o.deco?.(x, y, c);
    if (d) return d;
    if (c === '3' && o.belly === '') return undefined; // open front: the belly fur shows
    // hem lines where the suit meets bare fur above or to the left
    if (isFur(baseAt(x, y - 1)) && !covers(x, y - 1)) return o.collar ?? 'k';
    if (isFur(baseAt(x - 1, y)) && !covers(x - 1, y)) return 'k';
    return c === '3' && o.belly ? o.belly : o.main;
  });
}

export interface HoodOpts {
  main: string;
  bottom?: number; // last row covered (default 5: above the eyes)
  ears?: boolean; // cover the ears too (default true)
  face?: string; // optional colour for the muzzle area below the eyes (ninja mask)
  deco?: (x: number, y: number, c: string) => string | undefined;
  edge?: boolean; // outline the bottom edge (default true)
}

// A hood / cap / helmet cut to the head.
export function hood(o: HoodOpts): Gear {
  const bottom = o.bottom ?? 5;
  return cut('head', (x, y, c) => {
    if (!inHead(x, y)) return undefined;
    if (o.ears === false && y <= 2) return undefined;
    const inCap = y <= bottom;
    const inFace = o.face && y >= 8 && y <= 11;
    if (!inCap && !inFace) return undefined;
    if (c === 'k') return 'k';
    const d = o.deco?.(x, y, c);
    if (d) return d;
    if (inCap) {
      if (o.edge !== false && y === bottom && isFur(baseAt(x, y + 1))) return 'k';
      return o.main;
    }
    if (inFace && o.face) {
      if (y === 8 && isFur(baseAt(x, y - 1))) return 'k';
      return o.face;
    }
    return undefined;
  });
}

// Recolour pixels of a hand-drawn map ('A' -> 'r' etc.) for colour variants of a piece.
export const recolor = (rows: string[], m: Record<string, string>) => rows.map((r) => [...r].map((ch) => m[ch] ?? ch).join(''));
export const flipX = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
