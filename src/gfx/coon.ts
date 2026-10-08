// The raccoon. One hand-drawn base pose, the other frames are derived from it so every
// skin and every piece of gear lines up on every frame.
//
// Colour channels (remapped by skins):
//   k outline   1 main fur   2 dark fur (mask, ears, tail rings, paws)
//   3 light fur (belly, muzzle)   4 white (brows, cheeks)   p inner ear
// Everything else is a normal palette colour.

export const COON_W = 36;
export const COON_H = 25;

export const COON_BASE = [
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

// Where gear attaches, in base-pose pixel coordinates.
export const ANCHORS = {
  head: { x: 23, y: 3 }, // top of the head between the ears
  face: { x: 26, y: 8 }, // the eye line
  body: { x: 17, y: 16 }, // middle of the torso
  back: { x: 11, y: 12 }, // just behind the shoulders
  paw: { x: 27, y: 17 }, // the front paw
  tail: { x: 5, y: 9 }, // middle of the tail
} as const;
export type AnchorKey = keyof typeof ANCHORS;

// Which body part each anchor rides on, so gear follows the animation.
export const ANCHOR_PART: Record<AnchorKey, Part> = { head: 'head', face: 'head', body: 'body', back: 'body', paw: 'paw', tail: 'tail' };
export type Part = 'head' | 'body' | 'paw' | 'tail';

export type Pose = 'idle0' | 'idle1' | 'walk0' | 'walk1' | 'attack' | 'hurt';
export const POSES: Pose[] = ['idle0', 'idle1', 'walk0', 'walk1', 'attack', 'hurt'];

// How far each part moved in each pose, relative to the base.
export const POSE_OFFSETS: Record<Pose, Record<Part, [number, number]>> = {
  idle0: { head: [0, 0], body: [0, 0], paw: [0, 0], tail: [0, 0] },
  idle1: { head: [0, 1], body: [0, 1], paw: [0, 1], tail: [0, 1] },
  walk0: { head: [0, 0], body: [0, 0], paw: [0, 0], tail: [0, 0] },
  walk1: { head: [0, 0], body: [0, 0], paw: [0, 0], tail: [0, 0] },
  attack: { head: [2, 0], body: [1, 0], paw: [3, -2], tail: [1, 0] },
  hurt: { head: [-2, 0], body: [0, 0], paw: [0, 0], tail: [0, 0] },
};

type Grid = string[][];
const toGrid = (rows: string[]): Grid => rows.map((r) => [...r.padEnd(COON_W, '.')]);
const fromGrid = (g: Grid) => g.map((r) => r.join(''));

// Move every pixel inside a rectangle; the space it leaves becomes transparent.
function shift(g: Grid, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number) {
  if (!dx && !dy) return;
  const copy: [number, number, string][] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (g[y]?.[x] && g[y][x] !== '.') copy.push([x, y, g[y][x]]);
      if (g[y]?.[x]) g[y][x] = '.';
    }
  for (const [x, y, c] of copy) if (g[y + dy] && x + dx >= 0 && x + dx < COON_W) g[y + dy][x + dx] = c;
}

function paint(g: Grid, rows: string[], ox: number, oy: number) {
  rows.forEach((r, y) => [...r].forEach((c, x) => c !== ' ' && g[oy + y] && (g[oy + y][ox + x] = c === '_' ? '.' : c)));
}

const LEGS_A = ['......k222k......k222kk222k.......', '.....k222k........k222kk222k......', '.....kkkk.........kkkk.kkkk.......'];
const LEGS_B = ['........k222k...k222k..k222k......', '........k222k..k222k....k222k.....', '........kkkk...kkkk.....kkkk......'];

function withLegs(base: string[], legs: string[]) {
  return [...base.slice(0, 22), ...legs];
}

// base: the base pose to derive from (a skin's pattern is painted onto it first).
export function buildPose(p: Pose, base: string[] = COON_BASE): string[] {
  let rows = base;
  if (p === 'walk0') rows = withLegs(base, LEGS_A);
  if (p === 'walk1') rows = withLegs(base, LEGS_B);
  const g = toGrid(rows);
  if (p === 'idle1') {
    // breathe: everything above the legs sinks one pixel
    g.splice(19, 1);
    g.unshift([...'.'.repeat(COON_W)]);
  }
  if (p === 'attack') {
    shift(g, 0, 0, 35, 21, 1, 0); // whole body leans in
    shift(g, 15, 0, 35, 12, 1, 0); // head lunges a bit further
    // front paw swipes out under the snout
    paint(g, ['kkkk', '1112k', 'k222k', '.kkk'], 28, 13);
  }
  if (p === 'hurt') {
    shift(g, 15, 0, 35, 12, -2, 0);
    // squeezed-shut eyes
    for (const x of [16, 23]) paint(g, ['k2k', '2k2', 'k2k'], x, 6);
  }
  return fromGrid(g);
}

// Default fur, a classic grey raccoon.
export const DEFAULT_FUR = { '1': '#8b93a8', '2': '#3c4258', '3': '#c9d1dd', '4': '#f4f4f4', p: '#f5a5b8' };
