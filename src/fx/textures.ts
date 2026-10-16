// PROTOTYPE (combat VFX study). Particle shapes, drawn white and tinted from a palette
// ramp at runtime, like the existing pt_* aura shapes in gfx/textures.ts.
import Phaser from 'phaser';
import { mapTexture, canvasTexture } from '../gfx/pixels';

const SHAPES: Record<string, string[]> = {
  fx_shard: ['w..', 'ww.', '.ww', '..w'],
  fx_coin: ['.w.', 'www', '.w.'],
  fx_puff: ['.ww.', 'wwww', 'wwww', '.ww.'],
  fx_puff_l: ['..ww..', '.wwww.', 'wwwwww', 'wwwwww', '.wwww.', '..ww..'],
  fx_chunk: ['ww', 'w.'],
  fx_streak: ['www'],
  fx_streak_v: ['w', 'w', 'w'],
  fx_rune: ['www', 'w.w', 'ww.', 'w..'],
  fx_rune2: ['w.w', '.w.', 'w.w', 'www'],
  fx_plus: ['.w.', 'www', '.w.'],
  fx_skull: ['.www.', 'w.w.w', 'wwwww', '.w.w.'],
  fx_arrow_d: ['w.w', '.w.'],
  fx_spike: ['.w.', '.w.', 'www'],
  fx_crack: ['w..w', '.ww.', 'w..w'],
  fx_eye: ['.ww.', 'w..w', '.ww.'],
};

export const RINGS = [2, 3, 5, 7, 9, 12, 15, 19];

// Hit sparks: the classic arcade impact star, three sizes, two frames (solid, then only
// the ray tips). This is the one shape that says "a hit landed here" at a glance.
export const SPARKS = [3, 5, 7];
function spark(r: number, tips: boolean): string[] {
  const n = r * 2 + 1;
  const g = Array.from({ length: n }, () => Array(n).fill('.'));
  const d = Math.ceil(r * 0.6);
  for (let i = -r; i <= r; i++) {
    const far = Math.abs(i) > r / 2;
    if (!tips || far) {
      g[r][r + i] = 'w';
      g[r + i][r] = 'w';
    }
  }
  for (let i = -d; i <= d; i++) {
    const far = Math.abs(i) > d / 2;
    if (!tips || far) {
      g[r + i][r + i] = 'w';
      g[r + i][r - i] = 'w';
    }
  }
  if (!tips) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) g[r + y][r + x] = 'w';
  return g.map((row) => row.join(''));
}

export function buildFxTextures(scene: Phaser.Scene) {
  for (const [k, rows] of Object.entries(SHAPES)) mapTexture(scene, k, rows);
  for (const r of SPARKS) {
    mapTexture(scene, `fx_hit_${r}`, spark(r, false));
    mapTexture(scene, `fx_hit_${r}_b`, spark(r, true));
  }
  // 1px pixel rings (midpoint circle), so a shockwave stays on the pixel grid.
  for (const r of RINGS)
    canvasTexture(scene, `fx_ring_${r}`, r * 2 + 1, r * 2 + 1, (ctx) => {
      ctx.fillStyle = '#ffffff';
      let x = r;
      let y = 0;
      let d = 1 - r;
      const plot = (a: number, b: number) => ctx.fillRect(r + a, r + b, 1, 1);
      while (x >= y) {
        for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) plot(a, b);
        y++;
        if (d < 0) d += 2 * y + 1;
        else {
          x--;
          d += 2 * (y - x) + 1;
        }
      }
    });
}
