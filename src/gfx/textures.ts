import Phaser from 'phaser';
import { PAL } from './palette';
import * as A from './art';

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

export function mapTexture(scene: Phaser.Scene, key: string, rows: string[]) {
  if (scene.textures.exists(key)) return;
  const p = pad(rows);
  const tex = scene.textures.createCanvas(key, p[0].length, p.length)!;
  drawMap(tex.getContext(), p);
  tex.refresh();
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
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
      // Outline first, then the glyph on top.
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

// Deterministic noise so backgrounds look the same each run.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const BG_W = 180;
export const BG_H = 128;

function buildBackgrounds(scene: Phaser.Scene) {
  // Alley: brick walls, sidewalk curbs, cracked asphalt.
  canvasTexture(scene, 'bg_alley', BG_W, BG_H, (ctx) => {
    const r = rng(7);
    ctx.fillStyle = PAL.a;
    ctx.fillRect(0, 0, BG_W, BG_H);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = r() < 0.6 ? PAL.d : PAL.g;
      ctx.fillRect(Math.floor(r() * BG_W), Math.floor(r() * BG_H), 1, 1);
    }
    // cracks
    for (let c = 0; c < 4; c++) {
      let x = 30 + Math.floor(r() * 120);
      let y = Math.floor(r() * BG_H);
      ctx.fillStyle = PAL.d;
      for (let s = 0; s < 10; s++) {
        ctx.fillRect(x, y, 1, 1);
        x += Math.floor(r() * 3) - 1;
        y += 1;
      }
    }
    // centre drain line
    ctx.fillStyle = PAL.g;
    for (let y = 0; y < BG_H; y += 16) ctx.fillRect(89, y, 2, 8);
    const wall = (x0: number) => {
      ctx.fillStyle = PAL.k;
      ctx.fillRect(x0, 0, 16, BG_H);
      for (let row = 0; row < BG_H / 4; row++) {
        const off = row % 2 ? 0 : 3;
        for (let bx = -6; bx < 16; bx += 6) {
          const x = x0 + bx + off;
          ctx.fillStyle = (row * 7 + bx) % 3 === 0 ? PAL.N : PAL.n;
          const xs = Math.max(x, x0);
          const xe = Math.min(x + 5, x0 + 16);
          if (xe > xs) ctx.fillRect(xs, row * 4, xe - xs, 3);
        }
      }
    };
    wall(0);
    wall(BG_W - 16);
    ctx.fillStyle = PAL.g;
    ctx.fillRect(16, 0, 3, BG_H);
    ctx.fillRect(BG_W - 19, 0, 3, BG_H);
    ctx.fillStyle = PAL.l;
    ctx.fillRect(16, 0, 1, BG_H);
    ctx.fillRect(BG_W - 17, 0, 1, BG_H);
  });

  // Park: grass verges with a dirt path.
  canvasTexture(scene, 'bg_park', BG_W, BG_H, (ctx) => {
    const r = rng(11);
    ctx.fillStyle = PAL.G;
    ctx.fillRect(0, 0, BG_W, BG_H);
    ctx.fillStyle = PAL.n;
    ctx.fillRect(40, 0, 100, BG_H);
    for (let i = 0; i < 500; i++) {
      const x = Math.floor(r() * BG_W);
      const y = Math.floor(r() * BG_H);
      const onPath = x >= 40 && x < 140;
      ctx.fillStyle = onPath ? (r() < 0.5 ? PAL.N : PAL.o) : r() < 0.5 ? PAL.D : PAL.L;
      if (!onPath || r() < 0.4) ctx.fillRect(x, y, 1, 1);
    }
    // grass tufts
    for (let i = 0; i < 30; i++) {
      const x = r() < 0.5 ? Math.floor(r() * 34) : 144 + Math.floor(r() * 34);
      const y = Math.floor(r() * (BG_H - 3));
      ctx.fillStyle = PAL.D;
      ctx.fillRect(x, y + 1, 1, 2);
      ctx.fillRect(x + 2, y + 1, 1, 2);
      ctx.fillStyle = PAL.L;
      ctx.fillRect(x + 1, y, 1, 3);
    }
    ctx.fillStyle = PAL.N;
    ctx.fillRect(40, 0, 1, BG_H);
    ctx.fillRect(139, 0, 1, BG_H);
  });

  // Sewer: stone ledges and a murky channel.
  canvasTexture(scene, 'bg_sewer', BG_W, BG_H, (ctx) => {
    const r = rng(23);
    ctx.fillStyle = PAL.B;
    ctx.fillRect(0, 0, BG_W, BG_H);
    const stones = (x0: number, w: number) => {
      for (let row = 0; row < BG_H / 6; row++) {
        for (let bx = 0; bx < w; bx += 8) {
          ctx.fillStyle = (row + bx) % 3 === 0 ? PAL.g : PAL.d;
          ctx.fillRect(x0 + bx + (row % 2 ? 4 : 0) - 4, row * 6, 7, 5);
        }
      }
    };
    stones(0, 32);
    stones(156, 32);
    ctx.fillStyle = PAL.D;
    ctx.fillRect(24, 0, 132, BG_H);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = r() < 0.5 ? PAL.G : PAL.B;
      ctx.fillRect(24 + Math.floor(r() * 132), Math.floor(r() * BG_H), 2, 1);
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = PAL.C;
      ctx.fillRect(30 + Math.floor(r() * 120), Math.floor(r() * BG_H), 3, 1);
    }
    ctx.fillStyle = PAL.k;
    ctx.fillRect(23, 0, 1, BG_H);
    ctx.fillRect(156, 0, 1, BG_H);
    ctx.fillStyle = PAL.l;
    ctx.fillRect(22, 0, 1, BG_H);
    ctx.fillRect(157, 0, 1, BG_H);
  });

  // Decals that scroll past on top of the base tile.
  mapTexture(scene, 'decal_manhole', [
    '..kkkkk..',
    '.kgdgdgk.',
    'kgdgdgdgk',
    'kdgdgdgdk',
    'kgdgdgdgk',
    '.kgdgdgk.',
    '..kkkkk..',
  ]);
  mapTexture(scene, 'decal_puddle', [
    '...BBBBB....',
    '.BBbbbbbBB..',
    'BbbcbbbbbbB.',
    '.BBbbbbCbbbB',
    '...BBBBBBB..',
  ]);
  mapTexture(scene, 'decal_bush', [
    '..kkkk...',
    '.kGGLGk..',
    'kGLGGGGk.',
    'kGGGDGLGk',
    'kDGGGGGGk',
    '.kDGDGDk.',
    '..kkkkk..',
  ]);
  mapTexture(scene, 'decal_flower', ['.y.', 'yry', '.y.', '.G.']);
  mapTexture(scene, 'decal_grate', [
    'kkkkkkkkk',
    'kgkgkgkgk',
    'kgkgkgkgk',
    'kgkgkgkgk',
    'kkkkkkkkk',
  ]);
  mapTexture(scene, 'decal_slime', ['..LL..', '.LGGL.', 'LGGGGL', '.LLGL.']);
}

function buildMisc(scene: Phaser.Scene) {
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
  // Raccoon silhouette for dash afterimages.
  const sil = pad(A.RACCOON_0);
  canvasTexture(scene, 'raccoon_ghost', sil[0].length, sil.length, (ctx) => drawMap(ctx, sil, 0, 0, PAL.c));
  canvasTexture(scene, 'shadow', 12, 4, (ctx) => {
    ctx.fillStyle = 'rgba(26,28,44,0.45)';
    ctx.fillRect(2, 0, 8, 4);
    ctx.fillRect(0, 1, 12, 2);
  });
}

export function buildTextures(scene: Phaser.Scene) {
  const maps: Record<string, string[]> = {
    raccoon_0: A.RACCOON_0,
    raccoon_1: A.RACCOON_1,
    rat_0: A.RAT_0,
    rat_1: A.RAT_1,
    pigeon_0: A.PIGEON_0,
    pigeon_1: A.PIGEON_1,
    cat_0: A.CAT_0,
    cat_1: A.CAT_1,
    crow_0: A.CROW_0,
    crow_1: A.CROW_1,
    dog_0: A.DOG_0,
    dog_1: A.DOG_1,
    van_0: A.VAN_0,
    van_1: A.VAN_1,
    ratking_0: A.RATKING_0,
    ratking_1: A.RATKING_1,
    pebble: A.PEBBLE,
    orb: A.ORB,
    feather: A.FEATHER,
    net: A.NET,
    can: A.CAN,
    pizza: A.PIZZA,
    heart: A.HEART,
    heart_empty: A.HEART_EMPTY,
    cap: A.CAP,
  };
  for (const [k, rows] of Object.entries(maps)) mapTexture(scene, k, rows);
  for (const [k, rows] of Object.entries(A.ICONS)) mapTexture(scene, 'icon_' + k, rows);
  buildFont(scene);
  buildBackgrounds(scene);
  buildMisc(scene);

  const anim = (key: string, frames: string[], rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: f })), frameRate: rate, repeat: -1 });
  };
  anim('raccoon_run', ['raccoon_0', 'raccoon_1'], 8);
  anim('rat_run', ['rat_0', 'rat_1'], 8);
  anim('pigeon_fly', ['pigeon_0', 'pigeon_1'], 10);
  anim('cat_walk', ['cat_0', 'cat_1'], 6);
  anim('crow_fly', ['crow_0', 'crow_1'], 8);
  anim('dog_walk', ['dog_0', 'dog_1'], 5);
  anim('van_siren', ['van_0', 'van_1'], 6);
  anim('ratking_walk', ['ratking_0', 'ratking_1'], 5);
}
