// Face slot: glasses, masks and paint, anchored on the eye line (26,8).
// Eyes are at x18-20 and x25-27 on y7, i.e. relative x -8..-6 and -1..+1, y -1.
// The snout runs from x28 to x34 on y8-11.
import type { ItemDef } from '../types';

export const ITEMS_FACE: ItemDef[] = [
  {
    id: 'shades',
    name: 'COOL SHADES',
    rarity: 0,
    slot: 'face',
    tags: ['crit'],
    desc: '+2 LCK',
    gear: [
      {
        anchor: 'face',
        x: -9,
        y: -2,
        rows: [
          'kkkkkkkkkkkk',
          'kbHHkkkkbHHk',
          '.kkk....kkk.',
        ],
      },
    ],
    bonus: (b, l) => (b.lck += 2 * l),
  },
  {
    id: 'nerd_glasses',
    name: 'NERD GLASSES',
    rarity: 0,
    slot: 'face',
    tags: ['crit'],
    desc: 'CRITS DEAL 25% MORE',
    gear: [
      {
        anchor: 'face',
        x: -9,
        y: -2,
        rows: [
          'rrrrr..rrrrr',
          'r...rrrr...r',
          'Rrrrr..Rrrrr',
        ],
      },
    ],
    bonus: (b, l) => (b.critMult += 0.25 * l),
  },
  {
    id: 'bandana',
    name: 'BANDIT BANDANA',
    rarity: 0,
    slot: 'face',
    tags: ['speed'],
    desc: '+2 AGI',
    gear: [
      {
        anchor: 'face',
        x: -8,
        y: 1,
        rows: [
          '.kkkkkkkkkkkkkk.',
          'krrwrrrrrwrrrrRk',
          '.krrrrwrrrrrwRk.',
          '..krrwrrrrrRRk..',
          '...kkrrrwRRkk...',
          '.....kkkkkk.....',
        ],
      },
      { anchor: 'face', x: -12, y: 0, rows: ['.kk.', 'krrk', 'kRkk', '.k..'] },
    ],
    bonus: (b, l) => (b.agi += 2 * l),
  },
  {
    id: 'clown_nose',
    name: 'CLOWN NOSE',
    rarity: 0,
    slot: 'face',
    tags: ['trash'],
    desc: '+1 VIT, +1 LCK',
    gear: [{ anchor: 'face', x: 6, y: -1, rows: ['.kk.', 'kPrk', 'krRk', '.kk.'] }],
    bonus: (b, l) => {
      b.vit += l;
      b.lck += l;
    },
  },
  {
    id: 'gas_mask',
    name: 'GAS MASK',
    rarity: 1,
    slot: 'face',
    tags: ['tank'],
    desc: 'HEAL 2 AT THE START OF EVERY TURN',
    gear: [
      {
        anchor: 'face',
        x: -9,
        y: -2,
        rows: [
          '.kkk....kkk........',
          'kCiCkkkkCiCk.......',
          '.kkk....kkkkkkkkk..',
          '..........kzmzzzzk.',
          '.........kzzdzzdzzk',
          '.........kzzzzzzzk.',
          '..........kkgggkk..',
          '............kdk....',
          '............kkk....',
        ],
      },
    ],
    fx: (l) => ({ regen: 2 * l }),
  },
  {
    id: 'eye_patch',
    name: 'PIRATE PATCH',
    rarity: 1,
    slot: 'face',
    tags: ['crit'],
    desc: '+2 STR, +1 LCK',
    gear: [
      {
        anchor: 'face',
        x: -10,
        y: -3,
        rows: [
          '........kkkk.',
          'kkkkkkkkkdHHk',
          '........kHHHk',
          '........kHHHk',
          '.........kkk.',
        ],
      },
    ],
    bonus: (b, l) => {
      b.str += 2 * l;
      b.lck += l;
    },
  },
  {
    id: 'ski_goggles',
    name: 'SKI GOGGLES',
    rarity: 1,
    slot: 'face',
    tags: ['speed'],
    desc: '+3 AGI, +3% DODGE',
    gear: [
      {
        anchor: 'face',
        x: -10,
        y: -2,
        rows: [
          '.kkkkkkkkkkkkk',
          'dkyooOkkkyooOk',
          '.kkkkkk.kkkkkk',
        ],
      },
    ],
    bonus: (b, l) => {
      b.agi += 3 * l;
      b.dodge += 0.03;
    },
  },
  {
    id: 'monocle',
    name: 'FANCY MONOCLE',
    rarity: 2,
    slot: 'face',
    tags: ['crit'],
    desc: '+1 LCK, CRITS DEAL 75% MORE',
    gear: [
      {
        anchor: 'face',
        x: -3,
        y: -4,
        rows: [
          '.kkkk..',
          'kyYyyk.',
          'ky..Ok.',
          'ky..Ok.',
          'kyOOOk.',
          '.kOkk..',
          '..kO...',
          '.kOk...',
          '..kO...',
        ],
      },
    ],
    bonus: (b, l) => {
      b.critMult += 0.75 * l;
      b.lck += 1;
    },
  },
  {
    id: 'xray_specs',
    name: 'X-RAY SPECS',
    rarity: 2,
    slot: 'face',
    tags: ['scav'],
    desc: '+25% SHINIES, 5% INTEREST AFTER FIGHTS',
    gear: [
      {
        anchor: 'face',
        x: -9,
        y: -3,
        rows: [
          '.kkk....kkk.',
          'kwrwk..kwrwk',
          'krCrkkkkrCrk',
          'kwrwk..kwrwk',
          '.kkk....kkk.',
        ],
        alt: [
          '.kkk....kkk.',
          'krwrk..krwrk',
          'kwCwkkkkwCwk',
          'krwrk..krwrk',
          '.kkk....kkk.',
        ],
      },
    ],
    bonus: (b, l) => (b.shinyMult += 0.25 * l),
    fx: (l) => ({ interest: 5 * l }),
  },
  {
    id: 'war_paint',
    name: 'WAR PAINT',
    rarity: 2,
    slot: 'face',
    tags: ['crit', 'tank'],
    desc: '+2 STR, UNDER 35% HP: +30% DAMAGE',
    gear: [
      {
        anchor: 'face',
        x: -9,
        y: -5,
        rows: [
          '.....rr.....',
          '....rRRr....',
          '.....rr.....',
          '............',
          '............',
          '............',
          'rrr.....rrr.',
          '.rrr.....rrr',
        ],
      },
    ],
    bonus: (b, l) => (b.str += 2 * l),
    fx: (l) => ({ rage: 30 * l }),
  },
  {
    id: 'cyber_visor',
    name: 'CYBER VISOR',
    rarity: 3,
    slot: 'face',
    tags: ['crit', 'speed'],
    desc: 'FIRST HIT EACH FIGHT CRITS, CRITS +50%',
    gear: [
      {
        anchor: 'face',
        x: -11,
        y: -2,
        rows: [
          '.kkkkkkkkkkkkkk',
          'kOkCiCCCCCCCCtk',
          'kSktttttttttttk',
          '.kkkkkkkkkkkkk.',
        ],
        alt: [
          '.kkkkkkkkkkkkkk',
          'kOkCCCCCCiCCCtk',
          'kSktttttttttttk',
          '.kkkkkkkkkkkkk.',
        ],
      },
    ],
    bonus: (b, l) => (b.critMult += 0.5 * l),
    fx: () => ({ firstCrit: 1 }),
  },
  {
    id: 'laser_eyes',
    name: 'LASER EYES',
    rarity: 3,
    slot: 'face',
    tags: ['crit'],
    desc: 'EACH TURN, LASER THE TOUGHEST FOE FOR 6',
    gear: [
      {
        anchor: 'face',
        x: -8,
        y: -2,
        rows: [
          '.r......r...',
          'rwr....rwrqq',
          '.r......r...',
        ],
        alt: [
          'hrh....hrh..',
          'rYr....rYrhq',
          'hrh....hrh..',
        ],
      },
    ],
    fx: (l) => ({ laser: 6 * l }),
  },
];
