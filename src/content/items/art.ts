// Small helpers for item pixel art. Gear positions are relative to the anchors in
// gfx/coon.ts (head 23,3  face 26,8  body 17,16  back 11,12  paw 27,17  tail 5,9).

// Swap palette keys: tint(VEST, { a: 'n', b: 'N', c: 'T' }).
export function tint(rows: string[], map: Record<string, string>): string[] {
  return rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join(''));
}

// Paint `top` over `base`; '.' and ' ' in `top` let the base show through.
export function over(base: string[], top: string[]): string[] {
  return base.map((r, y) => [...r].map((ch, x) => (top[y]?.[x] && top[y][x] !== '.' && top[y][x] !== ' ' ? top[y][x] : ch)).join(''));
}

// Torso shell for shirts and armour, 20x10 at body anchor (-9, -5): covers x8-27, y11-20.
// a = main colour, b = shade, c = highlight. Row 0 is spare room for collars and spikes.
export const VEST = [
  '....................',
  '.....kkkkkkkkkkkk...',
  '...kkcccccccccccckk.',
  '..kccaaaaaaaaaaaaak.',
  '.kcaaaaaaaaaaaaaaabk',
  '.kaaaaaaaaaaaaaaaabk',
  '.kaaaaaaaaaaaaaaaabk',
  '.kbaaaaaaaaaaaaaabbk',
  '..kbbbbbbbbbbbbbbbk.',
  '...kkkkkkkkkkkkkkk..',
];
export const VEST_X = -9;
export const VEST_Y = -5;
