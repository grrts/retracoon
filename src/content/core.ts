// Core pack: critters found everywhere, the base items, skills and events.
import type { EncounterDef, EnemyDef, EventDef, ItemDef, PackDef, SkillDef } from './types';
import * as S from '../gfx/sprites';
import { ICONS } from '../gfx/art';

// ---------------------------------------------------------------- enemies

const enemies: EnemyDef[] = [
  {
    id: 'rat',
    name: 'RAT',
    frames: [S.RAT_0, S.RAT_1],
    hp: 10,
    moves: [
      { id: 'bite', name: 'BITE', intent: 'attack', dmg: 3, weight: 3 },
      { id: 'gnaw', name: 'GNAW', intent: 'multi', dmg: 2, hits: 2, weight: 2 },
    ],
    xp: 4,
    shinies: 2,
    colors: [0x8f563b, 0x5c3a2e, 0xf5a5b8],
  },
  {
    id: 'pigeon',
    name: 'PIGEON',
    frames: [S.PIGEON_0, S.PIGEON_1],
    fps: 6,
    hp: 9,
    dodge: 0.25,
    flyer: true,
    moves: [
      { id: 'peck', name: 'PECK PECK', intent: 'multi', dmg: 2, hits: 2, weight: 3 },
      { id: 'coo', name: 'COO', intent: 'debuff', apply: { weak: 1 }, weight: 1 },
    ],
    xp: 4,
    shinies: 2,
    colors: [0x94b0c2, 0xf4f4f4, 0x38b764],
  },
  {
    id: 'cat',
    name: 'ALLEY CAT',
    frames: [S.CAT_0, S.CAT_1],
    fps: 3,
    hp: 18,
    moves: [
      { id: 'scratch', name: 'SCRATCH', intent: 'attack', dmg: 5, weight: 2 },
      { id: 'crouch', name: 'CROUCH', intent: 'charge', weight: 2, after: 'pounce' },
      { id: 'pounce', name: 'POUNCE', intent: 'attack', dmg: 13, weight: 0 },
    ],
    xp: 9,
    shinies: 3,
    colors: [0xef7d57, 0xffcd75, 0x8f563b],
  },
  {
    id: 'crow',
    name: 'CROW',
    frames: [S.CROW_0, S.CROW_1],
    fps: 6,
    hp: 14,
    dodge: 0.15,
    flyer: true,
    moves: [
      { id: 'peck', name: 'PECK', intent: 'attack', dmg: 4, weight: 2 },
      { id: 'caw', name: 'CAW', intent: 'debuff', apply: { weak: 2 }, weight: 1 },
      { id: 'snatch', name: 'SNATCH', intent: 'steal', dmg: 2, steal: 4, weight: 2 },
    ],
    xp: 8,
    shinies: 3,
    colors: [0x333c57, 0x1a1c2c, 0xb13e53],
  },
  {
    id: 'dog',
    name: 'GUARD DOG',
    frames: [S.DOG_0, S.DOG_1],
    fps: 3,
    hp: 32,
    moves: [
      { id: 'bite', name: 'BITE', intent: 'attack', dmg: 7, weight: 3 },
      { id: 'growl', name: 'GROWL', intent: 'buff', buff: { rage: 2 }, weight: 1 },
      { id: 'brace', name: 'BRACE', intent: 'block', block: 8, weight: 1 },
    ],
    xp: 14,
    shinies: 5,
    colors: [0x8f563b, 0xf4f4f4, 0x5c3a2e],
  },
  {
    id: 'possum',
    name: 'POSSUM',
    frames: [S.POSSUM_0, S.POSSUM_1],
    fps: 3,
    hp: 20,
    onDeath: 'revive',
    moves: [
      { id: 'shield', name: 'LID SHIELD', intent: 'block', block: 9, guard: true, weight: 3 },
      { id: 'bite', name: 'BITE', intent: 'attack', dmg: 4, weight: 2 },
    ],
    xp: 10,
    shinies: 4,
    colors: [0x94b0c2, 0xf4f4f4, 0xf5a5b8],
  },
  {
    id: 'skunk',
    name: 'SKUNK',
    frames: [S.SKUNK_0, S.SKUNK_1],
    fps: 3,
    hp: 16,
    moves: [
      { id: 'spray', name: 'SPRAY', intent: 'debuff', apply: { poison: 4 }, weight: 2 },
      { id: 'rally', name: 'STINK RALLY', intent: 'buff', buff: { rage: 2 }, allies: true, weight: 2 },
      { id: 'nip', name: 'NIP', intent: 'attack', dmg: 3, weight: 1 },
    ],
    xp: 10,
    shinies: 4,
    colors: [0x1a1c2c, 0xf4f4f4, 0x38b764],
  },
];

const encounters: EncounterDef[] = [
  { id: 'rat', minDanger: 1, maxDanger: 3, weight: 3, foes: ['rat'] },
  { id: 'rats2', minDanger: 1, maxDanger: 6, weight: 3, foes: ['rat', 'rat'] },
  { id: 'pigeons', minDanger: 2, maxDanger: 8, weight: 2, foes: ['pigeon', 'pigeon'] },
  { id: 'rat_pigeon', minDanger: 2, maxDanger: 7, weight: 2, foes: ['rat', 'pigeon'] },
  { id: 'cat', minDanger: 3, maxDanger: 8, weight: 2, foes: ['cat'] },
  { id: 'crow_rats', minDanger: 4, weight: 2, foes: ['rat', 'crow', 'rat'] },
  { id: 'cat_rats', minDanger: 5, weight: 2, foes: ['cat', 'rat', 'rat'] },
  { id: 'dog', minDanger: 5, weight: 2, foes: ['dog'] },
  { id: 'dog_crow', minDanger: 7, weight: 2, foes: ['dog', 'crow'] },
  { id: 'flock', minDanger: 8, weight: 1.5, foes: ['pigeon', 'pigeon', 'pigeon', 'crow'] },
  { id: 'dogs', minDanger: 10, weight: 1.5, foes: ['dog', 'cat', 'dog'] },
];

// ---------------------------------------------------------------- items

const items: ItemDef[] = [
  // HEAD
  {
    id: 'paper_hat',
    name: 'PAPER HAT',
    rarity: 0,
    slot: 'head',
    tags: ['trash'],
    desc: '+1 STRENGTH',
    gear: [{ x: 9, y: -3, rows: ['...kk..', '..kwwk.', '.kwlwwk', 'kkkkkkk'] }],
    bonus: (b, l) => (b.str += l),
  },
  {
    id: 'bike_helmet',
    name: 'BIKE HELMET',
    rarity: 1,
    slot: 'head',
    tags: ['tank'],
    desc: '+2 DEFENSE, +1 VITALITY',
    gear: [{ x: 8, y: -1, rows: ['...kkkkk..', '.kkrrrrrkk', 'krrwrrrrrk', 'kkkkkkkkkk'] }],
    bonus: (b, l) => {
      b.def += 2 * l;
      b.vit += l;
    },
  },
  {
    id: 'propeller_cap',
    name: 'PROPELLER CAP',
    rarity: 2,
    slot: 'head',
    tags: ['speed'],
    desc: '+4 AGILITY, +5% DODGE',
    gear: [
      {
        x: 9,
        y: -4,
        rows: ['yyy.kyyy', '....k...', '..kbbbk.', '.kbbybbk', 'kkkkkkkk'],
        alt: ['..yyky..', '....k...', '..kbbbk.', '.kbbybbk', 'kkkkkkkk'],
      },
    ],
    bonus: (b, l) => {
      b.agi += 4 * l;
      b.dodge += 0.05;
    },
  },
  {
    id: 'lid_crown',
    name: 'CROWN OF LIDS',
    rarity: 4,
    slot: 'head',
    tags: ['scav'],
    desc: 'EVERY 10 SHINIES YOU HOLD = 1 BLOCK EACH TURN',
    needsBoss: true,
    gear: [{ x: 9, y: -3, rows: ['y.y.y.y', 'yyyyyyy', 'yryyyOy', 'kkkkkkk'] }],
    bonus: (b, l) => (b.shinyMult += 0.25 * l),
    fx: (l) => ({ moneyArmor: l }),
  },
  // FACE
  {
    id: 'shades',
    name: 'COOL SHADES',
    rarity: 0,
    slot: 'face',
    tags: ['crit'],
    desc: '+2 LUCK',
    gear: [{ x: 9, y: 4, rows: ['kkkkkkkkk', '.kppck...', '..kkk....'] }],
    bonus: (b, l) => (b.lck += 2 * l),
  },
  {
    id: 'monocle',
    name: 'FANCY MONOCLE',
    rarity: 2,
    slot: 'face',
    tags: ['crit'],
    desc: 'CRITS DEAL 75% MORE',
    gear: [{ x: 10, y: 4, rows: ['.yyy', 'y..y', '.yyy', '..y.', '..y.'] }],
    bonus: (b, l) => {
      b.critMult += 0.75 * l;
      b.lck += 1;
    },
  },
  {
    id: 'laser_eyes',
    name: 'LASER EYES',
    rarity: 3,
    slot: 'face',
    tags: ['crit'],
    desc: 'EACH TURN, LASER THE TOUGHEST FOE FOR 6',
    gear: [{ x: 10, y: 4, rows: ['.r.', 'rPr', '.r.'], alt: ['PrP', 'rwr', 'PrP'] }],
    fx: (l) => ({ laser: 6 * l }),
  },
  // BODY
  {
    id: 'cardboard',
    name: 'CARDBOARD ARMOR',
    rarity: 0,
    slot: 'body',
    tags: ['tank'],
    desc: '+2 VITALITY',
    gear: [{ x: 5, y: 9, rows: ['.knnnnnnk.', 'knNnnnnNnk', 'knnnnnnnnk', '.kkkkkkkk.'] }],
    bonus: (b, l) => (b.vit += 2 * l),
  },
  {
    id: 'puffer_vest',
    name: 'PUFFER VEST',
    rarity: 1,
    slot: 'body',
    tags: ['tank'],
    desc: 'GAIN 4 BLOCK WHENEVER YOU ARE HIT',
    gear: [{ x: 4, y: 9, rows: ['.kooooooook.', 'koyookooyook', 'kooookoooook', '.kkkkkkkkkk.'] }],
    bonus: (b) => (b.vit += 1),
    fx: (l) => ({ hurtBlock: 4 * l }),
  },
  {
    id: 'spiked_jacket',
    name: 'SPIKED JACKET',
    rarity: 2,
    slot: 'body',
    tags: ['tank'],
    desc: 'ATTACKERS TAKE 4 DAMAGE',
    gear: [{ x: 4, y: 8, rows: ['.w.w.w.w.w..', 'kkkkkkkkkkk.', 'kdddkdddddk.', 'kdldkdldddk.', 'kkkkkkkkkkk.'] }],
    bonus: (b) => (b.def += 1),
    fx: (l) => ({ thorns: 4 * l }),
  },
  {
    id: 'trash_mech',
    name: 'TRASH MECH',
    rarity: 4,
    slot: 'body',
    tags: ['tank', 'trash'],
    desc: '+3 DEF, +3 VIT, 6 BLOCK EVERY TURN',
    needsBoss: true,
    gear: [{ x: 3, y: 7, rows: ['.kkkkkkkkkkk.', 'kglllkklllggk', 'kgdgdkkdgdggk', 'kgllllllllggk', 'kgyglllgyggk.', '.kkkkkkkkkkk.'] }],
    bonus: (b, l) => {
      b.def += 3 * l;
      b.vit += 3 * l;
    },
    fx: (l) => ({ startBlock: 6 * l }),
  },
  // BACK
  {
    id: 'backpack',
    name: 'BACKPACK',
    rarity: 0,
    slot: 'back',
    tags: ['scav'],
    desc: '+30% SHINIES',
    gear: [{ x: 3, y: 4, rows: ['.kkkkk.', 'kGGGGGk', 'kGDGGGk', 'kGGGGGk', 'kGGDGGk', '.kkkkk.'] }],
    bonus: (b, l) => (b.shinyMult += 0.3 * l),
  },
  {
    id: 'treasure_sack',
    name: 'TREASURE SACK',
    rarity: 2,
    slot: 'back',
    tags: ['scav'],
    desc: 'SHOPS 15% CHEAPER, 10% INTEREST AFTER FIGHTS',
    gear: [{ x: 2, y: 1, rows: ['..kk..', '.kyyk.', 'knnnnk', 'knynnk', 'knnnnk', '.kkkk.'] }],
    bonus: (b, l) => (b.discount += 0.15 * l),
    fx: (l) => ({ interest: 10 * l }),
  },
  {
    id: 'jetpack',
    name: 'JETPACK',
    rarity: 3,
    slot: 'back',
    tags: ['speed'],
    desc: '+1 ACTION POINT EVERY TURN',
    gear: [
      {
        x: 3,
        y: 3,
        rows: ['.kk.', 'klgk', 'klgk', 'klgk', 'klgk', '.kk.', '.oy.', '..o.'],
        alt: ['.kk.', 'klgk', 'klgk', 'klgk', 'klgk', '.kk.', '.yo.', '.oy.', '..o.'],
      },
    ],
    bonus: (b, l) => (b.ap += l),
  },
  // PAW
  {
    id: 'slingshot',
    name: 'SLINGSHOT',
    rarity: 0,
    slot: 'paw',
    tags: ['crit'],
    desc: '+1 STRENGTH, +1 LUCK',
    gear: [{ x: 15, y: 6, rows: ['n.n', 'nrn', '.n.', '.n.', '.k.'] }],
    bonus: (b, l) => {
      b.str += l;
      b.lck += l;
    },
  },
  {
    id: 'bottle_rocket',
    name: 'BOTTLE ROCKETS',
    rarity: 1,
    slot: 'paw',
    tags: ['trash'],
    desc: 'SINGLE HITS SPLASH 30% TO OTHER FOES',
    gear: [{ x: 15, y: 4, rows: ['.r.', 'krk', 'kGk', 'kGk', 'kGk', '.k.'] }],
    fx: (l) => ({ splash: 30 * l }),
  },
  {
    id: 'boomerang_lid',
    name: 'BOOMERANG LID',
    rarity: 3,
    slot: 'paw',
    tags: ['trash'],
    desc: 'END OF YOUR TURN: HIT ALL FOES FOR 5',
    gear: [{ x: 14, y: 8, rows: ['.kkk.', 'klllk', 'klwlk', '.kkk.'] }],
    fx: (l) => ({ boomerang: 5 * l }),
  },
  {
    id: 'electric_fork',
    name: 'ELECTRIC FORK',
    rarity: 4,
    slot: 'paw',
    tags: ['crit'],
    desc: 'HITS ARC TO ANOTHER FOE FOR 70%',
    needsBoss: true,
    gear: [
      {
        x: 15,
        y: 2,
        rows: ['l.l', 'l.l', 'lll', '.l.', '.l.', '.n.', '.n.'],
        alt: ['lCl', 'l.lC', 'lll', 'Cl.', '.l.', '.n.', '.n.'],
      },
    ],
    fx: (l) => ({ chain: 70 * l }),
  },
  // TAIL
  {
    id: 'ribbon',
    name: 'TAIL RIBBON',
    rarity: 0,
    slot: 'tail',
    tags: ['speed'],
    desc: '+2 AGILITY',
    gear: [{ x: 2, y: 7, rows: ['r.r', '.r.', 'r.r'] }],
    bonus: (b, l) => (b.agi += 2 * l),
  },
  {
    id: 'rocket_tail',
    name: 'ROCKET TAIL',
    rarity: 1,
    slot: 'tail',
    tags: ['speed'],
    desc: 'YOUR FIRST HIT EACH FIGHT CRITS',
    gear: [{ x: -3, y: 5, rows: ['.yo', 'oyo', '.yo'], alt: ['..y', '.oy', '..y'] }],
    bonus: (b) => (b.agi += 1),
    fx: () => ({ firstCrit: 1 }),
  },
  {
    id: 'lucky_tail',
    name: 'LUCKY TAIL',
    rarity: 2,
    slot: 'tail',
    tags: ['crit', 'scav'],
    desc: '+3 LUCK, +20% SHINIES',
    gear: [{ x: 0, y: 5, rows: ['.yy.', 'yOyy', 'yyOy.', '.yOy'] }],
    bonus: (b, l) => {
      b.lck += 3 * l;
      b.shinyMult += 0.2 * l;
    },
  },
  {
    id: 'fluffy_tail',
    name: 'FLUFFY TAIL',
    rarity: 1,
    slot: 'tail',
    tags: ['tank'],
    desc: 'HEAL 3 FOR EVERY KILL',
    gear: [{ x: -2, y: 4, rows: ['.ww..', 'wllw.', 'wllw.', '.ww..'] }],
    fx: (l) => ({ killHeal: 3 * l }),
  },
  // AURA (no gear: shown as effects around the raccoon)
  {
    id: 'fly_swarm',
    name: 'FLY SWARM',
    rarity: 1,
    slot: 'aura',
    tags: ['trash'],
    desc: 'END OF TURN: FLIES BITE A FOE FOR 4',
    icon: ['.........', '..k...k..', '.klk.klk.', '..k...k..', '.........', '....k....', '...klk...', '....k....', '.........'],
    fx: (l) => ({ flies: 4 * l }),
  },
  {
    id: 'stink_cloud',
    name: 'STINK CLOUD',
    rarity: 2,
    slot: 'aura',
    tags: ['trash'],
    desc: 'FIGHTS START WITH 4 POISON ON ALL FOES',
    icon: ['..LL.....', '.LGGL.LL.', 'LGGGGLGGL', '.LGGGGGL.', '..LLGGGL.', '...LGGL..', '.LL.LL...', 'LGGL.....', '.LL......'],
    fx: (l) => ({ stink: 4 * l }),
  },
  {
    id: 'combo_fever',
    name: 'COMBO FEVER',
    rarity: 2,
    slot: 'aura',
    tags: ['speed'],
    desc: 'EVERY KILL GIVES +1 ACTION POINT',
    icon: ['....y....', '...yy....', '..yyo....', '.yyoyyyy.', 'yyoooyy..', '...yoy...', '...yy....', '..yy.....', '..y......'],
    fx: () => ({ killAp: 1 }),
  },
  {
    id: 'rage_aura',
    name: 'CORNERED RAGE',
    rarity: 3,
    slot: 'aura',
    tags: ['crit', 'tank'],
    desc: 'UNDER 35% HEALTH: +60% DAMAGE',
    icon: ICONS.rage,
    fx: (l) => ({ rage: 60 * l }),
  },
];

// ---------------------------------------------------------------- skills

const I = {
  claw: ['k.......k', 'wk.....kw', '.wk...kw.', '..w...w..', 'k.......k', 'wk.....kw', '.wk...kw.', '..w...w..', '.........'],
  pounce: ['....kk...', '...kook..', '..koyok..', '.koyyyok.', 'kooyyyook', '.koyyyok.', '..koyok..', '...kook..', '....kk...'],
  guard: ['.kkkkkkk.', 'klllllllk', 'klwllllk.', 'kllllllk.', 'klllllllk', '.klllllk.', '..klllk..', '...klk...', '....k....'],
  sweep: ['.........', 'kk.......', 'gkk......', 'kggkk....', '.kkggkk..', '...kkggkk', '.....kkgk', '.......kk', '.........'],
  stink: ['...kk....', '..kLLk...', '.kLGGLk..', 'kLGGGGLk.', 'kLGkkGLk.', 'kLGGGGLk.', '.kLGGLk..', '..kkkk...', '.........'],
  trick: ['...kkk...', '..kyyyk..', '.kywyyyk.', '.kyyyyyk.', '.kyyyyyk.', '..kyyyk..', '...kkk...', '..y...y..', '.y.....y.'],
  snack: ['kkkkkkkkk', 'knnnnnnnk', 'kyyryyryk', '.kyyyyyk.', '.kyryyyk.', '..kyyyk..', '..kyyrk..', '...kyk...', '....k....'],
  frenzy: ['....k....', '...krk...', '..krrok..', '.krrooyk.', 'krroyyyok', 'krooyyyok', 'kroyywyok', '.krooyyk.', '..kkkkk..'],
  jeer: ['.kkkkkkk.', 'kyyyyyyyk', 'kykyyykyk', 'kyyyyyyyk', 'kykkkkkyk', 'kyykrrkyk', '.kyyyyyk.', '..kkkkk..', '.........'],
  sniff: ['...kkk...', '..kwwwk..', '.kwkkkwk.', '.kwkrkwk.', '.kwkkkwk.', '..kwwwk..', '...kkkk..', '......kk.', '.......kk'],
  lucky: ['....k....', '...kyk...', 'kkkkykkkk', 'kyyyyyyyk', '.kyyyyyk.', '..kyyyk..', '.kyykyyk.', '.kyk.kyk.', '.kk...kk.'],
  flurry: ['k.k.k....', '.w.w.w...', '..w.w.w..', '...w.w.w.', 'k.k.k....', '.w.w.w...', '..w.w.w..', '...w.w.w.', '.........'],
  spikes: ['.w.w.w.w.', 'kkkkkkkkk', 'kdddddddk', 'kdldkdldk', 'kdddddddk', 'kdldkdldk', 'kdddddddk', 'kkkkkkkkk', '.w.w.w.w.'],
  bash: ['..kkkkk..', '.klllllk.', 'kllwllllk', 'klllllllk', 'klllllllk', 'klllllllk', '.klllllk.', '..kkkkk..', '.........'],
  storm: ['k..l..k..', '.l..k..l.', 'k..l..k..', '..k..l..k', '.l..k..l.', 'l..k..l..', '..l..k..l', '.k..l..k.', 'l..k..l..'],
  berserk: ['.kk...kk.', 'krrk.krrk', 'krrrkrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '..kwkwk..', '..kw.wk..', '...k.k...'],
};

const skills: SkillDef[] = [
  { id: 'claw', name: 'CLAW', desc: () => 'HIT A FOE', icon: I.claw, cost: 1, cooldown: 0, target: 'one', max: 3, effect: (l) => ({ dmg: 0.9 + 0.15 * l }) },
  { id: 'pounce', name: 'POUNCE', desc: (l) => `HUGE HIT (${Math.round((1.8 + 0.4 * l) * 100)}%)`, icon: I.pounce, cost: 2, cooldown: 1, target: 'one', max: 3, effect: (l) => ({ dmg: 1.8 + 0.4 * l }) },
  { id: 'guard', name: 'GUARD', desc: (l) => `GAIN ${4 + 3 * l} BLOCK + DEF X2`, icon: I.guard, cost: 1, cooldown: 0, target: 'self', max: 3, effect: (l) => ({ block: 4 + 3 * l }) },
  { id: 'sweep', name: 'TAIL SWEEP', desc: (l) => `HIT ALL FOES (${Math.round((0.6 + 0.2 * l) * 100)}%)`, icon: I.sweep, cost: 2, cooldown: 0, target: 'all', max: 3, effect: (l) => ({ dmg: 0.6 + 0.2 * l }) },
  { id: 'stink', name: 'STINK BOMB', desc: (l) => `POISON ALL FOES ${2 + 2 * l}`, icon: I.stink, cost: 1, cooldown: 2, target: 'all', max: 3, effect: (l) => ({ apply: { poison: 2 + 2 * l } }) },
  { id: 'trick', name: 'SHINY TRICK', desc: (l) => (l < 3 ? 'STUN A FOE FOR 1 TURN' : 'STUN A FOE, NO COOLDOWN'), icon: I.trick, cost: 1, cooldown: 3, target: 'one', max: 3, effect: () => ({ apply: { stun: 1 } }) },
  { id: 'snack', name: 'SNACK', desc: (l) => `HEAL ${15 + 10 * l}% HEALTH`, icon: I.snack, cost: 1, cooldown: 3, target: 'self', max: 3, effect: (l) => ({ heal: 0.15 + 0.1 * l }) },
  { id: 'frenzy', name: 'FRENZY', desc: (l) => `+${1 + l} AP, LOSE 4 HEALTH`, icon: I.frenzy, cost: 0, cooldown: 2, target: 'self', max: 2, effect: (l) => ({ ap: 1 + l, hpCost: 4 }) },
  { id: 'jeer', name: 'JEER', desc: (l) => `WEAKEN ALL FOES ${1 + l} TURNS`, icon: I.jeer, cost: 1, cooldown: 2, target: 'all', max: 3, effect: (l) => ({ apply: { weak: 1 + l } }) },
  { id: 'sniff', name: 'SNIFF OUT', desc: (l) => `FOE TAKES +50% FOR ${1 + l} TURNS`, icon: I.sniff, cost: 0, cooldown: 2, target: 'one', max: 3, effect: (l) => ({ apply: { vuln: 1 + l } }) },
  { id: 'lucky', name: 'LUCKY SWIPE', desc: (l) => `SURE CRIT, SCALES WITH LUCK (${Math.round((0.7 + 0.2 * l) * 100)}%)`, icon: I.lucky, cost: 1, cooldown: 1, target: 'one', max: 3, effect: (l) => ({ dmg: 0.7 + 0.2 * l, crit: true, scale: 'lck' }) },
  { id: 'flurry', name: 'FLURRY', desc: (l) => `${2 + l} QUICK HITS, SCALES WITH AGILITY`, icon: I.flurry, cost: 2, cooldown: 0, target: 'random', max: 3, effect: (l) => ({ dmg: 0.45, hits: 2 + l, scale: 'agi' }) },
  { id: 'spikes', name: 'TRASH ARMOR', desc: (l) => `5 BLOCK, ATTACKERS TAKE ${3 + 2 * l}`, icon: I.spikes, cost: 1, cooldown: 1, target: 'self', max: 3, effect: (l) => ({ block: 5, self: { thorns: 3 + 2 * l } }) },
  { id: 'bash', name: 'LID BASH', desc: (l) => `HIT AND GAIN ${3 + 2 * l} BLOCK`, icon: I.bash, cost: 1, cooldown: 0, target: 'one', max: 3, effect: (l) => ({ dmg: 0.6, block: 3 + 2 * l }) },
  { id: 'storm', name: 'TRASH STORM', desc: (l) => `${4 + 2 * l} RANDOM HITS`, icon: I.storm, cost: 3, cooldown: 1, target: 'random', max: 3, effect: (l) => ({ dmg: 0.6, hits: 4 + 2 * l }) },
  { id: 'berserk', name: 'BERSERK', desc: (l) => `+50% DAMAGE FOR ${1 + l} TURNS`, icon: I.berserk, cost: 1, cooldown: 3, target: 'self', max: 3, effect: (l) => ({ self: { rage: 1 + l } }) },
];

// ---------------------------------------------------------------- events

const events: EventDef[] = [
  {
    id: 'dumpster',
    title: 'OVERFLOWING DUMPSTER',
    text: ['SOMETHING SHINY IS BURIED', 'DEEP IN THERE. IT SMELLS', 'DANGEROUS.'],
    art: 'can',
    options: [
      { label: 'DIG IN', detail: 'LOSE 30% HEALTH, GET A RARE+ ITEM', can: (r) => r.hp > r.maxHp * 0.3, run: (r) => (r.hurt(Math.round(r.maxHp * 0.3)), `FOUND ${r.giveRandomItem(2)}!`) },
      { label: 'WALK PAST', detail: 'NOTHING HAPPENS', run: () => 'YOU KEEP YOUR NOSE CLEAN.' },
    ],
  },
  {
    id: 'possum_trader',
    title: 'SHADY POSSUM',
    text: ['PSST. I GOT GOOD STUFF.', 'YOU GIVE ME SOMETHIN,', 'I GIVE YOU SOMETHIN BETTER.'],
    art: 'possum',
    options: [
      {
        label: 'TRADE',
        detail: 'SWAP A RANDOM ITEM FOR A RARER ONE',
        can: (r) => r.itemCount > 0,
        run: (r) => {
          const lost = r.removeRandomItem();
          return `GAVE ${lost}, GOT ${r.giveRandomItem(2, 4)}!`;
        },
      },
      { label: 'NO THANKS', detail: 'KEEP YOUR STUFF', run: () => 'THE POSSUM PLAYS DEAD.' },
    ],
  },
  {
    id: 'dice',
    title: 'BACK-ALLEY DICE',
    text: ['A GANG OF RATS IS ROLLING', 'BOTTLE CAPS.', 'DOUBLE OR NOTHING?'],
    art: 'rat',
    options: [
      {
        label: 'BET HALF',
        detail: '50/50: DOUBLE IT OR LOSE IT',
        can: (r) => r.shinies >= 4,
        run: (r) => {
          const bet = Math.floor(r.shinies / 2);
          if (Math.random() < 0.5) {
            r.addShinies(bet);
            return `YOU WIN ${bet} SHINIES!`;
          }
          r.addShinies(-bet);
          return `THE RATS TAKE ${bet} SHINIES.`;
        },
      },
      { label: 'LEAVE', detail: 'WALK AWAY', run: () => 'SMART RACCOON.' },
    ],
  },
  {
    id: 'shortcut',
    title: 'A DARK SHORTCUT',
    text: ['A GAP IN THE FENCE LEADS', 'STRAIGHT AHEAD. WHATEVER', 'LIVES THERE IS NASTY.'],
    options: [
      { label: 'TAKE IT', detail: '+150M, BUT DANGER +1 FOR THE RUN', run: (r) => (r.addDistance(150), r.addHeat(1), 'YOU SQUEEZE THROUGH. +150M!') },
      { label: 'STAY ON THE PATH', detail: 'NO RISK', run: () => 'THE LONG WAY IT IS.' },
    ],
  },
  {
    id: 'elite_roost',
    title: 'ELITE ROOST',
    text: ['TOUGH CRITTERS GUARD A', 'STASH OF TREASURE.'],
    art: 'cat',
    minDanger: 3,
    options: [
      { label: 'CHALLENGE THEM', detail: 'NEXT FIGHT IS ELITE. WIN AN EPIC ITEM', run: (r) => (r.eliteNext(), 'THEY NOTICED YOU...') },
      { label: 'SNEAK PAST', detail: 'NOTHING HAPPENS', run: () => 'NOBODY SAW A THING.' },
    ],
  },
  {
    id: 'pizza',
    title: 'ABANDONED PIZZA',
    text: ['A WHOLE PIZZA, STILL WARM.', 'NOBODY AROUND.'],
    art: 'pizza',
    options: [
      { label: 'EAT IT', detail: 'HEAL TO FULL', can: (r) => r.hp < r.maxHp, run: (r) => (r.heal(9999), 'DELICIOUS. FULLY HEALED!') },
      { label: 'SELL IT', detail: '+15 SHINIES', run: (r) => (r.addShinies(15), 'SOLD TO A HUNGRY PIGEON.') },
    ],
  },
  {
    id: 'gym',
    title: 'ABANDONED GYM',
    text: ['RUSTY WEIGHTS AND A', 'HAMSTER WHEEL. NO PAIN,', 'NO GAIN?'],
    options: [
      { label: 'LIFT', detail: '+1 STRENGTH, LOSE 20% HEALTH', can: (r) => r.hp > r.maxHp * 0.2, run: (r) => (r.hurt(Math.round(r.maxHp * 0.2)), r.addStat('str', 1), 'SWOLE. +1 STRENGTH!') },
      { label: 'RUN THE WHEEL', detail: '+1 AGILITY, LOSE 20% HEALTH', can: (r) => r.hp > r.maxHp * 0.2, run: (r) => (r.hurt(Math.round(r.maxHp * 0.2)), r.addStat('agi', 1), 'ZOOM. +1 AGILITY!') },
      { label: 'NAP ON THE MAT', detail: 'HEAL 30%', run: (r) => (r.heal(Math.round(r.maxHp * 0.3)), 'A GOOD NAP.') },
    ],
  },
  {
    id: 'shaman',
    title: 'RAT SHAMAN',
    text: ['GIVE ME SOME OF YOUR', 'LIFE, LITTLE BANDIT,', 'AND I WILL GIVE YOU POWER.'],
    art: 'rat',
    minDanger: 5,
    options: [
      {
        label: 'ACCEPT',
        detail: '-2 VITALITY, GET AN EPIC+ ITEM',
        run: (r) => (r.addStat('vit', -2), `YOU FEEL EMPTY. GOT ${r.giveRandomItem(3)}!`),
      },
      { label: 'REFUSE', detail: 'NOTHING HAPPENS', run: () => 'THE SHAMAN SNEERS.' },
    ],
  },
  {
    id: 'old_raccoon',
    title: 'OLD RACCOON',
    text: ['A GREY-WHISKERED RACCOON', 'OFFERS TO TEACH YOU A', 'TRICK OR TWO.'],
    options: [
      { label: 'LISTEN', detail: '+15 XP', run: (r) => (r.addXp(15), 'YOU LEARNED SOMETHING.') },
      { label: 'PAY 10 SHINIES', detail: '+40 XP', can: (r) => r.shinies >= 10, run: (r) => (r.addShinies(-10), r.addXp(40), 'A MASTERCLASS IN MISCHIEF.') },
    ],
  },
];

export const corePack: PackDef = { id: 'core', name: 'CORE', enemies, encounters, items, skills, events };
