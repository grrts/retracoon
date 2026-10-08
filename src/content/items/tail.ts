// Tail slot: things tied to, worn on or fired from the tail, anchored mid-tail (5,9).
// The tail spans x1-9, y5-14 with its tip at the top (x4-7, y5); dark rings on y7, 9, 11, 13.
import type { ItemDef } from '../types';
import { tint } from './art';

// The tail's own silhouette (x1-9, y5-13), for repaints and ghost tails.
const TAIL = [
  '...kkkk..',
  '..kaaaak.',
  '.kbbbbbbk',
  '.kaaaaaak',
  'kbbbbbbbk',
  'kaaaaaaak',
  'kbbbbbbbk',
  '.kaaaaaak',
  '.kbbbbbbb',
];

export const ITEMS_TAIL: ItemDef[] = [
  {
    id: 'ribbon',
    name: 'TAIL RIBBON',
    rarity: 0,
    slot: 'tail',
    tags: ['speed'],
    desc: '+2 AGI',
    gear: [
      {
        anchor: 'tail',
        x: -4,
        y: 1,
        rows: [
          'kk...kk',
          'kPk.kPk',
          'krrkrrk',
          'kRk.kRk',
          'kk...kk',
        ],
      },
    ],
    bonus: (b, l) => (b.agi += 2 * l),
  },
  {
    id: 'tail_bell',
    name: 'TAIL BELL',
    rarity: 0,
    slot: 'tail',
    tags: ['scav'],
    desc: '+1 LCK, +10% SHINIES',
    gear: [
      { anchor: 'tail', x: -4, y: 1, rows: ['krrrrrrrk', 'kRRRRRRRk'] },
      {
        anchor: 'tail',
        x: -7,
        y: 2,
        rows: ['...k..', '..kyk.', '.kyYOk', '.kyyOk', 'kOOOOOk', '.kkNkk.'].map((r) => r.padEnd(7, '.')),
        alt: ['..k...', '.kyk..', 'kyYOk.', 'kyyOk.', 'kOOOOk.', '.kNkk..'].map((r) => r.padEnd(7, '.')),
      },
    ],
    bonus: (b, l) => {
      b.lck += l;
      b.shinyMult += 0.1 * l;
    },
  },
  {
    id: 'tail_wrap',
    name: 'TAIL WRAP',
    rarity: 0,
    slot: 'tail',
    tags: ['tank'],
    desc: '+1 DEF, +1 VIT',
    gear: [
      {
        anchor: 'tail',
        x: -4,
        y: -2,
        rows: [
          '.kQQsQQk.',
          '.kQsQQsk.',
          '.........',
          '.........',
          'kQQsQQsQk',
          'ksQQsQQQk',
          'kQsQQsQsk',
        ],
      },
    ],
    bonus: (b, l) => {
      b.def += l;
      b.vit += l;
    },
  },
  {
    id: 'tin_cans',
    name: 'TIN CAN STRING',
    rarity: 0,
    slot: 'tail',
    tags: ['trash'],
    desc: '+1 STR, +1 DEF',
    gear: [
      {
        anchor: 'tail',
        x: -11,
        y: 5,
        rows: [
          '.........l',
          '........l.',
          '.......l..',
          '......l...',
          '.....l....',
          '.kkkkl....',
          'klwllk....',
          'krrrrk....',
          'kwwwwk....',
          'krrrRk....',
          '.kkkk.....',
        ],
      },
    ],
    bonus: (b, l) => {
      b.str += l;
      b.def += l;
    },
  },
  {
    id: 'rocket_tail',
    name: 'ROCKET TAIL',
    rarity: 1,
    slot: 'tail',
    tags: ['speed'],
    desc: '+1 AGI, YOUR FIRST HIT EACH FIGHT CRITS',
    gear: [
      {
        anchor: 'tail',
        x: -10,
        y: -1,
        rows: [
          '.....kkkk',
          '...yokwlk',
          'yyooqkllk',
          '...yokgdk',
          '.....kkkk',
        ],
        alt: [
          '.....kkkk',
          '....okwlk',
          '..yoqkllk',
          '....okgdk',
          '.....kkkk',
        ],
      },
    ],
    bonus: (b) => (b.agi += 1),
    fx: () => ({ firstCrit: 1 }),
  },
  {
    id: 'fluffy_tail',
    name: 'FLUFFY TAIL',
    rarity: 1,
    slot: 'tail',
    tags: ['tank'],
    desc: 'HEAL 3 FOR EVERY KILL',
    gear: [
      {
        anchor: 'tail',
        x: -5,
        y: -9,
        rows: [
          '...kkkk...',
          '.kkwwwwkk.',
          'kwwiwwwwlk',
          'kwiwwwwwlk',
          'kwwwwwwllk',
          '.kwwllllk.',
          '..kkkkkk..',
        ],
      },
    ],
    fx: (l) => ({ killHeal: 3 * l }),
  },
  {
    id: 'spike_ring',
    name: 'SPIKE RING',
    rarity: 1,
    slot: 'tail',
    tags: ['tank', 'crit'],
    desc: '+1 DEF, ATTACKERS TAKE 2',
    gear: [
      {
        anchor: 'tail',
        x: -6,
        y: 0,
        rows: [
          '..kwk.kwk..',
          'kwkllllllgk',
          '..kgggggggk',
          '..kwk.kwk..',
        ],
      },
    ],
    bonus: (b, l) => (b.def += l),
    fx: (l) => ({ thorns: 2 * l }),
  },
  {
    id: 'sparkler',
    name: 'TAIL SPARKLER',
    rarity: 1,
    slot: 'tail',
    tags: ['trash', 'speed'],
    desc: 'FIGHTS START: 3 DAMAGE TO ALL FOES',
    gear: [
      {
        anchor: 'tail',
        x: -3,
        y: -13,
        rows: [
          'y...w..',
          '..y.y.y',
          '.wyYyw.',
          'y.YwY..',
          '.wyYyw.',
          '..ylyy.',
          'w..l...',
          '...l...',
          '...l...',
          '..kgk..',
        ],
        alt: [
          '..w...y',
          'w.y.y..',
          '.yyYyy.',
          '.wYwYw.',
          'y.yYy.w',
          '.y.ly..',
          '...l..y',
          '...l...',
          '...l...',
          '..kgk..',
        ],
      },
    ],
    fx: (l) => ({ firstStrike: 3 * l }),
  },
  {
    id: 'lucky_tail',
    name: 'LUCKY TAIL',
    rarity: 2,
    slot: 'tail',
    tags: ['crit', 'scav'],
    desc: '+3 LCK, +20% SHINIES',
    gear: [
      {
        anchor: 'tail',
        x: -4,
        y: -4,
        rows: tint(TAIL, { a: 'y', b: 'O' }).map((r, y) => (y === 1 ? '..kYyyk.' + r[8] : r)),
        alt: tint(TAIL, { a: 'y', b: 'O' }).map((r, y) => (y === 3 ? '.kyyyywk' + r[8] : y === 1 ? '..kYyyk.' + r[8] : r)),
      },
    ],
    bonus: (b, l) => {
      b.lck += 3 * l;
      b.shinyMult += 0.2 * l;
    },
  },
  {
    id: 'mace_tail',
    name: 'MACE TAIL',
    rarity: 2,
    slot: 'tail',
    tags: ['tank', 'trash'],
    desc: 'END OF YOUR TURN: HIT ALL FOES FOR 3',
    gear: [
      {
        anchor: 'tail',
        x: -4,
        y: -11,
        rows: [
          '....w....',
          '.w.klk.w.',
          '..kllgk..',
          '.kllwlgk.',
          'wklwllgkw',
          '.klllggk.',
          '..kgggk..',
          '.w.kdk.w.',
          '....k....',
        ],
      },
    ],
    bonus: (b) => (b.def += 1),
    fx: (l) => ({ boomerang: 3 * l }),
  },
  {
    id: 'phoenix_tail',
    name: 'PHOENIX TAIL',
    rarity: 3,
    slot: 'tail',
    tags: ['tank'],
    desc: 'HEAL 2 EVERY TURN, HEAL 4 FOR EVERY KILL',
    gear: [
      {
        anchor: 'tail',
        x: -4,
        y: -2,
        rows: [
          '..rrrrrr.',
          '.........',
          '.rrrrrrr.',
          '.........',
          '.rrrrrrr.',
          '.........',
          '..rrrrrrr',
        ],
      },
      {
        anchor: 'tail',
        x: -6,
        y: -12,
        rows: [
          '.....y.......',
          '....yo...y...',
          '...yoqy.yo...',
          '..yoqqoyoqy..',
          '..oqYqqoqqo..',
          '.koqYYqqqok..',
          '..koqYqqok...',
          '...kooqok....',
          '....kook.....',
        ],
        alt: [
          '......y......',
          '..y..yo..y...',
          '..oyyoqy.oy..',
          '..yoqqoyoqy..',
          '.yoqqYqoqqo..',
          '.koqYYqqqok..',
          '..koqYqqok...',
          '...kooqok....',
          '....kook.....',
        ],
      },
    ],
    fx: (l) => ({ regen: 2 * l, killHeal: 4 * l }),
  },
  {
    id: 'nine_tails',
    name: 'NINE TAILS',
    rarity: 4,
    slot: 'tail',
    tags: ['crit'],
    desc: '+4 LCK, CRITS KILL FOES UNDER 20% HP',
    needsBoss: true,
    gear: [
      { anchor: 'tail', x: -9, y: -5, behind: true, rows: tint(TAIL, { a: 'Q', b: 'O' }) },
      { anchor: 'tail', x: -6, y: -10, behind: true, rows: tint(TAIL, { a: 'w', b: 'y' }) },
      { anchor: 'tail', x: -11, y: -11, behind: true, rows: ['..y.....', '........', '....w...', '........', 'O.......'], alt: ['........', '.w......', '......y.', '..O.....', '........'] },
      {
        anchor: 'tail',
        x: -4,
        y: -4,
        rows: ['...kkkk..', '..kwwwwk.'],
        alt: ['...kkkk..', '..kwYwwk.'],
      },
    ],
    bonus: (b, l) => (b.lck += 4 * l),
    fx: (l) => ({ execute: 20 * l }),
  },
];
