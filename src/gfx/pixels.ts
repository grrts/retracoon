// Turning pixel maps into Phaser textures.
import Phaser from 'phaser';
import { PAL } from './palette';

export function pad(rows: string[]): string[] {
  const w = Math.max(1, ...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
}

export function drawMap(ctx: CanvasRenderingContext2D, rows: string[], ox = 0, oy = 0, pal: Record<string, string> = PAL, override?: string) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = override ?? pal[ch] ?? PAL[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

export function mapTexture(scene: Phaser.Scene, key: string, rows: string[], pal?: Record<string, string>, override?: string) {
  if (scene.textures.exists(key)) return key;
  const p = pad(rows.length ? rows : ['.']);
  const tex = scene.textures.createCanvas(key, p[0].length, p.length)!;
  drawMap(tex.getContext(), p, 0, 0, pal, override);
  tex.refresh();
  return key;
}

export function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))!;
  draw(tex.getContext());
  tex.refresh();
  return key;
}

// A one-pixel silhouette ring around a pixel map: used for rarity glows.
export function outlineMap(rows: string[], ch = 'w'): string[] {
  const p = pad(rows);
  const h = p.length + 2;
  const w = p[0].length + 2;
  const solid = (x: number, y: number) => y >= 0 && y < p.length && x >= 0 && x < p[0].length && p[y][x] !== '.' && p[y][x] !== ' ';
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const sx = x - 1;
      const sy = y - 1;
      if (solid(sx, sy)) line += '.';
      else if (solid(sx - 1, sy) || solid(sx + 1, sy) || solid(sx, sy - 1) || solid(sx, sy + 1)) line += ch;
      else line += '.';
    }
    out.push(line);
  }
  return out;
}

// Recolour a canvas texture's pixels by hue shift (used for enemy tiers).
export function hueTexture(scene: Phaser.Scene, srcKey: string, key: string, hueShift: number, satMul: number, lightMul: number) {
  if (scene.textures.exists(key) || !scene.textures.exists(srcKey)) return key;
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let l = (max + min) / 2;
    if (l < 0.16) continue; // keep outlines
    let s = 0;
    let hh = 0;
    if (max !== min) {
      const dd = max - min;
      s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
      if (max === r) hh = (g - b) / dd + (g < b ? 6 : 0);
      else if (max === g) hh = (b - r) / dd + 2;
      else hh = (r - g) / dd + 4;
      hh /= 6;
    }
    hh = (hh + hueShift / 360 + 1) % 1;
    s = Math.min(1, Math.max(s, 0.25) * satMul);
    l = Math.min(0.95, l * lightMul);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const conv = (t: number) => {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    d[i] = Math.round(conv(hh + 1 / 3) * 255);
    d[i + 1] = Math.round(conv(hh) * 255);
    d[i + 2] = Math.round(conv(hh - 1 / 3) * 255);
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

// The most common non-outline colour of a map, for tinting particles.
export function mainColor(rows: string[]): number {
  const count: Record<string, number> = {};
  for (const r of rows) for (const c of r) if (c !== '.' && c !== ' ' && c !== 'k' && PAL[c]) count[c] = (count[c] ?? 0) + 1;
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ? parseInt(PAL[best].slice(1), 16) : 0xf4f4f4;
}
