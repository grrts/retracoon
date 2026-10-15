// Passive skills: small, always-on buffs that stack without limit. Offered at level-up
// once the skill bar has nothing left to learn or upgrade, so late levels still matter.
// They last for the run only, like skills and items.
import type { Bonus, Fx } from './types';
import { ink } from './skills/icons';

export interface PassiveDef {
  id: string;
  name: string;
  desc: (n: number) => string; // what n stacks do in total
  each: string; // what one more stack adds
  icon: string[]; // 9x9, 'k' outline
  color: number;
  bonus?: (b: Bonus, n: number) => void;
  fx?: (n: number) => Fx;
  max?: number; // stacks allowed (default: no limit)
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const PASSIVES: PassiveDef[] = [
  {
    id: 'brawn',
    name: 'BRAWN',
    desc: (n) => `+${pct(0.06 * n)} DAMAGE`,
    each: '+6% DAMAGE',
    color: 0xef7d57,
    icon: ['..kkkk...', '.koooOk..', '.koOOOk..', 'kkoooOkk.', 'koookOOk.', 'koooooOk.', '.koooook.', '..kkkkk..', '.........'],
    bonus: (b, n) => (b.dmg += 0.06 * n),
  },
  {
    id: 'fur',
    name: 'THICK FUR',
    desc: (n) => `+${8 * n} MAX HEALTH`,
    each: '+8 MAX HEALTH',
    color: 0x38b764,
    icon: ['.kk.kk...', 'krrkrrk..', 'krwrrrk..', 'krrrrrk..', '.krrrk.k.', '..krk.kGk', '...k.kGGG', '.....kkGk', '.......k.'],
    bonus: (b, n) => (b.hp += 8 * n),
  },
  {
    id: 'eye',
    name: 'SHARP EYE',
    desc: (n) => `+${pct(0.02 * n)} CRIT CHANCE`,
    each: '+2% CRIT CHANCE',
    color: 0xffcd75,
    icon: ['.........', '..kkkkk..', '.kwwwwwk.', 'kwwkykwwk', 'kwkyOykwk', 'kwwkykwwk', '.kwwwwwk.', '..kkkkk..', '.........'],
    bonus: (b, n) => (b.crit += 0.02 * n),
  },
  {
    id: 'feet',
    name: 'LIGHT FEET',
    desc: (n) => `+${pct(0.02 * n)} DODGE`,
    each: '+2% DODGE',
    color: 0x73eff7,
    icon: ['.....kk..', '....kCCk.', '...kCCk..', '..kCCk...', '.kCCCCk..', 'kCCwCk...', 'kCCCk....', '.kkk.....', '.........'],
    bonus: (b, n) => (b.dodge += 0.02 * n),
  },
  {
    id: 'hide',
    name: 'TOUGH HIDE',
    desc: (n) => `TAKE ${pct(1 - Math.pow(0.97, n))} LESS DAMAGE`,
    each: 'TAKE 3% LESS DAMAGE',
    color: 0x94b0c2,
    icon: ['.kkkkkkk.', 'kllllllgk', 'kllwlllgk', 'klllllldk', 'klllllldk', '.klllldk.', '..kllgk..', '...kdk...', '....k....'],
    bonus: (b, n) => (b.armor = 1 - (1 - b.armor) * Math.pow(0.97, n)),
  },
  {
    id: 'scrap',
    name: 'SCRAP SHIELD',
    desc: (n) => `+${2 * n} BLOCK EVERY TURN`,
    each: '+2 BLOCK EVERY TURN',
    color: 0x41a6f6,
    icon: ['.kkkkkkk.', 'kbbbbbbck', 'kbcbbbbck', 'kbbbbbbck', 'kbbbbcbck', '.kbbbbck.', '..kbbck..', '...kck...', '....k....'],
    fx: (n) => ({ startBlock: 2 * n }),
  },
  {
    id: 'prickly',
    name: 'PRICKLY',
    desc: (n) => `ATTACKERS TAKE ${2 * n}`,
    each: 'ATTACKERS TAKE +2',
    color: 0xa7f070,
    icon: ['k...k...k', '.k..k..k.', '..kLLLk..', 'kkLLGLLkk', '..LGLGL..', 'kkLLGLLkk', '..kLLLk..', '.k..k..k.', 'k...k...k'],
    fx: (n) => ({ thorns: 2 * n }),
  },
  {
    id: 'wind',
    name: 'SECOND WIND',
    desc: (n) => `HEAL ${n} EVERY TURN`,
    each: 'HEAL +1 EVERY TURN',
    color: 0xf5a5b8,
    icon: ['....k....', '...kPk...', '..kPPPk..', '.kPPwPPk.', 'kPPPwPPPk', '.kkwwwkk.', '..kPwPk..', '..kPPPk..', '...kkk...'],
    fx: (n) => ({ regen: n }),
  },
  {
    id: 'feast',
    name: 'FEAST',
    desc: (n) => `HEAL ${4 * n} ON EVERY KILL`,
    each: 'HEAL +4 ON KILL',
    color: 0xb13e53,
    icon: ['...kkk...', '..kyyyk..', '.kyoyoyk.', 'kyyyyyyyk', 'kkkkkkkkk', 'kGLGLGLGk', 'knnnnnnnk', '.knnnnnk.', '..kkkkk..'],
    fx: (n) => ({ killHeal: 4 * n }),
  },
  {
    id: 'greed',
    name: 'GREED',
    desc: (n) => `+${pct(0.08 * n)} SHINIES`,
    each: '+8% SHINIES',
    color: 0xffa300,
    icon: ['..kkkkk..', '.kOOOOOk.', 'kOyyyyyOk', 'kOykkkyOk', 'kOykOOyOk', 'kOykkkyOk', 'kOyyyyyOk', '.kOOOOOk.', '..kkkkk..'],
    bonus: (b, n) => (b.shinyMult += 0.08 * n),
  },
  {
    id: 'brutal',
    name: 'BRUTAL CRITS',
    desc: (n) => `CRITS DEAL +${pct(0.1 * n)}`,
    each: 'CRITS DEAL +10%',
    color: 0xb05ccf,
    icon: ['k.......k', '.kv...vk.', '..kvwvk..', '..vwwwv..', '..kvwvk..', '.kv...vk.', 'k.......k', '.........', '.........'],
    bonus: (b, n) => (b.critMult += 0.1 * n),
  },
];

// ---------------------------------------------------------------- the big batch
// Each one changes how a build plays rather than adding plain numbers. Most stack;
// the build-defining and the strange ones (max 1) come with a catch.

const SHAPES: Record<string, string[]> = {
  drop: ['....k....', '...kwk...', '...kwk...', '..kwwlk..', '.kwwwwlk.', '.kwwwwlk.', '.kwwwllk.', '..kllgk..', '...kkk...'],
  flake: ['....k....', '.k.kwk.k.', '..kwlwk..', '.kwlwlwk.', 'kwlwwwlwk', '.kwlwlwk.', '..kwlwk..', '.k.kwk.k.', '....k....'],
  flame: ['....k....', '...kwk...', '..kwlwk..', '..kwlwk..', '.kwlwwlk.', 'kwlwwwlgk', 'kwlwwwlgk', '.kgllggk.', '..kkkkk..'],
  claw: ['k...k...k', 'wk.kwk.kw', 'wk.kwk.kw', '.wk.wk.wk', '.wk.wk.wk', '..wk.wk.k', '..lk.lk..', '...k..k..', '.........'],
  coin: ['..kkkkk..', '.kwwwwlk.', 'kwwkkkwlk', 'kwwkwwwlk', 'kwwkkkwlk', 'kwwwwkwlk', 'kwwkkkwlk', '.kllllgk.', '..kkkkk..'],
  clock: ['..kkkkk..', '.kwwkwwk.', 'kwwwkwwlk', 'kwwwkwwlk', 'kwwwkkklk', 'kwwwwwwlk', 'kwwwwwwlk', '.kllllgk.', '..kkkkk..'],
  eye: ['.........', '..kkkkk..', '.kwwwwwk.', 'kwwkkkwwk', 'kwkgggkwk', 'kwwkkkwwk', '.kwwwwwk.', '..kkkkk..', '.........'],
  heart: ['.........', '.kk...kk.', 'kwlk.kllk', 'kwllkllgk', 'klllllllk', '.kllllgk.', '..kllgk..', '...kgk...', '....k....'],
  shield: ['kkkkkkkkk', 'kwwwlllgk', 'kwwllllgk', 'kwllllllk', 'kllllllgk', '.kllllgk.', '..kllgk..', '...kgk...', '....k....'],
  star: ['....k....', '...kwk...', 'kkkkwkkkk', 'kwwwwwwlk', '.kwwwwlk.', '..kwlwk..', '.kwlklwk.', 'kwlk.klwk', 'kkk...kkk'],
  skull: ['..kkkkk..', '.kwwwwwk.', 'kwwwwwwlk', 'kwkkwkklk', 'kwkkwkklk', 'kwwwkwwlk', '.kwkkklk.', '..kwkwk..', '..kkkkk..'],
  bolt: ['....kkkk.', '...kwwk..', '..kwwk...', '.kwwwkkk.', 'kwwwwwwk.', '.kkkwwk..', '...kwk...', '..kwk....', '..kk.....'],
  fist: ['.........', '.kkkkkkk.', 'kwkwkwkwk', 'kwwwwwwlk', 'kkkkwwwlk', 'kwwkwwwlk', '.kwwwwlk.', '..kkkkk..', '.........'],
  dice: ['kkkkkkkkk', 'kwwwwwwlk', 'kwkwwwwlk', 'kwwwwwwlk', 'kwwwkwwlk', 'kwwwwwwlk', 'kwwwwwklk', 'klllllllk', 'kkkkkkkkk'],
};

interface P {
  id: string;
  name: string;
  look: string; // shape/ink
  color: number;
  each: string;
  desc: (n: number) => string;
  bonus?: (b: Bonus, n: number) => void;
  fx?: (n: number) => Fx;
  max?: number;
}
const def = (p: P): PassiveDef => {
  const [shape, theme] = p.look.split('/');
  return { id: p.id, name: p.name, each: p.each, desc: p.desc, color: p.color, icon: ink(SHAPES[shape], theme), bonus: p.bonus, fx: p.fx, max: p.max };
};
const cap = (n: number, max: number) => Math.min(n, max);

PASSIVES.push(
  // ---- on-hit elements: turn any skill into a fire, ice, bleed or poison skill
  def({ id: 'kindling', name: 'KINDLING', look: 'flame/fire', color: 0xef7d57, each: 'YOUR HITS BURN +1', desc: (n) => `YOUR HITS BURN ${n}`, fx: (n) => ({ burnHit: n }) }),
  def({ id: 'frost_touch', name: 'FROST TOUCH', look: 'flake/ice', color: 0x73eff7, each: 'YOUR HITS CHILL +1', desc: (n) => `YOUR HITS CHILL ${n}`, fx: (n) => ({ chillHit: n }), max: 2 }),
  def({ id: 'serrated', name: 'SERRATED CLAWS', look: 'claw/blood', color: 0xb13e53, each: 'YOUR HITS BLEED +1', desc: (n) => `YOUR HITS BLEED ${n}`, fx: (n) => ({ bleedHit: n }) }),
  def({ id: 'toxic_claws', name: 'TOXIC CLAWS', look: 'claw/poison', color: 0xa7f070, each: 'YOUR HITS POISON +1', desc: (n) => `YOUR HITS POISON ${n}`, fx: (n) => ({ poisonHit: n }) }),
  def({ id: 'bigger_bang', name: 'BIGGER BANG', look: 'star/fire', color: 0xffa300, each: '+15% POISON, BURN, BLEED', desc: (n) => `+${15 * n}% POISON BURN BLEED`, fx: (n) => ({ statusAmp: 15 * n }) }),
  def({ id: 'plague_rat', name: 'PLAGUE RAT', look: 'skull/poison', color: 0x38b764, each: 'DYING FOES PASS ON 50% POISON', desc: (n) => `DEATHS PASS ${50 * n}% POISON`, fx: (n) => ({ poisonSpread: 50 * n }), max: 2 }),

  // ---- hit patterns
  def({ id: 'extra_limbs', name: 'EXTRA LIMBS', look: 'fist/rose', color: 0xf5a5b8, each: 'MULTI-HIT SKILLS HIT +1 TIME', desc: (n) => `MULTI-HITS +${n} HIT${n > 1 ? 'S' : ''}`, fx: (n) => ({ multiHit: n }), max: 2 }),
  def({ id: 'echo', name: 'ECHO', look: 'bolt/shadow', color: 0xb05ccf, each: '6% CHANCE A SKILL FIRES TWICE', desc: (n) => `${6 * n}% SKILLS FIRE TWICE`, fx: (n) => ({ echo: 6 * n }), max: 5 }),
  def({ id: 'coupon_clipper', name: 'COUPON CLIPPER', look: 'coin/sea', color: 0x73eff7, each: '5% CHANCE A SKILL IS FREE', desc: (n) => `${5 * n}% SKILLS ARE FREE`, fx: (n) => ({ refund: 5 * n }), max: 5 }),
  def({ id: 'hourglass', name: 'HOURGLASS', look: 'clock/gold', color: 0xffcd75, each: '15% CHANCE COOLDOWNS TICK TWICE', desc: (n) => `${15 * n}% FAST COOLDOWNS`, fx: (n) => ({ quickCd: 15 * n }), max: 4 }),
  def({ id: 'early_bird', name: 'EARLY BIRD', look: 'bolt/gold', color: 0xffcd75, each: '+1 AP ON YOUR FIRST TURN', desc: (n) => `+${n} AP ON TURN 1`, fx: (n) => ({ startAp: n }), max: 2 }),
  def({ id: 'opening_gambit', name: 'OPENING GAMBIT', look: 'eye/gold', color: 0xffcd75, each: 'FIRST HIT EACH FIGHT CRITS +1', desc: (n) => `FIRST ${n} HIT${n > 1 ? 'S' : ''} CRIT`, fx: (n) => ({ focusStart: n }), max: 3 }),
  def({ id: 'first_step', name: 'FIRST STEP', look: 'bolt/sea', color: 0x73eff7, each: 'DODGE +1 HIT IN ROUND ONE', desc: (n) => `DODGE FIRST ${n} HIT${n > 1 ? 'S' : ''}`, fx: (n) => ({ evadeStart: n }), max: 3 }),
  def({ id: 'hunter_eyes', name: 'HUNTER EYES', look: 'eye/blood', color: 0xb13e53, each: 'FOES START MARKED +1', desc: (n) => `FOES START MARKED ${n}`, fx: (n) => ({ markStart: n }), max: 3 }),

  // ---- damage in the right moment
  def({ id: 'ambusher', name: 'AMBUSHER', look: 'fist/shadow', color: 0x7a4a8f, each: '+25% DAMAGE ON TURN ONE', desc: (n) => `+${25 * n}% DAMAGE TURN 1`, fx: (n) => ({ ambush: 25 * n }) }),
  def({ id: 'slow_cooker', name: 'SLOW COOKER', look: 'clock/fire', color: 0xef7d57, each: '+4% DAMAGE PER TURN', desc: (n) => `+${4 * n}% DAMAGE A TURN`, fx: (n) => ({ slowBurn: 4 * n }) }),
  def({ id: 'crowd_pleaser', name: 'CROWD PLEASER', look: 'star/neon', color: 0xff77c8, each: '+8% DAMAGE PER EXTRA FOE', desc: (n) => `+${8 * n}% PER EXTRA FOE`, fx: (n) => ({ crowd: 8 * n }) }),
  def({ id: 'lone_wolf', name: 'LONE WOLF', look: 'fist/steel', color: 0x94b0c2, each: '+15% DAMAGE IN A DUEL', desc: (n) => `+${15 * n}% IN A DUEL`, fx: (n) => ({ duel: 15 * n }) }),
  def({ id: 'giant_killer', name: 'GIANT KILLER', look: 'skull/gold', color: 0xffa300, each: '+10% DAMAGE TO BOSSES, ELITES', desc: (n) => `+${10 * n}% VS BIG FOES`, fx: (n) => ({ bossDmg: 10 * n }) }),
  def({ id: 'wide_swings', name: 'WIDE SWINGS', look: 'claw/storm', color: 0x41a6f6, each: '+8% DAMAGE WITH HIT-ALL SKILLS', desc: (n) => `+${8 * n}% HIT-ALL DAMAGE`, fx: (n) => ({ aoeDmg: 8 * n }) }),
  def({ id: 'tunnel_vision', name: 'TUNNEL VISION', look: 'eye/steel', color: 0x94b0c2, each: '+7% DAMAGE WITH SINGLE HITS', desc: (n) => `+${7 * n}% SINGLE DAMAGE`, fx: (n) => ({ soloDmg: 7 * n }) }),
  def({ id: 'kick_em_down', name: 'KICK EM DOWN', look: 'fist/gold', color: 0xffcd75, each: '+20% DAMAGE TO STUNNED FOES', desc: (n) => `+${20 * n}% VS STUNNED`, fx: (n) => ({ stunDmg: 20 * n }) }),
  def({ id: 'spiteful', name: 'SPITEFUL', look: 'skull/shadow', color: 0xb05ccf, each: '+4% DAMAGE PER DEBUFF ON FOE', desc: (n) => `+${4 * n}% PER DEBUFF`, fx: (n) => ({ debuffDmg: 4 * n }) }),
  def({ id: 'big_boned', name: 'BIG BONED', look: 'heart/rose', color: 0xf5a5b8, each: 'HITS ADD 2% OF MAX HEALTH', desc: (n) => `HITS +${2 * n}% MAX HP`, fx: (n) => ({ hpDmg: 2 * n }) }),
  def({ id: 'spiked_shield', name: 'SPIKED SHIELD', look: 'shield/steel', color: 0x94b0c2, each: 'HITS ADD 10% OF YOUR BLOCK', desc: (n) => `HITS +${10 * n}% BLOCK`, fx: (n) => ({ blockDmg: 10 * n }) }),

  // ---- shinies
  def({ id: 'dragon_hoard', name: 'DRAGON HOARD', look: 'coin/fire', color: 0xffa300, each: '+1% DAMAGE PER 10 SHINIES', desc: (n) => `+${n}% DMG PER 10 SHINIES`, fx: (n) => ({ richDmg: n }) }),
  def({ id: 'pocket_change', name: 'POCKET CHANGE', look: 'coin/gold', color: 0xffcd75, each: 'EVERY HIT PAYS +1 SHINY', desc: (n) => `HITS PAY ${n}`, fx: (n) => ({ goldHit: n }), max: 3 }),

  // ---- block and defence
  def({ id: 'packrat', name: 'PACKRAT', look: 'shield/earth', color: 0x8f563b, each: 'KEEP 15% OF BLOCK EACH TURN', desc: (n) => `KEEP ${15 * n}% BLOCK`, fx: (n) => ({ blockKeep: 15 * n }), max: 6 }),
  def({ id: 'bristles', name: 'BRISTLES', look: 'shield/nature', color: 0xa7f070, each: 'BLOCKED HITS BOUNCE 20% BACK', desc: (n) => `BLOCK BOUNCES ${20 * n}%`, fx: (n) => ({ spikeBlock: 20 * n }) }),
  def({ id: 'overeater', name: 'OVEREATER', look: 'heart/earth', color: 0x8f563b, each: 'OVERHEALING BECOMES 50% BLOCK', desc: (n) => `OVERHEAL: ${50 * n}% BLOCK`, fx: (n) => ({ overBlock: 50 * n }), max: 2 }),
  def({ id: 'slippery', name: 'SLIPPERY', look: 'drop/sea', color: 0x73eff7, each: 'HEAL 2 WHEN YOU DODGE', desc: (n) => `DODGE: HEAL ${2 * n}`, fx: (n) => ({ dodgeHeal: 2 * n }) }),
  def({ id: 'bubble_wrap', name: 'BUBBLE WRAP', look: 'shield/sea', color: 0x41a6f6, each: '+4 BLOCK ON EVERY KILL', desc: (n) => `KILL: +${4 * n} BLOCK`, fx: (n) => ({ killBlock: 4 * n }) }),
  def({ id: 'iron_stomach', name: 'IRON STOMACH', look: 'heart/steel', color: 0x94b0c2, each: '+15% HEALING RECEIVED', desc: (n) => `+${15 * n}% HEALING RECEIVED`, bonus: (b, n) => (b.healMul += 0.15 * n) }),

  // ---- crits and kills
  def({ id: 'killing_spree', name: 'KILLING SPREE', look: 'skull/blood', color: 0xb13e53, each: 'A KILL MAKES +1 HIT CRIT', desc: (n) => `KILL: ${n} SURE CRIT${n > 1 ? 'S' : ''}`, fx: (n) => ({ killFocus: n }), max: 2 }),
  def({ id: 'lucky_bandaid', name: 'LUCKY BANDAID', look: 'heart/gold', color: 0xffcd75, each: 'HEAL 2 ON EVERY CRIT', desc: (n) => `CRIT: HEAL ${2 * n}`, fx: (n) => ({ critHeal: 2 * n }) }),
  def({ id: 'crit_shield', name: 'CRIT SHIELD', look: 'shield/gold', color: 0xffcd75, each: '+3 BLOCK ON EVERY CRIT', desc: (n) => `CRIT: +${3 * n} BLOCK`, fx: (n) => ({ critBlock: 3 * n }) }),
  def({ id: 'vampire_teeth', name: 'VAMPIRE TEETH', look: 'drop/blood', color: 0xb13e53, each: 'DRAIN +3% OF ALL DAMAGE', desc: (n) => `DRAIN ${cap(3 * n, 40)}%`, fx: (n) => ({ lifesteal: cap(3 * n, 40) }) }),

  // ---- between fights
  def({ id: 'picnic_basket', name: 'PICNIC BASKET', look: 'heart/nature', color: 0x38b764, each: 'HEAL 4% AFTER EACH FIGHT', desc: (n) => `HEAL ${4 * n}% AFTER FIGHTS`, fx: (n) => ({ fightHeal: 4 * n }) }),
  def({ id: 'bookworm', name: 'BOOKWORM', look: 'star/sea', color: 0x41a6f6, each: '+10% XP FROM FIGHTS', desc: (n) => `+${10 * n}% XP`, bonus: (b, n) => (b.xp += 0.1 * n) }),

  // ---- build-defining, one stack, with a catch
  def({ id: 'nine_lives', name: 'NINE LIVES', look: 'skull/holy', color: 0xfff3b0, each: 'ONCE A FIGHT, A KILLING BLOW LEAVES YOU AT 1', desc: () => 'SURVIVE 1 DEATH A FIGHT', fx: () => ({ cheatDeath: 1 }), max: 1 }),
  def({ id: 'glass_cannon', name: 'GLASS CANNON', look: 'star/ice', color: 0xc7f2ff, each: '+40% DAMAGE, -30% MAX HEALTH', desc: () => '+40% DMG, -30% MAX HP', bonus: (b) => ((b.dmg += 0.4), (b.hpMul -= 0.3)), max: 1 }),
  def({ id: 'turtle_shell', name: 'TURTLE SHELL', look: 'shield/nature', color: 0x38b764, each: 'TAKE 25% LESS DAMAGE, -1 AP', desc: () => 'TAKE 25% LESS, -1 AP', bonus: (b) => ((b.taken -= 0.25), (b.ap -= 1)), max: 1 }),
  def({ id: 'hot_blooded', name: 'HOT BLOODED', look: 'flame/blood', color: 0xb13e53, each: 'UNDER 35% HP: +100% DMG, -30% HEAL', desc: () => 'LOW HP +100% DMG, -30% HEAL', fx: () => ({ rage: 100 }), bonus: (b) => (b.healMul -= 0.3), max: 1 }),
  def({ id: 'miser', name: 'MISER', look: 'coin/steel', color: 0x94b0c2, each: '+50% SHINIES, SHOPS COST 20% MORE', desc: () => '+50% LOOT, +20% PRICES', bonus: (b) => ((b.shinyMult += 0.5), (b.discount -= 0.2)), max: 1 }),
  def({ id: 'sugar_high', name: 'SUGAR HIGH', look: 'bolt/rose', color: 0xff77c8, each: '+1 AP, LOSE 6% HP AFTER FIGHTS', desc: () => '+1 AP, -6% HP A FIGHT', bonus: (b) => (b.ap += 1), fx: () => ({ fightHurt: 6 }), max: 1 }),
  def({ id: 'coward', name: 'COWARD', look: 'drop/ice', color: 0x73eff7, each: '+15% DODGE, -15% DAMAGE', desc: () => '+15% DODGE, -15% DMG', bonus: (b) => ((b.dodge += 0.15), (b.dmg -= 0.15)), max: 1 }),
  def({ id: 'adrenaline_junkie', name: 'ADRENALINE JUNKIE', look: 'bolt/fire', color: 0xef7d57, each: 'KILLS GIVE +1 AP, TAKE 10% MORE', desc: () => 'KILL +1 AP, TAKE +10%', fx: () => ({ killAp: 1 }), bonus: (b) => (b.taken += 0.1), max: 1 }),
  def({ id: 'golden_touch', name: 'GOLDEN TOUCH', look: 'fist/gold', color: 0xffa300, each: 'HITS PAY 3 SHINIES, HEAL -20%', desc: () => 'HITS PAY 3, HEAL -20%', fx: () => ({ goldHit: 3 }), bonus: (b) => (b.healMul -= 0.2), max: 1 }),

  // ---- just weird
  def({ id: 'banana_pockets', name: 'BANANA POCKETS', look: 'dice/gold', color: 0xffcd75, each: 'FOES TRIP AND LOSE A TURN, 4%', desc: (n) => `${4 * n}% FOES TRIP`, fx: (n) => ({ trip: 4 * n }), max: 5 }),
  def({ id: 'wild_magic', name: 'WILD MAGIC', look: 'dice/neon', color: 0xff77c8, each: 'SOMETHING RANDOM EVERY TURN', desc: () => 'SOMETHING RANDOM A TURN', fx: () => ({ chaos: 1 }), max: 1 }),
);

export const passives = new Map(PASSIVES.map((p) => [p.id, p]));
