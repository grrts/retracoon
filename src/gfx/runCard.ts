// The shareable end-of-run card: the raccoon in its final gear standing in the area it
// reached, next to whatever ended the run, with the stage in big numbers. Drawn at
// 400x210 in the game's own pixels, then scaled 3x to 1200x630 (the link-preview size).
import Phaser from 'phaser';
import { H, GROUND_Y } from '../config';
import { themes } from '../content/registry';
import { RunState } from '../game/run';
import { RaccoonView } from '../game/views';
import { shortDay, type Killer } from '../game/share';
import { text } from '../ui';
import { COL } from './palette';
import { rng } from './textures';
import { GROUND_H } from '../world/parallax';
import { SITE_URL } from '../platform/config';

export const CARD_W = 400;
export const CARD_H = 210;
export const CARD_SCALE = 3;
const TOP = H - CARD_H; // world rows cropped off the top of the sky
const FLOOR = GROUND_Y - TOP; // where feet stand on the card

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// The area as a still: banded sky, its painted layers and ground, like the run itself.
function paintArea(themeId: string): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = CARD_W;
  cv.height = CARD_H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const theme = themes.get(themeId) ?? [...themes.values()][0];
  if (!theme) return cv;
  const stops = theme.sky;
  const bands = 18;
  const bh = Math.ceil(H / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    const a = hexToRgb(stops[seg]);
    const b = hexToRgb(stops[seg + 1] ?? stops[seg]);
    ctx.fillStyle = `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * lt)).join(',')})`;
    ctx.fillRect(0, i * bh - TOP, CARD_W, bh);
  }
  const seed = [...theme.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const layer = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const l = document.createElement('canvas');
    l.width = w;
    l.height = h;
    const lc = l.getContext('2d')!;
    lc.imageSmoothingEnabled = false;
    paint(lc);
    return l;
  };
  theme.layers.forEach((def, i) => {
    const tile = def.tile ?? 512;
    const l = layer(tile, H, (c) => def.paint(c, tile, H, rng(seed + i * 101)));
    ctx.globalAlpha = def.alpha ?? 1;
    for (let x = 0; x < CARD_W; x += tile) ctx.drawImage(l, x, -TOP);
    ctx.globalAlpha = 1;
  });
  const g = layer(512, GROUND_H + 2, (c) => theme.ground(c, 512, GROUND_H + 2, rng(seed + 999)));
  ctx.drawImage(g, 0, FLOOR - 2);
  return cv;
}

export interface CardInfo {
  run: RunState;
  skin: string;
  reason: 'death' | 'retreat';
  killer: Killer | null;
}

// Renders the card and hands back a 1200x630 PNG.
export async function renderRunCard(scene: Phaser.Scene, info: CardInfo): Promise<Blob> {
  const r = info.run;
  const bgKey = '__card_bg';
  if (scene.textures.exists(bgKey)) scene.textures.remove(bgKey);
  scene.textures.addCanvas(bgKey, paintArea(r.theme));

  const rt = scene.make.renderTexture({ x: 0, y: 0, width: CARD_W, height: CARD_H }, false);
  const temp: Phaser.GameObjects.GameObject[] = [];
  const keep = <T extends Phaser.GameObjects.GameObject>(o: T) => {
    scene.children.remove(o);
    temp.push(o);
    return o;
  };
  // No x/y: each object is drawn where it stands.
  const put = (o: Phaser.GameObjects.GameObject) => rt.draw(o);

  put(keep(scene.make.image({ x: 0, y: 0, key: bgKey, origin: 0 }, false)));

  // The raccoon, and across from it what ended the run.
  const foe = info.reason === 'death' && info.killer?.tex && scene.textures.exists(info.killer.tex) ? info.killer.tex : null;
  const coon = keep(new RaccoonView(scene, foe ? 78 : 104, FLOOR, r, info.skin).setScale(3));
  put(coon);
  if (foe) {
    const src = scene.textures.get(foe).getSourceImage() as HTMLCanvasElement;
    const s = Math.max(1, Math.min(3, Math.floor(Math.min(64 / src.width, 84 / src.height))));
    put(keep(scene.make.image({ x: 172, y: FLOOR + 1, key: foe, origin: { x: 0.5, y: 1 }, scale: s }, false)));
  }

  // The scoreboard side.
  const g = keep(scene.make.graphics({}, false));
  g.fillStyle(0x1a1c2c, 0.82).fillRect(214, 8, 178, 194);
  g.lineStyle(2, 0x3b5dc9, 1).strokeRect(214, 8, 178, 194);
  put(g);
  const x = 224;
  const line = (y: number, s: string, color: number, scale = 1, maxWidth?: number, maxLines?: number) =>
    put(keep(text(scene, x, y, s, { origin: 0, originY: 0, color, scale, maxWidth, maxLines })));
  line(16, 'RETRACOON', COL.yellow, 2);
  const daily = r.mode === 'daily' && r.day;
  line(36, daily ? `DAILY RUN ${shortDay(r.day!)}` : `LEVEL ${r.level} RACCOON`, daily ? COL.lime : COL.light);
  line(56, 'STAGE REACHED', COL.light);
  line(68, `${r.stage}`, COL.white, 4);
  const area = themes.get(r.theme)?.name ?? '';
  line(104, `AREA ${r.area + 1} ${area}`, COL.ice, 1, 160, 1);
  if (daily) line(116, `LEVEL ${r.level}`, COL.ice);
  if (info.reason === 'retreat') line(138, 'RETREATED IN TIME', COL.lime);
  else {
    line(138, info.killer ? (info.killer.id ? 'BEATEN BY' : 'TAKEN OUT BY') : 'WIPED OUT', COL.red);
    if (info.killer) line(150, info.killer.name, COL.yellow, 1, 160, 2);
  }
  line(184, SITE_URL.replace(/^https?:\/\//, ''), COL.grey);

  const small = await new Promise<HTMLImageElement>((ok) => rt.snapshot((img) => ok(img as HTMLImageElement)));
  rt.destroy();
  temp.forEach((o) => o.destroy());
  scene.textures.remove(bgKey);
  if (!small.complete) await new Promise((ok) => (small.onload = ok));

  const big = document.createElement('canvas');
  big.width = CARD_W * CARD_SCALE;
  big.height = CARD_H * CARD_SCALE;
  const ctx = big.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, big.width, big.height);
  return new Promise((ok, fail) => big.toBlob((b) => (b ? ok(b) : fail(new Error('no card'))), 'image/png'));
}
