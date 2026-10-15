// Body gear for forged items: shirts, coats, robes and armour. Each starts from the
// torso shell and paints its own pattern, trim and add-ons. See shape.ts for channels.
import { VEST, VEST_X, VEST_Y, over, tint } from '../art';
import type { Gear } from '../../types';
import type { Shape } from './shape';

const SHELL = tint(VEST, { a: '2', b: '3', c: '1' });
// a torso pattern (20x10 over the shell), plus optional pieces behind or in front
// Patterns stay inside the shell, except on the top two rows (collars, spikes, fur).
const clip = (top: string[]) => top.map((r, y) => [...r].map((ch, x) => (y <= 1 || ('.k'.indexOf(SHELL[y][x] ?? '.') < 0) ? ch : '.')).join(''));
const suit = (top: string[], extra: Gear[] = []): Shape => ({ parts: [...extra.filter((g) => g.behind), { anchor: 'body', x: VEST_X, y: VEST_Y, rows: over(SHELL, clip(top)) }, ...extra.filter((g) => !g.behind)] });
const behind = (x: number, y: number, rows: string[]): Gear => ({ anchor: 'body', x, y, rows, behind: true });
const front = (x: number, y: number, rows: string[]): Gear => ({ anchor: 'body', x, y, rows });

export const BODY: Record<string, Shape> = {
  stripes: suit([
    '', '', '', '...5555555555555', '', '..5555555555555', '', '..5555555555555',
  ]),
  belted: suit([
    '', '', '', '', '', '', '.k666666666666666k', '.k66656666666666k',
  ]),
  zipper: suit([
    '', '', '...........5', '...........6', '...........5', '...........6', '...........5', '...........6',
  ]),
  plate: suit([
    '', '', '...k.......k....k', '..1k1111111k1111k', '', '...k.......k....k', '..w.........w', '',
  ]),
  scales: suit([
    '', '', '...3.3.3.3.3.3.3', '....3.3.3.3.3.3.3', '...3.3.3.3.3.3.3', '....3.3.3.3.3.3.3', '...3.3.3.3.3.3.3', '',
  ]),
  chainmail: suit([
    '', '', '...1.1.1.1.1.1.1', '..3.3.3.3.3.3.3.3', '...1.1.1.1.1.1.1', '..3.3.3.3.3.3.3.3', '...1.1.1.1.1.1.1', '',
  ]),
  spiked: suit([
    '...k.k.k.k.k.k.k', '..kwkwkwkwkwkwkwk', '', '', '', '', '', '',
  ]),
  studs: suit([
    '', '', '...5...5...5...5', '', '.....5...5...5..5', '', '...5...5...5...5', '',
  ]),
  robe: suit([
    '', '', '', '', '', '', '', '',
  ], [front(-9, 3, ['.k1111111111111111k.', 'k12222222222222223k.', 'k6666666666666666kk', '.kkkkkkkkkkkkkkkkk..'])]),
  apron: suit([
    '', '', '.........kkk', '........k555k', '.......k55555k', '.......k55555k', '.......k56665k', '........kkkkk',
  ]),
  sash: suit([
    '', '', '....55', '......55', '........55', '..........55', '............55', '..............55',
  ]),
  tie: suit([
    '', '.........kk', '........k55k', '.........56k', '.........556k', '........k556k', '.........kk', '',
  ]),
  vest_open: suit([
    '', '', '..........k1k', '..........k3k', '..........k3k', '..........k3k', '...........k', '',
  ]),
  hazard: suit([
    '', '', '..5.5.5.5.5.5.5.5', '', '', '', '', '..5.5.5.5.5.5.5.5',
  ]),
  checker: suit([
    '', '', '...55..55..55..55', '...55..55..55..55', '.....55..55..55..', '.....55..55..55..', '...55..55..55..55', '',
  ]),
  dots: suit([
    '', '', '....5....5....5', '', '.......5....5....5', '', '....5....5....5', '',
  ]),
  cross: suit([
    '', '', '.........k5k', '........kk5kk', '.......k55555k', '........kk5kk', '.........k5k', '',
  ]),
  emblem: suit([
    '', '', '..........kkk', '.........k565k', '.........k656k', '.........k565k', '..........kkk', '',
  ]),
  pockets: suit([
    '', '', '', '....kkk....kkk', '....k5k....k5k', '....kkk....kkk', '', '',
  ]),
  ribs: suit([
    '', '', '...w.w.w.w.w.w', '....w.w.w.w.w.w', '...w.w.w.w.w.w', '', '', '',
  ]),
  furry: suit([
    '..1.1.1.1.1.1.1.1', '.1k1k1k1k1k1k1k1k1', '', '', '', '', '', '.3.3.3.3.3.3.3.3',
  ]),
  collar: suit([
    '....kkkkkkkkkk', '...k5555555555k', '....kkkkkkkkkk', '', '', '', '', '',
  ]),
  cape: suit([
    '', '', '', '', '', '', '', '',
  ], [behind(-11, -9, ['....kkkkk.', '..kk55555k', '.k5555566k', 'k5555666k.', 'k555666k..', 'k55666k...', 'k5666k....', 'k666k.....', 'kkkk......'])]),
  hooded: suit([
    '', '', '', '', '', '', '', '',
  ], [front(-2, -7, ['kkk.......', 'k12kk.....', 'k1222kkk..', '.k1222223k', '..kkkkkkk.'])]),
  shoulder_pads: suit([
    '', '', '', '', '', '', '', '',
  ], [front(-11, -7, ['.kkkkk.', 'k11112k', 'k55556k', '.kkkkk.']), front(5, -7, ['.kkkkk.', 'k11112k', 'k55556k', '.kkkkk.'])]),
  bandolier: suit([
    '', '', '...k5k', '.....k5k', '.......k5k', '.........k5k', '...........k5k', '.............k5k',
  ]),
  barrel: suit([
    '', '', '..6666666666666666', '', '', '', '..6666666666666666', '',
  ], [front(-10, -4, ['k', 'k', 'k', 'k', 'k', 'k']), front(10, -4, ['k', 'k', 'k', 'k', 'k', 'k'])]),
  wrapped: suit([
    '', '', '..55..55..55..55', '...55..55..55..55', '....55..55..55..5', '..5..55..55..55..', '...55..55..55..55', '',
  ]),
  tank_top: suit([
    '.....kk.....kk', '....k22k...k22k', '....k2k.....k2k', '', '', '', '', '',
  ]),
  gem_core: suit([
    '', '', '.........kkkk', '........k5ww5k', '........k5566k', '.........k66k', '..........kk', '',
  ]),
  vents: suit([
    '', '', '', '...k1k1k1k1k1k', '...kkkkkkkkkkk', '...k3k3k3k3k3k', '', '',
  ], [behind(-7, -10, ['kk.kk', 'k1k1k', 'k3k3k', 'k3k3k', 'kkkkk'])]),
  wings_small: suit([
    '', '', '', '', '', '', '', '',
  ], [behind(-9, -13, ['kk.......', 'k5k......', 'k55kk....', 'k5555k...', '.k55556k.', '..k5666k.', '...kkkk..'])]),
};
