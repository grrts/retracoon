// Toy family: a toy box come to life. Stage 17 on.
// Tin soldiers that wind each other back up, a mime that copies your biggest hit, a
// teddy that makes you hit it, and a music box that lulls you.
import type { EnemyDef } from '../types';
import { frames } from './art';

// A tin soldier: coat and trouser colours, with a wind-up key on its back.
const tin = (coat: string, legs: string) => [
  '....dddd....',
  '....dddd....',
  '...dddOdd...',
  '....TTTT....',
  '....kTkT....',
  '....TTTT....',
  `..${coat.repeat(8)}.J`,
  `.T${coat}O${coat.repeat(4)}O${coat}JJ`,
  `.T${coat.repeat(2)}OOOO${coat.repeat(2)}.J`,
  `..${coat.repeat(8)}..`,
  `...${legs.repeat(2)}..${legs.repeat(2)}...`,
  `...${legs.repeat(2)}..${legs.repeat(2)}...`,
  '..kkk..kkk..',
];
const marching = (legs: string) => ({
  10: `...${legs.repeat(2)}...${legs.repeat(2)}..`,
  11: `..${legs.repeat(2)}....${legs.repeat(2)}..`,
  12: '..kkk...kkk.',
});

const MIME = [
  '....kkkk....',
  '...kkkkkk...',
  '...wwwwww...',
  '...wkwwkw...',
  '...wwwwww...',
  '...wwrrww...',
  '....wwww....',
  '..wkwkwkwk..',
  '.wwkwkwkwkww',
  'w.wkwkwkwk.w',
  '...kkkkkk...',
  '...kk..kk...',
  '..kkk..kkk..',
];

const TEDDY = [
  '..nn......nn..',
  '.nNNn....nNNn.',
  '.nNnnnnnnnnNn.',
  '..nnnnnnnnnn..',
  '..nnwknnPPnn..',
  '..nnnnTTnnnn..',
  '...nnTkkTnn...',
  '...nnnTTnnn...',
  '.nnnnnnnnnnnn.',
  'nnnnTTTTTTnnnn',
  'nn.nTTTTTTn.nn',
  'nn.nTTPTTTn.nn',
  '...nnnnnnnn...',
  '..nnnn..nnnn..',
  '..TTTT..TTTT..',
];

const MUSIC_BOX = [
  '......P.......',
  '.....PwP......',
  '......P.......',
  '....PPPPP.....',
  '.....PPP......',
  '......k.......',
  'MMMMMMMMMMMMMM',
  'MhhhhhhhhhhhhM',
  'MhOhhOhhOhhOhM',
  'MhhhhhhhhhhhhM',
  'MMMMMMMMMMMMMM',
  '.J..........J.',
];

export const ENEMIES_TOYS: EnemyDef[] = [
  {
    id: 'tin_tick',
    name: 'TIN TICK',
    family: 'toys',
    role: 'brute',
    minStage: 17,
    twin: true,
    pair: 'tin_tock',
    frames: frames(tin('r', 'b'), marching('b')),
    fps: 3,
    hp: 18,
    moves: [
      { id: 'bayonet', name: 'BAYONET', intent: 'attack', dmg: 7, weight: 3 },
      { id: 'march', name: 'QUICK MARCH', intent: 'multi', dmg: 4, hits: 2, weight: 2 },
      { id: 'windup', name: 'WIND UP', intent: 'buff', buff: { rage: 1 }, weight: 1 },
    ],
    xp: 13,
    shinies: 5,
    colors: [0xb13e53, 0xffa300, 0x333c57],
  },
  {
    // Only comes along with TIN TICK (no role, so never picked on its own).
    id: 'tin_tock',
    name: 'TIN TOCK',
    family: 'toys',
    minStage: 17,
    twin: true,
    frames: frames(tin('b', 'r'), marching('r')),
    fps: 3,
    hp: 18,
    moves: [
      { id: 'bayonet', name: 'BAYONET', intent: 'attack', dmg: 6, weight: 3 },
      { id: 'drum', name: 'DRUM ROLL', intent: 'buff', buff: { rage: 1 }, allies: true, weight: 1 },
      { id: 'stand', name: 'STAND GUARD', intent: 'block', block: 10, guard: true, weight: 2 },
    ],
    xp: 13,
    shinies: 5,
    colors: [0x3b5dc9, 0xffa300, 0x333c57],
  },
  {
    id: 'mime',
    name: 'MIME',
    family: 'toys',
    role: 'trickster',
    minStage: 18,
    frames: frames(MIME, {
      7: '..wkwkwkwk.w',
      8: '.wwkwkwkwkww',
      9: 'w.wkwkwkwk..',
    }),
    fps: 2,
    hp: 20,
    dodge: 0.1,
    moves: [
      { id: 'copycat', name: 'COPYCAT', intent: 'attack', mirror: 0.5, weight: 3 },
      { id: 'scream', name: 'SILENT SCREAM', intent: 'debuff', apply: { weak: 1, vuln: 1 }, weight: 2 },
      { id: 'box', name: 'INVISIBLE BOX', intent: 'block', block: 10, weight: 1 },
      { id: 'rope', name: 'INVISIBLE ROPE', intent: 'attack', dmg: 6, apply: { weak: 1 }, weight: 1 },
    ],
    xp: 13,
    shinies: 5,
    colors: [0xf4f4f4, 0x1a1c2c, 0xb13e53],
  },
  {
    id: 'teddy',
    name: 'TEDDY BRUISER',
    family: 'toys',
    role: 'guard',
    minStage: 19,
    armor: 1,
    frames: frames(TEDDY, {
      8: 'nnnnnnnnnnnnnn',
      9: 'nn.nTTTTTTn.nn',
      10: '...nTTTTTTn...',
    }),
    fps: 2,
    hp: 32,
    moves: [
      { id: 'lookatme', name: 'LOOK AT ME!', intent: 'buff', buff: { taunt: 2 }, block: 10, weight: 2 },
      { id: 'hug', name: 'BEAR HUG', intent: 'attack', dmg: 8, weight: 3 },
      { id: 'stuffing', name: 'RESTUFF', intent: 'heal', heal: 0.2, weight: 1 },
    ],
    xp: 15,
    shinies: 6,
    colors: [0x8f563b, 0xd6a77a, 0xf5a5b8],
  },
  {
    id: 'music_box',
    name: 'MUSIC BOX',
    family: 'toys',
    role: 'support',
    minStage: 18,
    frames: frames(MUSIC_BOX, {
      3: '.....PPP......',
      4: '....PPPPP.....',
    }),
    fps: 2,
    hp: 24,
    moves: [
      { id: 'lullaby', name: 'LULLABY', intent: 'debuff', apDrain: 1, weight: 2 },
      { id: 'tune', name: 'WIND-UP TUNE', intent: 'heal', heal: 0.15, allies: true, weight: 2 },
      { id: 'jingle', name: 'JINGLE', intent: 'attack', dmg: 5, weight: 1 },
    ],
    xp: 12,
    shinies: 6,
    colors: [0xc0398e, 0xff77c8, 0xffa300],
  },
];
