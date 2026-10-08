// Holiday skins: only sold while their season (SeasonDef id) is active.
import type { Gear } from '../../content/types';
import type { SkinDef, SkinRarity } from '../types';
import {
  fur, tone, pat, only, rnd, stripesH, diag, dots, blobs, inHead, inTail, inBody, cut, 
  type Fur, type PatFn,
} from './util';
import * as P from './pieces';

type Extra = Partial<Pick<SkinDef, 'effect' | 'glow'>> & { pattern?: PatFn; outfit?: Gear[] };
const h = (season: string, id: string, name: string, rarity: SkinRarity, f: Fur, x: Extra = {}): SkinDef => {
  const s: SkinDef = { id, name, rarity, group: 'holiday', season, fur: f };
  if (x.pattern) s.pattern = pat(x.pattern);
  if (x.outfit) s.outfit = x.outfit;
  if (x.effect) s.effect = x.effect;
  if (x.glow) s.glow = x.glow;
  return s;
};
const { suit, anyOf, belt, buttons, at } = P;
const mirror = (rows: string[]) => rows.map((r) => r + [...r].reverse().join(''));

// ---------------------------------------------------------------- holiday pieces

const santaHat = (main = 'r', trim = 'w'): Gear =>
  at('head', 12, -5, [
    '.kkk..............',
    'k@wwk....kkkkk....',
    'kwwwkkkkk#####kk..',
    '.kkk%%########%k..',
    '....kk#########%k.',
    '.....k##########k.',
    '....kTTTTTTTTTTTTk',
    '....kTTTTTTTTTTTTk',
    '.....kkkkkkkkkkkk.',
  ].map((r) => r.replace(/#/g, main).replace(/%/g, 'R').replace(/T/g, trim).replace(/@/g, 'w')));

const antlers = (c = 'n'): Gear =>
  at('head', 13, -6, mirror([
    '.k.k......',
    'kXkXk.....',
    '.kXXk.k...',
    '..kXXkXk..',
    '...kXXXk..',
    '....kkXk..',
  ]).map((r) => r.replace(/X/g, c)));

const bunnyEars = (outer: string, inner: string): Gear =>
  at('head', 18, -8, [
    '.kk....kk.',
    'k@@k..k@@k',
    'k#Pk..k#Pk',
    'k#Pk..k#Pk',
    'k#Pk..k#Pk',
    'k#Pk..k#Pk',
    'k#Pk..k#Pk',
    'k##k..k##k',
    '.k#k..k#k.',
    '.kk....kk.',
  ].map((r) => r.replace(/#/g, outer).replace(/@/g, outer).replace(/P/g, inner)));

const catEars = (main: string, inner: string): Gear =>
  at('head', 17, -3, [
    'k..........k',
    'kk........kk',
    'k#k......k#k',
    'k*#k....k#*k',
    'k*##kkkk##*k',
  ].map((r) => r.replace(/#/g, main).replace(/\*/g, inner)));

const eggshell = (): Gear =>
  at('head', 16, -2, [
    '..k.kk.k.kk..k',
    '.kwkwwkwkwwkwk',
    'kQwwwwwwwwwwQk',
    'kQQwwwwwwwwQQk',
    'kkkkkkkkkkkkkk',
  ]);

const pumpkinHead = (): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y)) return undefined;
    if (y <= 2) return undefined; // ears poke out of the pumpkin
    if (c === 'k') return 'k';
    if (c === '.') return undefined;
    // carved eyes and grin
    if ((y === 6 || y === 7) && ((x >= 18 && x <= 20 && (y === 7 || x === 19)) || (x >= 25 && x <= 27 && (y === 7 || x === 26)))) return 'y';
    if (y === 9 && x >= 21 && x <= 31) return (x % 2 ? 'y' : 'O');
    if (y === 10 && x >= 22 && x <= 30 && x % 2 === 0) return 'y';
    return x % 3 === 0 ? 'S' : 'o';
  });
const stem = (): Gear => at('head', 21, 0, ['.kk', 'kGk', 'kFk', '.k.']);

const ghostHood = (): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || c === '.') return undefined;
    if (c === 'k') return 'k';
    if ((y === 6 || y === 7) && (x === 19 || x === 20 || x === 25 || x === 26)) return 'k'; // eye holes
    if (y === 10 && (x === 28 || x === 29)) return 'k'; // little mouth
    return 'w';
  });

const witchHat = (): Gear => P.wizardHat('d', 'v', 'O');

const flatTop = (): Gear =>
  P.hood({ main: 'k', bottom: 4, ears: false, deco: (x, y) => (y === 4 && x % 3 === 0 ? 'd' : undefined) });
const flatTopCap = (): Gear => at('head', 16, -1, ['kkkkkkkkkkkkkk', 'kddkdddkddddkk', 'kkkkkkkkkkkkkk']);
const neckBolts = (): Gear => at('body', 12, 11, ['k...........kk', 'lk.........kll', 'k...........kk']);
const stitches = (x0: number, y0: number, len: number, vertical = false): Gear =>
  at(y0 < 12 ? 'head' : 'body', x0, y0, vertical ? Array.from({ length: len }, (_, i) => (i % 2 ? 'kkk' : '.k.')) : ['.' + 'k.'.repeat(len), 'k'.repeat(len * 2 + 1), '.' + 'k.'.repeat(len)]);
const fangs = (): Gear => at('head', 28, 11, ['wkw']);
const vampireCollar = (): Gear => at('body', 9, 8, ['..kk..', '.krk..', 'krrk..', 'krk...', 'kk....'], { behind: true });
const slickHair = (): Gear =>
  P.hood({ main: 'k', bottom: 4, deco: (x, y) => (y === 4 && x >= 22 && x <= 23 ? 'k' : y === 3 && x === 19 ? 'd' : undefined) });
const bowOnHead = (main: string): Gear => at('head', 18, -3, ['kk..kk.kk', 'k#k.k#k#k', 'k##k##k#k', 'k#kk#k##k', 'kk..kkkkk'].map((r) => r.replace(/#/g, main)));
const giftBow = (main: string): Gear => at('head', 18, -3, ['.kk...kk.', 'k##k.k##k', 'k###k###k', '.kk#k#kk.', '...kkk...'].map((r) => r.replace(/#/g, main)));
const starTopper = (): Gear => at('head', 20, -5, ['...k...', '..kyk..', 'kkyYykk', '.kyyyk.', '.kykyk.', '.kk.kk.']);
const carrotNose = (): Gear => at('face', 32, 8, ['kk...', 'kook.', 'koook', 'kkkk.']);
const redNose = (): Gear => at('face', 32, 8, ['.kk.', 'k@rk', 'krrk', '.kk.'].map((r) => r.replace('@', 'h')));
const shako = (main: string, trim: string): Gear =>
  at('head', 17, -8, [
    '....kkk.....',
    '...kwwwk....',
    '..kkkwkkkk..',
    '.k@#######k.',
    '.k@#######k.',
    '.k@##O####k.',
    '.k@#OOO###k.',
    '.k@#######k.',
    '.kTTTTTTTTk.',
    'kkkkkkkkkkkk',
  ].map((r) => r.replace(/#/g, main).replace(/@/g, main).replace(/T/g, trim)));
const lollipop = (): Gear => at('paw', 28, 9, ['.kkk.', 'kwrwk', 'krwrk', 'kwrwk', '.kkk.', '..w..', '..w..', '..w..', '..k..']);
const heartProp = (c: string): Gear => at('paw', 27, 13, ['.k.k.', 'k#k#k', 'k@##k', '.k#k.', '..k..'].map((r) => r.replace(/#/g, c).replace('@', 'w')));
const rose = (): Gear => at('paw', 28, 9, ['.kk.', 'krrk', 'kRrk', '.kk.', '.Gk.', 'GGk.', '.Gk.', '.G..', '.k..']);
const heartShades = (): Gear => at('face', 16, 6, ['kkkkkkkkkkkkkk', 'k.k.kkk.k.k..', 'khkhk.khkhk..', '.khk...khk...', '..k.....k....']);
const heartAntennae = (): Gear => at('head', 18, -5, ['k.k..k.k', 'khkhkhkh', '.khk.khk', '..k...k.', '..k...k.', '...k.k..']);
const cupidBow = (): Gear => at('paw', 27, 8, ['kk....', 'kOk...', '.kOk..', '.kOkl.', '..kOl.', 'hhkOlh', '..kOl.', '.kOkl.', '.kOk..', 'kOk...', 'kk....']);
const carrot = (): Gear => at('paw', 27, 13, ['..kGk.', '.kGGk.', 'kook..', 'kook..', 'kok...', 'kk....']);
const basket = (): Gear => at('paw', 25, 12, ['..kkkk...', '.k....k..', 'kkkkkkkkk', 'khkcky.kk', 'kSSSSSSSk', 'kSkSkSkSk', '.kkkkkkk.']);
const bonnet = (): Gear =>
  at('head', 15, -2, [
    '....kkkkkkkk....',
    '..kk@@#######k..',
    '.k@###########k.',
    'k##########h###k',
    'kkkkkkkkkkkkkkkk',
    '....k..........',
    '...k...........',
  ].map((r) => r.replace(/#/g, 'Y').replace(/@/g, 'w')));
const lambBell = (): Gear => at('body', 22, 12, ['kkkkk', '.kOk.', 'kOOOk', 'kkkkk']);
const orangeAfro = (): Gear => P.afro('o', 'O');
const flagPaint = (): Gear => at('face', 22, 9, ['r..r', 'w..w', 'b..b']);
const dutchFlag = (): Gear => at('paw', 28, 4, ['kkkkkkk', 'krrrrrk', 'kwwwwwk', 'kbbbbbk', 'kkkkkkk', 'k......', 'n......', 'n......', 'n......', 'n......', 'n......', 'k......'].map((r) => r));
const surfboard = (): Gear => at('back', 10, -6, ['..kk.', '.kwck', '.kcwk', 'kwcck', 'kccwk', 'kwcck', 'kcrck', 'kcrck', 'kwcck', 'kccwk', 'kwcck', 'kccwk', '.kwck', '.kck.', '..k..'], { behind: true });
const flamingoRing = (): Gear =>
  at('body', 8, 15, [
    '..........................k',
    '.........................khk',
    '..kkkkkkkkkkkkkkkkkkkkkkkkhk',
    '.k@hhhhhhhhhhhhhhhhhhhhhhhk.',
    'khhhhhhhhhhhhhhhhhhhhhhhhhk.',
    '.kkkkkkkkkkkkkkkkkkkkkkkkk..',
  ].map((r) => r.replace('@', 'w')));
const coneHat = (): Gear =>
  at('head', 17, -6, [
    '...kkkkkk...',
    '..kPhPPhPk..',
    '.kPPPPhPPPk.',
    'kQQPQQPQQQPk',
    'kkkkkkkkkkkk',
    '.kSkSkSkSk..',
    '..kSkSkSk...',
  ]);
const tikiMask = (): Gear =>
  at('face', 16, 2, [
    '.kkkkkkkkkkkkkk.',
    'kOSOSOSOSOSOSOSk',
    'kNNNNNNNNNNNNNNk',
    'kNkkkNNNNkkkNNNk',
    'kNkykNNNNkykNNNk',
    'kNkkkNNNNkkkNNNk',
    'kNNNNNkkNNNNNNNk',
    'kNNkwkwkwkwkNNk.',
    'kNNkkkkkkkkkNNk.',
    '.kNNNNNNNNNNNk..',
    '..kkkkkkkkkkk...',
  ]);
const grassSkirt = (): Gear =>
  at('body', 5, 17, [
    '.kkkkkkkkkkkkkkkkkkkkkkk.',
    'kzGzGzGzGzGzGzGzGzGzGzGzk',
    'kGzkzGkGzkzGkGzkzGkGzkzGk',
    '.kk.kk.kk.kk.kk.kk.kk.kk.',
  ]);
const sandBucket = (): Gear =>
  at('head', 17, -4, [
    '..kkkkkkkk..',
    '.k........k.',
    'kkkkkkkkkkkk',
    'k@ccccccccck',
    'k@cyycccccck',
    '.k@ccccccck.',
    '.kkkkkkkkkk.',
  ].map((r) => r.replace('@', 'C')).map((r) => r.replace('@', 'C')));
const spade = (): Gear => at('paw', 28, 10, ['.k.', 'k#k', 'k#k', '.k.', 'kyyk', 'kyyk', 'kyyk', '.kk.'].map((r) => r.replace(/#/g, 'n')));
const dragonHood = (): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || c === '.') return undefined;
    if (c === 'k') return 'k';
    if (y <= 5) return y === 5 ? 'O' : (x + y) % 3 ? 'r' : 'O';
    if (y >= 10 && x <= 28) return y === 10 ? 'k' : 'O';
    return undefined;
  });
const dragonHorns = (): Gear => at('head', 15, -4, ['kk...........', 'kOk.......kk.', '.kOk.....kOk.', '..kOk...kOk..', '...kk...kk...']);
const whiskers = (): Gear => at('face', 30, 9, ['..kkk', '.kO..', 'kO...', 'k....']);
const luckyBell = (): Gear => at('body', 15, 12, ['kkkkkkkkkkkk', 'krrrrrrrrrrk', 'kkkkkkkOOkkk', '.......kOk..', '.......kk...'].map((r) => r));
const raisedPaw = (): Gear => at('paw', 28, 9, ['.kkk.', 'kwwwk', 'kwPwk', 'kwwwk', 'kwwk.', 'kwwk.', '.kk..']);
const chineseLantern = (): Gear => at('paw', 27, 11, ['..k...', '.kkk..', 'kOOOk.', 'krrrrk', 'kryrrk', 'krrrrk', 'kOOOk.', '.kOk..', '..O...']);
const fuse = (): Gear => at('head', 21, -4, ['..y.', '.yq.', '.k..', 'kk..'], { alt: ['.q..', '.yq.', '.k..', 'kk..'] });
const leprechaunHat = (): Gear => P.topHat('G', 'k', 'z');
const buckle = (): Gear => at('head', 21, -1, ['kkkk', 'kyyk', 'kkkk']);
const potOfGold = (): Gear => at('paw', 25, 13, ['.kOkOk.', 'kOYOOOk', 'kkkkkkk', 'kdddddk', 'kd@dddk', '.kdddk.', '..kkk..'].map((r) => r.replace('@', 'l')));
const clover = (): Gear => at('paw', 28, 10, ['.kk.kk', 'kGGkGGk', 'kGFGFGk', '.kGGGk.', 'kGGkGGk', '.kk.kkk', '....kFk', '....kFk', '.....k.'].map((r) => r.slice(0, 7)));
const bowler = (main: string): Gear => at('head', 16, -2, ['....kkkkkk....', '..kk@#####kk..', '.k@#########k.', '.kkkkkkkkkkkk.', 'k%%%%%%%%%%%%k', '.kkkkkkkkkkkk.'].map((r) => r.replace(/#/g, main).replace(/@/g, main).replace(/%/g, main)));
const fiddle = (): Gear => at('paw', 26, 12, ['......kk', '.....knk', '..kk.kk.', '.knnkk..', 'knNnk...', 'knnNk...', '.knnk...', '..kk....']);

// ---------------------------------------------------------------- patterns

const bones: PatFn = (x, y, c) => {
  if (c === '2') return undefined;
  if (inBody(x, y) && y >= 14 && y <= 19 && x >= 12 && x <= 26) return y % 2 === 0 && x !== 19 ? 'w' : x === 19 ? 'w' : undefined;
  if (inHead(x, y) && y >= 3) return c === '3' || c === '1' ? 'l' : undefined;
  if (inTail(x, y)) return y % 2 ? 'w' : undefined;
  if (y === 21) return 'w';
  return undefined;
};
const bandages: PatFn = (x, y, c) => {
  if (c === '2' && inHead(x, y) && y >= 6) return undefined;
  const r = rnd(Math.floor((x + y * 2) / 4), 0, 7);
  return (x + y * 2) % 4 === 0 ? 'T' : r < 0.25 ? 'Y' : 'Q';
};
const ornaments: PatFn = (x, y, c) => {
  if (c === '2' && inHead(x, y)) return undefined;
  const r = rnd(x, y, 11);
  if (r < 0.04) return 'r';
  if (r < 0.08) return 'y';
  if (r < 0.11) return 'c';
  if ((x + y * 3) % 9 === 0) return 'O';
  return (x + y) % 5 === 0 ? 'F' : undefined;
};
const icing: PatFn = (x, y, c) => {
  if (c !== '1') return undefined;
  if (inTail(x, y)) return y % 3 === 0 ? 'w' : undefined;
  if (inBody(x, y) && (x === 19 || x === 20) && y % 3 === 0) return y % 2 ? 'r' : 'G';
  if (inBody(x, y) && y === 20 && x % 2 === 0) return 'w';
  return undefined;
};
const hearts = (k: string, seed: number, dens = 0.6): PatFn => (x, y) => {
  const heart = ['.r.r.', 'rrrrr', '.rrr.', '..r..'];
  const xx = x % 6;
  const yy = y % 5;
  return yy < 4 && xx < 5 && heart[yy][xx] === 'r' && rnd(Math.floor(x / 6), Math.floor(y / 5), seed) < dens ? k : undefined;
};
const shamrocks: PatFn = (x, y) => {
  const leaf = ['.G.', 'GFG', '.G.'];
  const xx = x % 5;
  const yy = (y + (Math.floor(x / 5) % 2) * 2) % 5;
  return yy < 3 && xx < 3 && leaf[yy][xx] === 'G' ? 'L' : yy < 3 && xx < 3 && leaf[yy][xx] === 'F' ? 'F' : undefined;
};
const coins: PatFn = (x, y) => {
  const cx = Math.floor(x / 3);
  const cy = Math.floor(y / 3);
  if (rnd(cx, cy, 33) > 0.55) return undefined;
  const ix = x % 3;
  const iy = y % 3;
  return ix === 1 && iy === 1 ? 'Y' : ix === 2 || iy === 2 ? 'S' : 'O';
};
const wool: PatFn = (x, y, c) => {
  if (inHead(x, y) && y >= 5) return undefined;
  if (c === '2') return undefined;
  return (x + (y % 2)) % 2 === 0 ? 'Q' : 'w';
};
const eggs: PatFn = (x, y) => (['P', undefined, 'C', undefined, 'Y', undefined, 'm', undefined] as (string | undefined)[])[(((y + Math.abs((x % 6) - 3)) % 8) + 8) % 8];

// ---------------------------------------------------------------- the skins

export const HOLIDAY_SKINS: SkinDef[] = [
  // ---------------------------------------------------------------- christmas
  h('christmas', 'santa', 'SANTA COON', 3, fur('#c9d1dd', '#3c4258', '#f4f4f4'), {
    outfit: [
      P.sack('n', 'N'),
      santaHat(),
      P.beard('w', 'l'),
      suit({ main: 'r', belly: 'r', deco: anyOf(belt('k', 'y', 18), (x, y) => (x === 25 && y !== 18 ? 'w' : y === 20 ? 'w' : undefined)) }),
    ],
    effect: 'snow',
  }),
  h('christmas', 'reindeer', 'REINDEER', 2, fur('#a0704a', '#4a2a1a', '#e0c49a', '#fff0dc'), {
    outfit: [antlers(), redNose(), P.at('body', 14, 12, ['kkkkkkkkkkkk', 'kGGGGGGGyGGk', 'kkkkkkkkkkkk'])],
    effect: 'snow',
  }),
  h('christmas', 'elf', 'ELF', 2, fur('#f8b48c', '#7a3a20', '#fff0dc'), {
    outfit: [
      P.nightcap('G', 'r', 'y'),
      suit({ main: 'G', belly: 'G', deco: anyOf(belt('k', 'y'), (x, y) => (y === 13 ? (x % 2 ? 'r' : 'y') : undefined)) }),
      P.tailBell('O'),
    ],
  }),
  h('christmas', 'snowman', 'SNOWMAN', 2, fur('#f4f4f4', '#94b0c2', '#ffffff', '#ffffff', '#c7f2ff'), {
    pattern: only('1', (x, y) => (inBody(x, y) && x === 24 && y % 3 === 0 ? 'k' : undefined)),
    outfit: [P.topHat('k', 'r', 'd'), carrotNose(), P.scarf('r', 'G')],
    effect: 'snow',
  }),
  h('christmas', 'gingerbread', 'GINGERBREAD', 2, fur('#b06a3b', '#5c2e1a', '#d08a4a', '#f4f4f4', '#f4f4f4'), {
    pattern: icing,
    outfit: [P.at('head', 18, 2, ['w.w.w.w.w.w'])],
  }),
  h('christmas', 'nutcracker', 'NUTCRACKER', 3, fur('#f0d0b0', '#1a1c2c', '#fff6e0'), {
    outfit: [
      shako('r', 'O'),
      P.beard('w', 'l'),
      suit({ main: 'r', belly: 'r', deco: anyOf(buttons('O', 25), buttons('O', 22), belt('k', 'O'), (_x, y) => (y === 13 ? 'O' : undefined)) }),
      P.sword('l', 'O'),
    ],
    effect: 'sparkle',
  }),
  h('christmas', 'xmastree', 'XMAS TREE', 2, tone('#2d6a3e'), { pattern: only('13', ornaments), outfit: [starTopper()], effect: 'sparkle' }),
  h('christmas', 'candycane', 'CANDY CANE', 1, fur('#f4f4f4', '#b13e53', '#ffffff', '#ffffff', '#ff77c8'), { pattern: only('13', diag('r', 6, 2)), outfit: [bowOnHead('G')] }),
  h('christmas', 'snowangel', 'SNOW ANGEL', 3, fur('#e2eaf2', '#73eff7', '#ffffff', '#ffffff', '#c7f2ff'), {
    pattern: only('13', dots('C', 0.08, 21)),
    outfit: [P.fairyWings('i', 'C'), P.crown('C', 'w', 'i')],
    effect: 'snow',
  }),
  h('christmas', 'present', 'PRESENT BOX', 2, fur('#94b0c2', '#333c57', '#f4f4f4'), {
    outfit: [giftBow('y'), suit({ main: 'b', belly: 'b', deco: (x, y) => (x === 19 || x === 20 || y === 16 ? 'y' : undefined) })],
  }),

  // ---------------------------------------------------------------- halloween
  h('halloween', 'skeleton', 'SKELETON', 2, fur('#1a1c2c', '#0e0f1a', '#333c57', '#f4f4f4', '#566c86'), { pattern: bones, effect: 'glow', glow: '#94b0c2' }),
  h('halloween', 'vampire', 'VAMPIRE', 3, fur('#c9d1dd', '#3b1f5c', '#f4f4f4', '#ffffff', '#b13e53'), {
    outfit: [P.cape('k', 'r'), vampireCollar(), slickHair(), fangs(), suit({ main: 'k', belly: 'w', deco: (x, y) => (x >= 22 && y <= 16 ? 'w' : undefined) }), P.bowtie('r')],
    effect: 'glow',
    glow: '#b13e53',
  }),
  h('halloween', 'pumpkin', 'PUMPKIN KING', 3, fur('#333c57', '#1a1c2c', '#566c86'), {
    outfit: [pumpkinHead(), stem(), P.cape('k', 'o'), suit({ main: 'k', belly: 'd', deco: (x, y) => (y === 15 && x % 2 ? 'o' : undefined) })],
    effect: 'flames',
  }),
  h('halloween', 'ghost', 'GHOST', 2, fur('#f4f4f4', '#c9d1dd', '#ffffff', '#ffffff', '#f4f4f4'), {
    outfit: [ghostHood(), suit({ main: 'w', belly: 'w', bottom: 21, deco: (x, y) => (y === 21 ? (x % 3 === 0 ? 'k' : undefined) : undefined) })],
    effect: 'glow',
    glow: '#c7f2ff',
  }),
  h('halloween', 'witch', 'WITCH', 2, tone('#9be2b0', 0.6), {
    outfit: [witchHat(), suit({ main: 'u', belly: 'u', deco: belt('k', 'O') }), P.broom('n', 's')],
  }),
  h('halloween', 'zombie', 'ZOMBIE', 2, fur('#7a9a6a', '#2a3a2a', '#a8c098', '#d0e0c0', '#b13e53'), {
    pattern: only('1', (x, y) => (rnd(x, y, 41) < 0.06 ? 'R' : rnd(x, y, 42) < 0.06 ? 'z' : undefined)),
    outfit: [suit({ main: 'g', belly: 'g', deco: (x, y) => (y === 20 && x % 3 ? 'k' : y >= 19 && x % 4 === 0 ? 'k' : rnd(x, y, 43) < 0.08 ? 'd' : undefined) }), stitches(18, 3, 3)],
  }),
  h('halloween', 'werewolf', 'WEREWOLF', 2, fur('#6a5040', '#2a1a10', '#a08060', '#d0c0a0', '#ffcd75'), {
    pattern: only('13', (x, y) => (rnd(x, y, 44) < 0.2 ? 'N' : rnd(x, y, 45) < 0.1 ? 'J' : undefined)),
    outfit: [suit({ main: 'e', belly: '', top: 18, deco: (x, y) => (y === 20 && x % 3 === 0 ? 'k' : undefined) }), P.at('head', 26, 11, ['wkw'])],
    effect: 'glow',
    glow: '#ffcd75',
  }),
  h('halloween', 'mummy', 'MUMMY', 2, fur('#e8dcc0', '#4d3b24', '#fff6e0', '#ffffff'), { pattern: only('13', bandages), outfit: [P.at('face', 25, 6, ['.kk.', 'kLLk', '.kk.'])] }),
  h('halloween', 'frankencoon', 'FRANKENCOON', 2, fur('#7ab06a', '#2d6a3e', '#a7f070', '#d8f0c0'), {
    outfit: [flatTop(), flatTopCap(), neckBolts(), stitches(19, 5, 3), suit({ main: 'd', belly: 'd', deco: buttons('l', 24) })],
  }),
  h('halloween', 'blackcat', 'BLACK CAT', 1, fur('#22242e', '#0e0f1a', '#333c57', '#ffcd75', '#7a4a8f'), {
    outfit: [catEars('k', 'e'), P.at('body', 15, 12, ['kkkkkkkkkkk', 'kvvvvvvOvvk', 'kkkkkkkkkkk'])],
  }),

  // ---------------------------------------------------------------- valentine
  h('valentine', 'cupid', 'CUPID', 3, fur('#ffd8ec', '#c0398e', '#ffffff', '#ffffff', '#ff77c8'), {
    outfit: [P.fairyWings('w', 'P'), P.halo('O'), suit({ main: 'w', belly: 'w', top: 18 }), cupidBow()],
    effect: 'hearts',
  }),
  h('valentine', 'heartthrob', 'HEARTTHROB', 2, fur('#b13e53', '#6e1f2e', '#ff77c8', '#ffffff'), {
    pattern: only('1', hearts('h', 5, 0.5)),
    outfit: [heartShades(), rose()],
    effect: 'hearts',
  }),
  h('valentine', 'lovebug', 'LOVE BUG', 2, fur('#ff77c8', '#1a1c2c', '#ffd8ec'), { pattern: only('1', blobs('k', 0.3, 3, 46)), outfit: [heartAntennae()], effect: 'hearts' }),
  h('valentine', 'bemine', 'BE MINE', 1, fur('#ffd8ec', '#c0398e', '#fff6f8', '#ffffff'), { pattern: only('13', hearts('P', 6, 0.8)), outfit: [heartProp('r')] }),
  h('valentine', 'sweettooth', 'SWEET TOOTH', 2, fur('#7a4a33', '#3a1f12', '#d6a77a', '#fff6e0'), {
    pattern: only('1', (x, y) => (inBody(x, y) && (x === 18 || y === 16) ? 'r' : undefined)),
    outfit: [bowOnHead('r'), lollipop()],
    effect: 'hearts',
  }),

  // ---------------------------------------------------------------- easter
  h('easter', 'bunny', 'EASTER BUNNY', 3, fur('#f4f4f4', '#c9d1dd', '#ffffff', '#ffffff', '#f5a5b8'), {
    outfit: [bunnyEars('w', 'P'), P.pompom('w'), carrot(), P.bowtie('c')],
    effect: 'sparkle',
  }),
  h('easter', 'chick', 'CHICK', 2, fur('#ffcd75', '#ffa300', '#fff3b0', '#ffffff', '#ffa300'), { outfit: [eggshell(), P.at('face', 32, 9, ['kkk.', 'kOOk', 'kkk.'])] }),
  h('easter', 'paintedegg', 'PAINTED EGG', 1, fur('#fff6e0', '#7a4a8f', '#ffffff', '#ffffff'), { pattern: only('13', eggs) }),
  h('easter', 'egghunter', 'EGG HUNTER', 2, tone('#d6a77a', 0.5), { outfit: [bonnet(), basket(), suit({ main: 'm', belly: 'm', deco: (x, y) => ((x + y) % 4 === 0 ? 'w' : undefined) })] }),
  h('easter', 'lamb', 'SPRING LAMB', 2, fur('#f4f4f4', '#566c86', '#fff6e0', '#ffffff', '#f5a5b8'), { pattern: only('13', wool), outfit: [lambBell(), P.flowerCrown('G', 'P', 'y')] }),

  // ---------------------------------------------------------------- king's day
  h('kingsday', 'koning', 'KONINGSCOON', 3, fur('#ef7d57', '#6e1f2e', '#ffcd75', '#fff3b0'), {
    outfit: [P.cape('o', 'w'), P.crown('O', 'b'), P.scepter('O', 'o')],
    effect: 'sparkle',
  }),
  h('kingsday', 'oranjefan', 'ORANJE FAN', 2, classic(), {
    outfit: [orangeAfro(), flagPaint(), suit({ main: 'o', belly: 'o', deco: (x) => (x === 21 ? 'O' : undefined) }), dutchFlag()],
    effect: 'notes',
  }),
  h('kingsday', 'vrijmarkt', 'VRIJMARKT', 2, fur('#8f6a4e', '#3f2a1f', '#d2b48c'), { outfit: [P.sack('s', 'o'), P.cap('o', 'O', 'o'), P.at('paw', 25, 14, ['kkkkkkk', 'kwwwwwk', 'kwokOwk', 'kwwwwwk', 'kkkkkkk'])] }),
  h('kingsday', 'tompouce', 'TOMPOUCE', 1, fur('#fff3b0', '#7a4a33', '#fff6e0', '#ffffff', '#ff77c8'), {
    pattern: (x, y, c) => {
      if (c === '2' && inHead(x, y) && y >= 5) return undefined;
      if (y <= 13 || (inTail(x, y) && y <= 8)) return (x + y) % 7 === 0 ? 'o' : 'h'; // pink icing on top
      if (y === 14 || y === 20 || y === 21) return 'T'; // pastry layers
      return (x + y) % 5 === 0 ? 's' : 'Y'; // custard
    },
  }),

  // ---------------------------------------------------------------- summer
  h('summer', 'surfer', "SURF'S UP", 2, fur('#dcb878', '#7a5a32', '#f6e6bc'), {
    outfit: [surfboard(), P.shades('k', 'c'), suit({ main: 'c', belly: 'c', top: 18, deco: (x, y) => ((x + y) % 4 === 0 ? 'y' : undefined) })],
  }),
  h('summer', 'poolparty', 'POOL PARTY', 2, classic(), { outfit: [P.goggles('h', 'C'), flamingoRing()], effect: 'bubbles' }),
  h('summer', 'icecream', 'ICE CREAM', 2, fur('#ffd8ec', '#7a4a33', '#fff6e0', '#ffffff', '#ff77c8'), {
    pattern: only('13', (x, y) => (y >= 17 + ((x * 7) % 3) ? 'T' : y <= 8 ? undefined : (x + y) % 7 === 0 ? 'r' : rnd(x, y, 51) < 0.05 ? 'c' : undefined)),
    outfit: [coneHat()],
  }),
  h('summer', 'sunburn', 'SUNBURN', 1, fur('#e05a4a', '#6e1f2e', '#ffa08a', '#fff6e0'), {
    pattern: only('13', (x, y) => (inBody(x, y) && (x === 17 || x === 18) && y <= 16 ? 'P' : undefined)),
    outfit: [P.shades('k', 'k')],
  }),
  h('summer', 'tiki', 'TIKI', 3, fur('#7a4a33', '#3a1f12', '#d6a77a'), { outfit: [tikiMask(), grassSkirt(), P.torch('n')], effect: 'flames' }),
  h('summer', 'sandcastle', 'SANDCASTLE', 2, fur('#e8c170', '#b88a4a', '#fff3b0'), { pattern: only('1', dots('S', 0.15, 52)), outfit: [sandBucket(), spade()] }),

  // ---------------------------------------------------------------- lunar new year
  h('lunar', 'dragondance', 'DRAGON DANCE', 3, fur('#b13e53', '#6e1f2e', '#ffcd75', '#fff3b0'), {
    outfit: [dragonHood(), dragonHorns(), whiskers(), suit({ main: 'r', belly: 'O', deco: (x, y) => ((x + (y % 2) * 2) % 4 === 0 ? 'O' : undefined) })],
    effect: 'sparkle',
  }),
  h('lunar', 'luckycat', 'LUCKY CAT', 2, fur('#f4f4f4', '#ffa300', '#ffffff', '#ffffff', '#ff77c8'), {
    pattern: only('1', blobs('o', 0.2, 4, 53)),
    outfit: [luckyBell(), raisedPaw()],
  }),
  h('lunar', 'redenvelope', 'RED ENVELOPE', 2, fur('#c8282e', '#6e1f2e', '#ff6e64', '#ffcd75', '#ffa300'), {
    pattern: only('13', (x, y) => ((x % 6 === 0 || y % 6 === 0) && (x + y) % 2 === 0 ? 'O' : undefined)),
    effect: 'sparkle',
  }),
  h('lunar', 'lantern', 'LANTERN NIGHT', 2, classic(), {
    outfit: [suit({ main: 'R', belly: 'R', deco: (x, y) => (y === 13 || x === 23 ? 'O' : (x * 3 + y) % 7 === 0 ? 'r' : undefined) }), chineseLantern()],
    effect: 'glow',
    glow: '#ffa300',
  }),
  h('lunar', 'firecracker', 'FIRECRACKER', 2, fur('#c8282e', '#1a1c2c', '#ffcd75', '#fff3b0'), { pattern: only('13', stripesH('O', 4)), outfit: [fuse()], effect: 'flames' }),

  // ---------------------------------------------------------------- st patrick's day
  h('stpatrick', 'leprechaun', 'LEPRECHAUN', 3, fur('#c9d1dd', '#3c4258', '#f4f4f4'), {
    outfit: [leprechaunHat(), buckle(), P.beard('o', 'O'), suit({ main: 'G', belly: 'G', deco: anyOf(belt('k', 'y'), buttons('y', 24)) }), potOfGold()],
    effect: 'sparkle',
  }),
  h('stpatrick', 'shamrock', 'SHAMROCK', 1, fur('#38b764', '#16382c', '#a7f070'), { pattern: only('13', shamrocks) }),
  h('stpatrick', 'potofgold', 'POT OF GOLD', 2, fur('#ffa300', '#7a4a33', '#ffcd75', '#fff3b0'), { pattern: only('13', coins), effect: 'sparkle' }),
  h('stpatrick', 'luckyclover', 'LUCKY CLOVER', 2, tone('#9be2b0', 0.6), { outfit: [bowler('G'), clover(), P.bowtie('G')] }),
  h('stpatrick', 'jig', 'JIG DANCER', 2, fur('#ef7d57', '#5c2e1a', '#ffcd75'), {
    outfit: [bowler('F'), suit({ main: 'F', belly: 'w', deco: buttons('O', 25) }), fiddle()],
    effect: 'notes',
  }),
];

function classic(): Fur {
  return fur('#8b93a8', '#3c4258', '#c9d1dd', '#f4f4f4', '#f5a5b8');
}
