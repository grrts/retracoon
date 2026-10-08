// Theme preview: renders every theme (sky + layers + actors + ground + front) the way the
// engine will, scrolled a bit so tiling is visible. Query params:
//   ?theme=id&scale=3        one theme
//   ?theme=id&season=id      a season overlay on a theme
//   ?seam=id&layer=n         one layer tile drawn twice side by side (layer 'g' = ground, 'f' = front)
//   ?scroll=100
import { THEMES } from '../../src/world/themes/index';
import { SEASONS } from '../../src/world/seasons';
import type { ThemeDef, LayerDef, Painter, SeasonDef } from '../../src/world/types';

const W = 480;
const H = 216;
const GY = 160;
const GH = 56;
const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 1);
const scroll = Number(q.get('scroll') ?? 100);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function paint(p: Painter, w: number, h: number, seed: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  p(ctx, w, h, rng(seed));
  return c;
}
function mixHex(a: string, b: string, t: number) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const COON = [
  '...................kk....kk.......',
  '..................k2pk..kp2k......',
  '..................k2p1kk1p2k......',
  '.................k1111111111k.....',
  '................k111111111111k....',
  '....kkkk.......k11441111111441k...',
  '...k1111k......k1222k111122224k...',
  '..k222222k.....k12k4k2222k4k22k...',
  '..k111111k.....k122222222222223kk.',
  '.k2222222k.....k11222221114333334k',
  '.k1111111k......k11111113333333kk.',
  '.k2222222k.....kk111111113333kkk..',
  '..k111111k...kk1111111111kkkk.....',
  '..k2222222kkk11111111111111k......',
  '...k111111111111111111111111k.....',
  '....k22111111111333333331111k.....',
  '.....k111111113333333333331k......',
  '.....k1111111133333333333311k.....',
  '.....k111111113333333333311k......',
  '......k1111111133333333311k.......',
  '......k11111111111111111111k......',
  '.......k11111kkkkk11111111k.......',
  '.......k222kk....k2221k222k.......',
  '.......k222k.....k222kk222k.......',
  '.......kkkk......kkkk.kkkk........',
];
const SLIME = [
  '......kkkkkk......',
  '....kkLLLLLLkk....',
  '...kLLwLLLLLLGk...',
  '..kLLwwLLLLLLLGk..',
  '..kLLLLkkLLkkLGk..',
  '.kLLLLLkwLLkwLLGk.',
  '.kLLLLLLLLLLLLLGk.',
  'kLLLLLLLLLLLLLGGGk',
  'kGLLLLLLLLLLLGGGGk',
  'kGGGGGGGGGGGGGGGGk',
  '.kkkkkkkkkkkkkkkk.',
];
const COL: Record<string, string> = { k: '#1a1c2c', '1': '#8b93a8', '2': '#3c4258', '3': '#c9d1dd', '4': '#f4f4f4', p: '#f5a5b8', L: '#a7f070', G: '#38b764', w: '#f4f4f4' };
function sprite(ctx: CanvasRenderingContext2D, map: string[], x: number, bottom: number, tint: number, flip = false) {
  const tr = ((tint >> 16) & 255) / 255;
  const tg = ((tint >> 8) & 255) / 255;
  const tb = (tint & 255) / 255;
  map.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = flip ? row[row.length - 1 - i] : row[i];
      if (ch === '.') continue;
      const n = parseInt(COL[ch].slice(1), 16);
      ctx.fillStyle = `rgb(${((n >> 16) & 255) * tr},${((n >> 8) & 255) * tg},${(n & 255) * tb})`;
      ctx.fillRect(x + i, bottom - map.length + j, 1, 1);
    }
  });
}

function drawLayer(ctx: CanvasRenderingContext2D, L: LayerDef, seed: number) {
  const tile = L.tile ?? 512;
  const c = paint(L.paint, tile, H, seed);
  const off = -(((scroll * L.speed) % tile) + tile) % tile;
  ctx.globalAlpha = L.alpha ?? 1;
  for (let x = off; x < W; x += tile) ctx.drawImage(c, Math.round(x), 0);
  ctx.globalAlpha = 1;
}

function weatherDots(ctx: CanvasRenderingContext2D, t: ThemeDef, s?: SeasonDef) {
  const wd = s?.weather ?? t.weather;
  if (!wd) return;
  const r = rng(7);
  for (let i = 0; i < wd.density; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    ctx.fillStyle = wd.colors[i % wd.colors.length];
    if (wd.kind === 'rain') ctx.fillRect(x, y, 1, 4);
    else if (wd.kind === 'snow' || wd.kind === 'ash') ctx.fillRect(x, y, 2, 2);
    else if (wd.kind === 'leaves' || wd.kind === 'petals') ctx.fillRect(x, y, 2, 1);
    else ctx.fillRect(x, y, 1, 1);
  }
}

export function render(t: ThemeDef, s?: SeasonDef): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  t.sky.forEach((col, i) => g.addColorStop(i / (t.sky.length - 1), s?.skyTint ? mixHex(col, s.skyTint, 0.3) : col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const seed = hash(t.id);
  t.layers.forEach((L, i) => drawLayer(ctx, L, seed + i * 977));
  if (s?.props) drawLayer(ctx, s.props, seed + 5555);
  const tint = t.light ?? 0xffffff;
  sprite(ctx, COON, 110, GY, tint);
  sprite(ctx, SLIME, 300, GY, tint);
  sprite(ctx, COON, 350, GY, tint, true);
  const gc = paint(t.ground, 512, GH, seed + 31337);
  const goff = -((scroll % 512) + 512) % 512;
  for (let x = goff; x < W; x += 512) ctx.drawImage(gc, x, GY);
  if (t.front) drawLayer(ctx, t.front, seed + 4242);
  if (s?.front) drawLayer(ctx, s.front, seed + 4343);
  weatherDots(ctx, t, s);
  return c;
}

function seam(t: ThemeDef, which: string) {
  const L: LayerDef | undefined = which === 'f' ? t.front : which === 'g' ? { paint: t.ground, speed: 1 } : t.layers[Number(which)];
  const out = document.createElement('canvas');
  const tile = L?.tile ?? 512;
  const hh = which === 'g' ? GH : H;
  out.width = tile * 2;
  out.height = hh;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#7f7f7f';
  ctx.fillRect(0, 0, out.width, hh);
  if (L) {
    const c = paint(L.paint, tile, hh, 1234);
    ctx.drawImage(c, 0, 0);
    ctx.drawImage(c, tile, 0);
  }
  return out;
}

function safe(f: () => HTMLCanvasElement): HTMLCanvasElement {
  try {
    return f();
  } catch (e) {
    console.error(e);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = 20;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f00';
    ctx.fillText(String(e), 2, 14);
    return c;
  }
}
function show(c: HTMLCanvasElement, label: string) {
  const d = document.createElement('div');
  d.className = 'cell';
  c.style.width = c.width * scale + 'px';
  c.style.height = c.height * scale + 'px';
  d.append(label, c);
  document.getElementById('out')!.append(d);
}

function colDiff(d: Uint8ClampedArray, w: number, h: number, a: number, b: number) {
  let s = 0;
  for (let y = 0; y < h; y++) {
    const i = (y * w + a) * 4;
    const j = (y * w + b) * 4;
    for (let k = 0; k < 4; k++) s += Math.abs(d[i + k] - d[j + k]);
  }
  return s / h;
}
function seamScore(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let tot = 0;
  for (let x = 0; x + 1 < c.width; x++) tot += colDiff(d, c.width, c.height, x, x + 1);
  const avg = tot / (c.width - 1);
  const wrap = colDiff(d, c.width, c.height, c.width - 1, 0);
  return { avg, wrap };
}
function seamcheck() {
  const out: string[] = [];
  for (const t of THEMES) {
    const seed = hash(t.id);
    const ls: Array<[string, LayerDef, number]> = t.layers.map((L, i) => [String(i), L, H] as [string, LayerDef, number]);
    ls.push(['g', { paint: t.ground, speed: 1 }, GH]);
    if (t.front) ls.push(['f', t.front, H]);
    for (const [name, L, hh] of ls) {
      const c = paint(L.paint, L.tile ?? 512, hh, seed);
      const { avg, wrap } = seamScore(c);
      if (wrap > avg * 2.5 + 6) out.push(`${t.id} layer ${name}: wrap ${wrap.toFixed(1)} avg ${avg.toFixed(1)}`);
    }
  }
  for (const s of SEASONS)
    for (const [name, L] of [['props', s.props], ['front', s.front]] as Array<[string, LayerDef | undefined]>) {
      if (!L) continue;
      const c = paint(L.paint, L.tile ?? 512, H, 99);
      const { avg, wrap } = seamScore(c);
      if (wrap > avg * 2.5 + 6) out.push(`season ${s.id} ${name}: wrap ${wrap.toFixed(1)} avg ${avg.toFixed(1)}`);
    }
  if (q.get('crops')) {
    for (const line of out) {
      const m = /^(\S+) layer (\S+):/.exec(line);
      if (!m) continue;
      const t = THEMES.find((x) => x.id === m[1])!;
      const which = m[2];
      const L: LayerDef | undefined = which === 'f' ? t.front : which === 'g' ? { paint: t.ground, speed: 1 } : t.layers[Number(which)];
      if (!L) continue;
      const hh = which === 'g' ? GH : H;
      const c = paint(L.paint, 512, hh, hash(t.id));
      const crop = document.createElement('canvas');
      crop.width = 120;
      crop.height = hh;
      const cx = crop.getContext('2d')!;
      cx.fillStyle = '#7f7f7f';
      cx.fillRect(0, 0, 120, hh);
      cx.drawImage(c, -452, 0);
      cx.drawImage(c, 60, 0);
      show(crop, `${t.id}:${which}`);
    }
  }
  const pre = document.createElement('pre');
  pre.id = 'seams';
  pre.textContent = out.join('\n') || 'no seams';
  document.getElementById('out')!.append(pre);
}
const one = q.get('theme');
const seamId = q.get('seam');
const t0 = performance.now();
if (seamId) {
  const t = THEMES.find((x) => x.id === seamId)!;
  show(seam(t, q.get('layer') ?? '0'), `${t.id} layer ${q.get('layer')}`);
} else if (q.get('seamcheck')) {
  seamcheck();
} else if (one) {
  const t = THEMES.find((x) => x.id === one)!;
  const s = SEASONS.find((x) => x.id === q.get('season'));
  show(safe(() => render(t, s)), `${t.id} ${t.name}${s ? ' + ' + s.id : ''}`);
} else if (q.get('seasons')) {
  const t = THEMES.find((x) => x.id === (q.get('seasons') === '1' ? 'street' : q.get('seasons')))!;
  for (const s of SEASONS) show(safe(() => render(t, s)), `${s.id}: ${s.banner}`);
} else {
  const tier = q.get('tier');
  for (const t of THEMES) if (!tier || String(t.tier) === tier) show(safe(() => render(t)), `${t.tier} ${t.id} ${t.name}`);
  if (!tier) {
    const st = THEMES.find((x) => x.id === 'street')!;
    for (const s of SEASONS) show(safe(() => render(st, s)), `${s.id}: ${s.banner}`);
  }
}
document.title = 'done ' + Math.round(performance.now() - t0) + 'ms';
(window as unknown as { done: boolean }).done = true;
