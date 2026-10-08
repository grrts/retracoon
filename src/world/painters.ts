// Painter library for the parallax backgrounds.
//
// Every factory returns a Painter that draws onto a transparent canvas tile which repeats
// horizontally. Anything that might cross the tile edge is drawn wrapped (at x, x - w and
// x + w), and every wavy profile is built from whole sine cycles over the tile width, so all
// layers tile seamlessly. Everything is drawn with fillRect at integer coordinates: no
// anti-aliasing, no smooth arcs.
//
// Conventions: `baseY` is the y just below an object's bottom row (objects stand on it).
// Back layers default to a base of 166 so their feet hide behind the ground strip (y >= 160);
// props next to the actors use about 161.
import type { Painter } from './types';
import { PAL } from '../gfx/palette';

export { PAL };
export type Ctx = CanvasRenderingContext2D;
export type Rnd = () => number;
// Draws one object standing with its bottom row at baseY - 1, left edge at x.
export type Sprite = (ctx: Ctx, x: number, baseY: number, rnd: Rnd) => void;

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- colour

const rgbCache = new Map<string, [number, number, number]>();
function rgb(c: string): [number, number, number] {
  let v = rgbCache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1, 7), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(c, v);
  }
  return v;
}
const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');

// Mixes colour a towards b by t (0..1). Used for atmospheric haze and shading.
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return '#' + hex2(A[0] + (B[0] - A[0]) * t) + hex2(A[1] + (B[1] - A[1]) * t) + hex2(A[2] + (B[2] - A[2]) * t);
}
export const darker = (c: string, t = 0.3) => mix(c, PAL.k, t);
export const lighter = (c: string, t = 0.3) => mix(c, PAL.w, t);

// ---------------------------------------------------------------- random

export function seeded(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const newSeed = (rnd: Rnd) => Math.floor(rnd() * 4294967295);
export const rr = (rnd: Rnd, a: number, b: number) => a + (b - a) * rnd();
export const ri = (rnd: Rnd, a: number, b: number) => Math.floor(a + (b - a + 1) * rnd());
export function pick<T>(rnd: Rnd, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}
// n positions spread evenly over [0, w) with some jitter: nicer than pure random.
export function spread(rnd: Rnd, w: number, n: number, jitter = 0.7): number[] {
  const out: number[] = [];
  const step = w / Math.max(1, n);
  for (let i = 0; i < n; i++) out.push(Math.round((i + 0.5 + (rnd() - 0.5) * jitter) * step));
  return out;
}
// A smooth function of x in roughly [-1, 1] that repeats exactly every w pixels.
export function periodic(rnd: Rnd, w: number, terms: Array<[number, number]>): (x: number) => number {
  const ts = terms.map(([k, a]) => ({ k: Math.max(1, Math.round(k)), a, p: rnd() * TAU }));
  const tot = ts.reduce((s, t) => s + Math.abs(t.a), 0) || 1;
  return (x) => {
    let v = 0;
    for (const t of ts) v += t.a * Math.sin((x / w) * TAU * t.k + t.p);
    return v / tot;
  };
}
const range = (rnd: Rnd, r: [number, number]) => rr(rnd, r[0], r[1]);
const irange = (rnd: Rnd, r: [number, number]) => ri(rnd, r[0], r[1]);

// ---------------------------------------------------------------- pixel helpers

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const W = Math.round(w);
  const H = Math.round(h);
  if (W <= 0 || H <= 0) return;
  ctx.fillStyle = c;
  ctx.fillRect(X, Y, W, H);
}
export const px = (ctx: Ctx, x: number, y: number, c: string) => rect(ctx, x, y, 1, 1, c);

// Draws an object at x and at its wrapped copies. Pass its width `bw` to skip the copies
// when it is fully inside the tile.
export function wrap(w: number, x: number, f: (x: number) => void, bw = -1) {
  if (bw >= 0 && x >= 0 && x + bw <= w) {
    f(x);
    return;
  }
  f(x);
  f(x - w);
  f(x + w);
}
// Same, but hands every copy the same fresh random stream.
export function wrapR(w: number, x: number, rnd: Rnd, f: (x: number, r: Rnd) => void, bw = -1) {
  const s = newSeed(rnd);
  wrap(w, x, (xx) => f(xx, seeded(s)), bw);
}

// Filled pixel circle; rows below maxY are skipped (flat-bottomed shapes).
export function disc(ctx: Ctx, cx: number, cy: number, r: number, c: string, maxY = Infinity, minY = -Infinity) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y > maxY || y < minY) continue;
    const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.5);
    ctx.fillRect(cx - hw, y, hw * 2 + 1, 1);
  }
}
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string, maxY = Infinity, minY = -Infinity) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  ry = Math.max(0, Math.round(ry));
  ctx.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const y = cy + dy;
    if (y > maxY || y < minY) continue;
    const t = ry === 0 ? 0 : dy / (ry + 0.5);
    const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)) + 0.5);
    ctx.fillRect(cx - hw, y, hw * 2 + 1, 1);
  }
}
// Scanline polygon fill (any simple polygon), crisp.
export function poly(ctx: Ctx, pts: Array<[number, number]>, c: string) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  ctx.fillStyle = c;
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]);
      const b = Math.round(xs[i + 1]);
      if (b > a) ctx.fillRect(a, y, b - a, 1);
    }
  }
}
// Bresenham line with square brush of size t.
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(t / 2);
  for (let i = 0; i < 2000; i++) {
    ctx.fillRect(x0 - o, y0 - o, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
// Polyline through points.
export function path(ctx: Ctx, pts: Array<[number, number]>, c: string, t = 1) {
  for (let i = 0; i + 1 < pts.length; i++) line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, t);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Ordered dither mask in absolute coordinates, so dithered areas tile seamlessly.
export function dmask(x: number, y: number, d: number): boolean {
  if (d >= 1) return true;
  if (d <= 0) return false;
  return BAYER[(y & 3) * 4 + (x & 3)] < d * 16;
}
export function ditherRect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, d = 0.5) {
  x = Math.floor(x);
  y = Math.floor(y);
  ctx.fillStyle = c;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (dmask(x + i, y + j, d)) ctx.fillRect(x + i, y + j, 1, 1);
}
// Dithered vertical fade from density d0 at the top to d1 at the bottom.
export function ditherFade(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, d0: number, d1: number) {
  x = Math.floor(x);
  y = Math.floor(y);
  ctx.fillStyle = c;
  for (let j = 0; j < h; j++) {
    const d = d0 + (d1 - d0) * (h <= 1 ? 1 : j / (h - 1));
    for (let i = 0; i < w; i++) if (dmask(x + i, y + j, d)) ctx.fillRect(x + i, y + j, 1, 1);
  }
}
export function ditherDisc(ctx: Ctx, cx: number, cy: number, r: number, c: string, d = 0.5) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r + r * 0.5 && dmask(cx + dx, cy + dy, d)) ctx.fillRect(cx + dx, cy + dy, 1, 1);
}
// Soft glow: rings of decreasing dither density.
export function glow(ctx: Ctx, cx: number, cy: number, r: number, c: string, strength = 0.6) {
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const rad = Math.round(r * (1 - i / steps));
    ditherDisc(ctx, cx, cy, rad, c, strength * ((i + 1) / steps) * 0.5);
  }
}
// Pixel ring / arc. `keep` filters pixels by offset from the centre.
export function ring(ctx: Ctx, cx: number, cy: number, r0: number, r1: number, c: string, keep?: (dx: number, dy: number) => boolean) {
  ctx.fillStyle = c;
  const R = Math.ceil(r1);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r0 && d <= r1 + 0.3 && (!keep || keep(dx, dy))) ctx.fillRect(Math.round(cx) + dx, Math.round(cy) + dy, 1, 1);
    }
}
// Isosceles triangle pointing up, apex at (cx, baseY - h), drawn row by row.
export function tri(ctx: Ctx, cx: number, baseY: number, halfW: number, h: number, c: string, jag = 0) {
  for (let i = 0; i < h; i++) {
    let hw = Math.round((halfW * (i + 1)) / h);
    if (jag && i % 3 === 2) hw -= jag;
    rect(ctx, cx - hw, baseY - h + i, hw * 2 + 1, 1, c);
  }
}
// Outlined box with light top/left and dark bottom/right.
export function bevel(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, outline?: string, hi?: string, lo?: string) {
  if (outline) rect(ctx, x - 1, y - 1, w + 2, h + 2, outline);
  rect(ctx, x, y, w, h, c);
  rect(ctx, x, y, w, 1, hi ?? lighter(c, 0.3));
  rect(ctx, x, y, 1, h, hi ?? lighter(c, 0.3));
  rect(ctx, x, y + h - 1, w, 1, lo ?? darker(c, 0.3));
  rect(ctx, x + w - 1, y + 1, 1, h - 1, lo ?? darker(c, 0.3));
}

// Pixel maps: strings of palette keys, '.' or ' ' transparent.
export interface MapOpts {
  pal?: Record<string, string>;
  swap?: Record<string, string>; // key -> hex
  tint?: string;
  t?: number;
  flip?: boolean;
}
export function drawMap(ctx: Ctx, map: readonly string[], x: number, y: number, o: MapOpts = {}) {
  const pal = o.pal ?? PAL;
  const cache = new Map<string, string>();
  const col = (ch: string) => {
    let c = cache.get(ch);
    if (c === undefined) {
      c = o.swap?.[ch] ?? pal[ch] ?? '#ff00ff';
      if (o.tint) c = mix(c, o.tint, o.t ?? 0.5);
      cache.set(ch, c);
    }
    return c;
  };
  const W = map.reduce((m, r) => Math.max(m, r.length), 0);
  x = Math.floor(x);
  y = Math.floor(y);
  for (let j = 0; j < map.length; j++) {
    const row = map[j];
    let i = 0;
    while (i < W) {
      const ch = o.flip ? row[W - 1 - i] ?? '.' : row[i] ?? '.';
      if (ch === '.' || ch === ' ') {
        i++;
        continue;
      }
      let n = 1;
      while (i + n < W) {
        const c2 = o.flip ? row[W - 1 - i - n] ?? '.' : row[i + n] ?? '.';
        if (c2 !== ch) break;
        n++;
      }
      ctx.fillStyle = col(ch);
      ctx.fillRect(x + i, y + j, n, 1);
      i += n;
    }
  }
}

// 3x5 pixel font for signs and toy blocks.
const FONT: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '1': '010110010010111',
  '2': '110001010100111',
  '3': '110001010001110',
  '$': '011110010011110',
  '!': '010010010000010',
  '*': '000101010101000',
  '+': '000010111010000',
};
export function text(ctx: Ctx, s: string, x: number, y: number, c: string) {
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') rect(ctx, x + (i % 3), y + Math.floor(i / 3), 1, 1, c);
    x += 4;
  }
}
// A random squiggly glyph (fake lettering on signs).
function glyph(ctx: Ctx, x: number, y: number, c: string, r: Rnd, gw = 3, gh = 5) {
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) if (r() < 0.55 || (j === 0 && r() < 0.5)) rect(ctx, x + i, y + j, 1, 1, c);
}

// ---------------------------------------------------------------- combinators

// Several painters into one layer, in order.
export function stack(...ps: Painter[]): Painter {
  return (ctx, w, h, rnd) => {
    for (const p of ps) p(ctx, w, h, rnd);
  };
}
// Runs a painter with a fixed offset (e.g. to raise a row of trees).
export function shift(dx: number, dy: number, p: Painter): Painter {
  return (ctx, w, h, rnd) => {
    ctx.save();
    ctx.translate(dx, dy);
    p(ctx, w, h, rnd);
    ctx.restore();
  };
}
// Recolours everything painted so far on this layer towards c (atmospheric haze).
export function haze(c: string, amount: number, p: Painter): Painter {
  return (ctx, w, h, rnd) => {
    p(ctx, w, h, rnd);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = amount;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
}

// ================================================================ SKY

export interface SunOpts {
  x: number;
  y: number;
  r: number;
  color: string;
  core?: string; // lighter inner disc
  rim?: string; // ring just outside
  glow?: string; // dithered halo
  glowR?: number;
  stripes?: boolean; // synthwave cuts across the lower half
}
export function sun(o: SunOpts): Painter {
  return (ctx) => {
    if (o.glow) glow(ctx, o.x, o.y, o.glowR ?? o.r + 12, o.glow, 0.9);
    if (o.rim) disc(ctx, o.x, o.y, o.r + 1, o.rim);
    disc(ctx, o.x, o.y, o.r, o.color);
    if (o.core) {
      const k = Math.round(o.r * 0.3);
      disc(ctx, o.x - Math.round(k * 0.5), o.y - Math.round(k * 0.5), Math.max(1, o.r - k - 1), o.core);
    }
    if (o.stripes) {
      let gap = 1;
      for (let y = o.y + 1; y < o.y + o.r + 2; y += 3 + Math.floor(gap / 2)) {
        ctx.clearRect(o.x - o.r - 2, y, o.r * 2 + 5, gap);
        gap++;
      }
    }
  };
}

export interface MoonOpts {
  x: number;
  y: number;
  r: number;
  color: string;
  shade?: string;
  craters?: string;
  phase?: number; // crescent: offset of the cut-out disc (negative cuts from the left)
  glow?: string;
}
export function moon(o: MoonOpts): Painter {
  return (ctx, _w, _h, rnd) => {
    if (o.glow) glow(ctx, o.x, o.y, o.r + 9, o.glow, 0.7);
    if (o.shade) disc(ctx, o.x, o.y, o.r, o.shade);
    disc(ctx, o.x - (o.shade ? 1 : 0), o.y - (o.shade ? 1 : 0), o.r - (o.shade ? 1 : 0), o.color);
    if (o.craters) {
      for (let i = 0; i < Math.max(2, Math.round(o.r / 3)); i++) {
        const a = rnd() * TAU;
        const d = rnd() * o.r * 0.55;
        const cr = Math.max(1, Math.round(rr(rnd, 1, o.r / 4)));
        disc(ctx, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, cr, o.craters);
      }
    }
    if (o.phase) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, o.x + o.phase, o.y - Math.round(Math.abs(o.phase) * 0.3), o.r, '#000000');
      ctx.restore();
    }
  };
}

export interface StarOpts {
  count: number;
  colors: string[];
  y?: [number, number];
  big?: number; // fraction drawn as little crosses
  dim?: string; // colour for the cross arms
}
export function stars(o: StarOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const [y0, y1] = o.y ?? [0, 120];
    for (let i = 0; i < o.count; i++) {
      const x = Math.floor(rnd() * w);
      // denser near the top
      const y = Math.floor(y0 + (y1 - y0) * Math.pow(rnd(), 1.4));
      const c = pick(rnd, o.colors);
      if (rnd() < (o.big ?? 0.08)) {
        const arm = o.dim ?? mix(c, PAL.k, 0.5);
        wrap(w, x, (xx) => {
          rect(ctx, xx - 1, y, 3, 1, arm);
          rect(ctx, xx, y - 1, 1, 3, arm);
          px(ctx, xx, y, c);
        });
      } else px(ctx, x, y, c);
    }
  };
}

export interface NebulaOpts {
  colors: string[]; // outer to inner
  count: number;
  y: [number, number];
  r: [number, number];
}
export function nebula(o: NebulaOpts): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const cy = range(rnd, o.y);
      const R = range(rnd, o.r);
      const blobs = Array.from({ length: 5 }, () => ({ dx: rr(rnd, -R, R), dy: rr(rnd, -R * 0.4, R * 0.4), r: rr(rnd, R * 0.4, R * 0.8) }));
      wrap(w, x0, (x) => {
        o.colors.forEach((c, i) => {
          const k = 1 - i / o.colors.length;
          for (const b of blobs) ditherDisc(ctx, x + b.dx, cy + b.dy, Math.round(b.r * k), c, 0.2 + i * 0.18);
        });
      });
    }
  };
}

export interface AuroraOpts {
  colors: [string, string, string?]; // bright edge, body, faint tail
  y: number;
  h: number;
  amp?: number;
}
export function aurora(o: AuroraOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const f = periodic(rnd, w, [[1, 1], [2, 0.6], [3, 0.4]]);
    const g = periodic(rnd, w, [[4, 1], [7, 0.5]]);
    const streak = periodic(rnd, w, [[23, 1], [37, 0.7], [61, 0.5]]);
    for (let x = 0; x < w; x++) {
      const s = streak(x);
      if (s < -0.45) continue;
      const top = Math.round(o.y + f(x) * (o.amp ?? 14));
      const hh = Math.round(o.h * (0.55 + 0.45 * g(x)));
      rect(ctx, x, top, 1, 2, o.colors[0]);
      for (let j = 2; j < hh; j++) {
        const t = j / hh;
        const d = (1 - t) * (s > 0.2 ? 0.8 : 0.55);
        if (dmask(x, top + j, d)) px(ctx, x, top + j, t < 0.5 ? o.colors[1] : o.colors[2] ?? o.colors[1]);
      }
    }
  };
}

export interface CloudOpts {
  count: number;
  y: [number, number]; // baseline range
  size: [number, number]; // width range
  colors: [string, string, string?]; // body, shadow, highlight
  style?: 'puffy' | 'streak' | 'flat';
}
export function clouds(o: CloudOpts): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const W = Math.round(range(rnd, o.size));
      const by = Math.round(range(rnd, o.y));
      if (o.style === 'streak') {
        const n = ri(rnd, 2, 4);
        const bars: Array<[number, number, number]> = [];
        for (let i = 0; i < n; i++) bars.push([Math.round(rr(rnd, 0, W * 0.35)), i * 3, Math.round(W * rr(rnd, 0.4, 1))]);
        wrap(w, x0, (x) => {
          for (const [dx, dy, len] of bars) {
            rect(ctx, x + dx + 2, by + dy + 2, len - 3, 1, o.colors[1]);
            rect(ctx, x + dx + 1, by + dy - 1, len - 2, 1, o.colors[2] ?? o.colors[0]);
            rect(ctx, x + dx, by + dy, len, 2, o.colors[0]);
          }
        });
        continue;
      }
      const n = Math.max(3, Math.round(W / 11));
      const flat = o.style === 'flat';
      const lobes: Array<{ dx: number; dy: number; r: number }> = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const mid = 1 - Math.abs(t - 0.5) * 1.5;
        const r = Math.max(3, Math.round((W / n) * rr(rnd, 0.65, 1.0) * (flat ? 0.7 + mid * 0.4 : 0.55 + mid * 1.1)));
        lobes.push({ dx: Math.round(t * W), dy: Math.round(rr(rnd, -1, 2)), r });
      }
      wrap(w, x0, (x) => {
        for (const l of lobes) disc(ctx, x + l.dx, by - l.r + 3 + l.dy + 2, l.r, o.colors[1], by + 1);
        if (o.colors[2]) for (const l of lobes) disc(ctx, x + l.dx - 1, by - l.r + 3 + l.dy - 1, l.r, o.colors[2], by - 2);
        for (const l of lobes) disc(ctx, x + l.dx, by - l.r + 3 + l.dy, l.r, o.colors[0], by - 1);
      });
    }
  };
}

export interface PlanetDef {
  x: number;
  y: number;
  r: number;
  colors: [string, string, string?]; // body, shadow, highlight
  ring?: string;
  bands?: string;
}
export function planets(list: PlanetDef[]): Painter {
  return (ctx) => {
    for (const p of list) {
      const back = (dx: number, dy: number) => dy < 0;
      const front = (dx: number, dy: number) => dy >= 0;
      const ringAt = (keep: (dx: number, dy: number) => boolean) => {
        if (!p.ring) return;
        const R = p.r * 1.8;
        ctx.fillStyle = p.ring;
        for (let dx = -Math.ceil(R); dx <= R; dx++)
          for (let dy = -Math.ceil(R * 0.3); dy <= R * 0.3; dy++) {
            const e = (dx * dx) / (R * R) + (dy * dy) / (R * R * 0.09);
            const inner = (dx * dx) / (R * R * 0.62) + (dy * dy) / (R * R * 0.09 * 0.62);
            if (e <= 1 && inner >= 1 && keep(dx, dy) && !(dy < 0 && dx * dx + dy * dy < p.r * p.r))
              ctx.fillRect(p.x + dx, p.y + dy, 1, 1);
          }
      };
      ringAt(back);
      disc(ctx, p.x, p.y, p.r, p.colors[1]);
      disc(ctx, p.x - Math.round(p.r * 0.2), p.y - Math.round(p.r * 0.2), Math.round(p.r * 0.85), p.colors[0]);
      if (p.bands) {
        for (let dy = -p.r; dy <= p.r; dy += 4) {
          const hw = Math.floor(Math.sqrt(Math.max(0, p.r * p.r - dy * dy)));
          ditherRect(ctx, p.x - hw, p.y + dy, hw * 2 + 1, 1, p.bands, 0.7);
        }
      }
      // terminator
      ctx.fillStyle = p.colors[1];
      for (let dy = -p.r; dy <= p.r; dy++)
        for (let dx = -p.r; dx <= p.r; dx++) {
          const d = dx * dx + dy * dy;
          if (d <= p.r * p.r && (dx + dy * 0.6) / p.r > 0.35 && dmask(p.x + dx, p.y + dy, Math.min(1, ((dx + dy * 0.6) / p.r - 0.35) * 2.2)))
            ctx.fillRect(p.x + dx, p.y + dy, 1, 1);
        }
      if (p.colors[2]) disc(ctx, p.x - Math.round(p.r * 0.45), p.y - Math.round(p.r * 0.45), Math.max(1, Math.round(p.r * 0.2)), p.colors[2]);
      ringAt(front);
    }
  };
}

export interface RayOpts {
  color: string;
  count: number;
  top?: number;
  len?: number;
  width?: [number, number];
  slant?: number;
  density?: number;
}
// Diagonal dithered light shafts (canopies, water, ruins).
export function lightRays(o: RayOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const top = o.top ?? 0;
    const len = o.len ?? 150;
    const sl = o.slant ?? 0.45;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const bw = Math.round(range(rnd, o.width ?? [6, 16]));
      wrap(w, x0, (x) => {
        ctx.fillStyle = o.color;
        for (let j = 0; j < len; j++) {
          const y = top + j;
          const d = (o.density ?? 0.4) * (1 - j / len);
          const xs = Math.round(x + j * sl);
          for (let i = 0; i < bw; i++) if (dmask(xs + i, y, d)) ctx.fillRect(xs + i, y, 1, 1);
        }
      });
    }
  };
}

// A dithered band of fog or glow, solid below, fading upwards.
export function mist(o: { color: string; y: number; h: number; solid?: number; d?: number }): Painter {
  return (ctx, w) => {
    ditherFade(ctx, 0, o.y, w, o.h, o.color, 0, o.d ?? 0.75);
    if (o.solid) rect(ctx, 0, o.y + o.h, w, o.solid, o.color);
  };
}

// ================================================================ TERRAIN

export interface MountainOpts {
  color: string; // shadow side
  light?: string; // lit face
  snow?: string;
  snowShade?: string;
  snowDepth?: number;
  peaks: number;
  top: [number, number]; // peak y range
  slope?: [number, number];
  baseY?: number;
  jag?: number;
  rim?: string; // 1px ridge highlight on the lit side
}
export function mountains(o: MountainOpts): Painter {
  return (ctx, w, h, rnd) => {
    const base = o.baseY ?? 170;
    const sl = o.slope ?? [0.55, 1.05];
    const ps = spread(rnd, w, o.peaks, 0.9).map((x) => ({ x, y: range(rnd, o.top), s: range(rnd, sl), sd: rr(rnd, 0.6, 1.4) }));
    const jag = periodic(rnd, w, [[29, 1], [47, 0.7], [83, 0.5]]);
    const sj = periodic(rnd, w, [[61, 1], [97, 0.8], [131, 0.5]]);
    for (let x = 0; x < w; x++) {
      let top = 1e9;
      let dx = 0;
      let pk = ps[0];
      for (const p of ps) {
        let d = x - p.x;
        d -= Math.round(d / w) * w;
        const y = p.y + Math.abs(d) * p.s;
        if (y < top) {
          top = y;
          dx = d;
          pk = p;
        }
      }
      top = Math.round(top + jag(x) * (o.jag ?? 1.6));
      if (top >= h) continue;
      const lit = dx < 0;
      rect(ctx, x, top, 1, h - top, o.color);
      if (lit && o.light) {
        const depth = Math.round(-dx * pk.s * 1.7 + 5 + sj(x) * 3);
        rect(ctx, x, top, 1, Math.min(depth, base - top), o.light);
      }
      if (o.snow) {
        const sb = Math.round(pk.y + (o.snowDepth ?? 10) * pk.sd + sj(x) * 3 + Math.abs(dx) * 0.2);
        if (top < sb) rect(ctx, x, top, 1, sb - top, lit ? o.snow : o.snowShade ?? mix(o.snow, o.color, 0.4));
      }
      if (o.rim && lit) px(ctx, x, top, o.rim);
    }
  };
}

export interface HillOpts {
  color: string;
  light?: string; // rim and dithered top band
  y: number; // mean top
  amp: number;
  cycles?: Array<[number, number]>;
  rim?: number;
  band?: number; // dithered band height under the rim
  stripes?: string; // contour stripes (fields)
  trees?: { color: string; light?: string; r: [number, number]; gap: number }; // treeline bumps
  specks?: string;
}
export function hills(o: HillOpts): Painter {
  return (ctx, w, h, rnd) => {
    const f = periodic(rnd, w, o.cycles ?? [[1, 0.5], [2, 0.35], [5, 0.15]]);
    const tops: number[] = [];
    for (let x = 0; x < w; x++) tops.push(Math.round(o.y + f(x) * o.amp));
    if (o.trees) {
      const t = o.trees;
      let x = 0;
      while (x < w) {
        const r = Math.round(range(rnd, t.r));
        const xx = x;
        const cy = tops[((xx % w) + w) % w] - r + 3 + ri(rnd, -1, 1);
        wrap(w, xx, (q) => {
          disc(ctx, q, cy, r, t.color);
          if (t.light) disc(ctx, q - 1, cy - 1, Math.max(1, r - 1), t.light, cy - r + 1);
        });
        x += Math.max(2, t.gap + ri(rnd, -1, 2));
      }
    }
    for (let x = 0; x < w; x++) {
      const t = tops[x];
      rect(ctx, x, t, 1, h - t, o.color);
      if (o.stripes) for (let y = t + 7; y < h; y += 6) rect(ctx, x, y + (Math.floor(y / 6) % 2), 1, 2, o.stripes);
      if (o.light) {
        const lit = tops[(x + 1) % w] <= t;
        rect(ctx, x, t, 1, lit ? o.rim ?? 2 : 1, o.light);
        const b = o.band ?? 0;
        for (let j = 0; j < b; j++) if (dmask(x, t + 2 + j, 0.6 * (1 - j / b))) px(ctx, x, t + 2 + j, o.light);
      }
    }
    if (o.specks)
      for (let i = 0; i < w / 6; i++) {
        const x = Math.floor(rnd() * w);
        const y = tops[x] + 4 + Math.floor(rnd() * 30);
        rect(ctx, x, y, 2, 1, o.specks);
      }
  };
}

export interface SkylineOpts {
  color: string;
  edge?: string; // lit left edge
  roof?: string; // roof line
  win?: [string, string?]; // lit, unlit (unlit omitted = no unlit windows)
  lit?: number;
  h: [number, number];
  bw: [number, number];
  baseY?: number;
  winSize?: [number, number, number, number]; // w, h, step x, step y
  gap?: [number, number];
  antennas?: number;
  tanks?: number;
  setbacks?: number;
  brick?: string; // brick texture colour
  fireEscapes?: string;
  beacon?: string;
}
export function skyline(o: SkylineOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 170;
    const [ww, wh, sx, sy] = o.winSize ?? [1, 2, 3, 4];
    let x = 0;
    while (x < w) {
      const bw = irange(rnd, o.bw);
      const bh = irange(rnd, o.h);
      const top = base - bh;
      const kind = rnd();
      wrapR(
        w,
        x,
        rnd,
        (xx, r) => {
          let roofY = top;
          if (r() < (o.setbacks ?? 0.25) && bw > 12) {
            const st = ri(r, 2, Math.max(2, Math.floor(bw / 4)));
            const sh = ri(r, 4, 14);
            rect(ctx, xx + st, top - sh, bw - st * 2, sh + 1, o.color);
            if (o.roof) rect(ctx, xx + st, top - sh, bw - st * 2, 1, o.roof);
            if (o.edge) rect(ctx, xx + st, top - sh, 1, sh, o.edge);
            roofY = top - sh;
            if (r() < 0.4) {
              rect(ctx, xx + Math.floor(bw / 2), roofY - 8, 1, 8, o.color);
              if (o.beacon) px(ctx, xx + Math.floor(bw / 2), roofY - 9, o.beacon);
            }
          }
          rect(ctx, xx, top, bw, base - top + 4, o.color);
          if (o.brick) {
            for (let y = top + 3; y < base; y += 3) for (let i = (y % 6 === 0 ? 0 : 3); i < bw; i += 6) px(ctx, xx + i, y, o.brick);
            for (let y = top + 2; y < base; y += 3) ditherRect(ctx, xx + 1, y, bw - 2, 1, o.brick, 0.25);
          }
          if (o.edge) rect(ctx, xx, top, 1, base - top, o.edge);
          if (o.roof) rect(ctx, xx, top, bw, 1, o.roof);
          if (o.win) {
            const lit = o.lit ?? 0.3;
            const dark = r() < 0.15;
            for (let y = top + 3; y + wh < base - 2; y += sy) {
              const rowLit = r() < 0.8;
              for (let i = 2; i + ww <= bw - 2; i += sx) {
                const on = !dark && rowLit && r() < lit;
                if (on) rect(ctx, xx + i, y, ww, wh, o.win[0]);
                else if (o.win[1]) rect(ctx, xx + i, y, ww, wh, o.win[1]);
              }
            }
          }
          if (o.fireEscapes && bw > 24 && r() < 0.6) {
            const fx = xx + ri(r, 3, bw - 22);
            for (let y = top + 10; y < base - 20; y += 14) {
              rect(ctx, fx, y, 18, 1, o.fireEscapes);
              for (let i = 0; i <= 18; i += 3) rect(ctx, fx + i, y - 4, 1, 4, o.fireEscapes);
              rect(ctx, fx, y - 4, 18, 1, o.fireEscapes);
              line(ctx, fx + 2, y + 1, fx + 14, y + 13, o.fireEscapes);
            }
          }
          if (kind > 1 - (o.antennas ?? 0.2)) {
            const ax = xx + ri(r, 2, bw - 3);
            rect(ctx, ax, roofY - ri(r, 6, 16), 1, 16, o.color);
            if (o.beacon) px(ctx, ax, roofY - 16, o.beacon);
          } else if (kind > 1 - (o.antennas ?? 0.2) - (o.tanks ?? 0.15) && bw > 10) {
            const tx = xx + ri(r, 1, bw - 9);
            rect(ctx, tx, roofY - 9, 7, 6, o.color);
            rect(ctx, tx + 1, roofY - 10, 5, 1, o.color);
            rect(ctx, tx + 1, roofY - 3, 1, 3, o.color);
            rect(ctx, tx + 5, roofY - 3, 1, 3, o.color);
            if (o.edge) rect(ctx, tx, roofY - 9, 1, 6, o.edge);
          }
        },
        bw,
      );
      x += bw + irange(rnd, o.gap ?? [-3, 4]);
    }
  };
}

export interface ShopOpts {
  walls: string[];
  trim: string;
  glass: [string, string]; // lit window, dark window
  awnings: Array<[string, string]>;
  signs: string[];
  h: [number, number];
  bw: [number, number];
  baseY?: number;
  lit?: number;
  outline?: string;
  haze?: [string, number];
}
// Row of old shop buildings: brick fronts, cornices, upper windows, striped awnings, signs.
export function shopfronts(o: ShopOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    const ol = o.outline ?? PAL.k;
    let x = 0;
    while (x < w) {
      const bw = irange(rnd, o.bw);
      const bh = irange(rnd, o.h);
      wrapR(
        w,
        x,
        rnd,
        (xx, r) => {
          const top = base - bh;
          const wall = pick(r, o.walls);
          const hiW = mix(wall, PAL.w, 0.12);
          const loW = mix(wall, ol, 0.28);
          const mortar = mix(wall, ol, 0.16);
          rect(ctx, xx, top, bw, bh + 2, wall);
          // brick
          for (let y = top + 4; y < base - 36; y += 4) {
            ditherRect(ctx, xx, y, bw, 1, mortar, 0.5);
            for (let i = ((y / 4) % 2) * 4 + 1; i < bw; i += 8) px(ctx, xx + i, y + 1, mortar);
          }
          rect(ctx, xx, top, 1, bh, hiW);
          rect(ctx, xx + bw - 2, top, 2, bh, loW);
          // cornice
          rect(ctx, xx - 1, top - 1, bw + 2, 1, ol);
          rect(ctx, xx - 1, top, bw + 2, 3, o.trim);
          rect(ctx, xx - 1, top + 3, bw + 2, 1, mix(o.trim, ol, 0.45));
          for (let i = 1; i < bw; i += 4) px(ctx, xx + i, top + 4, mix(o.trim, ol, 0.3));
          // upper floors
          const winW = 7;
          const cols = Math.max(1, Math.floor((bw - 6) / 13));
          const pad = Math.floor((bw - cols * winW - (cols - 1) * 6) / 2);
          for (let fy = top + 9; fy + 14 < base - 38; fy += 18) {
            for (let c = 0; c < cols; c++) {
              const wx = xx + pad + c * (winW + 6);
              const lit = r() < (o.lit ?? 0.35);
              rect(ctx, wx - 1, fy - 1, winW + 2, 12, mix(wall, ol, 0.4));
              rect(ctx, wx, fy, winW, 10, lit ? o.glass[0] : o.glass[1]);
              rect(ctx, wx + 3, fy, 1, 10, mix(wall, ol, 0.4));
              rect(ctx, wx, fy + 4, winW, 1, mix(wall, ol, 0.4));
              if (lit && r() < 0.5) rect(ctx, wx, fy, 2, 10, mix(o.glass[0], PAL.r, 0.35)); // curtain
              if (!lit) px(ctx, wx + 1, fy + 1, mix(o.glass[1], PAL.w, 0.3));
              rect(ctx, wx - 1, fy + 10, winW + 2, 1, o.trim); // sill
              if (r() < 0.2) {
                rect(ctx, wx + 1, fy + 8, 5, 2, PAL.U);
                rect(ctx, wx + 1, fy + 6, 5, 2, PAL.G);
                px(ctx, wx + 2, fy + 5, PAL.P);
              }
            }
          }
          // shop sign band
          const sy = base - 37;
          const sign = pick(r, o.signs);
          rect(ctx, xx + 2, sy, bw - 4, 7, ol);
          rect(ctx, xx + 3, sy + 1, bw - 6, 5, sign);
          const tc = mix(sign, PAL.w, 0.7);
          for (let i = 6; i + 3 < bw - 8; i += 4) if (r() < 0.85) glyph(ctx, xx + i, sy + 2, tc, r, 3, 3);
          // awning
          const [a1, a2] = pick(r, o.awnings);
          const ay = base - 29;
          for (let i = 0; i < bw; i++) {
            const c = Math.floor(i / 4) % 2 ? a2 : a1;
            rect(ctx, xx + i, ay, 1, 5, c);
            if (i % 4 < 3) px(ctx, xx + i, ay + 5, c);
          }
          rect(ctx, xx, ay - 1, bw, 1, ol);
          rect(ctx, xx, ay, bw, 1, mix(a1, PAL.w, 0.3));
          rect(ctx, xx, ay + 6, bw, 1, mix(wall, ol, 0.55));
          // storefront: window + door
          const dw = 9;
          const doorLeft = r() < 0.5;
          const dx = doorLeft ? xx + 4 : xx + bw - dw - 4;
          const wx0 = doorLeft ? xx + dw + 7 : xx + 3;
          const wW = bw - dw - 10;
          const gy = base - 22;
          rect(ctx, wx0 - 1, gy - 1, wW + 2, 19, ol);
          const shopLit = r() < 0.75;
          const glassC = shopLit ? o.glass[0] : o.glass[1];
          rect(ctx, wx0, gy, wW, 17, glassC);
          rect(ctx, wx0, gy + 12, wW, 5, mix(glassC, ol, 0.45));
          // goods on the shelf
          for (let i = 2; i < wW - 2; i += ri(r, 3, 5)) {
            const gh = ri(r, 2, 6);
            rect(ctx, wx0 + i, gy + 12 - gh, 2, gh, mix(pick(r, [PAL.r, PAL.G, PAL.b, PAL.O, PAL.v, PAL.n]), glassC, 0.35));
          }
          for (let i = 3; i < wW; i += 11) line(ctx, wx0 + i, gy + 9, wx0 + i + 5, gy + 2, mix(glassC, PAL.w, 0.45));
          for (let i = Math.floor(wW / 2); i < wW; i += 100) rect(ctx, wx0 + i, gy, 1, 17, ol);
          rect(ctx, dx - 1, gy - 3, dw + 2, 25, ol);
          rect(ctx, dx, gy - 2, dw, 24, mix(pick(r, [PAL.D, PAL.r, PAL.N, PAL.B]), ol, 0.2));
          rect(ctx, dx + 2, gy, dw - 4, 8, shopLit ? o.glass[0] : o.glass[1]);
          px(ctx, dx + dw - 3, gy + 12, PAL.y);
          rect(ctx, xx, base - 2, bw, 2, mix(wall, ol, 0.5));
        },
        bw,
      );
      x += bw;
    }
  };
}

export interface MesaOpts {
  colors: [string, string, string]; // body, lit, shadow
  stripe?: string;
  count: number;
  top: [number, number];
  w: [number, number];
  baseY?: number;
  cliff?: [number, number];
}
// Flat-topped buttes with vertical cliffs, talus slopes and strata stripes.
export function mesas(o: MesaOpts): Painter {
  return (ctx, w, h, rnd) => {
    const base = o.baseY ?? 172;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const W = irange(rnd, o.w);
      const y = irange(rnd, o.top);
      const ch = irange(rnd, o.cliff ?? [14, 30]);
      const k = rr(rnd, 0.7, 1.3);
      const jag = periodic(rnd, w, [[90, 1], [140, 1]]);
      const span = Math.ceil((base - y - ch) / k) + 2;
      wrap(w, x0 - Math.floor(W / 2), (a) => {
        for (let xx = a - span; xx <= a + W + span; xx++) {
          let t: number;
          let side = 0;
          if (xx < a) {
            t = y + ch + (a - xx) * k;
            side = -1;
          } else if (xx > a + W) {
            t = y + ch + (xx - a - W) * k;
            side = 1;
          } else t = y;
          t = Math.round(t + (side ? jag(xx) * 1.2 : 0));
          if (t >= h) continue;
          rect(ctx, xx, t, 1, h - t, o.colors[0]);
          if (side === 0 && xx < a + W * 0.28) rect(ctx, xx, t, 1, ch + 6, o.colors[1]);
          if (side === 1) rect(ctx, xx, t, 1, h - t, o.colors[2]);
          if (side === 0 && xx > a + W * 0.8) ditherRect(ctx, xx, t + 1, 1, ch + 6, o.colors[2], 0.5);
          if (side === -1) ditherRect(ctx, xx, t, 1, 5, o.colors[1], 0.5);
          if (o.stripe) for (let sy = y + 5; sy < base; sy += 7) if (sy > t) px(ctx, xx, sy + (xx % 9 < 2 ? 1 : 0), o.stripe);
          if (side === 0) px(ctx, xx, t, mix(o.colors[1], PAL.w, 0.2));
        }
      });
    }
  };
}

export interface DuneOpts {
  colors: [string, string, string]; // body, lit, shadow
  ripple?: string;
  y: number;
  amp: number;
  cycles?: Array<[number, number]>;
}
export function dunes(o: DuneOpts): Painter {
  return (ctx, w, h, rnd) => {
    const f = periodic(rnd, w, o.cycles ?? [[2, 1], [3, 0.6], [7, 0.2]]);
    const tops: number[] = [];
    for (let x = 0; x < w; x++) tops.push(Math.round(o.y + f(x) * o.amp));
    for (let x = 0; x < w; x++) {
      const t = tops[x];
      const slope = tops[(x + 1) % w] - tops[(x - 1 + w) % w];
      rect(ctx, x, t, 1, h - t, o.colors[0]);
      if (slope < 0) {
        rect(ctx, x, t, 1, 2, o.colors[1]);
        ditherRect(ctx, x, t + 2, 1, 6, o.colors[1], 0.5);
      } else if (slope > 0) {
        rect(ctx, x, t + 1, 1, 10, o.colors[2]);
        ditherRect(ctx, x, t + 11, 1, 6, o.colors[2], 0.5);
        px(ctx, x, t, o.colors[1]);
      } else px(ctx, x, t, o.colors[1]);
      if (o.ripple) for (let y = t + 9; y < h; y += 5) if ((x + y * 3) % 11 < 6) px(ctx, x, y, o.ripple);
    }
  };
}

export interface SeaOpts {
  y: number;
  colors: [string, string, string, string?]; // horizon, body, deep, foam
  sparkle?: string;
  sparkleX?: number;
}
// Flat water from the horizon down, with perspective wave dashes.
export function sea(o: SeaOpts): Painter {
  return (ctx, w, h, rnd) => {
    rect(ctx, 0, o.y, w, h - o.y, o.colors[1]);
    rect(ctx, 0, o.y, w, 2, o.colors[0]);
    ditherFade(ctx, 0, o.y + 2, w, 8, o.colors[0], 0.6, 0);
    ditherFade(ctx, 0, o.y + 20, w, 30, o.colors[2], 0, 0.6);
    rect(ctx, 0, o.y + 50, w, h, o.colors[2]);
    let gap = 3;
    for (let y = o.y + 4; y < h; y += gap) {
      const n = Math.round(w / 18);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rnd() * w);
        const len = ri(rnd, 2, 3 + Math.floor((y - o.y) / 6));
        wrap(w, x, (xx) => rect(ctx, xx, y, len, 1, o.colors[3] ?? o.colors[0]));
      }
      gap += 1;
    }
    if (o.sparkle) {
      const sx = o.sparkleX ?? w / 2;
      for (let i = 0; i < 40; i++) {
        const y = o.y + 2 + Math.floor(Math.pow(rnd(), 1.5) * 26);
        const x = Math.round(sx + (rnd() - 0.5) * (8 + (y - o.y) * 1.5));
        wrap(w, x, (xx) => rect(ctx, xx, y, ri(rnd, 1, 4), 1, o.sparkle as string));
      }
    }
  };
}

export interface BergOpts {
  colors: [string, string, string, string?]; // lit, body, shadow, underwater
  count: number;
  y: number; // waterline
  w: [number, number];
  h: [number, number];
}
export function icebergs(o: BergOpts): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const W = irange(rnd, o.w);
      const H = irange(rnd, o.h);
      const n = ri(rnd, 2, 4);
      const pk = Array.from({ length: n }, () => ({ x: rr(rnd, 0.2, 0.8) * W, y: H * rr(rnd, 0.55, 1), s: rr(rnd, 0.9, 2) }));
      wrap(w, x0, (a) => {
        for (let i = 0; i < W; i++) {
          let top = 1e9;
          let lit = false;
          for (const p of pk) {
            const t = o.y - p.y + Math.abs(i - p.x) * p.s;
            if (t < top) {
              top = t;
              lit = i < p.x;
            }
          }
          const edge = Math.min(i, W - 1 - i);
          top = Math.max(top, o.y - edge * 2.2);
          top = Math.round(top);
          if (top >= o.y) continue;
          rect(ctx, a + i, top, 1, o.y - top, lit ? o.colors[0] : o.colors[1]);
          if (!lit) ditherRect(ctx, a + i, top + 4, 1, o.y - top - 4, o.colors[2], 0.5);
          if (o.colors[3]) ditherRect(ctx, a + i, o.y, 1, Math.max(2, Math.round((o.y - top) * 0.35)), o.colors[3], 0.5);
        }
        rect(ctx, a, o.y, W, 1, mix(o.colors[0], PAL.w, 0.4));
      });
    }
  };
}

export interface IslandOpts {
  count: number;
  y: [number, number];
  w: [number, number];
  grass: [string, string, string]; // light, mid, dark
  rock: [string, string, string];
  trees?: [string, string, string?]; // canopy, trunk, light
  waterfall?: string;
}
export function floatingIslands(o: IslandOpts): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const W = irange(rnd, o.w);
      const y = irange(rnd, o.y);
      const D = Math.round(W * rr(rnd, 0.45, 0.75));
      const jag = Array.from({ length: D }, () => rr(rnd, -2, 2));
      const hasFall = !!o.waterfall && rnd() < 0.5;
      const fx = ri(rnd, Math.floor(W * 0.6), W - 4);
      const treeN = o.trees ? ri(rnd, 0, 2) : 0;
      const tx = Array.from({ length: treeN }, () => ri(rnd, 4, W - 5));
      wrap(w, x0, (a) => {
        for (let j = 0; j < D; j++) {
          const t = j / D;
          const hw = (W / 2) * (1 - Math.pow(t, 0.9)) + jag[j];
          const cx = a + W / 2 + Math.sin(j * 0.5) * 1.5;
          const x1 = Math.round(cx - hw);
          const x2 = Math.round(cx + hw);
          rect(ctx, x1, y + j, x2 - x1, 1, o.rock[1]);
          rect(ctx, x1, y + j, Math.max(1, Math.round((x2 - x1) * 0.3)), 1, o.rock[0]);
          rect(ctx, x2 - Math.max(1, Math.round((x2 - x1) * 0.3)), y + j, Math.max(1, Math.round((x2 - x1) * 0.3)), 1, o.rock[2]);
          if (j % 5 === 3) ditherRect(ctx, x1, y + j, x2 - x1, 1, o.rock[2], 0.5);
        }
        rect(ctx, a - 1, y - 2, W + 2, 3, o.grass[1]);
        rect(ctx, a, y - 3, W, 1, o.grass[0]);
        for (let i = 0; i < W; i += 3) rect(ctx, a + i, y + 1, 1, 1 + ((i * 7) % 3), o.grass[2]);
        for (let i = 0; i < tx.length; i++) {
          const q = a + tx[i];
          rect(ctx, q, y - 9, 2, 7, (o.trees as string[])[1]);
          disc(ctx, q + 1, y - 12, 5, (o.trees as string[])[0]);
          if (o.trees?.[2]) disc(ctx, q, y - 13, 3, o.trees[2], y - 13);
        }
        if (hasFall && o.waterfall) {
          rect(ctx, a + fx, y - 1, 3, 70, o.waterfall);
          ditherRect(ctx, a + fx, y + 70, 3, 20, o.waterfall, 0.5);
          rect(ctx, a + fx, y - 1, 1, 70, mix(o.waterfall, PAL.w, 0.5));
        }
      });
    }
  };
}

export interface CeilingOpts {
  colors: [string, string, string]; // body, rim light, dark
  y: number;
  amp: number;
  stalactites?: number;
  len?: [number, number];
  drip?: string;
}
// Cave or tunnel ceiling hanging from the top edge, with stalactites.
export function ceiling(o: CeilingOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const f = periodic(rnd, w, [[2, 1], [5, 0.5], [13, 0.3], [31, 0.15]]);
    for (let x = 0; x < w; x++) {
      const b = Math.round(o.y + f(x) * o.amp);
      rect(ctx, x, 0, 1, b, o.colors[0]);
      rect(ctx, x, b - 1, 1, 1, o.colors[1]);
      ditherRect(ctx, x, b - 6, 1, 5, o.colors[2], 0.4);
    }
    for (let i = 0; i < (o.stalactites ?? 0); i++) {
      const x = Math.floor(rnd() * w);
      const L = irange(rnd, o.len ?? [6, 20]);
      const hw = Math.max(1, Math.round(L / 5));
      const b = Math.round(o.y + f(x) * o.amp) - 2;
      wrap(w, x, (xx) => {
        for (let j = 0; j < L; j++) {
          const k = Math.round(hw * (1 - j / L));
          rect(ctx, xx - k, b + j, k * 2 + 1, 1, o.colors[0]);
          px(ctx, xx - k, b + j, o.colors[1]);
        }
        if (o.drip) px(ctx, xx, b + L + 2, o.drip);
      });
    }
  };
}

// ================================================================ PLANTS

export interface PineOpts {
  colors: [string, string, string?]; // dark, body, lit
  trunk?: string;
  count: number;
  h: [number, number];
  baseY?: number;
  width?: number; // width / height
  snow?: string;
  outline?: string;
}
export function pines(o: PineOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const xs = spread(rnd, w, o.count, 1.2);
    for (const x0 of xs) {
      const H = irange(rnd, o.h);
      const hw = Math.round((H * (o.width ?? 0.42)) / 2);
      const tiers = Math.max(2, Math.min(5, Math.round(H / 14)));
      wrap(w, x0, (cx) => {
        if (o.trunk) rect(ctx, cx - 1, base - Math.round(H * 0.2), 3, Math.round(H * 0.2), o.trunk);
        const top = base - H;
        const crown = H * 0.85;
        for (let t = 0; t < tiers; t++) {
          const ty = top + Math.round((crown / tiers) * t * 0.85);
          const th = Math.round((crown / tiers) * (1.25 + t * 0.12));
          const tw = Math.round(hw * (0.45 + (0.55 * (t + 1)) / tiers));
          if (o.outline) tri(ctx, cx, ty + th + 1, tw + 1, th + 1, o.outline);
          for (let i = 0; i < th; i++) {
            const y = ty + i;
            let k = Math.round((tw * (i + 1)) / th);
            if (i % 2 === 1) k -= 1;
            rect(ctx, cx - k, y, k * 2 + 1, 1, o.colors[1]);
            if (o.colors[2]) rect(ctx, cx - k, y, Math.max(1, Math.round(k * 0.7)), 1, o.colors[2]);
            if (i >= th - 2) rect(ctx, cx - k, y, k * 2 + 1, 1, o.colors[0]);
            else rect(ctx, cx + Math.round(k * 0.45), y, Math.max(1, k - Math.round(k * 0.45) + 1), 1, o.colors[0]);
            if (o.snow && i < 3 + (t === 0 ? 2 : 0) && i < th - 2) rect(ctx, cx - k, y, k + 1 + (i < 2 ? k : 0), 1, o.snow);
          }
        }
      });
    }
  };
}

export interface TreeOpts {
  leaves: [string, string, string, string?]; // dark, mid, light, highlight
  trunk: [string, string]; // body, shadow
  count: number;
  h: [number, number]; // canopy centre height above base
  r: [number, number]; // canopy radius
  baseY?: number;
  outline?: string;
  fruit?: string[];
  lobes?: number;
}
// Round broadleaf trees: clustered disc canopy, lit from the top left.
export function trees(o: TreeOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.1)) {
      const H = irange(rnd, o.h);
      const R = irange(rnd, o.r);
      const n = o.lobes ?? ri(rnd, 5, 8);
      const lobes = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + rr(rnd, -0.3, 0.3);
        const d = R * rr(rnd, 0.35, 0.65);
        return { dx: Math.round(Math.cos(a) * d * 1.15), dy: Math.round(Math.sin(a) * d * 0.8), r: Math.round(R * rr(rnd, 0.5, 0.7)) };
      });
      lobes.push({ dx: 0, dy: -Math.round(R * 0.2), r: Math.round(R * 0.7) });
      const tw = Math.max(2, Math.round(R / 4));
      const fruitPts = o.fruit ? Array.from({ length: ri(rnd, 3, 8) }, () => [rr(rnd, -R, R), rr(rnd, -R * 0.6, R * 0.7), ri(rnd, 0, o.fruit!.length - 1)] as const) : [];
      const seed = newSeed(rnd);
      wrap(w, x0, (cx) => {
        const r = seeded(seed);
        const cy = base - H;
        if (o.outline) rect(ctx, cx - tw / 2 - 1, cy, tw + 2, H, o.outline);
        rect(ctx, cx - Math.floor(tw / 2), cy, tw, H, o.trunk[0]);
        rect(ctx, cx - Math.floor(tw / 2) + tw - Math.max(1, Math.floor(tw / 2)), cy, Math.max(1, Math.floor(tw / 2)), H, o.trunk[1]);
        line(ctx, cx, cy + R * 0.6, cx - R * 0.5, cy + R * 0.1, o.trunk[0], Math.max(1, tw - 2));
        line(ctx, cx, cy + R * 0.5, cx + R * 0.5, cy, o.trunk[1], Math.max(1, tw - 2));
        if (o.outline) for (const l of lobes) disc(ctx, cx + l.dx, cy + l.dy, l.r + 1, o.outline);
        for (const l of lobes) disc(ctx, cx + l.dx, cy + l.dy, l.r, o.leaves[0]);
        for (const l of lobes) disc(ctx, cx + l.dx - 1, cy + l.dy - 2, l.r - 1, o.leaves[1]);
        for (const l of lobes) if (l.dy <= 0 || l.dx < 0) disc(ctx, cx + l.dx - 2, cy + l.dy - 3, Math.max(1, l.r - 3), o.leaves[2], cy + l.dy);
        // leaf texture
        for (let i = 0; i < R * 3; i++) {
          const a = r() * TAU;
          const d = r() * R;
          const qx = Math.round(cx + Math.cos(a) * d);
          const qy = Math.round(cy + Math.sin(a) * d * 0.8);
          const up = qy < cy && qx < cx + R * 0.3;
          rect(ctx, qx, qy, 2, 1, up ? o.leaves[3] ?? o.leaves[2] : o.leaves[0]);
        }
        for (const [fx, fy, fi] of fruitPts) rect(ctx, cx + fx, cy + fy, 2, 2, (o.fruit as string[])[fi]);
      });
    }
  };
}

export interface PalmOpts {
  trunk: [string, string];
  leaves: [string, string, string?];
  count: number;
  h: [number, number];
  baseY?: number;
  coconut?: string;
}
export function palms(o: PalmOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const H = irange(rnd, o.h);
      const lean = rr(rnd, -0.35, 0.35) * H;
      const fr = Array.from({ length: ri(rnd, 6, 8) }, (_, i) => ({ a: (i / 7) * Math.PI + rr(rnd, -0.25, 0.25) + Math.PI, L: rr(rnd, 0.32, 0.48) * H }));
      wrap(w, x0, (bx) => {
        const pt = (t: number): [number, number] => [bx + lean * t * t, base - H * t];
        for (let j = 0; j <= H; j++) {
          const [x, y] = pt(j / H);
          const c = Math.floor(j / 3) % 2 ? o.trunk[0] : o.trunk[1];
          const tw = j < H * 0.15 ? 4 : 3;
          rect(ctx, x - 1, y, tw, 1, c);
          px(ctx, x + tw - 2, y, o.trunk[1]);
        }
        const [cx, cy] = pt(1);
        for (const f of fr) {
          let fx = 0;
          let fy = 0;
          const dirx = Math.cos(f.a);
          for (let s = 0; s < f.L; s++) {
            fx = cx + dirx * s;
            fy = cy + Math.sin(f.a) * s * 0.55 + (s * s) / (f.L * 1.4);
            const lw = Math.max(1, Math.round(3 * (1 - s / f.L)) + 1);
            rect(ctx, fx, fy, 1, lw, o.leaves[1]);
            if (s % 2 === 0) rect(ctx, fx, fy + lw, 1, Math.max(1, lw - 1), o.leaves[0]);
            if (o.leaves[2] && s < f.L * 0.7) px(ctx, fx, fy, o.leaves[2]);
          }
        }
        if (o.coconut) {
          disc(ctx, cx - 1, cy + 3, 1, o.coconut);
          disc(ctx, cx + 2, cy + 3, 1, o.coconut);
        }
        disc(ctx, cx, cy, 2, o.leaves[0]);
      });
    }
  };
}

export interface BambooOpts {
  colors: [string, string, string]; // stalk, lit edge, node/shadow
  leaves: [string, string];
  count: number;
  width?: [number, number];
  baseY?: number;
  top?: number;
}
export function bamboo(o: BambooOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 170;
    for (const x0 of spread(rnd, w, o.count, 1.2)) {
      const sw = irange(rnd, o.width ?? [3, 5]);
      const top = (o.top ?? 0) + ri(rnd, -10, 30);
      const lean = rr(rnd, -0.06, 0.06);
      const nodeGap = ri(rnd, 16, 24);
      const off = ri(rnd, 0, nodeGap);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        for (let y = Math.max(0, top); y < base; y++) {
          const xx = Math.round(x + (base - y) * lean);
          rect(ctx, xx, y, sw, 1, o.colors[0]);
          px(ctx, xx, y, o.colors[1]);
          px(ctx, xx + sw - 1, y, o.colors[2]);
          if ((y + off) % nodeGap === 0) {
            rect(ctx, xx - 1, y, sw + 2, 1, o.colors[2]);
            rect(ctx, xx, y + 1, sw, 1, o.colors[1]);
            if (r() < 0.45 && y < base - 30) {
              const dir = r() < 0.5 ? -1 : 1;
              for (let k = 0; k < 3; k++) {
                const L = ri(r, 7, 12);
                const ang = 0.25 + k * 0.35;
                for (let s = 0; s < L; s++) {
                  const lx = xx + (dir > 0 ? sw : -1) + dir * s;
                  const ly = y + Math.round(s * ang) + 1;
                  rect(ctx, lx, ly, 1, s < L - 2 ? 2 : 1, k === 1 ? o.leaves[1] : o.leaves[0]);
                }
              }
            }
          }
        }
      });
    }
  };
}

export interface MushroomOpts {
  stem: [string, string]; // body, shade
  caps: Array<[string, string, string]>; // body, light, dark
  spots?: string;
  count: number;
  h: [number, number];
  r: [number, number];
  baseY?: number;
  outline?: string;
  gills?: string;
  glow?: string;
}
export function mushrooms(o: MushroomOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.1)) {
      const H = irange(rnd, o.h);
      const R = irange(rnd, o.r);
      const cap = pick(rnd, o.caps);
      const sw = Math.max(3, Math.round(R * 0.38));
      const bend = rr(rnd, -0.15, 0.15);
      const spots = Array.from({ length: ri(rnd, 2, 5) }, () => [rr(rnd, -0.75, 0.75), rr(rnd, 0.2, 0.85), ri(rnd, 1, Math.max(1, Math.round(R / 6)))]);
      const ry = Math.round(R * rr(rnd, 0.5, 0.75));
      wrap(w, x0, (cx) => {
        const cy = base - H;
        if (o.glow) glow(ctx, cx, cy - ry / 2, R + 8, o.glow, 0.5);
        for (let y = cy; y < base; y++) {
          const t = (y - cy) / H;
          const xx = Math.round(cx + bend * (base - y) * 0.6 - sw / 2);
          const ww = sw + (t > 0.85 ? Math.round((t - 0.85) * 14) : 0);
          if (o.outline) rect(ctx, xx - 1 - (ww - sw) / 2, y, ww + 2, 1, o.outline);
          rect(ctx, xx - (ww - sw) / 2, y, ww, 1, o.stem[0]);
          rect(ctx, xx - (ww - sw) / 2 + ww - Math.max(1, Math.floor(ww / 3)), y, Math.max(1, Math.floor(ww / 3)), 1, o.stem[1]);
        }
        const capX = Math.round(cx + bend * H * 0.6);
        if (o.outline) ellipse(ctx, capX, cy + 1, R + 1, ry + 1, o.outline, cy + 3);
        ellipse(ctx, capX, cy, R, ry, cap[2], cy + 2);
        ellipse(ctx, capX - 1, cy - 1, R - 1, ry - 1, cap[0], cy);
        ellipse(ctx, capX - Math.round(R * 0.3), cy - Math.round(ry * 0.45), Math.round(R * 0.45), Math.round(ry * 0.35), cap[1], cy);
        rect(ctx, capX - R + 1, cy + 1, R * 2 - 1, 2, o.gills ?? cap[2]);
        if (o.spots)
          for (const [sx, sy, sr] of spots) {
            const qx = capX + sx * R * 0.8;
            const qy = cy - sy * ry * 0.85;
            disc(ctx, qx, qy, sr, o.spots);
          }
      });
    }
  };
}

export interface CrystalOpts {
  sets: Array<[string, string, string]>; // light, mid, dark
  count: number;
  h: [number, number];
  baseY?: number;
  hang?: boolean; // from the ceiling (y = 0) downwards
  glow?: boolean;
  outline?: string;
  hangY?: number;
}
export function crystals(o: CrystalOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.hang ? o.hangY ?? 0 : o.baseY ?? 166;
    const dirY = o.hang ? 1 : -1;
    for (const x0 of spread(rnd, w, o.count, 1.1)) {
      const set = pick(rnd, o.sets);
      const n = ri(rnd, 2, 5);
      const H = irange(rnd, o.h);
      const shards = Array.from({ length: n }, (_, i) => ({
        dx: Math.round(rr(rnd, -H * 0.25, H * 0.25)),
        a: rr(rnd, -0.55, 0.55) + (i === 0 ? 0 : 0),
        L: i === 0 ? H : H * rr(rnd, 0.35, 0.75),
        W: Math.max(4, Math.round(H * rr(rnd, 0.16, 0.24))),
      }));
      shards.sort((a, b) => a.L - b.L);
      shards.reverse();
      wrap(w, x0, (cx) => {
        if (o.glow) glow(ctx, cx, base + dirY * H * 0.4, Math.round(H * 0.6), set[1], 0.5);
        for (const s of shards) {
          const bx = cx + s.dx;
          const dx = Math.sin(s.a);
          const dy = dirY * Math.cos(s.a);
          const nx = Math.cos(s.a);
          const ny = -dirY * Math.sin(s.a) * -1;
          const hw = s.W / 2;
          const sh = s.L - s.W * 0.9;
          const P = (along: number, side: number): [number, number] => [bx + dx * along + nx * side, base + dy * along + ny * side];
          const bl = P(0, -hw);
          const br = P(0, hw);
          const bc = P(0, -hw * 0.1);
          const sl = P(sh, -hw);
          const sr = P(sh, hw);
          const sc = P(sh + 1, -hw * 0.1);
          const tip = P(s.L, 0);
          if (o.outline) poly(ctx, [P(0, -hw - 1), P(0, hw + 1), P(sh, hw + 1), P(s.L + 1.5, 0), P(sh, -hw - 1)], o.outline);
          poly(ctx, [bl, bc, sc, tip, sl], set[0]);
          poly(ctx, [bc, br, sr, tip, sc], set[2]);
          poly(ctx, [P(0, -hw * 0.1), P(0, hw * 0.35), P(sh, hw * 0.35), tip, P(sh, -hw * 0.1)], set[1]);
          line(ctx, sl[0], sl[1], tip[0], tip[1], mix(set[0], PAL.w, 0.5));
        }
      });
    }
  };
}

export interface GrassOpts {
  colors: string[]; // dark .. light
  count: number;
  h: [number, number];
  baseY?: number;
  blades?: [number, number];
  flowers?: string[];
  lean?: number;
  width?: number; // blade width
}
// Grass tufts: curved blades. Big dark ones make a great foreground.
export function grass(o: GrassOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 162;
    for (const x0 of spread(rnd, w, o.count, 1.4)) {
      const n = irange(rnd, o.blades ?? [4, 8]);
      const H = irange(rnd, o.h);
      const bl = Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        return { dx: Math.round((t - 0.5) * n * 2.2), h: Math.round(H * (0.45 + 0.55 * (1 - Math.abs(t - 0.5) * 1.6)) * rr(rnd, 0.75, 1)), lean: (t - 0.5) * 2 * (o.lean ?? 5) + rr(rnd, -2, 2), c: ri(rnd, 0, o.colors.length - 1) };
      });
      const fl = o.flowers && rnd() < 0.5 ? pick(rnd, o.flowers) : null;
      wrap(w, x0, (x) => {
        for (const b of bl) {
          let tx = x + b.dx;
          let ty = base - b.h;
          for (let j = 0; j < b.h; j++) {
            const t = j / b.h;
            const xx = Math.round(x + b.dx + b.lean * t * t);
            const yy = base - 1 - j;
            const ww = j < b.h * 0.5 ? o.width ?? 2 : 1;
            rect(ctx, xx, yy, ww, 1, o.colors[b.c]);
            tx = xx;
            ty = yy;
          }
          px(ctx, tx, ty, o.colors[o.colors.length - 1]);
        }
        if (fl) {
          const b = bl[Math.floor(bl.length / 2)];
          const fx = Math.round(x + b.dx + b.lean);
          rect(ctx, fx - 1, base - b.h - 2, 3, 3, fl);
          px(ctx, fx, base - b.h - 1, PAL.y);
        }
      });
    }
  };
}

export interface ReedOpts {
  colors: [string, string]; // stem, lit
  head?: string;
  count: number;
  h: [number, number];
  baseY?: number;
}
export function reeds(o: ReedOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.6)) {
      const stems = Array.from({ length: ri(rnd, 2, 5) }, () => ({ dx: ri(rnd, -5, 5), h: irange(rnd, o.h), lean: rr(rnd, -4, 4), cat: rnd() < 0.5 }));
      wrap(w, x0, (x) => {
        for (const s of stems) {
          let tx = 0;
          let ty = 0;
          for (let j = 0; j < s.h; j++) {
            const t = j / s.h;
            tx = Math.round(x + s.dx + s.lean * t * t);
            ty = base - 1 - j;
            px(ctx, tx, ty, j % 7 === 0 ? o.colors[1] : o.colors[0]);
          }
          if (s.cat && o.head) {
            rect(ctx, tx - 1, ty + 2, 3, 6, o.head);
            px(ctx, tx - 1, ty + 2, mix(o.head, PAL.w, 0.3));
          }
          // a leaf
          line(ctx, x + s.dx, base - 2, x + s.dx + s.lean * 1.5 + 4, base - s.h * 0.55, o.colors[1]);
        }
      });
    }
  };
}

export interface CornOpts {
  colors: [string, string, string]; // stalk dark, leaf, leaf light
  cob?: [string, string];
  tassel?: string;
  count: number;
  h: [number, number];
  baseY?: number;
}
export function corn(o: CornOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const H = irange(rnd, o.h);
      const lean = rr(rnd, -3, 3);
      const leaves = Array.from({ length: Math.round(H / 9) }, (_, i) => ({ y: Math.round(H * (0.15 + (0.75 * i) / Math.max(1, Math.round(H / 9)))), dir: i % 2 ? 1 : -1, L: ri(rnd, 8, 14) }));
      const cobAt = Math.round(H * rr(rnd, 0.45, 0.6));
      wrap(w, x0, (x) => {
        const sx = (y: number) => Math.round(x + (lean * (base - y)) / H);
        for (let y = base - H; y < base; y++) rect(ctx, sx(y), y, 2, 1, o.colors[0]);
        for (const l of leaves) {
          const y0 = base - l.y;
          for (let s = 0; s < l.L; s++) {
            const lx = sx(y0) + (l.dir > 0 ? 2 : -1) + l.dir * s;
            const ly = y0 - Math.round(Math.sin((s / l.L) * 2.2) * 4);
            rect(ctx, lx, ly, 1, 2, s < l.L / 2 ? o.colors[2] : o.colors[1]);
          }
        }
        if (o.cob) {
          const cy = base - cobAt;
          rect(ctx, sx(cy) + 2, cy - 6, 3, 7, o.cob[0]);
          px(ctx, sx(cy) + 2, cy - 6, mix(o.cob[0], PAL.w, 0.4));
          rect(ctx, sx(cy) + 4, cy - 4, 1, 5, o.cob[1]);
        }
        if (o.tassel) {
          const ty = base - H;
          for (let k = -2; k <= 2; k++) line(ctx, sx(ty), ty, sx(ty) + k * 2, ty - 4 + Math.abs(k), o.tassel);
        }
      });
    }
  };
}

export interface VineOpts {
  colors: [string, string, string?]; // stem, leaf, leaf light
  count: number;
  len: [number, number];
  y?: number;
  flowers?: string;
  canopy?: [string, string]; // leafy mass along the top edge
}
// Vines hanging from the top edge (and an optional canopy band).
export function vines(o: VineOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const y0 = o.y ?? 0;
    if (o.canopy) {
      const f = periodic(rnd, w, [[3, 1], [7, 0.6], [17, 0.4]]);
      for (let x = 0; x < w; x++) {
        const b = Math.round(y0 + 8 + f(x) * 6);
        rect(ctx, x, 0, 1, b, o.canopy[0]);
        if ((x * 7) % 5 < 3) px(ctx, x, b, o.canopy[0]);
      }
      for (let i = 0; i < w / 3; i++) {
        const x = Math.floor(rnd() * w);
        const y = Math.floor(rnd() * (y0 + 10));
        wrap(w, x, (xx) => {
          disc(ctx, xx, y, 2, o.canopy![1]);
          px(ctx, xx - 1, y - 1, o.colors[2] ?? o.colors[1]);
        });
      }
    }
    for (const x0 of spread(rnd, w, o.count, 1.4)) {
      const L = irange(rnd, o.len);
      const ph = rr(rnd, 0, TAU);
      const fl = !!o.flowers && rnd() < 0.4;
      wrap(w, x0, (x) => {
        for (let j = 0; j < L; j++) {
          const xx = Math.round(x + Math.sin(j * 0.12 + ph) * 3);
          const y = y0 + j;
          px(ctx, xx, y, o.colors[0]);
          if (j % 5 === 2) {
            const d = j % 10 === 2 ? -1 : 1;
            rect(ctx, xx + (d > 0 ? 1 : -3), y, 3, 2, o.colors[1]);
            if (o.colors[2]) px(ctx, xx + (d > 0 ? 1 : -3), y, o.colors[2]);
          }
        }
        const ex = Math.round(x + Math.sin(L * 0.12 + ph) * 3);
        if (fl && o.flowers) {
          rect(ctx, ex - 1, y0 + L, 3, 3, o.flowers);
          px(ctx, ex, y0 + L + 1, PAL.y);
        } else rect(ctx, ex - 1, y0 + L, 3, 2, o.colors[1]);
      });
    }
  };
}

export interface BushOpts {
  colors: [string, string, string]; // dark, mid, light
  count: number;
  r: [number, number];
  baseY?: number;
  dots?: string[]; // berries / flowers
  outline?: string;
}
export function bushes(o: BushOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    for (const x0 of spread(rnd, w, o.count, 1.2)) {
      const R = irange(rnd, o.r);
      const nl = ri(rnd, 3, 5);
      const lobes = Array.from({ length: nl }, (_, i) => ({ dx: Math.round((i - (nl - 1) / 2) * R * 0.8), r: Math.round(R * rr(rnd, 0.6, 1)) }));
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        if (o.outline) for (const l of lobes) disc(ctx, x + l.dx, base - l.r, l.r + 1, o.outline, base);
        for (const l of lobes) disc(ctx, x + l.dx, base - l.r, l.r, o.colors[0], base);
        for (const l of lobes) disc(ctx, x + l.dx - 1, base - l.r - 1, l.r - 1, o.colors[1], base - 3);
        for (const l of lobes) disc(ctx, x + l.dx - 2, base - l.r - 2, Math.max(1, l.r - 3), o.colors[2], base - l.r - 1);
        if (o.dots) for (let i = 0; i < R; i++) rect(ctx, x + rr(r, -R * 1.4, R * 1.4), base - rr(r, 2, R * 1.5), 1 + (r() < 0.4 ? 1 : 0), 1, pick(r, o.dots));
      });
    }
  };
}

export interface BranchTreeOpts {
  color: string;
  light?: string;
  count: number;
  h: [number, number];
  baseY?: number;
  thick?: number;
  depth?: number;
  spread?: number;
  tips?: string[]; // little blobs at branch tips (leaves, buds, coral polyps)
  up?: boolean; // branches reach straight up (coral)
}
// Recursive branching silhouettes: dead trees, bare autumn trees, coral.
export function branchy(o: BranchTreeOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.1)) {
      const H = irange(rnd, o.h);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        const br = (bx: number, by: number, a: number, len: number, t: number, d: number) => {
          const ex = bx + Math.sin(a) * len;
          const ey = by - Math.cos(a) * len;
          const mx = (bx + ex) / 2 + rr(r, -2, 2);
          const my = (by + ey) / 2 + rr(r, -2, 2);
          line(ctx, bx, by, mx, my, o.color, t);
          line(ctx, mx, my, ex, ey, o.color, Math.max(1, t - (d < 2 ? 1 : 0)));
          if (o.light && t > 1) line(ctx, bx - Math.floor(t / 2), by, mx - Math.floor(t / 2), my, o.light, 1);
          if (d <= 0) {
            if (o.tips) disc(ctx, ex, ey, 1 + (r() < 0.4 ? 1 : 0), pick(r, o.tips));
            return;
          }
          const n = r() < 0.35 ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const sp = o.spread ?? 0.55;
            const na = o.up ? a * 0.5 + (i - (n - 1) / 2) * sp : a + (i - (n - 1) / 2) * sp * 1.6 + rr(r, -0.25, 0.25);
            br(ex, ey, na, len * rr(r, 0.6, 0.8), Math.max(1, t - 1), d - 1);
          }
        };
        br(x, base, rr(r, -0.12, 0.12), H * 0.42, o.thick ?? 4, o.depth ?? 4);
      });
    }
  };
}

export interface KelpOpts {
  colors: [string, string, string]; // dark, mid, light
  count: number;
  h: [number, number];
  baseY?: number;
}
export function kelp(o: KelpOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.4)) {
      const H = irange(rnd, o.h);
      const ph = rr(rnd, 0, TAU);
      const fr = rr(rnd, 0.06, 0.1);
      wrap(w, x0, (x) => {
        for (let j = 0; j < H; j++) {
          const y = base - j;
          const xx = Math.round(x + Math.sin(j * fr + ph) * 3 * (j / H + 0.3));
          rect(ctx, xx, y, 2, 1, o.colors[1]);
          px(ctx, xx, y, o.colors[2]);
          if (j % 7 === 3 && j < H - 4) {
            const d = j % 14 === 3 ? 1 : -1;
            const lx = d > 0 ? xx + 2 : xx - 5;
            rect(ctx, lx, y - 1, 5, 2, o.colors[0]);
            rect(ctx, lx + (d > 0 ? 0 : 2), y - 2, 3, 1, o.colors[1]);
            px(ctx, lx + (d > 0 ? 4 : 0), y - 2, o.colors[2]);
          }
        }
        ellipse(ctx, Math.round(x + Math.sin(H * fr + ph) * 3), base - H - 2, 2, 3, o.colors[1]);
      });
    }
  };
}

export interface CoralOpts {
  colors: Array<[string, string]>; // body, light
  count: number;
  h: [number, number];
  baseY?: number;
}
// Mixed reef: branching coral, fans, brain coral, tube sponges.
export function coral(o: CoralOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.2)) {
      const kind = ri(rnd, 0, 3);
      const [c, l] = pick(rnd, o.colors);
      const H = irange(rnd, o.h);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        if (kind === 0) {
          // drawn below with its own translate
        } else if (kind === 1) {
          for (let y = 0; y < H; y++) {
            const hw = Math.round(H * 0.7 * Math.sqrt(1 - Math.pow((H - y) / H, 2)));
            for (let i = -hw; i <= hw; i++) if ((i + y) % 3 === 0 || (i - y) % 3 === 0 || y === H - 1 - 0) px(ctx, x + i, base - H + (H - y) - 1 + 0, (i + y) % 2 ? c : l);
          }
          rect(ctx, x - 1, base - 4, 3, 4, c);
        } else if (kind === 2) {
          const R = Math.round(H * 0.5);
          ellipse(ctx, x, base - 1, R, Math.round(R * 0.8), c, base - 1);
          for (let k = 0; k < R * 2; k += 3) {
            const ry = Math.round(R * 0.8 * Math.sqrt(Math.max(0, 1 - Math.pow((k - R) / R, 2))));
            for (let j = 2; j < ry; j += 2) px(ctx, x - R + k + (j % 4 === 0 ? 1 : 0), base - 1 - j, l);
          }
        } else {
          const n = ri(r, 2, 4);
          for (let i = 0; i < n; i++) {
            const th = Math.round(H * rr(r, 0.5, 1));
            const tx = x + (i - n / 2) * 5;
            rect(ctx, tx, base - th, 4, th, c);
            rect(ctx, tx, base - th, 1, th, l);
            rect(ctx, tx, base - th, 4, 1, l);
            rect(ctx, tx + 1, base - th, 2, 1, darker(c, 0.5));
          }
        }
      });
      if (kind === 0) {
        // draw the branching coral properly positioned
        const s2 = newSeed(rnd);
        wrap(w, x0, (x) => {
          ctx.save();
          ctx.translate(x, 0);
          branchy({ color: c, light: l, count: 1, h: [H * 2, H * 2], baseY: base, thick: 3, depth: 3, up: true, spread: 0.75, tips: [l] })(ctx, 1, 1, seeded(s2));
          ctx.restore();
        });
      }
    }
  };
}

export interface CactusOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  h: [number, number];
  baseY?: number;
  outline?: string;
  flowers?: string;
}
export function cacti(o: CactusOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1.2)) {
      const H = irange(rnd, o.h);
      const tw = Math.max(4, Math.round(H / 7));
      const arms = Array.from({ length: ri(rnd, 0, 2) }, (_, i) => ({ side: i === 0 ? -1 : 1, y: Math.round(H * rr(rnd, 0.35, 0.6)), up: Math.round(H * rr(rnd, 0.2, 0.35)), out: ri(rnd, 3, 6) }));
      const fl = o.flowers && rnd() < 0.5;
      wrap(w, x0, (x) => {
        const col = (cx: number, top: number, bottom: number, ww: number) => {
          if (o.outline) rect(ctx, cx - 1, top - 1, ww + 2, bottom - top + 1, o.outline);
          rect(ctx, cx, top, ww, bottom - top, o.colors[1]);
          rect(ctx, cx, top, 1, bottom - top, o.colors[0]);
          rect(ctx, cx + ww - 1, top, 1, bottom - top, o.colors[2]);
          for (let i = 2; i < ww - 1; i += 2) for (let y = top + 1; y < bottom; y += 3) px(ctx, cx + i, y, o.colors[2]);
        };
        for (const a of arms) {
          const aw = tw - 1;
          const ay = base - a.y;
          const ax = a.side < 0 ? x - a.out - aw + 1 : x + tw + a.out - 1;
          rect(ctx, a.side < 0 ? ax : x + tw - 1, ay - aw + 1, a.out + 1 + (a.side < 0 ? aw : 0) - (a.side < 0 ? 0 : 0), aw, o.colors[1]);
          rect(ctx, a.side < 0 ? ax : x + tw - 1, ay, a.out + aw, 1, o.colors[2]);
          col(ax, ay - a.up, ay + 1, aw);
        }
        col(x, base - H, base, tw);
        if (fl) {
          rect(ctx, x + 1, base - H - 2, tw - 2, 2, o.flowers as string);
        }
      });
    }
  };
}

// ================================================================ STRUCTURES

export interface FenceOpts {
  style: 'picket' | 'wood' | 'chain' | 'iron' | 'rail';
  colors: [string, string, string]; // light, mid, dark
  h: number;
  baseY?: number;
  spacing?: number;
  gaps?: number; // chance of a missing section
}
export function fence(o: FenceOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 162;
    const top = base - o.h;
    const [L, M, D] = o.colors;
    const sp = o.spacing ?? (o.style === 'picket' ? 8 : o.style === 'iron' ? 5 : 64);
    const n = Math.max(1, Math.round(w / sp));
    const step = w / n;
    if (o.style === 'picket') {
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * step);
        const bh = o.h - (i % 7 === 3 ? 2 : 0);
        rect(ctx, x, base - bh + 2, 5, bh - 2, M);
        rect(ctx, x + 1, base - bh, 3, 2, M);
        px(ctx, x + 2, base - bh - 1, M);
        rect(ctx, x, base - bh + 2, 1, bh - 2, L);
        rect(ctx, x + 4, base - bh + 2, 1, bh - 2, D);
      }
      rect(ctx, 0, top + 5, w, 2, M);
      rect(ctx, 0, top + 7, w, 1, D);
      rect(ctx, 0, base - 7, w, 2, M);
      rect(ctx, 0, base - 5, w, 1, D);
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * step);
        rect(ctx, x, top + 5, 5, 2, L);
        rect(ctx, x + 4, top + 5, 1, 3, D);
        rect(ctx, x, base - 7, 5, 2, L);
      }
    } else if (o.style === 'iron') {
      rect(ctx, 0, top + 3, w, 1, M);
      rect(ctx, 0, base - 5, w, 1, M);
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * step);
        rect(ctx, x, top + 1, 1, o.h - 1, i % 6 === 0 ? L : M);
        px(ctx, x, top, L);
        if (i % 6 === 0) {
          rect(ctx, x - 1, top - 2, 3, 3, M);
          rect(ctx, x - 1, top - 2, 1, 1, L);
        }
        if (i % 2 === 0) px(ctx, x, top + 5, D);
      }
    } else if (o.style === 'chain') {
      for (let y = top + 2; y < base; y++)
        for (let x = 0; x < w; x++) if ((x + y) % 6 === 0 || (x - y + 1200) % 6 === 0) px(ctx, x, y, D);
      rect(ctx, 0, top, w, 2, M);
      rect(ctx, 0, top, w, 1, L);
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * step);
        rect(ctx, x, top - 2, 3, o.h + 2, M);
        rect(ctx, x, top - 2, 1, o.h + 2, L);
        rect(ctx, x + 2, top - 2, 1, o.h + 2, D);
        rect(ctx, x - 1, top - 3, 5, 1, D);
      }
      // a few torn holes
      for (let i = 0; i < 3; i++) {
        const hx = Math.floor(rnd() * w);
        const hy = top + ri(rnd, 4, o.h - 10);
        wrap(w, hx, (x) => ctx.clearRect(x, hy, ri(rnd, 4, 8), ri(rnd, 3, 6)));
      }
    } else {
      // wood boards or ranch rails
      const rails = o.style === 'rail' ? [top + 3, top + Math.round(o.h * 0.55)] : [];
      if (o.style === 'wood') {
        for (let x = 0; x < w; x++) {
          const bi = Math.floor(x / 6);
          const bh = o.h - ((bi * 7) % 3);
          const c = x % 6 === 0 ? D : x % 6 === 1 ? L : M;
          rect(ctx, x, base - bh, 1, bh, c);
          if (x % 6 === 2 && (bi * 13) % 5 === 0) px(ctx, x + 1, base - bh + 6, D);
        }
        rect(ctx, 0, top + 4, w, 2, D);
        rect(ctx, 0, base - 8, w, 2, D);
      }
      for (const ry of rails) {
        rect(ctx, 0, ry, w, 3, M);
        rect(ctx, 0, ry, w, 1, L);
        rect(ctx, 0, ry + 3, w, 1, D);
      }
      if (o.style === 'rail')
        for (let i = 0; i < n; i++) {
          const x = Math.round(i * step);
          rect(ctx, x, top, 4, o.h, M);
          rect(ctx, x, top, 1, o.h, L);
          rect(ctx, x + 3, top, 1, o.h, D);
          rect(ctx, x, top, 4, 1, L);
        }
    }
  };
}

export interface LampOpts {
  color: string;
  light?: string;
  bulb: string;
  glow?: string;
  count: number;
  h: number;
  baseY?: number;
  style?: 'arc' | 'globe' | 'lantern';
  offset?: number;
}
export function lampPosts(o: LampOpts): Painter {
  return (ctx, w) => {
    const base = o.baseY ?? 163;
    const step = w / o.count;
    for (let i = 0; i < o.count; i++) {
      const x0 = Math.round(i * step + (o.offset ?? step / 2));
      wrap(w, x0, (x) => {
        const top = base - o.h;
        const style = o.style ?? 'arc';
        const hx = style === 'arc' ? x + 9 : x;
        const hy = style === 'arc' ? top + 3 : top - 2;
        if (o.glow) {
          glow(ctx, hx, hy + 3, 14, o.glow, 0.8);
          for (let j = 0; j < 30; j++) ditherRect(ctx, hx - 2 - Math.floor(j / 3), hy + 5 + j, 5 + Math.floor((j / 3) * 2), 1, o.glow, 0.25 * (1 - j / 30));
        }
        rect(ctx, x - 3, base - 5, 7, 5, o.color);
        rect(ctx, x - 2, base - 7, 5, 2, o.color);
        rect(ctx, x, top, 2, o.h, o.color);
        if (o.light) {
          rect(ctx, x, top, 1, o.h, o.light);
          rect(ctx, x - 3, base - 5, 1, 5, o.light);
        }
        if (style === 'arc') {
          rect(ctx, x, top - 1, 7, 2, o.color);
          rect(ctx, x + 6, top, 6, 3, o.color);
          rect(ctx, x + 7, top + 3, 4, 1, o.bulb);
          if (o.light) rect(ctx, x + 1, top - 1, 6, 1, o.light);
        } else if (style === 'globe') {
          disc(ctx, x + 1, top - 3, 3, o.bulb);
          px(ctx, x, top - 4, PAL.w);
        } else {
          rect(ctx, x - 2, top - 7, 6, 1, o.color);
          rect(ctx, x - 1, top - 6, 4, 5, o.bulb);
          rect(ctx, x - 2, top - 1, 6, 1, o.color);
          px(ctx, x + 1, top - 8, o.color);
        }
      }, 30);
    }
  };
}

export interface PowerOpts {
  color: string;
  light?: string;
  wire: string;
  count: number;
  h: number;
  baseY?: number;
  sag?: number;
  wires?: number;
}
export function powerLines(o: PowerOpts): Painter {
  return (ctx, w) => {
    const base = o.baseY ?? 166;
    const step = w / o.count;
    const top = base - o.h;
    const nw = o.wires ?? 3;
    const offs = [-7, 0, 7, -3, 3].slice(0, nw);
    for (let i = 0; i < o.count; i++) {
      const x0 = Math.round(i * step + step * 0.3);
      const x1 = Math.round((i + 1) * step + step * 0.3);
      for (const dx of offs) {
        const ax = x0 + dx + 1;
        const bx = x1 + dx + 1;
        for (let x = ax; x < bx; x++) {
          const t = (x - ax) / (bx - ax);
          const y = Math.round(top + 2 + (o.sag ?? 10) * 4 * t * (1 - t));
          px(ctx, ((x % w) + w) % w, y, o.wire);
        }
      }
      wrap(w, x0, (x) => {
        rect(ctx, x, top - 2, 3, o.h + 2, o.color);
        if (o.light) rect(ctx, x, top - 2, 1, o.h + 2, o.light);
        rect(ctx, x - 9, top + 1, 21, 2, o.color);
        for (const dx of offs) rect(ctx, x + dx + 1, top, 1, 2, o.light ?? o.color);
        for (let y = top + 12; y < base - 12; y += 4) px(ctx, x + 1, y, o.light ?? o.color);
      }, 24);
    }
  };
}

export interface PillarOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  h: [number, number];
  baseY?: number;
  width?: number;
  broken?: number; // chance
  arches?: boolean;
  moss?: string;
  outline?: string;
}
export function pillars(o: PillarOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    const [L, M, D] = o.colors;
    const W = o.width ?? 10;
    for (const x0 of spread(rnd, w, o.count, 0.6)) {
      const H = irange(rnd, o.h);
      const broken = rnd() < (o.broken ?? 0.4);
      const tops = Array.from({ length: W }, () => (broken ? ri(rnd, 0, 7) : 0));
      const arch = o.arches && rnd() < 0.5;
      const span = ri(rnd, 26, 40);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        const col = (cx: number, hh: number, brk: boolean) => {
          const top = base - hh;
          if (o.outline) rect(ctx, cx - 3, top - 1, W + 6, hh + 1, o.outline);
          rect(ctx, cx - 2, base - 5, W + 4, 5, M);
          rect(ctx, cx - 2, base - 5, W + 4, 1, L);
          rect(ctx, cx - 1, base - 7, W + 2, 2, D);
          for (let i = 0; i < W; i++) {
            const t = brk ? top + tops[i] + (i > W / 2 ? 2 : 0) : top + 5;
            const c = i === 0 ? L : i === W - 1 ? D : i % 3 === 2 ? D : i < W / 2 ? M : mix(M, D, 0.4);
            rect(ctx, cx + i, t, 1, base - 7 - t, c);
          }
          if (!brk) {
            rect(ctx, cx - 3, top, W + 6, 3, M);
            rect(ctx, cx - 3, top, W + 6, 1, L);
            rect(ctx, cx - 2, top + 3, W + 4, 2, D);
          }
          if (o.moss) for (let i = 0; i < 10; i++) rect(ctx, cx + ri(r, 0, W - 2), top + ri(r, 2, Math.max(3, hh - 10)), ri(r, 1, 3), ri(r, 1, 4), o.moss);
        };
        col(x, H, broken && !arch);
        if (arch) {
          col(x + span, H, false);
          const cx = x + (span + W) / 2;
          const R = (span + W) / 2;
          const top = base - H;
          ring(ctx, cx, top, R - W + 2, R + 2, M, (_dx, dy) => dy <= 0);
          ring(ctx, cx, top, R + 1, R + 2, L, (_dx, dy) => dy <= 0);
          ring(ctx, cx, top, R - W + 2, R - W + 3, D, (_dx, dy) => dy <= 0);
          for (let a = 0; a < 8; a++) {
            const an = Math.PI + (a / 8) * Math.PI;
            line(ctx, cx + Math.cos(an) * (R - W + 3), top + Math.sin(an) * (R - W + 3), cx + Math.cos(an) * (R + 1), top + Math.sin(an) * (R + 1), D);
          }
        } else if (broken) {
          rect(ctx, x + W + 3, base - 5, 7, 5, M);
          rect(ctx, x + W + 3, base - 5, 7, 1, L);
          rect(ctx, x + W + 9, base - 4, 1, 4, D);
        }
      });
    }
  };
}

export interface TempleOpts {
  style: 'greek' | 'pagoda' | 'ziggurat';
  colors: [string, string, string, string?]; // light, mid, dark, roof
  count: number;
  scale?: [number, number];
  baseY?: number;
  windows?: string;
}
export function temples(o: TempleOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const [L, M, D] = o.colors;
    const roof = o.colors[3] ?? D;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const s = range(rnd, o.scale ?? [1, 1]);
      wrap(w, x0, (cx) => {
        if (o.style === 'greek') {
          const W = Math.round(70 * s);
          const H = Math.round(42 * s);
          const x = cx - W / 2;
          for (let i = 0; i < 3; i++) {
            rect(ctx, x - 6 + i * 2, base - 3 * (i + 1), W + 12 - i * 4, 3, i % 2 ? M : L);
            rect(ctx, x - 6 + i * 2, base - 3 * (i + 1) + 2, W + 12 - i * 4, 1, D);
          }
          const ct = base - 9 - H;
          const nc = Math.max(4, Math.round(W / 12));
          for (let i = 0; i < nc; i++) {
            const px0 = Math.round(x + 2 + (i * (W - 8)) / (nc - 1));
            rect(ctx, px0, ct, 5, H, M);
            rect(ctx, px0, ct, 1, H, L);
            rect(ctx, px0 + 3, ct, 1, H, D);
          }
          rect(ctx, x - 3, ct - 6, W + 6, 6, M);
          rect(ctx, x - 3, ct - 6, W + 6, 1, L);
          rect(ctx, x - 3, ct - 1, W + 6, 1, D);
          for (let i = 0; i < W + 6; i += 4) px(ctx, x - 3 + i, ct - 3, D);
          const ph = Math.round(W * 0.22);
          for (let j = 0; j < ph; j++) {
            const hw = Math.round(((W + 8) / 2) * (j / ph));
            rect(ctx, cx - hw, ct - 6 - ph + j, hw * 2, 1, j === ph - 1 ? D : roof);
            px(ctx, cx - hw, ct - 6 - ph + j, L);
          }
          tri(ctx, cx, ct - 8, Math.round(W * 0.3), Math.round(ph * 0.6), M);
        } else if (o.style === 'pagoda') {
          let y = base;
          const tiers = 4;
          let tw = Math.round(48 * s);
          for (let t = 0; t < tiers; t++) {
            const th = Math.round(15 * s);
            rect(ctx, cx - tw / 2, y - th, tw, th, M);
            rect(ctx, cx - tw / 2, y - th, 2, th, L);
            rect(ctx, cx + tw / 2 - 2, y - th, 2, th, D);
            for (let i = cx - tw / 2 + 4; i < cx + tw / 2 - 4; i += 6) rect(ctx, i, y - th + 4, 3, 6, o.windows ?? D);
            y -= th;
            const rw = tw + Math.round(16 * s);
            for (let j = 0; j < 5; j++) rect(ctx, cx - rw / 2 + j * 2, y - j, rw - j * 4, 1, j === 0 ? D : roof);
            rect(ctx, cx - rw / 2 - 2, y - 2, 2, 1, roof);
            rect(ctx, cx + rw / 2, y - 2, 2, 1, roof);
            px(ctx, cx - rw / 2 - 3, y - 3, L);
            px(ctx, cx + rw / 2 + 2, y - 3, L);
            rect(ctx, cx - rw / 2 + 8, y - 5, rw - 16, 1, L);
            y -= 5;
            tw = Math.round(tw * 0.8);
          }
          rect(ctx, cx - 1, y - 12, 2, 12, D);
          for (let k = 0; k < 3; k++) rect(ctx, cx - 2, y - 4 - k * 3, 4, 1, L);
        } else {
          let y = base;
          let tw = Math.round(90 * s);
          for (let t = 0; t < 5; t++) {
            const th = Math.round(9 * s);
            rect(ctx, cx - tw / 2, y - th, tw, th, t % 2 ? M : mix(M, L, 0.3));
            rect(ctx, cx - tw / 2, y - th, tw, 1, L);
            rect(ctx, cx + tw / 2 - 3, y - th, 3, th, D);
            y -= th;
            tw -= Math.round(16 * s);
          }
          rect(ctx, cx - 4, base - 30 * s, 8, 30 * s, D);
          for (let k = 0; k < 30 * s; k += 3) rect(ctx, cx - 4, base - k, 8, 1, M);
          rect(ctx, cx - tw / 2 + 4, y - 10, tw - 8, 10, M);
          rect(ctx, cx - 3, y - 8, 6, 8, o.windows ?? D);
        }
      });
    }
  };
}

export interface DomeOpts {
  colors: [string, string, string]; // light, mid, dark
  window: string;
  count: number;
  r: [number, number];
  baseY?: number;
  beacon?: string;
}
export function domes(o: DomeOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    const [L, M, D] = o.colors;
    const xs = spread(rnd, w, o.count, 0.6);
    const rs = xs.map(() => irange(rnd, o.r));
    // connecting tubes
    for (let i = 0; i < xs.length; i++) {
      const a = xs[i];
      const b = i + 1 < xs.length ? xs[i + 1] : xs[0] + w;
      for (let x = a; x < b; x++) {
        const xx = ((x % w) + w) % w;
        rect(ctx, xx, base - 9, 1, 7, M);
        px(ctx, xx, base - 9, L);
        rect(ctx, xx, base - 3, 1, 1, D);
        if (x % 8 === 0) rect(ctx, xx, base - 10, 1, 9, D);
      }
    }
    xs.forEach((x0, i) => {
      const R = rs[i];
      const ry = Math.round(R * 0.8);
      wrap(w, x0, (cx) => {
        rect(ctx, cx - R - 2, base - 4, R * 2 + 5, 4, D);
        ellipse(ctx, cx, base - 3, R, ry, D, base - 4);
        ellipse(ctx, cx - 1, base - 4, R - 1, ry - 1, M, base - 4);
        ellipse(ctx, cx - Math.round(R * 0.35), base - 4 - Math.round(ry * 0.45), Math.round(R * 0.4), Math.round(ry * 0.35), L);
        for (let k = 1; k < 4; k++) {
          const yy = base - 4 - Math.round((ry * k) / 4);
          const hw = Math.round(R * Math.sqrt(1 - Math.pow(k / 4, 2)));
          ditherRect(ctx, cx - hw, yy, hw * 2, 1, D, 0.5);
        }
        rect(ctx, cx - 1, base - 4 - ry, 1, ry, mix(M, D, 0.5));
        for (let k = -R + 4; k < R - 4; k += 6) rect(ctx, cx + k, base - 9, 3, 2, o.window);
        rect(ctx, cx, base - 4 - ry - 8, 1, 8, D);
        if (o.beacon) px(ctx, cx, base - 4 - ry - 9, o.beacon);
      });
    });
  };
}

export interface FarmOpts {
  barn: [string, string, string]; // wall, wall shadow, trim
  roof: string;
  silo?: [string, string, string];
  windmill?: string;
  count?: number;
  baseY?: number;
  scale?: number;
}
export function farmstead(o: FarmOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const s = o.scale ?? 1;
    for (const x0 of spread(rnd, w, o.count ?? 1, 0.5)) {
      wrap(w, x0, (x) => {
        const W = Math.round(46 * s);
        const H = Math.round(24 * s);
        const top = base - H;
        // silo
        if (o.silo) {
          const sx = x + W + 2;
          const sh = Math.round(40 * s);
          const sw = Math.round(12 * s);
          rect(ctx, sx, base - sh, sw, sh, o.silo[1]);
          rect(ctx, sx, base - sh, 3, sh, o.silo[0]);
          rect(ctx, sx + sw - 3, base - sh, 3, sh, o.silo[2]);
          for (let y = base - sh + 6; y < base; y += 6) rect(ctx, sx, y, sw, 1, o.silo[2]);
          ellipse(ctx, sx + sw / 2, base - sh, sw / 2, Math.round(5 * s), o.silo[0], base - sh);
        }
        // barn body
        rect(ctx, x, top, W, H, o.barn[0]);
        rect(ctx, x + W - 4, top, 4, H, o.barn[1]);
        for (let i = 3; i < W; i += 4) rect(ctx, x + i, top, 1, H, o.barn[1]);
        // gable roof
        const rh = Math.round(16 * s);
        for (let j = 0; j < rh; j++) {
          const hw = Math.round((W / 2 + 3) * (j / rh));
          rect(ctx, x + W / 2 - hw, top - rh + j, hw * 2, 1, o.roof);
          if (j > 3) rect(ctx, x + W / 2 - hw + 3, top - rh + j, Math.max(0, hw * 2 - 6), 1, o.barn[0]);
        }
        rect(ctx, x - 3, top - 1, W + 6, 2, o.roof);
        // doors
        const dw = Math.round(18 * s);
        const dx = x + W / 2 - dw / 2;
        rect(ctx, dx, base - Math.round(16 * s), dw, Math.round(16 * s), o.barn[1]);
        rect(ctx, dx, base - Math.round(16 * s), dw, 1, o.barn[2]);
        rect(ctx, dx, base - Math.round(16 * s), 1, Math.round(16 * s), o.barn[2]);
        rect(ctx, dx + dw - 1, base - Math.round(16 * s), 1, Math.round(16 * s), o.barn[2]);
        line(ctx, dx, base - Math.round(16 * s), dx + dw - 1, base - 1, o.barn[2]);
        line(ctx, dx + dw - 1, base - Math.round(16 * s), dx, base - 1, o.barn[2]);
        rect(ctx, x + W / 2 - 3, top - rh + 7, 6, 5, o.barn[1]);
        rect(ctx, x + W / 2 - 3, top - rh + 7, 6, 1, o.barn[2]);
        // windmill
        if (o.windmill) {
          const mx = x - Math.round(26 * s);
          const mh = Math.round(52 * s);
          line(ctx, mx - 6 * s, base, mx, base - mh, o.windmill);
          line(ctx, mx + 6 * s, base, mx, base - mh, o.windmill);
          for (let y = base - mh + 8; y < base; y += 8) {
            const hw = ((y - (base - mh)) / mh) * 6 * s;
            rect(ctx, mx - hw, y, hw * 2 + 1, 1, o.windmill);
          }
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU + 0.2;
            line(ctx, mx, base - mh, mx + Math.cos(a) * 11 * s, base - mh + Math.sin(a) * 11 * s, o.windmill);
          }
          rect(ctx, mx + 1, base - mh - 1, 8, 3, o.windmill);
        }
      });
    }
  };
}

// Lattice girder between two points.
export function truss(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, vertical = false) {
  rect(ctx, x, y, vertical ? 1 : w, vertical ? h : 1, c);
  if (vertical) rect(ctx, x + w - 1, y, 1, h, c);
  else rect(ctx, x, y + h - 1, w, 1, c);
  if (vertical) {
    for (let j = 0; j < h; j += w) {
      line(ctx, x, y + j, x + w - 1, y + j + w - 1, c);
      rect(ctx, x, y + j, w, 1, c);
    }
  } else {
    for (let i = 0; i < w; i += h) {
      line(ctx, x + i, y + h - 1, x + i + h - 1, y, c);
      rect(ctx, x + i, y, 1, h, c);
    }
  }
}

export interface CraneOpts {
  color: string;
  light?: string;
  count: number;
  h: [number, number];
  baseY?: number;
  cab?: string;
}
export function cranes(o: CraneOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.6)) {
      const H = irange(rnd, o.h);
      const dir = rnd() < 0.5 ? 1 : -1;
      const boom = ri(rnd, 50, 80);
      const hook = ri(rnd, 15, 50);
      wrap(w, x0, (x) => {
        const top = base - H;
        truss(ctx, x, top, 6, H, o.color, true);
        truss(ctx, x + 26, top + 10, 6, H - 10, o.color, true);
        line(ctx, x + 6, top + 10, x + 26, top + 10, o.color, 2);
        const bx = dir > 0 ? x - 20 : x - boom + 32;
        truss(ctx, bx, top - 6, boom + 18, 6, o.color);
        rect(ctx, x + 1, top - 22, 4, 16, o.color);
        line(ctx, x + 3, top - 22, bx, top - 6, o.color);
        line(ctx, x + 3, top - 22, bx + boom + 17, top - 6, o.color);
        const hx = dir > 0 ? bx + boom + 8 : bx + 6;
        rect(ctx, hx, top, 1, hook, o.color);
        rect(ctx, hx - 2, top + hook, 5, 3, o.color);
        rect(ctx, x + 7, top - 4, 9, 7, o.cab ?? o.color);
        if (o.light) rect(ctx, x + 9, top - 2, 5, 2, o.light);
      });
    }
  };
}

export interface GirderOpts {
  color: string;
  light?: string;
  rows: Array<[number, number]>; // y, height
  towers?: number;
  baseY?: number;
  lights?: string;
}
export function girders(o: GirderOpts): Painter {
  return (ctx, w) => {
    const base = o.baseY ?? 166;
    for (const [y, h] of o.rows) {
      truss(ctx, 0, y, w, h, o.color);
      if (o.light) rect(ctx, 0, y, w, 1, o.light);
      if (o.lights) for (let x = 8; x < w; x += 32) px(ctx, x, y + h, o.lights);
    }
    const n = o.towers ?? 0;
    for (let i = 0; i < n; i++) {
      const x = Math.round((i + 0.5) * (w / n));
      const top = Math.min(...o.rows.map((r) => r[0]));
      truss(ctx, x, top, 8, base - top, o.color, true);
      if (o.light) rect(ctx, x, top, 1, base - top, o.light);
    }
  };
}

export interface PipeOpts {
  colors: [string, string, string]; // light, mid, dark
  rows: Array<[number, number]>; // y, thickness
  verticals?: number;
  flange?: string;
  baseY?: number;
  valve?: string;
  drip?: string;
}
export function pipes(o: PipeOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const [L, M, D] = o.colors;
    const fl = o.flange ?? D;
    const vx = Array.from({ length: o.verticals ?? 0 }, () => ({ x: Math.floor(rnd() * w), t: ri(rnd, 4, 7), from: o.rows.length ? pick(rnd, o.rows)[0] : -2, valve: rnd() < 0.5 }));
    for (const v of vx)
      wrap(w, v.x, (x) => {
        const y0 = v.from;
        rect(ctx, x, y0, v.t, base - y0, M);
        rect(ctx, x, y0, 1, base - y0, L);
        rect(ctx, x + v.t - 1, y0, 1, base - y0, D);
        for (let y = y0 + 20; y < base; y += 24) rect(ctx, x - 1, y, v.t + 2, 3, fl);
        if (v.valve && o.valve) {
          const vy = base - 30;
          ring(ctx, x + v.t / 2, vy, 3, 4, o.valve);
          rect(ctx, x + v.t / 2 - 4, vy, 9, 1, o.valve);
          rect(ctx, x + v.t / 2, vy - 4, 1, 9, o.valve);
        }
      });
    for (const [y, t] of o.rows) {
      rect(ctx, 0, y, w, t, M);
      rect(ctx, 0, y, w, 1, L);
      if (t > 4) rect(ctx, 0, y + 1, w, 1, mix(L, M, 0.5));
      rect(ctx, 0, y + t - 1, w, 1, D);
      for (let x = 16; x < w; x += 64) {
        rect(ctx, x, y - 1, 3, t + 2, fl);
        px(ctx, x + 1, y, L);
        px(ctx, x + 1, y + t - 1, D);
      }
      if (o.drip)
        for (let i = 0; i < 4; i++) {
          const x = Math.floor(rnd() * w);
          rect(ctx, x, y + t, 1, 2, o.drip);
          px(ctx, x, y + t + 4 + ri(rnd, 0, 6), o.drip);
        }
    }
  };
}

export interface WallOpts {
  style: 'brick' | 'tile' | 'panel' | 'stone' | 'plank' | 'concrete';
  colors: [string, string, string, string?]; // base, light, dark, accent
  y: number;
  bottom?: number;
  ragged?: number; // amplitude of a broken top edge
  holes?: { count: number; w: [number, number]; h: [number, number]; y: [number, number]; frame?: string; shape?: 'rect' | 'arch' | 'round' };
  posters?: string[];
}
// A textured wall band. Use holes and ragged tops so it never reads as a flat backdrop.
export function wall(o: WallOpts): Painter {
  return (ctx, w, h, rnd) => {
    const bottom = o.bottom ?? h;
    const [B, L, D] = o.colors;
    const f = o.ragged ? periodic(rnd, w, [[3, 1], [11, 0.6], [29, 0.4]]) : () => 0;
    for (let x = 0; x < w; x++) {
      const t = Math.round(o.y + (o.ragged ? (f(x) + 1) * o.ragged : 0));
      rect(ctx, x, t, 1, bottom - t, B);
      px(ctx, x, t, L);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const top = o.y;
    if (o.style === 'brick') {
      for (let y = top; y < bottom; y += 5) {
        rect(ctx, 0, y + 4, w, 1, D);
        const off = (Math.floor((y - top) / 5) % 2) * 6;
        for (let x = off; x < w; x += 12) {
          px(ctx, x, y, D);
          rect(ctx, x, y, 1, 4, D);
          const r = rnd();
          if (r < 0.15) rect(ctx, x + 1, y, 11, 4, mix(B, D, 0.3));
          else if (r < 0.25) rect(ctx, x + 1, y, 11, 4, mix(B, L, 0.25));
          px(ctx, x + 1, y, L);
        }
      }
    } else if (o.style === 'tile') {
      for (let y = top; y < bottom; y += 6)
        for (let x = 0; x < w; x += 6) {
          rect(ctx, x, y + 5, 6, 1, D);
          rect(ctx, x + 5, y, 1, 6, D);
          px(ctx, x + 1, y + 1, L);
          if (rnd() < 0.06) rect(ctx, x, y, 5, 5, mix(B, D, 0.25));
        }
    } else if (o.style === 'panel') {
      for (let y = top; y < bottom; y += 24)
        for (let x = 0; x < w; x += 32) {
          rect(ctx, x, y, 32, 1, L);
          rect(ctx, x, y, 1, 24, L);
          rect(ctx, x + 31, y, 1, 24, D);
          rect(ctx, x, y + 23, 32, 1, D);
          px(ctx, x + 3, y + 3, D);
          px(ctx, x + 28, y + 3, D);
          px(ctx, x + 3, y + 20, D);
          px(ctx, x + 28, y + 20, D);
          if (rnd() < 0.3) {
            rect(ctx, x + 8, y + 8, 16, 8, D);
            for (let k = 0; k < 4; k++) rect(ctx, x + 9, y + 9 + k * 2, 14, 1, mix(B, D, 0.5));
          }
        }
    } else if (o.style === 'stone') {
      for (let y = top; y < bottom; y += 9) {
        let x = -((Math.floor((y - top) / 9) % 2) * 7);
        while (x < w) {
          const bw = ri(rnd, 10, 18);
          rect(ctx, x, y + 8, bw, 1, D);
          rect(ctx, x + bw - 1, y, 1, 9, D);
          rect(ctx, x, y, bw - 1, 1, L);
          if (rnd() < 0.3) rect(ctx, x + 1, y + 1, bw - 3, 7, mix(B, rnd() < 0.5 ? L : D, 0.2));
          x += bw;
        }
      }
    } else if (o.style === 'plank') {
      for (let x = 0; x < w; x += 8) {
        rect(ctx, x, top, 1, bottom - top, D);
        rect(ctx, x + 1, top, 1, bottom - top, L);
        for (let k = 0; k < 2; k++) {
          const y = top + ri(rnd, 0, bottom - top);
          rect(ctx, x + 3, y, 3, 1, D);
        }
      }
    } else {
      for (let y = top; y < bottom; y += 20) rect(ctx, 0, y, w, 1, D);
      for (let x = 0; x < w; x += 64) rect(ctx, x, top, 1, bottom - top, D);
      for (let i = 0; i < w / 4; i++) px(ctx, Math.floor(rnd() * w), top + Math.floor(rnd() * (bottom - top)), rnd() < 0.5 ? D : L);
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(rnd() * w);
        const y = top + Math.floor(rnd() * (bottom - top - 30));
        const len = ri(rnd, 10, 30);
        ditherRect(ctx, x, y, 2, len, D, 0.5);
      }
    }
    if (o.posters) {
      for (const x0 of spread(rnd, w, Math.round(w / 90), 0.6)) {
        const pw = ri(rnd, 12, 20);
        const ph = ri(rnd, 16, 24);
        const py = Math.round(top + (bottom - top) * 0.3 + rr(rnd, -6, 6));
        const c = pick(rnd, o.posters);
        const seed = newSeed(rnd);
        wrap(w, x0, (x) => {
          const r = seeded(seed);
          rect(ctx, x, py, pw, ph, c);
          rect(ctx, x + 2, py + 2, pw - 4, Math.round(ph * 0.45), mix(c, PAL.w, 0.4));
          for (let k = 0; k < 3; k++) rect(ctx, x + 2, py + ph - 8 + k * 2, ri(r, 4, pw - 4), 1, mix(c, PAL.k, 0.5));
          rect(ctx, x + pw - 3, py + ph - 3, 3, 3, mix(c, PAL.k, 0.3));
        });
      }
    }
    ctx.restore();
    if (o.holes) {
      const ho = o.holes;
      for (const x0 of spread(rnd, w, ho.count, 0.5)) {
        const hw = irange(rnd, ho.w);
        const hh = irange(rnd, ho.h);
        const hy = irange(rnd, ho.y);
        wrap(w, x0, (x) => {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          if (ho.shape === 'arch') {
            rect(ctx, x, hy + hw / 2, hw, hh - hw / 2, '#000');
            disc(ctx, x + hw / 2, hy + hw / 2, Math.floor(hw / 2), '#000', hy + hw / 2);
          } else if (ho.shape === 'round') disc(ctx, x + hw / 2, hy + hh / 2, Math.floor(Math.min(hw, hh) / 2), '#000');
          else rect(ctx, x, hy, hw, hh, '#000');
          ctx.restore();
          if (ho.frame) {
            if (ho.shape === 'round') ring(ctx, x + hw / 2, hy + hh / 2, Math.floor(Math.min(hw, hh) / 2), Math.floor(Math.min(hw, hh) / 2) + 2, ho.frame);
            else if (ho.shape === 'arch') {
              ring(ctx, x + hw / 2, hy + hw / 2, Math.floor(hw / 2), Math.floor(hw / 2) + 2, ho.frame, (_dx, dy) => dy <= 0);
              rect(ctx, x - 2, hy + hw / 2, 2, hh - hw / 2, ho.frame);
              rect(ctx, x + hw, hy + hw / 2, 2, hh - hw / 2, ho.frame);
            } else {
              rect(ctx, x - 2, hy - 2, hw + 4, 2, ho.frame);
              rect(ctx, x - 2, hy + hh, hw + 4, 3, ho.frame);
              rect(ctx, x - 2, hy, 2, hh, ho.frame);
              rect(ctx, x + hw, hy, 2, hh, ho.frame);
              rect(ctx, x + Math.floor(hw / 2) - 1, hy, 2, hh, ho.frame);
            }
          }
        });
      }
    }
  };
}

export interface StallOpts {
  awnings: Array<[string, string]>;
  wood: [string, string, string]; // light, mid, dark
  goods: string[];
  lantern?: string;
  count: number;
  baseY?: number;
  glow?: string;
}
// Market stalls with striped roofs, counters and hanging lanterns.
export function stalls(o: StallOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 163;
    const [L, M, D] = o.wood;
    for (const x0 of spread(rnd, w, o.count, 0.5)) {
      const W = ri(rnd, 44, 60);
      const [a1, a2] = pick(rnd, o.awnings);
      const seed = newSeed(rnd);
      wrap(w, x0 - W / 2, (x) => {
        const r = seeded(seed);
        const top = base - 46;
        if (o.glow) glow(ctx, x + W / 2, base - 24, 26, o.glow, 0.5);
        rect(ctx, x + 1, top, 2, 46, D);
        rect(ctx, x + W - 3, top, 2, 46, D);
        rect(ctx, x + 3, base - 16 - 22, W - 6, 22, mix(D, PAL.k, 0.4));
        // roof
        for (let j = 0; j < 8; j++) {
          const ww = W + 6 - (7 - j) * 2;
          for (let i = 0; i < ww; i++) px(ctx, x + W / 2 - ww / 2 + i, top - 8 + j, Math.floor(i / 5) % 2 ? a2 : a1);
        }
        for (let i = 0; i < W + 6; i++) if (i % 5 < 4) px(ctx, x - 3 + i, top, Math.floor(i / 5) % 2 ? a2 : a1);
        rect(ctx, x - 3, top - 9, W + 6, 1, mix(a1, PAL.k, 0.5));
        // counter
        rect(ctx, x, base - 16, W, 16, M);
        rect(ctx, x, base - 16, W, 2, L);
        for (let i = 4; i < W; i += 7) rect(ctx, x + i, base - 13, 1, 13, D);
        // goods
        for (let i = 3; i < W - 3; i += 4) {
          const gh = ri(r, 2, 5);
          const c = pick(r, o.goods);
          rect(ctx, x + i, base - 16 - gh, 3, gh, c);
          px(ctx, x + i, base - 16 - gh, mix(c, PAL.w, 0.4));
        }
        if (o.lantern) {
          for (let k = 0; k < 2; k++) {
            const lx = x + 8 + k * (W - 18);
            rect(ctx, lx + 1, top + 1, 1, 4, D);
            ellipse(ctx, lx + 1, top + 9, 3, 4, o.lantern);
            rect(ctx, lx - 1, top + 5, 5, 1, mix(o.lantern, PAL.k, 0.4));
            rect(ctx, lx - 1, top + 13, 5, 1, mix(o.lantern, PAL.k, 0.4));
            px(ctx, lx, top + 8, PAL.y);
          }
        }
      });
    }
  };
}

export interface LightsOpts {
  y: number;
  sag: number;
  span: number;
  colors: string[];
  wire?: string;
  every?: number;
  glow?: boolean;
  flags?: boolean; // bunting triangles instead of bulbs
  lanterns?: boolean;
}
// Strings of bulbs, bunting or lanterns sagging between invisible anchors.
export function stringLights(o: LightsOpts): Painter {
  return (ctx, w) => {
    const n = Math.max(1, Math.round(w / o.span));
    const sp = w / n;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const a = i * sp;
      for (let x = Math.floor(a); x < Math.floor(a + sp); x++) {
        const t = (x - a) / sp;
        const y = Math.round(o.y + o.sag * 4 * t * (1 - t));
        if (o.wire) px(ctx, x, y, o.wire);
        const ev = o.every ?? (o.flags ? 8 : o.lanterns ? 18 : 6);
        if ((x - Math.floor(a)) % ev === Math.floor(ev / 2)) {
          const c = o.colors[k++ % o.colors.length];
          wrap(w, x, (xx) => {
            if (o.flags) {
              for (let j = 0; j < 6; j++) rect(ctx, xx - 3 + Math.floor(j / 2), y + 1 + j, 6 - Math.floor(j / 2) * 2, 1, c);
              px(ctx, xx - 3, y + 1, mix(c, PAL.w, 0.4));
            } else if (o.lanterns) {
              rect(ctx, xx, y + 1, 1, 2, o.wire ?? PAL.k);
              if (o.glow) glow(ctx, xx, y + 7, 8, c, 0.6);
              ellipse(ctx, xx, y + 7, 3, 4, c);
              rect(ctx, xx - 2, y + 3, 5, 1, mix(c, PAL.k, 0.5));
              rect(ctx, xx - 2, y + 11, 5, 1, mix(c, PAL.k, 0.5));
              px(ctx, xx - 1, y + 6, mix(c, PAL.w, 0.5));
              rect(ctx, xx, y + 12, 1, 3, PAL.O);
            } else {
              if (o.glow) ditherDisc(ctx, xx, y + 2, 3, c, 0.35);
              rect(ctx, xx, y + 1, 1, 1, o.wire ?? PAL.k);
              rect(ctx, xx - 1, y + 2, 2, 2, c);
              px(ctx, xx - 1, y + 2, mix(c, PAL.w, 0.6));
            }
          });
        }
      }
    }
  };
}

export interface NeonOpts {
  colors: string[];
  back?: string;
  count: number;
  y: [number, number];
  size?: [number, number];
  vertical?: number; // chance of a tall narrow sign
}
export function neonSigns(o: NeonOpts): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const vert = rnd() < (o.vertical ?? 0.4);
      const n = ri(rnd, 2, 5);
      const sw = vert ? 9 : 4 * n + 5;
      const sh = vert ? 6 * n + 4 : 11;
      const y = irange(rnd, o.y);
      const c = pick(rnd, o.colors);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        glow(ctx, x + sw / 2, y + sh / 2, Math.round(Math.max(sw, sh) * 0.8), c, 0.35);
        rect(ctx, x, y, sw, sh, o.back ?? PAL.H);
        rect(ctx, x, y, sw, 1, c);
        rect(ctx, x, y + sh - 1, sw, 1, c);
        rect(ctx, x, y, 1, sh, c);
        rect(ctx, x + sw - 1, y, 1, sh, c);
        const lc = mix(c, PAL.w, 0.45);
        if (vert) for (let i = 0; i < n; i++) glyph(ctx, x + 3, y + 3 + i * 6, lc, r, 3, 4);
        else for (let i = 0; i < n; i++) glyph(ctx, x + 3 + i * 4, y + 3, lc, r, 3, 5);
        rect(ctx, x + Math.floor(sw / 2), y + sh, 1, 3, o.back ?? PAL.H);
        rect(ctx, x + (vert ? 3 : 2), y - 3, 1, 3, PAL.d);
        rect(ctx, x + sw - (vert ? 4 : 3), y - 3, 1, 3, PAL.d);
      });
    }
  };
}

export interface GearOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  r: [number, number];
  y: [number, number];
  outline?: string;
}
export function gears(o: GearOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const [L, M, D] = o.colors;
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const R = irange(rnd, o.r);
      const cy = irange(rnd, o.y);
      const teeth = Math.max(6, Math.round(R * 0.7));
      const spokes = ri(rnd, 3, 6);
      const rot = rnd() * TAU;
      const th = Math.max(2, Math.round(R * 0.18));
      wrap(w, x0, (cx) => {
        const RR = R + th + 1;
        for (let dy = -RR; dy <= RR; dy++)
          for (let dx = -RR; dx <= RR; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            const a = Math.atan2(dy, dx) + rot;
            const tooth = Math.cos(a * teeth) > 0.2;
            const outer = R + (tooth ? th : 0);
            if (d > outer + 0.3) {
              if (o.outline && d <= outer + 1.3) px(ctx, cx + dx, cy + dy, o.outline);
              continue;
            }
            const rimIn = R - Math.max(3, Math.round(R * 0.2));
            const hubR = Math.max(2, Math.round(R * 0.3));
            let inside = d >= rimIn || d <= hubR;
            if (!inside) {
              const sa = ((a * spokes) / TAU) % 1;
              const ang = Math.abs(sa - Math.round(sa)) * (TAU / spokes) * d;
              inside = ang < Math.max(1.5, R * 0.09);
            }
            if (d < hubR * 0.45) continue;
            if (!inside) continue;
            const s = (dx + dy) / (d || 1);
            const c = s < -0.5 && (d > outer - 2 || d < hubR + 1) ? L : s > 0.5 && d > outer - 2 ? D : M;
            px(ctx, cx + dx, cy + dy, c);
          }
      });
    }
  };
}

export interface CaneOpts {
  colors: [string, string]; // stripe, base
  count: number;
  h: [number, number];
  baseY?: number;
  thick?: number;
  outline?: string;
}
export function candyCanes(o: CaneOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const t = o.thick ?? 5;
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const H = irange(rnd, o.h);
      const R = ri(rnd, 5, 8);
      const flip = rnd() < 0.5 ? 1 : -1;
      wrap(w, x0, (x) => {
        const top = base - H;
        const col = (px0: number, py: number) => ((px0 + py) % 8 + 8) % 8 < 3 ? o.colors[0] : o.colors[1];
        const P = (xx: number, yy: number, edge: boolean) => px(ctx, xx, yy, edge && o.outline ? o.outline : col(xx, yy));
        for (let y = top; y < base; y++) for (let i = -1; i <= t; i++) P(x + i, y, i === -1 || i === t);
        const cx = x + (t - 1) / 2 + R * flip;
        for (let dy = -R - t; dy <= 0; dy++)
          for (let dx = -R - t; dx <= R + t; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= R - t / 2 - 1 && d <= R + t / 2 + 1) P(Math.round(cx + dx), top + dy, d < R - t / 2 || d > R + t / 2);
          }
        const ex = x + 2 * R * flip;
        for (let y = top; y < top + R; y++) for (let i = -1; i <= t; i++) P(ex + i, y, i === -1 || i === t || y === top + R - 1);
        for (let y = top - R; y < base; y += 1) if (dmask(x + 1, y, 0.5)) px(ctx, x + 1, y, PAL.w);
      });
    }
  };
}

export interface LollyOpts {
  colors: Array<[string, string]>;
  count: number;
  h: [number, number];
  r: [number, number];
  baseY?: number;
  stick?: string;
  outline?: string;
}
export function lollipops(o: LollyOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const H = irange(rnd, o.h);
      const R = irange(rnd, o.r);
      const [c1, c2] = pick(rnd, o.colors);
      wrap(w, x0, (x) => {
        rect(ctx, x - 1, base - H, 3, H, o.stick ?? PAL.w);
        px(ctx, x + 1, base - H, PAL.l);
        rect(ctx, x + 1, base - H, 1, H, PAL.l);
        const cy = base - H - R + 2;
        if (o.outline) disc(ctx, x, cy, R + 1, o.outline);
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > R + 0.4) continue;
            const s = ((Math.atan2(dy, dx) / TAU) * 3 + d / (R * 0.8) + 10) % 1;
            px(ctx, x + dx, cy + dy, s < 0.5 ? c1 : c2);
          }
        disc(ctx, x - Math.round(R * 0.4), cy - Math.round(R * 0.4), Math.max(1, Math.round(R * 0.15)), PAL.w);
      });
    }
  };
}

export interface BlockOpts {
  colors: string[];
  count: number;
  size: [number, number];
  baseY?: number;
  letters?: string;
  outline?: string;
}
export function toyBlocks(o: BlockOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    const letters = o.letters ?? 'ABCXYZ123';
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const S = irange(rnd, o.size);
      const n = ri(rnd, 1, 3);
      const stack = Array.from({ length: n }, (_, i) => ({ dx: i === 0 ? 0 : ri(rnd, -4, 4), c: pick(rnd, o.colors), ch: letters[ri(rnd, 0, letters.length - 1)], s: i === 0 ? S : Math.max(10, S - i * 3) }));
      wrap(w, x0, (x) => {
        let y = base;
        for (const b of stack) {
          const bx = x + b.dx + (S - b.s) / 2;
          const by = y - b.s;
          bevel(ctx, bx, by, b.s, b.s, b.c, o.outline ?? PAL.k);
          rect(ctx, bx + 1, by + 1, b.s - 2, 2, mix(b.c, PAL.w, 0.35));
          rect(ctx, bx + b.s - 3, by + 2, 2, b.s - 3, mix(b.c, PAL.k, 0.3));
          const inset = Math.round(b.s * 0.22);
          rect(ctx, bx + inset, by + inset, b.s - inset * 2, b.s - inset * 2, mix(b.c, PAL.w, 0.55));
          const sc = Math.max(1, Math.floor((b.s - inset * 2 - 2) / 5));
          const tx = bx + Math.round(b.s / 2 - 1.5 * sc);
          const ty = by + Math.round(b.s / 2 - 2.5 * sc);
          const g = FONT[b.ch];
          if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') rect(ctx, tx + (i % 3) * sc, ty + Math.floor(i / 3) * sc, sc, sc, mix(b.c, PAL.k, 0.25));
          y = by;
        }
      });
    }
  };
}

export interface BoneOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  scale?: [number, number];
  baseY?: number;
  outline?: string;
}
// Giant rib cages, tusks and skulls half sunk in the ground.
export function bones(o: BoneOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const [L, M, D] = o.colors;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const s = range(rnd, o.scale ?? [1, 1]);
      const kind = ri(rnd, 0, 2);
      wrap(w, x0, (x) => {
        if (kind === 0) {
          // ribcage
          const W = Math.round(70 * s);
          const H = Math.round(44 * s);
          const sy = base - H;
          for (let i = 0; i < W; i++) {
            const y = Math.round(sy + Math.pow((i - W / 2) / (W / 2), 2) * 6);
            rect(ctx, x + i, y, 1, 4, M);
            px(ctx, x + i, y, L);
            if (i % 5 === 0) rect(ctx, x + i, y - 1, 2, 6, D);
          }
          for (let i = 4; i < W - 4; i += Math.round(9 * s)) {
            const y0 = Math.round(sy + Math.pow((i - W / 2) / (W / 2), 2) * 6) + 3;
            const len = base - y0;
            for (let j = 0; j < len; j++) {
              const t = j / len;
              const xx = Math.round(x + i + Math.sin(t * Math.PI) * 9 * s - t * 3);
              rect(ctx, xx, y0 + j, 3, 1, M);
              px(ctx, xx, y0 + j, L);
              px(ctx, xx + 2, y0 + j, D);
            }
          }
        } else if (kind === 1) {
          // tusk
          const R = Math.round(30 * s);
          for (let a = 0; a < 60; a++) {
            const t = a / 60;
            const an = Math.PI - t * Math.PI * 0.75;
            const th = Math.max(1, Math.round(6 * s * (1 - t)));
            const cx = x + R + Math.cos(an) * R;
            const cy = base - Math.sin(an) * R * 1.3;
            rect(ctx, cx - th / 2, cy, th, th + 1, M);
            px(ctx, cx - th / 2, cy, L);
            if (th > 2) px(ctx, cx + th / 2 - 1, cy + th, D);
          }
        } else {
          // skull
          const R = Math.round(14 * s);
          const cy = base - R;
          if (o.outline) disc(ctx, x, cy, R + 1, o.outline, base);
          disc(ctx, x, cy, R, M, base);
          disc(ctx, x - 2, cy - 2, R - 2, L, cy);
          rect(ctx, x - R + 3, cy + 2, R * 2 - 5, R - 2, M);
          disc(ctx, x - Math.round(R * 0.45), cy + 1, Math.max(2, Math.round(R * 0.28)), D);
          disc(ctx, x + Math.round(R * 0.45), cy + 1, Math.max(2, Math.round(R * 0.28)), D);
          tri(ctx, x, cy + Math.round(R * 0.65), 2, 3, D);
          for (let i = -R + 5; i < R - 4; i += 3) rect(ctx, x + i, base - 4, 2, 3, L);
        }
      });
    }
  };
}

export interface JunkOpts {
  colors: string[]; // junk item colours
  base: string; // mound colour
  shade: string;
  count: number;
  h: [number, number];
  w: [number, number];
  baseY?: number;
}
// Heaps of junk: a mound packed with fridges, tyres, panels and pipes.
export function junkPiles(o: JunkOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const W = irange(rnd, o.w);
      const H = irange(rnd, o.h);
      const seed = newSeed(rnd);
      wrap(w, x0 - W / 2, (x) => {
        const r = seeded(seed);
        const tops: number[] = [];
        for (let i = 0; i < W; i++) {
          const t = (i / W) * 2 - 1;
          tops.push(Math.round(base - H * Math.sqrt(Math.max(0, 1 - t * t)) * (0.9 + 0.1 * Math.sin(i * 0.7))));
        }
        // poking-out items behind the outline
        for (let k = 0; k < 4; k++) {
          const i = ri(r, Math.floor(W * 0.2), Math.floor(W * 0.8));
          const c = pick(r, o.colors);
          if (r() < 0.5) line(ctx, x + i, tops[i] + 4, x + i + ri(r, -10, 10), tops[i] - ri(r, 8, 16), c, 2);
          else {
            const bw = ri(r, 6, 12);
            const bh = ri(r, 8, 14);
            bevel(ctx, x + i - bw / 2, tops[i] - bh + 4, bw, bh, c, o.shade);
          }
        }
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < W; i++) ctx.rect(x + i, tops[i], 1, base - tops[i]);
        ctx.clip();
        for (let i = 0; i < W; i++) rect(ctx, x + i, tops[i], 1, base - tops[i], o.base);
        const items = Math.round((W * H) / 45);
        for (let k = 0; k < items; k++) {
          const ix = x + ri(r, 0, W);
          const iy = ri(r, base - H, base);
          const c = pick(r, o.colors);
          const t = r();
          if (t < 0.25) {
            ring(ctx, ix, iy, 2, 4, PAL.k);
            ring(ctx, ix, iy, 4, 4.5, PAL.d);
          } else if (t < 0.5) line(ctx, ix, iy, ix + ri(r, -12, 12), iy + ri(r, -6, 6), c, 2);
          else bevel(ctx, ix, iy, ri(r, 5, 12), ri(r, 4, 9), c);
        }
        ditherFade(ctx, x, base - H, W, H, o.shade, 0, 0.55);
        ctx.restore();
        for (let i = 0; i < W; i++) px(ctx, x + i, tops[i], mix(o.base, PAL.w, 0.25));
      });
    }
  };
}

export interface LavaOpts {
  rock: [string, string, string]; // light, mid, dark
  lava: [string, string, string]; // hot, mid, dark
  count: number;
  h: [number, number];
  baseY?: number;
}
// Dark rock spires with glowing lava falls and pools.
export function lavaFalls(o: LavaOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const [L, M, D] = o.rock;
    const [hot, mid, dk] = o.lava;
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const H = irange(rnd, o.h);
      const W = ri(rnd, 26, 44);
      const prof = Array.from({ length: W }, (_, i) => {
        const t = (i / (W - 1)) * 2 - 1;
        return Math.round(base - H * (1 - Math.pow(Math.abs(t), 2.2)) + rr(rnd, -3, 3));
      });
      const fall = rnd() < 0.7;
      const fx = ri(rnd, Math.floor(W * 0.35), Math.floor(W * 0.6));
      wrap(w, x0 - W / 2, (x) => {
        glow(ctx, x + W / 2, base - 4, Math.round(W * 0.8), dk, 0.6);
        for (let i = 0; i < W; i++) {
          const t = prof[i];
          rect(ctx, x + i, t, 1, base - t + 4, i < W * 0.35 ? M : D);
          px(ctx, x + i, t, L);
          if (i % 7 === 3) ditherRect(ctx, x + i, t + 3, 1, base - t, L, 0.25);
        }
        if (fall) {
          const top = prof[fx] + 4;
          for (let y = top; y < base; y++) {
            const ww = 3 + Math.floor((y - top) / 30);
            rect(ctx, x + fx - 1, y, ww + 2, 1, dk);
            rect(ctx, x + fx, y, ww, 1, (y + Math.floor(y / 4)) % 5 === 0 ? hot : mid);
            px(ctx, x + fx + 1, y, hot);
          }
          ellipse(ctx, x + fx + 2, base - 1, 9, 3, mid, base);
          ellipse(ctx, x + fx + 2, base - 1, 5, 2, hot, base);
        }
        for (let k = 0; k < 4; k++) {
          const i = (fx + k * 9) % W;
          line(ctx, x + i, prof[i] + 6, x + i + 3, prof[i] + 14, mid);
        }
      });
    }
  };
}

export interface RockOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  size: [number, number];
  baseY?: number;
  outline?: string;
  flat?: number;
  moss?: string;
}
export function rocks(o: RockOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 164;
    for (const x0 of spread(rnd, w, o.count, 1.3)) {
      const R = irange(rnd, o.size);
      const ry = Math.round(R * (o.flat ?? rr(rnd, 0.55, 0.85)));
      const crack = rnd() < 0.5;
      wrap(w, x0, (x) => {
        if (o.outline) ellipse(ctx, x, base, R + 1, ry + 1, o.outline, base);
        ellipse(ctx, x, base, R, ry, o.colors[2], base);
        ellipse(ctx, x - 1, base - 1, R - 2, ry - 1, o.colors[1], base - 2);
        ellipse(ctx, x - Math.round(R * 0.35), base - Math.round(ry * 0.55), Math.round(R * 0.4), Math.round(ry * 0.3), o.colors[0]);
        if (crack) line(ctx, x + R * 0.2, base - ry + 2, x + R * 0.35, base - ry * 0.4, o.colors[2]);
        if (o.moss) {
          ellipse(ctx, x - 1, base - ry, Math.round(R * 0.6), 1, o.moss);
          px(ctx, x - Math.round(R * 0.4), base - ry + 2, o.moss);
        }
      });
    }
  };
}

export interface ScatterOpts {
  items: Array<[Sprite, number]>; // sprite, weight
  count: number;
  baseY?: number;
  dy?: [number, number];
  jitter?: number;
}
// Places sprites along the layer.
export function scatter(o: ScatterOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const total = o.items.reduce((s, i) => s + i[1], 0);
    for (const x0 of spread(rnd, w, o.count, o.jitter ?? 0.9)) {
      let t = rnd() * total;
      let spr = o.items[0][0];
      for (const [s, wt] of o.items) {
        t -= wt;
        if (t <= 0) {
          spr = s;
          break;
        }
      }
      const by = (o.baseY ?? 161) + (o.dy ? ri(rnd, o.dy[0], o.dy[1]) : 0);
      wrapR(w, x0, rnd, (x, r) => spr(ctx, x, by, r));
    }
  };
}

// ================================================================ SPRITES

const TRASH_CAN = [
  '......kkkk......',
  '.....klwwlk.....',
  '..kkkkkkkkkkkk..',
  '.kwwllllllllggk.',
  '.kllllllllllgdk.',
  '..kkkkkkkkkkkk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kgllglllgddk..',
  '...kkkkkkkkkk...',
];
const TRASH_CAN_OPEN = [
  '.....n...G......',
  '...yynk.GGr.....',
  '..kkkkkkkkkkkk..',
  '..kaaddadadadk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kwllglllgldk..',
  '..kllllllllgdk..',
  '..kwllglllgldk..',
  '..kgllglllgddk..',
  '...kkkkkkkkkk...',
];
const LID = ['...kkkk...', '..kllllk..', 'kkkkkkkkkk', 'kwllllllgk', '.kkkkkkkk.'];
const BIN = [
  '.kkkkkkkkkkkkkk.',
  'kGGGGGGGGGGGGGFk',
  'kFFFFFFFFFFFFFEk',
  '.kkkkkkkkkkkkkk.',
  '.kGFFFFFFFFFFEk.',
  '.kGFFFFFFFFFFEk.',
  '.kGFFEFFFFEFFEk.',
  '.kGFFEFFFFEFFEk.',
  '.kGFFEFFFFEFFEk.',
  '.kGFFFFFFFFFFEk.',
  '.kGFwwwwwwFFFEk.',
  '.kGFwddddwFFFEk.',
  '.kGFwwwwwwFFFEk.',
  '.kGFFFFFFFFFFEk.',
  '.kGFFEFFFFEFFEk.',
  '.kGFFEFFFFEFFEk.',
  '.kGFFFFFFFFFFEk.',
  '.kGFFFFFFFFFFEk.',
  '.kkkkkkkkkkkkkk.',
  '..kdk......kdk..',
  '..kkk......kkk..',
];
const BAG = [
  '......kk......',
  '.....kddk.....',
  '......kk......',
  '....kkaakk....',
  '..kkaagaaakk..',
  '.kaaggaaaadak.',
  'kaagaaaaaaddak',
  'kaaaaaaaaaddak',
  'kaaaaaaaadddak',
  '.kaaaaaaddddk.',
  '..kkkkkkkkkk..',
];
const HYDRANT = [
  '...kkkk...',
  '..korrRk..',
  '.kkkkkkkk.',
  '.korrrrRk.',
  'kkorrrrRkk',
  'kgorrrrRgk',
  'kkorrrrRkk',
  '.korrrrRk.',
  '.korrrrRk.',
  '.korrrrRk.',
  '.korrrrRk.',
  'kkkkkkkkkk',
  'klllllllgk',
  'kkkkkkkkkk',
];
const CONE = [
  '.....kk.....',
  '....kook....',
  '....kork....',
  '...kwwwwk...',
  '...kwwwwk...',
  '..koooorrk..',
  '..koooorrk..',
  '.kwwwwwwwwk.',
  '.kwwwwwwwwk.',
  '.koooooorrk.',
  'kkkkkkkkkkkk',
  'kddddddddddk',
  'kkkkkkkkkkkk',
];
const SKULL = [
  '..kkkkk..',
  '.kwwwwlk.',
  'kwwwwwwlk',
  'kwkkwkklk',
  'kwkkwkklk',
  'kwwwkwwlk',
  '.kwlwlwk.',
  '..kkkkk..',
];
const TIRE = [
  '...kkkkkk...',
  '.kkddddddkk.',
  'kddkkkkkkddk',
  'kdkk....kkdk',
  'kdk......kdk',
  'kdkk....kkdk',
  'kddkkkkkkddk',
  '.kkddddddkk.',
  '...kkkkkk...',
];

export const sprMap = (map: readonly string[], swaps?: Array<Record<string, string>>): Sprite => (ctx, x, by, r) =>
  drawMap(ctx, map, x, by - map.length, { swap: swaps ? pick(r, swaps) : undefined, flip: r() < 0.5 });

const BIN_SWAPS: Array<Record<string, string>> = [
  {},
  { G: PAL.c, F: PAL.b, E: PAL.B },
  { G: PAL.l, F: PAL.g, E: PAL.d },
  { G: PAL.L, F: PAL.G, E: PAL.F },
];
const BAG_SWAPS: Array<Record<string, string>> = [{}, {}, { a: PAL.F, d: PAL.E, g: PAL.z }, { a: PAL.g, d: PAL.a, g: PAL.l }];
const CAR_COLORS = [PAL.r, PAL.b, PAL.D, PAL.O, PAL.e, PAL.l, PAL.G, PAL.n];

function car(ctx: Ctx, x: number, base: number, r: Rnd, color?: string) {
  const c = color ?? pick(r, CAR_COLORS);
  const L = mix(c, PAL.w, 0.35);
  const D = mix(c, PAL.k, 0.4);
  const K = PAL.k;
  const W = 50;
  const van = r() < 0.25;
  const cab0 = van ? 4 : 12;
  const cab1 = van ? 36 : 34;
  const roofY = base - (van ? 24 : 20);
  const beltY = base - 13;
  // outline
  rect(ctx, x, beltY - 1, W, 10, K);
  for (let j = 0; j <= beltY - roofY; j++) {
    const y = roofY + j - 1;
    const a = cab0 - Math.min(j, 3) + 3;
    const b = cab1 + Math.min(j, 6);
    rect(ctx, x + a - 1, y, b - a + 2, 1, K);
  }
  // cabin and glass
  for (let j = 0; j < beltY - roofY; j++) {
    const y = roofY + j;
    const a = cab0 - Math.min(j, 3) + 3;
    const b = cab1 + Math.min(j, 6);
    rect(ctx, x + a, y, b - a, 1, j === 0 ? L : c);
    if (j >= 2) {
      const ga = a + 2;
      const gb = b - 2;
      rect(ctx, x + ga, y, gb - ga, 1, j === 2 ? PAL.i : PAL.l);
      rect(ctx, x + Math.round((ga + gb) / 2), y, 2, 1, c);
    }
  }
  line(ctx, x + cab0 + 7, roofY + 3, x + cab0 + 11, roofY + 3, PAL.w);
  // body
  rect(ctx, x + 1, beltY, W - 2, 8, c);
  rect(ctx, x + 1, beltY, W - 2, 1, L);
  rect(ctx, x + 1, beltY + 6, W - 2, 2, D);
  rect(ctx, x + Math.round(W / 2), beltY, 1, 6, D);
  rect(ctx, x + Math.round(W / 2) + 3, beltY + 2, 2, 1, D);
  rect(ctx, x + W - 3, beltY + 1, 2, 2, PAL.y);
  rect(ctx, x + 1, beltY + 1, 1, 2, PAL.r);
  rect(ctx, x - 1, beltY + 4, 3, 2, PAL.l);
  rect(ctx, x + W - 2, beltY + 4, 3, 2, PAL.l);
  // wheels
  for (const wx of [x + 10, x + W - 11]) {
    disc(ctx, wx, base - 4, 5, K);
    disc(ctx, wx, base - 4, 4, PAL.d);
    disc(ctx, wx, base - 4, 2, PAL.l);
    px(ctx, wx, base - 4, PAL.g);
  }
  if (r() < 0.3) {
    // rust and a dent: it's trash street
    ditherRect(ctx, x + 4, beltY + 3, 6, 3, PAL.n, 0.5);
  }
}
function box(ctx: Ctx, x: number, base: number, r: Rnd) {
  const w = ri(r, 10, 16);
  const h = ri(r, 7, 11);
  bevel(ctx, x, base - h, w, h, PAL.T, PAL.k, PAL.s, PAL.S);
  rect(ctx, x, base - h, w, 2, PAL.s);
  rect(ctx, x + Math.floor(w / 2) - 1, base - h, 2, h, mix(PAL.T, PAL.S, 0.6));
  if (r() < 0.5) {
    line(ctx, x - 1, base - h - 1, x - 3, base - h - 4, PAL.T);
    line(ctx, x + w, base - h - 1, x + w + 2, base - h - 4, PAL.S);
  }
}
function crate(ctx: Ctx, x: number, base: number, r: Rnd) {
  const s = ri(r, 12, 16);
  bevel(ctx, x, base - s, s, s, PAL.n, PAL.k, PAL.T, PAL.N);
  rect(ctx, x + 2, base - s + 2, s - 4, s - 4, PAL.N);
  for (let y = base - s + 4; y < base - 2; y += 3) rect(ctx, x + 2, y, s - 4, 1, PAL.n);
  line(ctx, x + 2, base - 3, x + s - 3, base - s + 2, PAL.T, 2);
}
function barrel(ctx: Ctx, x: number, base: number, r: Rnd) {
  const toxic = r() < 0.4;
  const c = toxic ? PAL.G : pick(r, [PAL.b, PAL.r, PAL.n]);
  bevel(ctx, x, base - 16, 12, 16, c, PAL.k);
  rect(ctx, x, base - 12, 12, 1, mix(c, PAL.k, 0.4));
  rect(ctx, x, base - 5, 12, 1, mix(c, PAL.k, 0.4));
  rect(ctx, x + 2, base - 16, 2, 15, mix(c, PAL.w, 0.3));
  if (toxic) {
    rect(ctx, x + 5, base - 10, 3, 3, PAL.y);
    rect(ctx, x + 2, base - 18, 5, 2, PAL.L);
  }
}
function bench(ctx: Ctx, x: number, base: number) {
  rect(ctx, x, base - 8, 26, 2, PAL.n);
  rect(ctx, x, base - 8, 26, 1, PAL.T);
  rect(ctx, x, base - 14, 26, 2, PAL.n);
  rect(ctx, x, base - 14, 26, 1, PAL.T);
  rect(ctx, x + 2, base - 15, 2, 15, PAL.d);
  rect(ctx, x + 22, base - 15, 2, 15, PAL.d);
}
function acUnit(ctx: Ctx, x: number, base: number) {
  bevel(ctx, x, base - 12, 18, 12, PAL.l, PAL.k);
  ring(ctx, x + 6, base - 6, 2, 4, PAL.g);
  for (let i = 11; i < 16; i += 2) rect(ctx, x + i, base - 10, 1, 8, PAL.g);
}
function chimney(ctx: Ctx, x: number, base: number, r: Rnd) {
  const h = ri(r, 14, 22);
  rect(ctx, x - 1, base - h - 3, 12, 3, PAL.d);
  rect(ctx, x, base - h, 10, h, PAL.U);
  for (let y = base - h + 2; y < base; y += 3) ditherRect(ctx, x, y, 10, 1, PAL.N, 0.5);
  rect(ctx, x, base - h, 1, h, PAL.n);
}
function waterTower(ctx: Ctx, x: number, base: number) {
  const top = base - 46;
  for (const lx of [x + 2, x + 18]) rect(ctx, lx, top + 22, 2, 24, PAL.N);
  line(ctx, x + 3, top + 24, x + 19, base - 2, PAL.N);
  line(ctx, x + 19, top + 24, x + 3, base - 2, PAL.N);
  rect(ctx, x, top + 4, 22, 18, PAL.n);
  for (let i = 2; i < 22; i += 3) rect(ctx, x + i, top + 4, 1, 18, PAL.N);
  rect(ctx, x, top + 4, 2, 18, PAL.T);
  rect(ctx, x, top + 8, 22, 1, PAL.d);
  rect(ctx, x, top + 17, 22, 1, PAL.d);
  for (let j = 0; j < 5; j++) rect(ctx, x + 1 + j * 2, top + 4 - j, 20 - j * 4, 1, PAL.d);
}
function dish(ctx: Ctx, x: number, base: number) {
  rect(ctx, x + 5, base - 8, 2, 8, PAL.g);
  ring(ctx, x + 6, base - 12, 4, 6, PAL.l, (dx, dy) => dx - dy > 0);
  line(ctx, x + 6, base - 12, x + 2, base - 16, PAL.g);
}
function hayBale(ctx: Ctx, x: number, base: number) {
  ellipse(ctx, x + 8, base - 7, 8, 7, PAL.S, base);
  ellipse(ctx, x + 7, base - 8, 7, 6, PAL.s, base - 2);
  ring(ctx, x + 7, base - 8, 2, 3, PAL.S);
  ring(ctx, x + 7, base - 8, 5, 5.5, PAL.S);
}
function scarecrow(ctx: Ctx, x: number, base: number) {
  rect(ctx, x + 8, base - 34, 2, 34, PAL.N);
  rect(ctx, x, base - 26, 18, 2, PAL.N);
  rect(ctx, x + 4, base - 27, 10, 12, PAL.b);
  rect(ctx, x + 1, base - 27, 4, 4, PAL.r);
  rect(ctx, x + 13, base - 27, 4, 4, PAL.r);
  disc(ctx, x + 9, base - 32, 4, PAL.s);
  px(ctx, x + 7, base - 33, PAL.k);
  px(ctx, x + 10, base - 33, PAL.k);
  rect(ctx, x + 3, base - 37, 12, 2, PAL.N);
  rect(ctx, x + 6, base - 40, 6, 3, PAL.N);
  for (let i = 0; i < 4; i++) px(ctx, x + 4 + i * 3, base - 15, PAL.y);
}
function gravestone(ctx: Ctx, x: number, base: number, r: Rnd) {
  const k = ri(r, 0, 2);
  const L = PAL.l;
  const M = PAL.g;
  const D = PAL.d;
  if (k === 0) {
    const h = ri(r, 14, 20);
    rect(ctx, x - 1, base - h, 14, h, PAL.k);
    disc(ctx, x + 6, base - h + 6, 7, PAL.k);
    rect(ctx, x, base - h + 6, 12, h - 6, M);
    disc(ctx, x + 6, base - h + 6, 6, M, base - h + 6);
    rect(ctx, x, base - h + 6, 2, h - 6, L);
    disc(ctx, x + 5, base - h + 6, 4, L, base - h + 3);
    rect(ctx, x + 10, base - h + 6, 2, h - 6, D);
    rect(ctx, x + 3, base - h + 8, 6, 1, D);
    rect(ctx, x + 3, base - h + 10, 5, 1, D);
  } else if (k === 1) {
    rect(ctx, x + 3, base - 22, 6, 22, PAL.k);
    rect(ctx, x - 1, base - 17, 14, 6, PAL.k);
    rect(ctx, x + 4, base - 21, 4, 21, M);
    rect(ctx, x, base - 16, 12, 4, M);
    rect(ctx, x + 4, base - 21, 1, 21, L);
    rect(ctx, x, base - 16, 12, 1, L);
  } else {
    rect(ctx, x - 1, base - 12, 18, 12, PAL.k);
    rect(ctx, x, base - 11, 16, 11, M);
    rect(ctx, x, base - 11, 16, 2, L);
    rect(ctx, x + 14, base - 9, 2, 9, D);
  }
  if (r() < 0.4) for (let i = 0; i < 4; i++) px(ctx, x + ri(r, 0, 10), base - ri(r, 1, 3), PAL.z);
}
function deadStump(ctx: Ctx, x: number, base: number) {
  rect(ctx, x, base - 10, 10, 10, PAL.N);
  rect(ctx, x, base - 10, 2, 10, PAL.n);
  ellipse(ctx, x + 5, base - 10, 5, 1, PAL.T);
  px(ctx, x + 5, base - 10, PAL.n);
  rect(ctx, x - 2, base - 2, 3, 2, PAL.N);
  rect(ctx, x + 9, base - 2, 3, 2, PAL.N);
}
function smallRock(ctx: Ctx, x: number, base: number, r: Rnd) {
  const R = ri(r, 4, 8);
  ellipse(ctx, x, base, R + 1, R * 0.7 + 1, PAL.k, base);
  ellipse(ctx, x, base, R, R * 0.7, PAL.g, base);
  ellipse(ctx, x - 1, base - 2, R - 2, R * 0.4, PAL.l, base - Math.round(R * 0.5));
}
function shell(ctx: Ctx, x: number, base: number, r: Rnd) {
  if (r() < 0.5) {
    ellipse(ctx, x + 3, base - 2, 3, 2, PAL.P, base);
    for (let i = 0; i < 6; i += 2) px(ctx, x + 1 + i, base - 3, PAL.Q);
  } else {
    rect(ctx, x + 2, base - 5, 1, 5, PAL.o);
    rect(ctx, x, base - 3, 5, 1, PAL.o);
    px(ctx, x + 1, base - 1, PAL.o);
    px(ctx, x + 3, base - 1, PAL.o);
  }
}
function terminal(ctx: Ctx, x: number, base: number, r: Rnd) {
  bevel(ctx, x, base - 20, 14, 20, PAL.d, PAL.k, PAL.g, PAL.H);
  rect(ctx, x + 2, base - 18, 10, 7, PAL.H);
  const c = pick(r, [PAL.L, PAL.t, PAL.h]);
  for (let j = 0; j < 3; j++) rect(ctx, x + 3, base - 17 + j * 2, ri(r, 3, 8), 1, c);
  rect(ctx, x + 3, base - 8, 2, 2, PAL.r);
  rect(ctx, x + 7, base - 8, 2, 2, PAL.L);
}
function bollard(ctx: Ctx, x: number, base: number) {
  rect(ctx, x, base - 10, 8, 10, PAL.d);
  rect(ctx, x - 1, base - 12, 10, 3, PAL.d);
  rect(ctx, x, base - 12, 1, 12, PAL.g);
  rect(ctx, x + 1, base - 7, 6, 1, PAL.y);
  for (let i = 0; i < 3; i++) px(ctx, x + 9 + i, base - 9 + i * 3, PAL.J);
}
function mailbox(ctx: Ctx, x: number, base: number) {
  rect(ctx, x + 4, base - 14, 2, 14, PAL.N);
  rect(ctx, x, base - 20, 11, 6, PAL.l);
  ellipse(ctx, x + 5, base - 20, 5, 2, PAL.l, base - 20);
  rect(ctx, x, base - 15, 11, 1, PAL.g);
  rect(ctx, x + 10, base - 22, 1, 5, PAL.r);
  rect(ctx, x + 10, base - 22, 3, 2, PAL.r);
}
function signPost(ctx: Ctx, x: number, base: number, r: Rnd) {
  rect(ctx, x + 5, base - 26, 2, 26, PAL.g);
  const c = pick(r, [PAL.r, PAL.D, PAL.O]);
  rect(ctx, x, base - 30, 12, 9, PAL.k);
  rect(ctx, x + 1, base - 29, 10, 7, c);
  text(ctx, pick(r, ['!', 'X', '$']), x + 4, base - 28, PAL.w);
}
function flowerPatch(ctx: Ctx, x: number, base: number, r: Rnd) {
  for (let i = 0; i < 4; i++) {
    const fx = x + i * 3 + ri(r, -1, 1);
    const h = ri(r, 3, 7);
    rect(ctx, fx, base - h, 1, h, PAL.F);
    const c = pick(r, [PAL.r, PAL.y, PAL.P, PAL.w, PAL.v]);
    rect(ctx, fx - 1, base - h - 2, 3, 2, c);
    px(ctx, fx, base - h - 2, PAL.y);
  }
}
function lantern(ctx: Ctx, x: number, base: number) {
  rect(ctx, x + 2, base - 14, 2, 14, PAL.N);
  rect(ctx, x, base - 20, 6, 6, PAL.O);
  rect(ctx, x + 1, base - 19, 4, 4, PAL.y);
  rect(ctx, x - 1, base - 21, 8, 1, PAL.N);
}
function pumpkinSmall(ctx: Ctx, x: number, base: number) {
  ellipse(ctx, x + 5, base - 4, 5, 4, PAL.R, base);
  ellipse(ctx, x + 5, base - 4, 4, 3, PAL.o, base);
  rect(ctx, x + 5, base - 4, 1, 4, PAL.R);
  rect(ctx, x + 5, base - 10, 1, 2, PAL.F);
}

function dumpster(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [PAL.D, PAL.F, PAL.b, PAL.g]);
  const L = mix(c, PAL.w, 0.3);
  const D = mix(c, PAL.k, 0.4);
  const W = 38;
  const top = base - 22;
  rect(ctx, x - 1, top - 1, W + 2, 20, PAL.k);
  rect(ctx, x, top, W, 18, c);
  rect(ctx, x, top, W, 2, L);
  rect(ctx, x + W - 3, top, 3, 18, D);
  for (let i = 5; i < W - 4; i += 8) rect(ctx, x + i, top + 4, 2, 12, D);
  rect(ctx, x + 2, top + 6, 10, 5, PAL.w);
  text(ctx, 'K', x + 3, top + 6, D);
  text(ctx, 'O', x + 7, top + 6, D);
  // lid, propped open by trash
  const open = r() < 0.5;
  if (open) {
    line(ctx, x, top - 2, x + W, top - 9, PAL.k, 2);
    line(ctx, x + 1, top - 3, x + W - 1, top - 9, D, 1);
    for (let i = 3; i < W - 3; i += 4) rect(ctx, x + i, top - 3 - ri(r, 0, 3), 3, 3, pick(r, [PAL.a, PAL.T, PAL.w, PAL.G, PAL.n]));
  } else rect(ctx, x - 1, top - 3, W + 2, 3, D);
  rect(ctx, x + 3, base - 4, 4, 4, PAL.k);
  rect(ctx, x + W - 7, base - 4, 4, 4, PAL.k);
  px(ctx, x + 4, base - 3, PAL.g);
  px(ctx, x + W - 6, base - 3, PAL.g);
}
function newspaper(ctx: Ctx, x: number, base: number, r: Rnd) {
  const w = ri(r, 8, 12);
  rect(ctx, x, base - 2, w, 2, PAL.l);
  rect(ctx, x + 1, base - 3, w - 3, 1, PAL.w);
  for (let i = 2; i < w - 2; i += 2) px(ctx, x + i, base - 2, PAL.g);
  if (r() < 0.5) {
    rect(ctx, x + w + 3, base - 4, 4, 4, PAL.r);
    rect(ctx, x + w + 3, base - 4, 4, 1, PAL.l);
  }
}
function fishBox(ctx: Ctx, x: number, base: number) {
  bevel(ctx, x, base - 7, 16, 7, PAL.c, PAL.k);
  for (let i = 2; i < 14; i += 4) {
    rect(ctx, x + i, base - 9, 3, 2, PAL.l);
    px(ctx, x + i + 3, base - 9, PAL.l);
  }
}
function rope(ctx: Ctx, x: number, base: number) {
  ellipse(ctx, x + 7, base - 3, 7, 3, PAL.N, base);
  ellipse(ctx, x + 7, base - 3, 6, 2, PAL.T, base);
  ring(ctx, x + 7, base - 3, 2, 3, PAL.S);
}
function basket(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [PAL.o, PAL.L, PAL.r, PAL.y, PAL.v]);
  for (let i = 0; i < 4; i++) disc(ctx, x + 3 + i * 3, base - 9 + (i % 2), 2, c);
  rect(ctx, x, base - 8, 16, 8, PAL.S);
  for (let i = 0; i < 16; i += 2) rect(ctx, x + i, base - 8, 1, 8, PAL.n);
  rect(ctx, x, base - 8, 16, 1, PAL.s);
}

function umbrella(ctx: Ctx, x: number, base: number, r: Rnd) {
  const [a, b] = pick(r, [[PAL.r, PAL.w], [PAL.b, PAL.y], [PAL.G, PAL.w], [PAL.h, PAL.Y]] as Array<[string, string]>);
  rect(ctx, x + 12, base - 30, 1, 30, PAL.w);
  for (let dy = -9; dy <= 0; dy++) {
    const hw = Math.round(14 * Math.sqrt(1 - (dy * dy) / 100));
    for (let i = -hw; i <= hw; i++) px(ctx, x + 12 + i, base - 30 + dy, Math.floor((i + 14) / 4) % 2 ? a : b);
  }
  for (let i = -14; i <= 14; i += 4) px(ctx, x + 12 + i, base - 29, a);
  rect(ctx, x + 2, base - 3, 20, 3, pick(r, [PAL.P, PAL.c, PAL.y]));
}
function ball(ctx: Ctx, x: number, base: number, r: Rnd) {
  const R = ri(r, 4, 7);
  const [a, b] = pick(r, [[PAL.r, PAL.w], [PAL.b, PAL.y], [PAL.G, PAL.y], [PAL.h, PAL.w]] as Array<[string, string]>);
  disc(ctx, x + R, base - R - 1, R + 1, PAL.k);
  disc(ctx, x + R, base - R - 1, R, a);
  rect(ctx, x, base - R - 2, R * 2 + 1, 2, b);
  disc(ctx, x + R - Math.round(R / 2), base - R - 1 - Math.round(R / 2), 1, PAL.w);
}
function duck(ctx: Ctx, x: number, base: number) {
  ellipse(ctx, x + 7, base - 4, 7, 4, PAL.k, base);
  ellipse(ctx, x + 7, base - 4, 6, 3, PAL.y, base - 1);
  disc(ctx, x + 11, base - 9, 4, PAL.k);
  disc(ctx, x + 11, base - 9, 3, PAL.y);
  rect(ctx, x + 14, base - 9, 3, 2, PAL.o);
  px(ctx, x + 12, base - 10, PAL.k);
  rect(ctx, x + 3, base - 5, 5, 1, PAL.O);
}
function robotToy(ctx: Ctx, x: number, base: number) {
  bevel(ctx, x + 2, base - 18, 10, 8, PAL.l, PAL.k);
  rect(ctx, x + 4, base - 16, 2, 2, PAL.r);
  rect(ctx, x + 8, base - 16, 2, 2, PAL.r);
  rect(ctx, x + 6, base - 21, 1, 3, PAL.k);
  px(ctx, x + 6, base - 22, PAL.r);
  bevel(ctx, x, base - 9, 14, 7, PAL.b, PAL.k);
  rect(ctx, x + 2, base - 2, 3, 2, PAL.k);
  rect(ctx, x + 9, base - 2, 3, 2, PAL.k);
}
function mushroomSmall(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [PAL.r, PAL.v, PAL.O, PAL.c]);
  rect(ctx, x + 3, base - 5, 3, 5, PAL.Q);
  ellipse(ctx, x + 4, base - 5, 5, 3, c, base - 5);
  px(ctx, x + 2, base - 7, PAL.w);
  px(ctx, x + 6, base - 6, PAL.w);
}
function crystalSmall(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [[PAL.C, PAL.t, PAL.D], [PAL.h, PAL.M, PAL.p], [PAL.v, PAL.e, PAL.u]] as Array<[string, string, string]>);
  poly(ctx, [[x, base], [x + 2, base - 9], [x + 4, base - 12], [x + 6, base - 9], [x + 7, base]], c[1]);
  poly(ctx, [[x, base], [x + 2, base - 9], [x + 4, base - 12], [x + 4, base]], c[0]);
  poly(ctx, [[x + 6, base], [x + 9, base - 6], [x + 11, base - 5], [x + 10, base]], c[2]);
}
function gumdrop(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [PAL.r, PAL.L, PAL.y, PAL.h, PAL.v, PAL.c]);
  ellipse(ctx, x + 6, base - 1, 6, 8, mix(c, PAL.k, 0.3), base - 1);
  ellipse(ctx, x + 5, base - 2, 5, 7, c, base - 2);
  px(ctx, x + 3, base - 7, PAL.w);
  for (let i = 0; i < 4; i++) px(ctx, x + 2 + i * 2, base - 3 - (i % 2) * 3, mix(c, PAL.w, 0.5));
}
function cupcake(ctx: Ctx, x: number, base: number, r: Rnd) {
  const c = pick(r, [PAL.P, PAL.h, PAL.Q, PAL.m]);
  poly(ctx, [[x, base - 8], [x + 14, base - 8], [x + 12, base], [x + 2, base]], PAL.n);
  for (let i = 2; i < 13; i += 2) rect(ctx, x + i, base - 7, 1, 7, PAL.N);
  ellipse(ctx, x + 7, base - 9, 8, 4, c);
  ellipse(ctx, x + 7, base - 13, 5, 3, c);
  px(ctx, x + 4, base - 11, PAL.w);
  disc(ctx, x + 7, base - 17, 1, PAL.r);
}
function bone(ctx: Ctx, x: number, base: number) {
  rect(ctx, x + 2, base - 3, 12, 2, PAL.Q);
  disc(ctx, x + 2, base - 4, 1, PAL.Q);
  disc(ctx, x + 2, base - 1, 1, PAL.Q);
  disc(ctx, x + 14, base - 4, 1, PAL.Q);
  disc(ctx, x + 14, base - 1, 1, PAL.Q);
  rect(ctx, x + 2, base - 2, 12, 1, PAL.T);
}
function candle(ctx: Ctx, x: number, base: number) {
  rect(ctx, x, base - 8, 4, 8, PAL.Q);
  rect(ctx, x + 3, base - 8, 1, 8, PAL.T);
  px(ctx, x + 1, base - 9, PAL.k);
  rect(ctx, x + 1, base - 12, 2, 3, PAL.y);
  px(ctx, x + 1, base - 13, PAL.Y);
  ditherDisc(ctx, x + 2, base - 11, 4, PAL.y, 0.25);
}
function rover(ctx: Ctx, x: number, base: number) {
  bevel(ctx, x + 2, base - 12, 22, 6, PAL.l, PAL.k);
  rect(ctx, x + 6, base - 18, 2, 6, PAL.g);
  ring(ctx, x + 7, base - 20, 2, 3, PAL.l, (dx, dy) => dx - dy > 0);
  for (const wx of [x + 4, x + 13, x + 22]) {
    disc(ctx, wx, base - 3, 3, PAL.k);
    disc(ctx, wx, base - 3, 1, PAL.g);
  }
  rect(ctx, x + 16, base - 11, 5, 2, PAL.c);
}

export const SPR = {
  umbrella: umbrella as Sprite,
  ball: ball as Sprite,
  duck: ((ctx, x, by) => duck(ctx, x, by)) as Sprite,
  robot: ((ctx, x, by) => robotToy(ctx, x, by)) as Sprite,
  shroom: mushroomSmall as Sprite,
  gem: crystalSmall as Sprite,
  gumdrop: gumdrop as Sprite,
  cupcake: cupcake as Sprite,
  bone: ((ctx, x, by) => bone(ctx, x, by)) as Sprite,
  candle: ((ctx, x, by) => candle(ctx, x, by)) as Sprite,
  rover: ((ctx, x, by) => rover(ctx, x, by)) as Sprite,
  dumpster: dumpster as Sprite,
  paper: newspaper as Sprite,
  fishBox: ((ctx, x, by) => fishBox(ctx, x, by)) as Sprite,
  rope: ((ctx, x, by) => rope(ctx, x, by)) as Sprite,
  basket: basket as Sprite,
  trashCan: ((ctx, x, by, r) => {
    if (r() < 0.6) drawMap(ctx, TRASH_CAN, x, by - TRASH_CAN.length);
    else {
      drawMap(ctx, TRASH_CAN_OPEN, x, by - TRASH_CAN_OPEN.length);
      drawMap(ctx, LID, x + 15, by - 5);
      drawMap(ctx, BAG, x + 24, by - BAG.length, { swap: pick(r, BAG_SWAPS) });
    }
  }) as Sprite,
  bin: sprMap(BIN, BIN_SWAPS),
  bag: ((ctx, x, by, r) => {
    const n = ri(r, 1, 3);
    for (let i = 0; i < n; i++) drawMap(ctx, BAG, x + i * 9, by - BAG.length - (i === 1 ? 0 : 0), { swap: pick(r, BAG_SWAPS), flip: r() < 0.5 });
  }) as Sprite,
  hydrant: sprMap(HYDRANT),
  cone: sprMap(CONE),
  tire: sprMap(TIRE),
  skull: sprMap(SKULL),
  car: ((ctx, x, by, r) => car(ctx, x, by, r)) as Sprite,
  box: box as Sprite,
  crate: crate as Sprite,
  barrel: barrel as Sprite,
  bench: ((ctx, x, by) => bench(ctx, x, by)) as Sprite,
  ac: ((ctx, x, by) => acUnit(ctx, x, by)) as Sprite,
  chimney: chimney as Sprite,
  waterTower: ((ctx, x, by) => waterTower(ctx, x, by)) as Sprite,
  dish: ((ctx, x, by) => dish(ctx, x, by)) as Sprite,
  hay: ((ctx, x, by) => hayBale(ctx, x, by)) as Sprite,
  scarecrow: ((ctx, x, by) => scarecrow(ctx, x, by)) as Sprite,
  grave: gravestone as Sprite,
  stump: ((ctx, x, by) => deadStump(ctx, x, by)) as Sprite,
  rock: smallRock as Sprite,
  shell: shell as Sprite,
  terminal: terminal as Sprite,
  bollard: ((ctx, x, by) => bollard(ctx, x, by)) as Sprite,
  mailbox: ((ctx, x, by) => mailbox(ctx, x, by)) as Sprite,
  sign: signPost as Sprite,
  flowers: flowerPatch as Sprite,
  lantern: ((ctx, x, by) => lantern(ctx, x, by)) as Sprite,
  pumpkin: ((ctx, x, by) => pumpkinSmall(ctx, x, by)) as Sprite,
};

// ================================================================ GROUND STRIPS
// Painted into a w x 56 strip whose top row is the walking surface edge.

export interface SoilOpts {
  top: string[]; // surface rows, top to bottom
  body: string;
  deep?: string; // dithered towards the bottom
  edge?: 'flat' | 'ragged' | 'drip' | 'lumpy';
  edgeColor?: string;
  edgeDepth?: number;
  specks?: Array<[string, number]>; // colour, count per 100 px of width
  stones?: [string, string, string?]; // body, highlight, shadow
  stoneCount?: number;
  strata?: string;
  lip?: string; // 1px highlight on the very top row
  blades?: string; // little blade marks in the surface band
  craters?: [string, string];
  cracks?: [string, string?]; // crack colour, glow
}
export function soil(o: SoilOpts): Painter {
  return (ctx, w, h, rnd) => {
    rect(ctx, 0, 0, w, h, o.body);
    if (o.strata)
      for (let y = o.top.length + 10; y < h; y += 9) {
        const f = periodic(rnd, w, [[3, 1], [7, 0.5]]);
        for (let x = 0; x < w; x++) if ((x + y) % 5 !== 0) px(ctx, x, Math.round(y + f(x) * 2), o.strata);
      }
    if (o.deep) ditherFade(ctx, 0, Math.round(h * 0.45), w, Math.ceil(h * 0.55), o.deep, 0, 0.9);
    for (const [c, n] of o.specks ?? []) {
      for (let i = 0; i < (n * w) / 100; i++) {
        const x = Math.floor(rnd() * w);
        const y = o.top.length + 2 + Math.floor(rnd() * (h - o.top.length - 2));
        rect(ctx, x, y, rnd() < 0.3 ? 2 : 1, 1, c);
      }
    }
    if (o.stones) {
      const n = o.stoneCount ?? Math.round(w / 40);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rnd() * w);
        const y = o.top.length + 5 + Math.floor(rnd() * (h - o.top.length - 10));
        const R = ri(rnd, 2, 4);
        wrap(w, x, (xx) => {
          if (o.stones![2]) ellipse(ctx, xx + 1, y + 1, R, R * 0.6, o.stones![2]);
          ellipse(ctx, xx, y, R, R * 0.6, o.stones![0]);
          rect(ctx, xx - R + 1, y - Math.round(R * 0.6), R, 1, o.stones![1]);
        });
      }
    }
    if (o.craters) {
      for (let i = 0; i < Math.round(w / 50); i++) {
        const x = Math.floor(rnd() * w);
        const y = ri(rnd, 12, h - 8);
        const R = ri(rnd, 4, 10);
        wrap(w, x, (xx) => {
          ellipse(ctx, xx, y, R, Math.round(R * 0.35), o.craters![0]);
          ellipse(ctx, xx, y + 1, R - 1, Math.max(1, Math.round(R * 0.3) - 1), o.body, Infinity, y + 1);
          rect(ctx, xx - R + 2, y + Math.round(R * 0.35), R * 2 - 3, 1, o.craters![1]);
        });
      }
    }
    if (o.cracks) {
      for (let i = 0; i < Math.round(w / 45); i++) {
        let x = Math.floor(rnd() * w);
        let y = o.top.length + ri(rnd, 2, 10);
        const pts: Array<[number, number]> = [[x, y]];
        for (let k = 0; k < 6; k++) {
          x += ri(rnd, -8, 8);
          y += ri(rnd, 3, 8);
          pts.push([x, y]);
        }
        wrap(w, 0, (dx) => {
          const pp = pts.map(([a, b]) => [a + dx, b] as [number, number]);
          if (o.cracks![1]) {
            for (const [a, b] of pp) ditherDisc(ctx, a, b, 3, o.cracks![1], 0.4);
          }
          path(ctx, pp, o.cracks![0], 1);
        });
      }
    }
    o.top.forEach((c, i) => rect(ctx, 0, i, w, 1, c));
    if (o.blades) {
      for (let x = 0; x < w; x += 2) {
        const y = 1 + ((x * 7 + Math.floor(x / 5)) % Math.max(1, o.top.length - 1));
        if ((x * 13) % 7 < 3) px(ctx, x, y, o.blades);
      }
    }
    const ec = o.edgeColor ?? o.top[o.top.length - 1];
    const ed = o.edgeDepth ?? 4;
    const n0 = o.top.length;
    if (o.edge === 'ragged') {
      for (let x = 0; x < w; x++) {
        const d = Math.floor(rnd() * ed * ((x % 3) + 1) * 0.4);
        if (d > 0) rect(ctx, x, n0, 1, d, ec);
      }
    } else if (o.edge === 'drip') {
      let x = 0;
      while (x < w) {
        const dw = ri(rnd, 3, 6);
        const dl = ri(rnd, 2, ed + 4);
        const xx = x;
        wrap(w, xx, (q) => {
          rect(ctx, q, n0, dw, dl, ec);
          rect(ctx, q + 1, n0 + dl, dw - 2, 1, ec);
        });
        x += dw + ri(rnd, 3, 12);
      }
      rect(ctx, 0, n0, w, 1, ec);
    } else if (o.edge === 'lumpy') {
      const f = periodic(rnd, w, [[16, 1], [37, 0.6], [53, 0.4]]);
      for (let x = 0; x < w; x++) {
        const d = Math.round((f(x) + 1) * ed * 0.5);
        rect(ctx, x, n0, 1, d, ec);
      }
    }
    if (o.lip) rect(ctx, 0, 0, w, 1, o.lip);
  };
}

export interface SidewalkOpts {
  slab: [string, string, string]; // light, mid, joint
  curb: [string, string, string]; // top, face, shadow
  road: [string, string, string]; // body, specks, light specks
  line?: string;
  litter?: boolean;
}
// Sidewalk slabs, curb, and a strip of road: TRASH STREET's floor.
export function sidewalk(o: SidewalkOpts): Painter {
  return (ctx, w, h, rnd) => {
    const [SL, SM, SJ] = o.slab;
    rect(ctx, 0, 0, w, 20, SM);
    rect(ctx, 0, 0, w, 1, SL);
    ditherRect(ctx, 0, 1, w, 2, SL, 0.5);
    ditherFade(ctx, 0, 12, w, 8, SJ, 0, 0.35);
    for (let x = 0; x < w; x += 32) line(ctx, x + 3, 1, x - 3, 19, SJ);
    rect(ctx, 0, 10, w, 1, mix(SM, SJ, 0.5));
    for (let i = 0; i < w / 40; i++) {
      // cracks and gum
      const x = Math.floor(rnd() * w);
      const y = ri(rnd, 3, 16);
      if (rnd() < 0.5) path(ctx, [[x, y], [x + 3, y + 2], [x + 5, y + 1], [x + 8, y + 3]], SJ);
      else rect(ctx, x, y, 2, 1, mix(SM, PAL.k, 0.35));
    }
    if (o.litter) {
      for (let i = 0; i < w / 60; i++) {
        const x = Math.floor(rnd() * w);
        const y = ri(rnd, 4, 15);
        const c = pick(rnd, [PAL.w, PAL.r, PAL.y, PAL.l, PAL.G]);
        rect(ctx, x, y, ri(rnd, 2, 3), ri(rnd, 1, 2), c);
      }
    }
    const [CT, CF, CS] = o.curb;
    rect(ctx, 0, 20, w, 2, CT);
    rect(ctx, 0, 22, w, 4, CF);
    for (let x = 0; x < w; x += 64) rect(ctx, x, 20, 1, 6, CS);
    rect(ctx, 0, 26, w, 1, CS);
    const [R, RS, RL] = o.road;
    rect(ctx, 0, 27, w, h - 27, R);
    rect(ctx, 0, 27, w, 3, mix(R, CS, 0.5));
    for (let i = 0; i < w * 0.6; i++) px(ctx, Math.floor(rnd() * w), 29 + Math.floor(rnd() * (h - 29)), rnd() < 0.7 ? RS : RL);
    if (o.line) for (let x = 8; x < w; x += 64) rect(ctx, x, 46, 30, 2, o.line);
    // storm drain + manhole
    for (let x = 100; x < w; x += 256) {
      rect(ctx, x, 21, 18, 5, PAL.k);
      for (let i = 1; i < 18; i += 3) rect(ctx, x + i, 22, 1, 4, CS);
    }
    ellipse(ctx, 360, 38, 12, 3, mix(R, PAL.k, 0.4));
    ellipse(ctx, 360, 38, 10, 2, mix(R, PAL.l, 0.15));
    for (let i = -8; i <= 8; i += 3) px(ctx, 360 + i, 38, mix(R, PAL.k, 0.4));
    // oil stain
    ellipse(ctx, 200, 50, 14, 2, mix(R, PAL.k, 0.25));
  };
}

export interface PlankOpts {
  colors: [string, string, string, string]; // light, mid, dark, gap
  depth?: number; // deck thickness before what is under it
  under?: 'water' | 'dark' | 'none';
  water?: [string, string, string];
  posts?: string;
}
// Wooden boardwalk / dock / floorboards.
export function planks(o: PlankOpts): Painter {
  return (ctx, w, h, rnd) => {
    const [L, M, D, G] = o.colors;
    const depth = o.depth ?? (o.under && o.under !== 'none' ? 18 : h);
    if (o.under === 'water' && o.water) {
      const [wl, wm, wd] = o.water;
      rect(ctx, 0, depth, w, h - depth, wm);
      ditherFade(ctx, 0, depth + 10, w, h - depth - 10, wd, 0, 0.9);
      for (let i = 0; i < w / 6; i++) {
        const x = Math.floor(rnd() * w);
        rect(ctx, x, depth + ri(rnd, 3, h - depth - 2), ri(rnd, 3, 8), 1, wl);
      }
    } else if (o.under === 'dark') rect(ctx, 0, depth, w, h - depth, PAL.H);
    if (o.posts && depth < h)
      for (let x = 20; x < w; x += 64) {
        rect(ctx, x, depth, 6, h - depth, o.posts);
        rect(ctx, x, depth, 1, h - depth, mix(o.posts, PAL.w, 0.25));
        if (o.under === 'water') ditherRect(ctx, x - 1, depth + 14, 8, 2, mix(o.posts, PAL.w, 0.3), 0.5);
      }
    // deck: rows of boards with staggered butt joints
    const rows = Math.max(2, Math.floor((Math.min(depth, h) - 4) / 5));
    for (let rw = 0; rw < rows; rw++) {
      const y = rw * 5;
      rect(ctx, 0, y, w, 4, rw % 2 ? M : mix(M, L, 0.25));
      rect(ctx, 0, y + 4, w, 1, G);
      const off = (rw * 37) % 64;
      for (let x = off; x < w + 64; x += 64) {
        const xx = x % w;
        rect(ctx, xx, y, 1, 4, G);
        px(ctx, xx + 2, y + 1, D);
        px(ctx, xx - 3 < 0 ? xx - 3 + w : xx - 3, y + 1, D);
      }
      for (let i = 0; i < w / 16; i++) rect(ctx, Math.floor(rnd() * w), y + 1 + ri(rnd, 0, 2), ri(rnd, 3, 9), 1, rnd() < 0.5 ? D : L);
    }
    rect(ctx, 0, 0, w, 1, L);
    if (depth < h) {
      rect(ctx, 0, rows * 5, w, depth - rows * 5, D);
      rect(ctx, 0, rows * 5, w, 1, M);
    }
  };
}

export interface MetalOpts {
  colors: [string, string, string]; // light, mid, dark
  hazard?: [string, string];
  plate?: number;
  grate?: boolean;
  glow?: string; // floor strip light
}
export function metalFloor(o: MetalOpts): Painter {
  return (ctx, w, h) => {
    const [L, M, D] = o.colors;
    rect(ctx, 0, 0, w, h, M);
    let y0 = 0;
    if (o.hazard) {
      for (let x = 0; x < w; x++) for (let y = 0; y < 4; y++) px(ctx, x, y, (x + y) % 8 < 4 ? o.hazard[0] : o.hazard[1]);
      y0 = 4;
    }
    rect(ctx, 0, y0, w, 1, L);
    if (o.glow) {
      rect(ctx, 0, y0 + 1, w, 1, o.glow);
      ditherRect(ctx, 0, y0 + 2, w, 2, o.glow, 0.5);
    }
    const P = o.plate ?? 32;
    for (let y = y0 + 4; y < h; y += 14) {
      rect(ctx, 0, y, w, 1, D);
      rect(ctx, 0, y + 1, w, 1, L);
      for (let x = ((y / 14) % 2) * (P / 2); x < w; x += P) {
        rect(ctx, x, y, 1, 14, D);
        rect(ctx, x + 1, y, 1, 14, L);
        px(ctx, x + 3, y + 3, D);
        px(ctx, x + P - 3, y + 3, D);
        px(ctx, x + 3, y + 3 - 1, L);
      }
    }
    if (o.grate) for (let x = 64; x < w; x += 128) for (let i = 0; i < 24; i += 3) rect(ctx, x + i, y0 + 6, 2, 10, PAL.H);
    ditherFade(ctx, 0, Math.round(h * 0.5), w, Math.ceil(h * 0.5), D, 0, 0.6);
  };
}

export interface TileFloorOpts {
  colors: [string, string, string]; // tile, grout, highlight
  edge?: [string, string]; // safety strip colours
  tile?: number;
  pit?: [string, string, string]; // track pit: dark, rail, sleeper
}
// Tiled platform (subway), optional yellow safety strip and track pit below.
export function tileFloor(o: TileFloorOpts): Painter {
  return (ctx, w, h) => {
    const [T, G, Hh] = o.colors;
    const S = o.tile ?? 8;
    const end = o.pit ? 30 : h;
    rect(ctx, 0, 0, w, end, T);
    let y0 = 0;
    if (o.edge) {
      rect(ctx, 0, 0, w, 4, o.edge[0]);
      for (let x = 1; x < w; x += 3) px(ctx, x, 1 + (x % 2), o.edge[1]);
      y0 = 4;
    }
    for (let y = y0; y < end; y += S) {
      rect(ctx, 0, y, w, 1, G);
      for (let x = (y / S) % 2 ? S / 2 : 0; x < w; x += S) {
        rect(ctx, x, y, 1, S, G);
        px(ctx, x + 2, y + 2, Hh);
      }
    }
    if (o.pit) {
      const [pd, pr, ps] = o.pit;
      rect(ctx, 0, end, w, 3, mix(T, PAL.k, 0.4));
      rect(ctx, 0, end + 3, w, h - end - 3, pd);
      for (let x = 0; x < w; x += 16) rect(ctx, x, end + 12, 10, 3, ps);
      rect(ctx, 0, end + 10, w, 2, pr);
      rect(ctx, 0, end + 10, w, 1, mix(pr, PAL.w, 0.5));
      rect(ctx, 0, end + 20, w, 2, pr);
    }
  };
}

export interface CobbleOpts {
  colors: [string, string, string]; // light, mid, dark (mortar)
  size?: [number, number];
}
export function cobbles(o: CobbleOpts): Painter {
  return (ctx, w, h, rnd) => {
    const [L, M, D] = o.colors;
    rect(ctx, 0, 0, w, h, D);
    for (let y = 0; y < h; y += 7) {
      const off = (Math.floor(y / 7) % 2) * 5;
      let x = off;
      while (x < off + w) {
        let sw = ri(rnd, (o.size ?? [7, 12])[0], (o.size ?? [7, 12])[1]);
        if (x + sw > off + w - 5) sw = off + w - x;
        const shade = rnd() < 0.2;
        const ww = sw;
        wrap(w, x, (xx) => {
          rect(ctx, xx + 1, y + 1, ww - 1, 5, M);
          rect(ctx, xx + 2, y, ww - 3, 1, M);
          rect(ctx, xx + 1, y + 1, ww - 2, 1, L);
          if (shade) rect(ctx, xx + 2, y + 3, ww - 4, 2, mix(M, D, 0.3));
        });
        x += sw;
      }
    }
    rect(ctx, 0, 0, w, 1, L);
    ditherFade(ctx, 0, Math.round(h * 0.5), w, Math.ceil(h * 0.5), D, 0, 0.5);
  };
}

export interface WaterEdgeOpts {
  bank: SoilOpts;
  bankH: number;
  water: [string, string, string]; // light, mid, dark
  reeds?: string;
}
// A bank to walk on with water in front of it.
export function waterEdge(o: WaterEdgeOpts): Painter {
  const bank = soil(o.bank);
  return (ctx, w, h, rnd) => {
    bank(ctx, w, h, rnd);
    const [L, M, D] = o.water;
    const f = periodic(rnd, w, [[8, 1], [19, 0.5]]);
    for (let x = 0; x < w; x++) {
      const y = Math.round(o.bankH + f(x) * 2);
      rect(ctx, x, y, 1, h - y, M);
      px(ctx, x, y, L);
    }
    ditherFade(ctx, 0, o.bankH + 6, w, h - o.bankH - 6, D, 0, 0.85);
    for (let i = 0; i < w / 5; i++) {
      const x = Math.floor(rnd() * w);
      const y = o.bankH + ri(rnd, 4, h - o.bankH - 2);
      rect(ctx, x, y, ri(rnd, 2, 7), 1, L);
    }
    if (o.reeds)
      for (let x = 7; x < w; x += ri(rnd, 20, 50)) {
        rect(ctx, x, o.bankH - 1, 1, 4, o.reeds);
        rect(ctx, x + 2, o.bankH, 1, 3, o.reeds);
      }
  };
}

export interface GridFloorOpts {
  base: string;
  line: string;
  glow?: string;
  spacing?: number;
}
// Neon grid floor.
export function gridFloor(o: GridFloorOpts): Painter {
  return (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, o.base);
    if (o.glow) ditherFade(ctx, 0, 0, w, 10, o.glow, 0.7, 0);
    let y = 0;
    let g = 3;
    while (y < h) {
      rect(ctx, 0, y, w, 1, o.line);
      y += g;
      g += 2;
    }
    const s = o.spacing ?? 32;
    for (let x = 0; x < w; x += s) {
      rect(ctx, x, 0, 1, h, o.line);
      if (o.glow) {
        ditherRect(ctx, x - 1, 0, 1, h, o.glow, 0.5);
        ditherRect(ctx, x + 1, 0, 1, h, o.glow, 0.5);
      }
    }
    rect(ctx, 0, 0, w, 1, mix(o.line, PAL.w, 0.5));
  };
}

export interface CloudFloorOpts {
  colors: [string, string, string, string?]; // light, mid, shade, sparkle
}
export function cloudFloor(o: CloudFloorOpts): Painter {
  return (ctx, w, h, rnd) => {
    const [L, M, S] = o.colors;
    rect(ctx, 0, 0, w, h, M);
    ditherFade(ctx, 0, 14, w, h - 14, S, 0, 0.9);
    for (let i = 0; i < w / 14; i++) {
      const x = Math.floor(rnd() * w);
      const y = ri(rnd, 8, h - 4);
      const r = ri(rnd, 4, 9);
      wrap(w, x, (xx) => {
        disc(ctx, xx + 1, y + 2, r, S, y + r);
        disc(ctx, xx, y, r, M);
        disc(ctx, xx - 1, y - 1, r - 2, L, y - 1);
      });
    }
    rect(ctx, 0, 0, w, 3, L);
    rect(ctx, 0, 0, w, 1, PAL.w);
    if (o.colors[3]) for (let i = 0; i < w / 12; i++) px(ctx, Math.floor(rnd() * w), ri(rnd, 2, h - 2), o.colors[3]);
  };
}

export interface LavaFloorOpts {
  rock: [string, string, string]; // light, mid, dark
  lava: [string, string];
}
export function lavaFloor(o: LavaFloorOpts): Painter {
  const s = soil({ top: [o.rock[0], o.rock[1], o.rock[1]], body: o.rock[2], specks: [[o.rock[1], 14]], cracks: [o.lava[0], o.lava[1]], deep: PAL.H });
  return (ctx, w, h, rnd) => {
    s(ctx, w, h, rnd);
    for (let x = 30; x < w; x += 128) {
      ellipse(ctx, x + 20, 40, 18, 4, o.lava[1]);
      ellipse(ctx, x + 20, 40, 14, 2, o.lava[0]);
      for (let i = 0; i < 5; i++) px(ctx, x + 10 + i * 5, 40 + (i % 2), PAL.Y);
    }
  };
}

export interface CandyFloorOpts {
  frosting: [string, string]; // light, mid
  cake: [string, string, string]; // light, mid, dark
  sprinkles: string[];
}
export function candyFloor(o: CandyFloorOpts): Painter {
  const s = soil({ top: [o.frosting[0], o.frosting[1], o.frosting[1], o.frosting[1], o.frosting[1]], body: o.cake[1], edge: 'drip', edgeColor: o.frosting[1], edgeDepth: 6, specks: [[o.cake[2], 10], [o.cake[0], 6]], deep: o.cake[2] });
  return (ctx, w, h, rnd) => {
    s(ctx, w, h, rnd);
    for (let y = 24; y < h; y += 14) {
      rect(ctx, 0, y, w, 3, o.frosting[1]);
      rect(ctx, 0, y, w, 1, o.frosting[0]);
    }
    for (let i = 0; i < w / 3; i++) {
      const x = Math.floor(rnd() * w);
      const y = ri(rnd, 0, 3);
      const c = pick(rnd, o.sprinkles);
      if (rnd() < 0.5) rect(ctx, x, y, 2, 1, c);
      else rect(ctx, x, y, 1, 2, c);
    }
  };
}


// ================================================================ MORE STRUCTURES

export interface ColumnOpts {
  colors: [string, string, string]; // light, mid, dark
  count: number;
  width?: number;
  top?: number;
  baseY?: number;
  stripes?: [string, string];
  label?: string[];
  labelColors?: [string, string];
  ibeam?: boolean;
  outline?: string;
}
// Square support columns (garage, subway, station), floor to ceiling.
export function columns(o: ColumnOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const top = o.top ?? 0;
    const W = o.width ?? 14;
    const [L, M, D] = o.colors;
    const step = w / o.count;
    for (let i = 0; i < o.count; i++) {
      const x0 = Math.round(i * step + step * 0.25);
      const lab = o.label ? pick(rnd, o.label) : '';
      wrap(w, x0, (x) => {
        if (o.outline) rect(ctx, x - 1, top, W + 2, base - top, o.outline);
        rect(ctx, x, top, W, base - top, M);
        rect(ctx, x, top, 2, base - top, L);
        rect(ctx, x + W - 3, top, 3, base - top, D);
        if (o.ibeam) {
          rect(ctx, x - 2, top, 2, base - top, D);
          rect(ctx, x + W, top, 2, base - top, D);
          for (let y = top + 6; y < base; y += 8) {
            px(ctx, x + 3, y, D);
            px(ctx, x + W - 5, y, D);
          }
          rect(ctx, x - 4, top, W + 8, 4, D);
          rect(ctx, x - 4, top, W + 8, 1, L);
        }
        if (o.stripes) for (let y = base - 22; y < base; y++) for (let k = 0; k < W; k++) px(ctx, x + k, y, (k + y) % 8 < 4 ? o.stripes[0] : o.stripes[1]);
        if (lab && o.labelColors) {
          const ly = top + Math.round((base - top) * 0.35);
          rect(ctx, x + 1, ly, W - 2, 9, o.labelColors[0]);
          text(ctx, lab, x + Math.round((W - lab.length * 4) / 2) + 1, ly + 2, o.labelColors[1]);
        }
      }, W + 8);
    }
  };
}

export interface CeilingLightOpts {
  y: number; // underside of the ceiling slab
  slab?: [string, string]; // body, edge
  beams?: number;
  count: number;
  color: string; // tube colour
  glow?: string;
  housing?: string;
  hang?: number;
}
// A ceiling slab with hanging fluorescent tubes.
export function ceilingLights(o: CeilingLightOpts): Painter {
  return (ctx, w) => {
    if (o.slab) {
      rect(ctx, 0, 0, w, o.y, o.slab[0]);
      rect(ctx, 0, o.y - 1, w, 1, o.slab[1]);
      const nb = o.beams ?? 0;
      for (let i = 0; i < nb; i++) {
        const x = Math.round((i * w) / nb);
        rect(ctx, x, o.y, 12, 6, o.slab[0]);
        rect(ctx, x, o.y + 5, 12, 1, o.slab[1]);
      }
    }
    const step = w / o.count;
    for (let i = 0; i < o.count; i++) {
      const x = Math.round(i * step + step / 2 - 12);
      const y = o.y + (o.hang ?? 6);
      wrap(w, x, (xx) => {
        if (o.glow) {
          for (let j = 0; j < 40; j++) ditherRect(ctx, xx - Math.floor(j / 2), y + 3 + j, 24 + j, 1, o.glow, 0.28 * (1 - j / 40));
        }
        rect(ctx, xx + 4, o.y, 1, y - o.y, o.housing ?? PAL.d);
        rect(ctx, xx + 19, o.y, 1, y - o.y, o.housing ?? PAL.d);
        rect(ctx, xx - 1, y, 26, 2, o.housing ?? PAL.d);
        rect(ctx, xx, y + 2, 24, 1, o.color);
      }, 30);
    }
  };
}

export interface ParkingOpts {
  colors: [string, string, string]; // light, mid, dark
  line: string;
  oil?: string;
}
export function parkingFloor(o: ParkingOpts): Painter {
  const s = soil({ top: [o.colors[0], o.colors[1]], body: o.colors[1], specks: [[o.colors[2], 30], [o.colors[0], 10]], deep: o.colors[2] });
  return (ctx, w, h, rnd) => {
    s(ctx, w, h, rnd);
    for (let x = 0; x < w; x += 64) line(ctx, x + 6, 3, x - 6, h, o.line, 2);
    rect(ctx, 0, 3, w, 1, o.line);
    for (let x = 40; x < w; x += 128) {
      ellipse(ctx, x, 30, 10, 3, o.oil ?? mix(o.colors[1], PAL.k, 0.3));
      text(ctx, x % 256 === 40 ? 'P' : '2', x + 18, 14, o.line);
    }
  };
}

export interface ContainerOpts {
  colors: string[];
  count: number;
  stack: [number, number];
  baseY?: number;
  haze?: [string, number];
}
// Stacks of shipping containers.
export function containers(o: ContainerOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.5)) {
      const n = irange(rnd, o.stack);
      const cols = ri(rnd, 1, 2);
      const boxes: Array<[number, number, string]> = [];
      for (let c = 0; c < cols; c++) for (let k = 0; k < n - (c === 1 ? ri(rnd, 0, 2) : 0); k++) boxes.push([c * 44 + ri(rnd, -2, 2), k, pick(rnd, o.colors)]);
      wrap(w, x0, (x) => {
        for (const [dx, k, c0] of boxes) {
          const c = o.haze ? mix(c0, o.haze[0], o.haze[1]) : c0;
          const y = base - (k + 1) * 13;
          rect(ctx, x + dx, y, 42, 13, mix(c, PAL.k, 0.45));
          rect(ctx, x + dx + 1, y + 1, 40, 11, c);
          for (let i = 3; i < 40; i += 3) rect(ctx, x + dx + 1 + i, y + 2, 1, 9, mix(c, PAL.k, 0.25));
          rect(ctx, x + dx + 1, y + 1, 40, 1, mix(c, PAL.w, 0.3));
          rect(ctx, x + dx + 36, y + 2, 1, 9, mix(c, PAL.k, 0.5));
        }
      });
    }
  };
}

export interface ShipOpts {
  hull: string;
  deck: string;
  boxes?: string[];
  count: number;
  y: number; // waterline
  scale?: number;
}
// Ships on the horizon.
export function ships(o: ShipOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const s = o.scale ?? 1;
    for (const x0 of spread(rnd, w, o.count, 0.8)) {
      const L = Math.round(rr(rnd, 70, 110) * s);
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        const y = o.y;
        const hh = Math.round(7 * s);
        poly(ctx, [[x, y - hh], [x + L, y - hh], [x + L - 6 * s, y], [x + 4 * s, y]], o.hull);
        rect(ctx, x + 3, y - hh, L - 6, 1, o.deck);
        const bx = x + Math.round(L * 0.08);
        rect(ctx, bx, y - hh - 12 * s, 10 * s, 12 * s, o.deck);
        rect(ctx, bx + 2, y - hh - 10 * s, 6 * s, 1, o.hull);
        rect(ctx, bx + 3 * s, y - hh - 17 * s, 3 * s, 5 * s, o.hull);
        if (o.boxes)
          for (let i = bx + 12 * s; i < x + L - 8; i += 6 * s) {
            const n = ri(r, 1, 3);
            for (let k = 0; k < n; k++) rect(ctx, i, y - hh - (k + 1) * 4 * s, 5 * s, 4 * s - 1, pick(r, o.boxes));
          }
      });
    }
  };
}


// ================================================================ MORE NATURE

export interface AcaciaOpts {
  leaves: [string, string, string]; // dark, mid, light
  trunk: string;
  count: number;
  h: [number, number];
  baseY?: number;
}
// Flat-topped savanna trees.
export function acacias(o: AcaciaOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 1)) {
      const H = irange(rnd, o.h);
      const R = Math.round(H * rr(rnd, 0.55, 0.8));
      const lean = rr(rnd, -6, 6);
      const pads = Array.from({ length: ri(rnd, 2, 4) }, (_, i) => ({ dx: Math.round(rr(rnd, -R * 0.5, R * 0.5)), dy: -i * 3 + ri(rnd, -1, 1), rx: Math.round(R * rr(rnd, 0.45, 0.75)) }));
      wrap(w, x0, (x) => {
        const top = base - H;
        line(ctx, x, base, x + lean, top + 6, o.trunk, 3);
        line(ctx, x + lean, top + 8, x + lean - R * 0.4, top + 2, o.trunk, 2);
        line(ctx, x + lean, top + 8, x + lean + R * 0.45, top + 1, o.trunk, 2);
        for (const p of pads) ellipse(ctx, x + lean + p.dx, top + p.dy + 1, p.rx, 4, o.leaves[0]);
        for (const p of pads) ellipse(ctx, x + lean + p.dx - 1, top + p.dy, p.rx - 1, 3, o.leaves[1]);
        for (const p of pads) rect(ctx, x + lean + p.dx - p.rx + 3, top + p.dy - 3, p.rx, 1, o.leaves[2]);
      });
    }
  };
}

export interface MangroveOpts {
  leaves: [string, string, string];
  trunk: [string, string];
  count: number;
  h: [number, number];
  r: [number, number];
  baseY?: number;
}
// Trees standing on arching stilt roots.
export function mangroves(o: MangroveOpts): Painter {
  const canopy = trees({ leaves: o.leaves, trunk: o.trunk, count: 1, h: o.h, r: o.r, baseY: o.baseY });
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const rootH = ri(rnd, 14, 24);
      const roots = Array.from({ length: ri(rnd, 4, 7) }, () => rr(rnd, -26, 26));
      const s = newSeed(rnd);
      wrap(w, x0, (x) => {
        for (const dx of roots) {
          const pts: Array<[number, number]> = [];
          for (let t = 0; t <= 1.001; t += 0.1) pts.push([x + dx * t, base - rootH - 2 + Math.sin(t * Math.PI) * -6 + t * (rootH + 2)]);
          path(ctx, pts, o.trunk[1], 2);
          path(ctx, pts.map(([a, b]) => [a, b - 1] as [number, number]), o.trunk[0], 1);
        }
        ctx.save();
        ctx.translate(x - 256, -rootH);
        canopy(ctx, 512, 216, seeded(s));
        ctx.restore();
      });
    }
  };
}

export interface RainbowOpts {
  x: number;
  y: number;
  r: number;
  colors?: string[];
  band?: number;
}
export function rainbow(o: RainbowOpts): Painter {
  return (ctx) => {
    const cs = o.colors ?? [PAL.r, PAL.o, PAL.y, PAL.L, PAL.c, PAL.v];
    const b = o.band ?? 3;
    cs.forEach((c, i) => {
      const r1 = o.r - i * b;
      ring(ctx, o.x, o.y, r1 - b + 0.5, r1, c, (_dx, dy) => dy <= 0);
    });
  };
}

export interface PyramidOpts {
  colors: [string, string, string]; // lit, shadow, line
  count: number;
  size: [number, number];
  baseY?: number;
}
export function pyramids(o: PyramidOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.9)) {
      const S = irange(rnd, o.size);
      wrap(w, x0, (cx) => {
        for (let j = 0; j < S; j++) {
          const y = base - S + j;
          const hw = j;
          rect(ctx, cx - hw, y, hw, 1, o.colors[0]);
          rect(ctx, cx, y, hw + 1, 1, o.colors[1]);
          if (j % 4 === 3) {
            ditherRect(ctx, cx - hw, y, hw, 1, o.colors[2], 0.5);
            rect(ctx, cx, y, hw + 1, 1, mix(o.colors[1], o.colors[2], 0.5));
          }
        }
        rect(ctx, cx - 4, base - 10, 8, 10, mix(o.colors[1], PAL.k, 0.3));
      });
    }
  };
}

export interface MansionOpts {
  colors: [string, string, string]; // wall, wall shadow, roof
  window: [string, string]; // lit, dark
  count: number;
  scale?: number;
  baseY?: number;
}
// Crooked old houses with towers and pointy roofs.
export function mansions(o: MansionOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    const s = o.scale ?? 1;
    for (const x0 of spread(rnd, w, o.count, 0.7)) {
      const seed = newSeed(rnd);
      wrap(w, x0, (x) => {
        const r = seeded(seed);
        const W = Math.round(60 * s);
        const H = Math.round(40 * s);
        const [Wc, Ws, Rf] = o.colors;
        const win = (wx: number, wy: number) => {
          const lit = r() < 0.4;
          rect(ctx, wx - 1, wy - 1, 6, 9, Ws);
          rect(ctx, wx, wy, 4, 7, lit ? o.window[0] : o.window[1]);
          if (lit) rect(ctx, wx + 2, wy, 1, 7, Ws);
        };
        rect(ctx, x, base - H, W, H, Wc);
        rect(ctx, x + W - 6, base - H, 6, H, Ws);
        for (let j = 0; j < 14 * s; j++) {
          const hw = Math.round((W / 2 + 4) * (j / (14 * s)));
          rect(ctx, x + W / 2 - hw + (j > 2 ? 1 : 0), base - H - 14 * s + j, hw * 2, 1, Rf);
        }
        // tower
        const tx = x + Math.round(W * 0.68);
        const tw = Math.round(16 * s);
        const th = Math.round(64 * s);
        rect(ctx, tx, base - th, tw, th, Wc);
        rect(ctx, tx + tw - 4, base - th, 4, th, Ws);
        for (let j = 0; j < 22 * s; j++) {
          const hw = Math.round((tw / 2 + 2) * (j / (22 * s)));
          rect(ctx, tx + tw / 2 - hw + Math.round((22 * s - j) * 0.15), base - th - 22 * s + j, hw * 2 + 1, 1, Rf);
        }
        win(tx + tw / 2 - 2, base - th + 8);
        rect(ctx, x + 8, base - H - 20 * s, 6, 12 * s, Ws);
        for (let i = x + 6; i < x + W - 10; i += 12) {
          win(i, base - H + 8);
          win(i, base - H + 22);
        }
        rect(ctx, x + W / 2 - 5, base - 14, 10, 14, Ws);
        disc(ctx, x + W / 2, base - 14, 5, Ws, base - 14);
      });
    }
  };
}

export interface FallOpts {
  rock: [string, string, string];
  water: [string, string, string?]; // light, mid, foam
  count: number;
  h: [number, number];
  w: [number, number];
  baseY?: number;
}
// Cliffs with waterfalls.
export function waterfalls(o: FallOpts): Painter {
  return (ctx, w, _h, rnd) => {
    const base = o.baseY ?? 166;
    for (const x0 of spread(rnd, w, o.count, 0.6)) {
      const H = irange(rnd, o.h);
      const W = irange(rnd, o.w);
      const fw = Math.max(5, Math.round(W * 0.22));
      const fx = Math.round(W * rr(rnd, 0.3, 0.55));
      const prof = Array.from({ length: W }, (_, i) => {
        const e = Math.min(i, W - 1 - i);
        return Math.round(base - H + Math.max(0, 14 - e) * 2 + rr(rnd, -1, 1) + (i > fx && i < fx + fw ? 2 : 0));
      });
      wrap(w, x0 - W / 2, (x) => {
        for (let i = 0; i < W; i++) {
          rect(ctx, x + i, prof[i], 1, base - prof[i] + 4, i < W * 0.4 ? o.rock[1] : o.rock[2]);
          px(ctx, x + i, prof[i], o.rock[0]);
          if (i % 6 === 2) ditherRect(ctx, x + i, prof[i] + 2, 1, base - prof[i], o.rock[0], 0.25);
        }
        for (let y = prof[fx] + 2; y < base; y++) {
          for (let i = 0; i < fw; i++) px(ctx, x + fx + i, y, (i + Math.floor(y / 3)) % 4 === 0 ? o.water[0] : o.water[1]);
        }
        rect(ctx, x + fx, prof[fx] + 2, fw, 1, o.water[0]);
        const foam = o.water[2] ?? o.water[0];
        ellipse(ctx, x + fx + fw / 2, base - 2, fw + 4, 4, foam, base);
        ditherDisc(ctx, x + fx + fw / 2, base - 6, fw + 6, foam, 0.3);
      });
    }
  };
}
