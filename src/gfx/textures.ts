import Phaser from 'phaser';
import { PAL } from './palette';
import * as A from './art';
import * as S from './sprites';
import { biomes, enemies, items, skills } from '../content/registry';
import type { Gear } from '../content/types';

function pad(rows: string[]): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
}

function drawMap(ctx: CanvasRenderingContext2D, rows: string[], ox = 0, oy = 0, override?: string) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = override ?? PAL[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

export function mapTexture(scene: Phaser.Scene, key: string, rows: string[], override?: string) {
  if (scene.textures.exists(key)) return;
  const p = pad(rows);
  const tex = scene.textures.createCanvas(key, p[0].length, p.length)!;
  drawMap(tex.getContext(), p, 0, 0, override);
  tex.refresh();
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
}

// Flatten an item's gear pieces into one icon.
function gearIcon(gear: Gear[]): string[] {
  const minX = Math.min(...gear.map((g) => g.x));
  const minY = Math.min(...gear.map((g) => g.y));
  const maxX = Math.max(...gear.map((g) => g.x + Math.max(...g.rows.map((r) => r.length))));
  const maxY = Math.max(...gear.map((g) => g.y + g.rows.length));
  const grid = Array.from({ length: maxY - minY }, () => Array(maxX - minX).fill('.'));
  for (const g of gear)
    g.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && (grid[g.y - minY + y][g.x - minX + x] = ch)));
  return grid.map((r) => r.join(''));
}

export const FONT_CHARS = Object.keys(A.GLYPHS).join('');
const CELL_W = 5;
const CELL_H = 7;

function buildFont(scene: Phaser.Scene) {
  const chars = FONT_CHARS;
  canvasTexture(scene, 'font', chars.length * CELL_W, CELL_H, (ctx) => {
    [...chars].forEach((ch, i) => {
      const g = A.GLYPHS[ch];
      const ox = i * CELL_W + 1;
      ctx.fillStyle = PAL.k;
      g.forEach((row, y) => {
        for (let x = 0; x < 3; x++) {
          if (row[x] !== '#') continue;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ctx.fillRect(ox + x + dx, 1 + y + dy, 1, 1);
        }
      });
      ctx.fillStyle = '#ffffff';
      g.forEach((row, y) => {
        for (let x = 0; x < 3; x++) if (row[x] === '#') ctx.fillRect(ox + x, 1 + y, 1, 1);
      });
    });
  });
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'font',
    width: CELL_W,
    height: CELL_H,
    chars,
    charsPerRow: chars.length,
    'spacing.x': 0,
    'spacing.y': 0,
    'offset.x': 0,
    'offset.y': 0,
    lineSpacing: 1,
  } as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig);
  scene.cache.bitmapFont.add('px', data);
}

// Deterministic noise so scenery looks the same each run.
export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const LAYER_W = 512;
export const GROUND_Y = 124;

function buildBiomes(scene: Phaser.Scene, h: number) {
  biomes.forEach((b, i) => {
    canvasTexture(scene, `sky_${b.id}`, 4, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, b.sky[0]);
      g.addColorStop(1, b.sky[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, h);
    });
    canvasTexture(scene, `far_${b.id}`, LAYER_W, GROUND_Y + 4, (ctx) => b.paintFar(ctx, LAYER_W, GROUND_Y + 4, rng(11 + i), PAL));
    canvasTexture(scene, `near_${b.id}`, LAYER_W, GROUND_Y + 2, (ctx) => b.paintNear(ctx, LAYER_W, GROUND_Y + 2, rng(37 + i), PAL));
    canvasTexture(scene, `ground_${b.id}`, LAYER_W, h - GROUND_Y, (ctx) => b.paintGround(ctx, LAYER_W, h - GROUND_Y, rng(71 + i), PAL));
  });
}

export function buildTextures(scene: Phaser.Scene) {
  const maps: Record<string, string[]> = {
    coon_idle_0: S.COON_IDLE_0,
    coon_idle_1: S.COON_IDLE_1,
    coon_walk_1: S.COON_WALK_1,
    coon_attack: S.COON_ATTACK,
    coon_hurt: S.COON_HURT,
    chest: S.CHEST,
    sign: S.SIGN,
    shopkeep: S.SHOPKEEP,
    lid: S.LID,
    can: A.CAN,
    coin: A.COIN_0,
    pizza: A.PIZZA,
    heart: A.HEART,
    cap: A.CAP,
  };
  for (const [k, rows] of Object.entries(maps)) mapTexture(scene, k, rows);
  mapTexture(scene, 'coon_ghost', S.COON_IDLE_0, PAL.w);
  for (const [k, rows] of Object.entries(A.STATUS_ICONS)) mapTexture(scene, 'st_' + k, rows);
  for (const [k, rows] of Object.entries(A.INTENT_ICONS)) mapTexture(scene, 'in_' + k, rows);

  for (const e of enemies.values()) e.frames.forEach((f, i) => mapTexture(scene, `${e.id}_${i}`, f));
  for (const it of items.values()) {
    it.gear?.forEach((g, i) => {
      mapTexture(scene, `gear_${it.id}_${i}`, g.rows);
      if (g.alt) mapTexture(scene, `gear_${it.id}_${i}_alt`, g.alt);
    });
    mapTexture(scene, `item_${it.id}`, it.icon ?? (it.gear ? gearIcon(it.gear) : ['k']));
  }
  for (const s of skills.values()) mapTexture(scene, `skill_${s.id}`, s.icon);

  buildFont(scene);
  buildBiomes(scene, scene.scale.height);

  canvasTexture(scene, 'px', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
  canvasTexture(scene, 'ring', 32, 32, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTexture(scene, 'shadow', 16, 4, (ctx) => {
    ctx.fillStyle = 'rgba(26,28,44,0.5)';
    ctx.fillRect(2, 0, 12, 4);
    ctx.fillRect(0, 1, 16, 2);
  });
  canvasTexture(scene, 'arrow', 7, 5, (ctx) => {
    ctx.fillStyle = PAL.k;
    ctx.fillRect(0, 0, 7, 2);
    ctx.fillRect(1, 2, 5, 1);
    ctx.fillRect(2, 3, 3, 1);
    ctx.fillRect(3, 4, 1, 1);
    ctx.fillStyle = PAL.y;
    ctx.fillRect(1, 0, 5, 1);
    ctx.fillRect(2, 1, 3, 1);
    ctx.fillRect(3, 2, 1, 1);
  });
}
