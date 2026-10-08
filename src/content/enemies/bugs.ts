// Bugs family: oversized creepy-crawlies from the overgrown lots. Stage 5 on.
import type { EnemyDef } from '../types';
import { frames, frames2 } from './art';

const BEETLE = [
  '...........cccbbbb.........',
  'c.......cccbbbbbbbbb.......',
  'bc.....cbbbbbbbbbbbbbB.....',
  '.bc...cbbcbbbbbbbbbbbBB....',
  '.bb..cbbcbbbbbbbbbbbbbBB...',
  '..bbBbbcbbbbbbbbbbbbbbBBB..',
  '..bBBBkbbbbbbbbbbbbbbBBBB..',
  '.BBwkBBkbbbbbbbbbbbbBBBBB..',
  'BBBBBBBkBBbbbbbbbbBBBBBII..',
  '.IBBBBkIBBBBBBBBBBBBBBIII..',
  '..IIIk.IIIIIIIIIIIIIIII....',
  '...k..k...k..k...k..k......',
  '..k..k...k...k...k...k.....',
];

const WASP_A = [
  '.........iii.................',
  '........iCCCi................',
  'k........iCCCi...............',
  '.k........iCCCi..............',
  '..k........iCi...............',
  '..aaaa...yyi.....dyyyd.......',
  '.drwddd.yyyy..yyddyyyddyy....',
  '.rrddddOOOOOOOOOddOOOddOOO...',
  '.dddddd.OOOO.OOOddOOOddOOO.dd',
  '..dddd..OOOO.OOOddOOOddOOO...',
  '.........k..k.OOddOOOddOO....',
  '........k..k.....dOOOd.......',
  '.......k..k..k...............',
];
const WASP_B = [
  '.............................',
  '.............................',
  'k............................',
  '.k...........................',
  '..k.........iCCCi............',
  '..aaaa...yyiCCCCCiyyyd.......',
  '.drwddd.yyyyiCCCCCyyyddyy....',
  '.rrddddOOOOOOOOOddOOOddOOO...',
  '.dddddd.OOOO.OOOddOOOddOOO.dd',
  '..dddd..OOOO.OOOddOOOddOOO...',
  '.........k..k.OOddOOOddOO....',
  '........k..k.....dOOOd.......',
  '.......k..k..k...............',
];

const MANTIS = [
  '.k...k..............',
  '..k.k...............',
  '..LLLL..............',
  '.LYYYLL.............',
  'LLYkYLLG............',
  '.LLLLLGG............',
  '..PLLGG.............',
  '....LGG.............',
  '...LLLG.............',
  '..mmLLGG............',
  '.mmmmLLG............',
  'mm.mmLLGG...........',
  'm..mmLLLG...........',
  'm.mmLLLLGGmmmmm.....',
  '.mm.LLLLGGmmmmmmmm..',
  '.....LLLGGGGmmmmmmmm',
  '......LGGGGGGGGGGGGF',
  '.......FFFFFFFFFFFF.',
  '......k.k....k..k...',
  '.....k..k....k...k..',
  '....k...k.....k...k.',
];

const FLY = ['..ii...', '.iiCi..', 'odddYYy', '.k.kYy.'];
// Paints small sprites onto an empty map: [rows, x, y][].
const scatter = (w: number, h: number, parts: [string[], number, number][]) => {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [rows, ox, oy] of parts) rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && (g[oy + y][ox + x] = ch)));
  return g.map((r) => r.join(''));
};
const FLY_DIM = ['.......', '.iiCi..', 'odddyOO', '.k.kyO.'];
const SWARM_A = scatter(24, 17, [
  [FLY, 3, 0], [FLY_DIM, 14, 1], [FLY, 8, 6], [FLY, 17, 8], [FLY_DIM, 0, 11], [FLY, 10, 13],
]);
const SWARM_B = scatter(24, 17, [
  [FLY_DIM, 2, 1], [FLY, 15, 0], [FLY_DIM, 9, 5], [FLY, 17, 9], [FLY, 1, 10], [FLY_DIM, 11, 13],
]);

const TICK = [
  '........RRRRRR.....',
  '......RrPrrrrrRR...',
  '....RrPPrrrrrrrRR..',
  '...RrPrrrrrrrrrrRR.',
  '..NRrrrrrrrrrrrrrRR',
  'NNyNrrrrrrrrrrrrrRR',
  'NNNNrrrrrrrrrrrrRRR',
  '.NNNRrrrrrrrrrrRRRU',
  '.k.kRRRrrrrrrRRRRU.',
  'k.k..URRRRRRRRRUU..',
  '..k.k..UUUUUUUU....',
  '...k..k..k..k......',
  '..k..k..k....k.....',
];

export const ENEMIES_BUGS: EnemyDef[] = [
  {
    id: 'beetle',
    name: 'RHINO BEETLE',
    family: 'bugs',
    role: 'guard',
    minStage: 5,
    armor: 2,
    frames: frames(BEETLE, {
      11: '...k...k..k...k..k...k.....',
      12: '...k..k...k..k...k...k.....',
      1: '........cccbbbbbbbbb.......',
      2: 'c......cbbbbbbbbbbbbbB.....',
      3: 'bc....cbbcbbbbbbbbbbbBB....',
    }),
    fps: 3,
    hp: 22,
    moves: [
      { id: 'shell', name: 'SHELL UP', intent: 'block', block: 11, guard: true, weight: 3 },
      { id: 'gore', name: 'HORN GORE', intent: 'attack', dmg: 6, weight: 2 },
      { id: 'buzz', name: 'BUZZ', intent: 'buff', buff: { thorns: 2 }, allies: true, weight: 1 },
    ],
    xp: 11,
    shinies: 4,
    colors: [0x3b5dc9, 0x29366f, 0x41a6f6],
  },
  {
    id: 'wasp',
    name: 'WASP',
    family: 'bugs',
    role: 'brute',
    minStage: 5,
    frames: frames2(WASP_A, WASP_B),
    fps: 8,
    hp: 24,
    dodge: 0.12,
    flyer: true,
    moves: [
      { id: 'sting', name: 'STING', intent: 'attack', dmg: 8, apply: { poison: 2 }, weight: 3 },
      { id: 'flurry', name: 'STING FLURRY', intent: 'multi', dmg: 3, hits: 3, weight: 2 },
      { id: 'angry', name: 'ANGRY BUZZ', intent: 'buff', buff: { rage: 2 }, weight: 1 },
    ],
    xp: 11,
    shinies: 3,
    colors: [0xffcd75, 0xffa300, 0x1a1c2c],
  },
  {
    id: 'mantis',
    name: 'MANTIS',
    family: 'bugs',
    role: 'charger',
    minStage: 7,
    frames: frames(MANTIS, {
      0: 'k....k..............',
      1: '.k..k...............',
      9: '.mmmLLGG............',
      10: 'mm.mmLLG............',
      11: 'm..mmLLGG...........',
      12: 'm.mmmLLLG...........',
      13: '.mm.LLLLGGmmmmm.....',
      14: '....LLLLGGmmmmmmmm..',
    }),
    fps: 2,
    hp: 20,
    dodge: 0.1,
    moves: [
      { id: 'slash', name: 'SLASH', intent: 'attack', dmg: 6, weight: 2 },
      { id: 'pray', name: 'PRAY', intent: 'charge', weight: 2, after: 'strike' },
      { id: 'strike', name: 'SCYTHE STRIKE', intent: 'attack', dmg: 18, weight: 0 },
      { id: 'stare', name: 'STARE', intent: 'debuff', apply: { vuln: 2 }, weight: 1 },
    ],
    xp: 12,
    shinies: 4,
    colors: [0xa7f070, 0x38b764, 0xfff3b0],
  },
  {
    id: 'firefly',
    name: 'FIREFLY SWARM',
    family: 'bugs',
    role: 'support',
    minStage: 6,
    frames: frames2(SWARM_A, SWARM_B),
    fps: 5,
    hp: 15,
    dodge: 0.3,
    flyer: true,
    onDeath: 'burst',
    moves: [
      { id: 'glow', name: 'WARM GLOW', intent: 'heal', heal: 0.2, allies: true, weight: 2 },
      { id: 'blink', name: 'DAZZLE', intent: 'debuff', apply: { weak: 2 }, weight: 2 },
      { id: 'zap', name: 'ZAP', intent: 'multi', dmg: 1, hits: 4, weight: 1 },
    ],
    xp: 9,
    shinies: 3,
    colors: [0xfff3b0, 0xffcd75, 0xa7f070],
  },
  {
    id: 'tick',
    name: 'TICK',
    family: 'bugs',
    role: 'trickster',
    minStage: 6,
    frames: frames(TICK, {
      0: '.........RRRRR.....',
      1: '......RrPrrrrrRRR..',
      11: '..k..k..k..k.......',
      12: '...k..k..k...k.....',
    }),
    fps: 3,
    hp: 16,
    regen: 2,
    moves: [
      { id: 'latch', name: 'LATCH ON', intent: 'debuff', dmg: 3, apDrain: 1, weight: 2 },
      { id: 'suck', name: 'BLOOD SUCK', intent: 'attack', dmg: 5, apply: { weak: 1 }, weight: 2 },
      { id: 'itch', name: 'ITCH', intent: 'debuff', apply: { poison: 3 }, weight: 1 },
    ],
    xp: 9,
    shinies: 4,
    colors: [0xb13e53, 0x6e1f2e, 0x5c3a2e],
  },
];
