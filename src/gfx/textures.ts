import Phaser from 'phaser';
import { PAL } from './palette';
import * as A from './art';
import { FONT, GLYPH_H } from './font';
import { canvasTexture, hueTexture, mapTexture, outlineMap, pad } from './pixels';
import { enemies, items, skills } from '../content/registry';
import type { Gear } from '../content/types';
import { ANCHORS } from './coon';

export { mapTexture, canvasTexture };

// Deterministic noise so scenery looks the same each run.
export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Flatten an item's gear pieces into one icon, keeping their relative positions.
export function gearIcon(gear: Gear[]): string[] {
  const minX = Math.min(...gear.map((g) => g.x + anchorX(g)));
  const minY = Math.min(...gear.map((g) => g.y + anchorY(g)));
  const maxX = Math.max(...gear.map((g) => g.x + anchorX(g) + Math.max(...g.rows.map((r) => r.length))));
  const maxY = Math.max(...gear.map((g) => g.y + anchorY(g) + g.rows.length));
  const grid = Array.from({ length: maxY - minY }, () => Array(maxX - minX).fill('.'));
  for (const g of gear)
    g.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '.' && ch !== ' ') grid[g.y + anchorY(g) - minY + y][g.x + anchorX(g) - minX + x] = ch;
      }),
    );
  return grid.map((r) => r.join(''));
}
const anchorX = (g: Gear) => ANCHORS[g.anchor].x;
const anchorY = (g: Gear) => ANCHORS[g.anchor].y;

// Proportional outlined pixel font built from gfx/font.ts.
function buildFont(scene: Phaser.Scene) {
  if (scene.cache.bitmapFont.exists('px')) return;
  const chars = Object.keys(FONT);
  const cellH = GLYPH_H + 2;
  const widths = chars.map((c) => FONT[c][0].length + 2);
  const total = widths.reduce((a, b) => a + b, 0);
  const pos: number[] = [];
  canvasTexture(scene, 'font', total, cellH, (ctx) => {
    let ox = 0;
    chars.forEach((ch, i) => {
      pos.push(ox);
      const g = FONT[ch];
      ctx.fillStyle = PAL.k;
      g.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== '#') continue;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ctx.fillRect(ox + 1 + x + dx, 1 + y + dy, 1, 1);
        }
      });
      ctx.fillStyle = '#ffffff';
      g.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(ox + 1 + x, 1 + y, 1, 1);
      });
      ox += widths[i];
    });
  });
  const data: { font: string; size: number; lineHeight: number; retroFont: boolean; chars: Record<number, object> } = {
    font: 'font',
    size: cellH,
    lineHeight: cellH,
    retroFont: true,
    chars: {},
  };
  chars.forEach((ch, i) => {
    const w = widths[i];
    data.chars[ch.charCodeAt(0)] = {
      x: pos[i],
      y: 0,
      width: w,
      height: cellH,
      centerX: Math.floor(w / 2),
      centerY: Math.floor(cellH / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: w - 1,
      data: {},
      kerning: {},
      u0: pos[i] / total,
      v0: 0,
      u1: (pos[i] + w) / total,
      v1: 1,
    };
  });
  scene.cache.bitmapFont.add('px', { data, frame: null, texture: 'font' } as unknown as Phaser.Types.GameObjects.BitmapText.BitmapFontData);
}

// Enemy textures, built when first needed. Tiers are hue-shifted copies.
const TIER_HUE: [number, number, number][] = [
  [0, 1, 1],
  [28, 1.25, 1.05], // MEAN: warmer
  [-40, 1.35, 0.9], // FERAL: blood red
  [250, 1.3, 1.0], // MYTHIC: violet
];
export function enemyKey(id: string, frame: number, tier = 0, phase = 1) {
  return `${id}${phase === 2 ? '_p2' : ''}_${frame}${tier ? `_t${tier}` : ''}`;
}
export function ensureEnemy(scene: Phaser.Scene, id: string, tier = 0) {
  const def = enemies.get(id);
  if (!def) return;
  def.frames.forEach((f, i) => {
    mapTexture(scene, enemyKey(id, i), f);
    if (tier) hueTexture(scene, enemyKey(id, i), enemyKey(id, i, tier), ...TIER_HUE[tier]);
  });
  if (tier >= 3) mapTexture(scene, `${id}_glow`, outlineMap(def.frames[0]));
  def.phase2?.frames?.forEach((f, i) => mapTexture(scene, enemyKey(id, i, 0, 2), f));
}

// Small particle shapes for auras, skins and weather.
const PARTICLES: Record<string, string[]> = {
  heart: ['.w.w.', 'wwwww', '.www.', '..w..'],
  note: ['.ww', '.w.', '.w.', 'ww.', 'ww.'],
  flake: ['.w.', 'www', '.w.'],
  spark: ['..w..', '..w..', 'wwwww', '..w..', '..w..'],
  bubble: ['.ww.', 'w..w', 'w..w', '.ww.'],
  flame: ['.w.', 'www', 'www', '.w.'],
  leaf: ['.ww', 'www', 'ww.'],
  drop: ['w', 'w', 'w'],
  star: ['w.w', '.w.', 'w.w'],
  dot: ['ww', 'ww'],
};

export function buildTextures(scene: Phaser.Scene) {
  buildFont(scene);
  const maps: Record<string, string[]> = {
    coin: A.COIN_0,
    heart: A.HEART,
    can: A.CAN,
    pizza: A.PIZZA,
    cap: A.CAP,
    gem: ['..kkk..', '.kCiCk.', 'kCiwiCk', 'kcCiCck', '.kcCck.', '..kck..', '...k...'],
    bottlecap: ['.kkkkk.', 'krrrrrk', 'krwrrrk', 'krrrrrk', 'krrrrrk', '.kkkkk.'],
    lock: ['.kkk.', 'k...k', 'kkkkk', 'kyyyk', 'kyOyk', 'kkkkk'],
    sack1: ['..kk...', '.knnk..', 'knyNnk.', 'knnnnk.', '.kkkk..'],
    sack2: ['...kk....', '..knnk...', '.knnyNk..', 'knOnnnnk.', 'knnnynNk.', 'knnnnnnk.', '.kkkkkk..'],
    sack3: ['....kkk....', '...knnnk...', '..knyOnnk..', '.knnnnyNnk.', 'knOnnnnnnNk', 'knnnynnOnnk', 'knnnnnnnnNk', '.kkkkkkkkk.'],
    flag: ['w..', 'www', 'www', 'w..', 'w..', 'w..'],
    flag_big: ['w...', 'wwww', 'wwww', 'wwww', 'w...', 'w...', 'w...'],
    sign: ['.kkkkkkkkkk.', 'knnnnnnnnnnk', 'kNnnnnnnnnNk', 'knnnnnnnnnnk', '.kkkkkkkkkk.', '.....kk.....', '.....kn.....', '.....kn.....', '.....kn.....', '.....kn.....', '.....kn.....'],
    chest: ['.kkkkkkkkk.', 'knnnnnnnnnk', 'kNNNkykNNNk', 'kkkkkykkkkk', 'knnnnnnnnnk', 'knnnnnnnnnk', 'kkkkkkkkkkk'],
  };
  for (const [k, rows] of Object.entries(maps)) mapTexture(scene, k, rows);
  for (const [k, rows] of Object.entries(PARTICLES)) mapTexture(scene, 'pt_' + k, rows);
  for (const [k, rows] of Object.entries(A.STATUS_ICONS)) mapTexture(scene, 'st_' + k, rows);
  for (const [k, rows] of Object.entries(A.INTENT_ICONS)) mapTexture(scene, 'in_' + k, rows);

  for (const it of items.values()) {
    it.gear?.forEach((g, i) => {
      mapTexture(scene, `gear_${it.id}_${i}`, g.rows);
      mapTexture(scene, `gearglow_${it.id}_${i}`, outlineMap(g.rows));
      if (g.alt) mapTexture(scene, `gear_${it.id}_${i}_alt`, g.alt);
    });
    mapTexture(scene, `item_${it.id}`, it.icon ?? (it.gear?.length ? gearIcon(it.gear) : ['k']));
  }
  for (const s of skills.values()) mapTexture(scene, `skill_${s.id}`, s.icon);

  canvasTexture(scene, 'px', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
  canvasTexture(scene, 'px1', 1, 1, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  });
  canvasTexture(scene, 'shadow', 16, 4, (ctx) => {
    ctx.fillStyle = 'rgba(26,28,44,0.5)';
    ctx.fillRect(2, 0, 12, 4);
    ctx.fillRect(0, 1, 16, 2);
  });
  canvasTexture(scene, 'slash', 16, 16, (ctx) => {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) ctx.fillRect(1 + i, 14 - i, 2, 1);
    ctx.fillStyle = '#ffcd75';
    for (let i = 2; i < 12; i++) ctx.fillRect(1 + i, 15 - i, 1, 1);
  });
  mapTexture(scene, 'arrow', pad(['kkkkkkk', 'kyyyyyk', '.kyyyk.', '..kyk..', '...k...']));
}
