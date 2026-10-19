// Shore family: beach bums with claws, beaks and stings. Stage 10 on.
// Each one plays a trick of its own: a shell to crack, a thief that flies off with your
// shinies, a sting that heals the stinger, and a fish that blows up if you let it.
import type { EnemyDef } from '../types';
import { frames } from './art';

const HERMIT = [
  '.......ssss.......',
  '.....ssSSSSss.....',
  '....sSSTTTTSSs....',
  '...sSTTsssTTSSs...',
  '...sSTsSSSsTTSs...',
  '...sSTsSUSsTTSs...',
  '...sSTTssSTTSSs...',
  '....sSSTTTTSSs....',
  '..k.k.sSSSSSs.....',
  '..r.r.rrrrrr......',
  'rr.rrrrrrrrrr.....',
  'rRr.rrRrrRrrr.....',
  '.rr..r.r.r.r......',
];

const GULL = [
  '...www............',
  '..wwkww...........',
  'OOOwwww...........',
  '...wwwwwwwwwwll...',
  '....wwwwwwwlllgg..',
  '.....wwwwwwllgggd.',
  '......lwwwwl......',
  '.......O...O......',
];

const JELLY = [
  '....PPPPPP....',
  '..PPhhhhhhPP..',
  '.PhhwhhhhhhhP.',
  'PhhwhhkhhkhhhP',
  'PhhhhhhhhhhhhP',
  'PPPPPPPPPPPPPP',
  '.M.M.M..M.M.M.',
  '.M..M.M.M..M..',
  '..M.M..M..M.M.',
  '..M..M.M.M..M.',
];

const PUFFER = [
  '....y.y.y.....',
  '..y.YYYYY.y...',
  '...YYYYYYY....',
  'y.YYkwYYYYY.yo',
  '.YYYkkYYYYYYoo',
  'oYYYYYYYYYYYoo',
  '.YYsYsYsYsYY.o',
  'y.YsssssssY.y.',
  '...YsssssY....',
  '..y.YYYYY.y...',
  '....y.y.y.....',
];

export const ENEMIES_SHORE: EnemyDef[] = [
  {
    id: 'hermit_crab',
    name: 'HERMIT CRAB',
    family: 'shore',
    role: 'guard',
    minStage: 10,
    shell: 3,
    frames: frames(HERMIT, {
      10: 'r.rrrrrrrrrrr.....',
      11: '.Rr.rrRrrRrrr.....',
    }),
    fps: 2,
    hp: 20,
    moves: [
      { id: 'pinch', name: 'PINCH', intent: 'attack', dmg: 6, weight: 3 },
      { id: 'clack', name: 'CLAW CLACK', intent: 'multi', dmg: 3, hits: 2, weight: 2 },
      { id: 'tuck', name: 'TUCK IN', intent: 'buff', buff: { shell: 2 }, weight: 1 },
    ],
    xp: 13,
    shinies: 5,
    colors: [0xe8c170, 0xb13e53, 0xd6a77a],
  },
  {
    id: 'seagull',
    name: 'SEAGULL',
    family: 'shore',
    role: 'trickster',
    minStage: 10,
    flyer: true,
    frames: frames(GULL, {
      1: '..wwkww....llgg...',
      2: 'OOOwwww..lllg.....',
      4: '....wwwwwwwll.....',
      5: '.....wwwwwwl......',
    }),
    fps: 3,
    hp: 15,
    dodge: 0.15,
    moves: [
      { id: 'dive', name: 'DIVE BOMB', intent: 'attack', dmg: 5, weight: 2 },
      { id: 'snatch', name: 'SNATCH', intent: 'steal', dmg: 2, steal: 6, weight: 2, after: 'flyoff' },
      { id: 'flyoff', name: 'FLY OFF', intent: 'flee', flee: true, weight: 0 },
      { id: 'squawk', name: 'SQUAWK', intent: 'debuff', apply: { weak: 1 }, weight: 1 },
    ],
    xp: 10,
    shinies: 6,
    colors: [0xf4f4f4, 0x94b0c2, 0xffa300],
  },
  {
    id: 'jellyfish',
    name: 'JELLYFISH',
    family: 'shore',
    role: 'support',
    minStage: 11,
    flyer: true,
    frames: frames(
      JELLY,
      {
        6: 'M.M.M..M.M.M..',
        7: '.M.M..M.M.M.M.',
        8: '.M..M.M..M.M..',
        9: '..M.M..M.M..M.',
      },
      'kM',
    ),
    fps: 2,
    hp: 18,
    moves: [
      { id: 'sting', name: 'DRAINING STING', intent: 'attack', dmg: 5, drain: 1, weight: 3 },
      { id: 'tangle', name: 'TANGLE', intent: 'debuff', apply: { weak: 1, poison: 3 }, weight: 2 },
      { id: 'glow', name: 'SOOTHING GLOW', intent: 'heal', heal: 0.2, allies: true, weight: 1 },
    ],
    xp: 12,
    shinies: 4,
    colors: [0xf5a5b8, 0xff77c8, 0xc0398e],
  },
  {
    id: 'pufferfish',
    name: 'PUFFERFISH',
    family: 'shore',
    role: 'charger',
    minStage: 11,
    fuse: 3,
    frames: frames(
      PUFFER,
      {
        0: '...y..y..y....',
        3: '.yYYkwYYYYYy.o',
        7: '.yYsssssssYy..',
        10: '...y..y..y....',
      },
      'ky',
    ),
    fps: 3,
    hp: 14,
    moves: [
      { id: 'nibble', name: 'NIBBLE', intent: 'attack', dmg: 4, weight: 2 },
      { id: 'puff', name: 'PUFF UP', intent: 'block', block: 8, weight: 2 },
      { id: 'kaboom', name: 'KABOOM', intent: 'charge', dmg: 20, blast: true, weight: 0 },
    ],
    xp: 10,
    shinies: 3,
    colors: [0xfff3b0, 0xffcd75, 0xe8c170],
  },
];
