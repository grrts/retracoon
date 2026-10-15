// The item forge: one line per item. An item names its slot, rarity, tags, a look (an
// existing piece of gear repainted in one of the ink themes, so every item is drawn on
// the raccoon) and its effects. The card text is written from the effects.
//
// Item levels (picking up a duplicate): stats grow x1/x2/x3, percentages and most item
// effects x1/x1.5/x2, and on/off effects (cheat death, chaos, +AP) don't grow.
// Drawbacks never grow, so levelling up a risky item is how you outgrow its catch.
import type { Bonus, FxKey, Fx, Gear, ItemDef, Rarity, SetDef, Slot, Tag } from '../types';
import { INKS } from '../skills/icons';
import { SHAPES } from './sprites';
import { paint, type Shape } from './sprites/shape';
import { fits } from './sprites/match';
import { ITEMS_HEAD } from './head';
import { ITEMS_FACE } from './face';
import { ITEMS_BODY } from './body';
import { ITEMS_BACK } from './back';
import { ITEMS_PAW } from './paw';
import { ITEMS_TAIL } from './tail';
import { ITEMS_AURA } from './aura';

export type EffKey = Exclude<keyof Bonus, never> | FxKey;
export type Eff = Partial<Record<EffKey, number>>;

const BONUS_KEYS = new Set<string>(['str', 'def', 'agi', 'lck', 'vit', 'ap', 'critMult', 'shinyMult', 'discount', 'dodge', 'dmg', 'hp', 'crit', 'armor', 'taken', 'healMul', 'hpMul', 'xp']);
const STATS = new Set<string>(['str', 'def', 'agi', 'lck', 'vit', 'hp']);
// On/off effects: the number never grows with item level.
const FLAT = new Set<string>(['ap', 'cheatDeath', 'chaos', 'multiHit', 'startAp', 'killAp', 'firstCrit', 'focusStart', 'evadeStart', 'markStart', 'cdPlus', 'killFocus']);

// How much of an effect an item of this level gives.
export function grow(k: string, v: number, lvl: number) {
  if (FLAT.has(k)) return v;
  if (STATS.has(k)) return v * lvl;
  const g = v * (1 + 0.5 * (lvl - 1));
  return Number.isInteger(v) && !BONUS_KEYS.has(k) ? Math.round(g) : g;
}

export function applyBonus(b: Bonus, e: Eff, lvl: number | null) {
  for (const [k, v] of Object.entries(e)) {
    if (!BONUS_KEYS.has(k) || v === undefined) continue;
    b[k as keyof Bonus] += lvl === null ? v : grow(k, v, lvl);
  }
}

export function fxOf(e: Eff, lvl: number | null): Fx {
  const out: Fx = {};
  for (const [k, v] of Object.entries(e)) {
    if (BONUS_KEYS.has(k) || v === undefined) continue;
    out[k as FxKey] = lvl === null ? v : grow(k, v, lvl);
  }
  return out;
}

// ---------------------------------------------------------------- card text

const P = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
const sign = (n: number) => (n < 0 ? '-' : '+');
const PHRASE: Record<EffKey, (n: number) => string> = {
  str: (n) => `${sign(n)}${Math.abs(n)} STR`,
  def: (n) => `${sign(n)}${Math.abs(n)} DEF`,
  agi: (n) => `${sign(n)}${Math.abs(n)} AGI`,
  lck: (n) => `${sign(n)}${Math.abs(n)} LCK`,
  vit: (n) => `${sign(n)}${Math.abs(n)} VIT`,
  ap: (n) => `${sign(n)}${Math.abs(n)} AP`,
  critMult: (n) => `${sign(n)}${P(n)} CRIT DMG`,
  shinyMult: (n) => `${sign(n)}${P(n)} SHINIES`,
  discount: (n) => (n >= 0 ? `SHOPS ${P(n)} OFF` : `SHOPS COST +${P(n)}`),
  dodge: (n) => `${sign(n)}${P(n)} DODGE`,
  dmg: (n) => `${sign(n)}${P(n)} DAMAGE`,
  hp: (n) => `${sign(n)}${Math.abs(n)} MAX HP`,
  crit: (n) => `${sign(n)}${P(n)} CRIT`,
  armor: (n) => `TAKE ${P(n)} LESS`,
  taken: (n) => (n >= 0 ? `TAKE +${P(n)} DAMAGE` : `TAKE ${P(n)} LESS`),
  healMul: (n) => `${sign(n)}${P(n)} HEALING`,
  hpMul: (n) => `${sign(n)}${P(n)} MAX HP`,
  xp: (n) => `${sign(n)}${P(n)} XP`,
  thorns: (n) => `THORNS ${n}`,
  hurtBlock: (n) => `HURT: +${n} BLOCK`,
  startBlock: (n) => `+${n} BLOCK A TURN`,
  firstStrike: (n) => `START: HIT ALL ${n}`,
  laser: (n) => `EACH TURN ZAP TOP FOE ${n}`,
  flies: (n) => `TURN END: BITE A FOE ${n}`,
  stink: (n) => `START: POISON ALL ${n}`,
  chain: (n) => `HITS ARC ${n}%`,
  execute: (n) => `CRITS KILL UNDER ${n}%`,
  killHeal: (n) => `KILL: HEAL ${n}`,
  killAp: (n) => `KILL: +${n} AP`,
  rage: (n) => `UNDER 35% HP: +${n}% DMG`,
  moneyArmor: (n) => `${n} BLOCK PER 10 SHINIES`,
  interest: (n) => `${n}% INTEREST`,
  firstCrit: () => 'FIRST HIT CRITS',
  dodgeStrike: (n) => `DODGE: HIT BACK ${n}`,
  regen: (n) => `HEAL ${n} A TURN`,
  splash: (n) => `HITS SPLASH ${n}%`,
  boomerang: (n) => `TURN END: HIT ALL ${n}`,
  killBurst: (n) => `KILL: BURST ${n}`,
  lifesteal: (n) => `DRAIN ${n}%`,
  poisonHit: (n) => `HITS POISON ${n}`,
  burnHit: (n) => `HITS BURN ${n}`,
  bleedHit: (n) => `HITS BLEED ${n}`,
  chillHit: (n) => `HITS CHILL ${n}`,
  stunChance: (n) => `${n}% STUN ON HIT`,
  goldHit: (n) => `HITS PAY ${n}`,
  hpDmg: (n) => `HITS +${n}% MAX HP`,
  blockDmg: (n) => `HITS +${n}% BLOCK`,
  critHeal: (n) => `CRIT: HEAL ${n}`,
  critBlock: (n) => `CRIT: +${n} BLOCK`,
  bossDmg: (n) => `+${n}% VS BOSSES`,
  aoeDmg: (n) => `+${n}% HIT-ALL DMG`,
  soloDmg: (n) => `+${n}% SINGLE DMG`,
  stunDmg: (n) => `+${n}% VS STUNNED`,
  debuffDmg: (n) => `+${n}% PER DEBUFF`,
  ambush: (n) => `TURN 1: +${n}% DMG`,
  slowBurn: (n) => `+${n}% DMG PER TURN`,
  crowd: (n) => `+${n}% PER EXTRA FOE`,
  duel: (n) => `+${n}% DMG IN A DUEL`,
  richDmg: (n) => `+${n}% DMG PER 10 SHINIES`,
  statusAmp: (n) => `+${n}% POISON BURN BLEED`,
  multiHit: (n) => `MULTI-HITS +${n}`,
  echo: (n) => `${n}% SKILLS FIRE TWICE`,
  refund: (n) => `${n}% SKILLS FREE`,
  quickCd: (n) => `${n}% FAST COOLDOWNS`,
  startAp: (n) => `+${n} AP ON TURN 1`,
  focusStart: (n) => `FIRST ${n} HITS CRIT`,
  evadeStart: (n) => `DODGE FIRST ${n} HITS`,
  markStart: (n) => `FOES START MARKED ${n}`,
  blockKeep: (n) => `KEEP ${n}% BLOCK`,
  spikeBlock: (n) => `BLOCK BOUNCES ${n}%`,
  overBlock: (n) => `OVERHEAL: ${n}% BLOCK`,
  dodgeHeal: (n) => `DODGE: HEAL ${n}`,
  killBlock: (n) => `KILL: +${n} BLOCK`,
  killFocus: (n) => `KILL: ${n} SURE CRIT`,
  poisonSpread: (n) => `DEATHS SPREAD ${n}% POISON`,
  cheatDeath: () => 'CHEAT DEATH',
  trip: (n) => `${n}% FOES TRIP`,
  chaos: () => 'CHAOS EVERY TURN',
  fightHeal: (n) => `HEAL ${n}% AFTER FIGHTS`,
  turnHurt: (n) => `-${n} HP A TURN`,
  selfPoison: (n) => `START POISONED ${n}`,
  foeHp: (n) => `FOES +${n}% HP`,
  foeDmg: (n) => `FOES +${n}% DMG`,
  cdPlus: (n) => `COOLDOWNS +${n}`,
  fightTax: (n) => `-${n}% SHINIES A FIGHT`,
  fightHurt: (n) => `-${n}% HP A FIGHT`,
};

export function describeEff(e: Eff): string {
  return Object.entries(e)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => PHRASE[k as EffKey](v!))
    .join(', ');
}

// ---------------------------------------------------------------- looks

const BASE: Record<string, ItemDef> = {};
for (const it of [...ITEMS_HEAD, ...ITEMS_FACE, ...ITEMS_BODY, ...ITEMS_BACK, ...ITEMS_PAW, ...ITEMS_TAIL, ...ITEMS_AURA]) BASE[it.id] = it;

// ---------------------------------------------------------------- inks

// An item's main ink follows what it does (burn is fire, gold is gold); a set's pieces
// all wear the set's ink.
const INK_OF: [string, string[]][] = [
  ['void', ['chaos', 'cheatDeath', 'turnHurt', 'foeHp', 'foeDmg', 'hpMul']],
  ['fire', ['burnHit', 'rage', 'ambush', 'firstStrike', 'killBurst']],
  ['ice', ['chillHit', 'blockKeep', 'trip']],
  ['poison', ['poisonHit', 'stink', 'poisonSpread', 'selfPoison', 'statusAmp']],
  ['blood', ['bleedHit', 'lifesteal', 'execute', 'critHeal']],
  ['gold', ['goldHit', 'richDmg', 'interest', 'moneyArmor', 'shinyMult', 'discount', 'fightTax']],
  ['storm', ['stunChance', 'chain', 'laser', 'stunDmg', 'quickCd', 'echo', 'refund']],
  ['shadow', ['evadeStart', 'dodge', 'dodgeStrike', 'dodgeHeal', 'soloDmg', 'duel']],
  ['holy', ['regen', 'fightHeal', 'healMul', 'killHeal', 'overBlock']],
  ['neon', ['critMult', 'crit', 'firstCrit', 'focusStart', 'killFocus', 'markStart']],
  ['steel', ['armor', 'startBlock', 'hurtBlock', 'blockDmg', 'killBlock', 'critBlock']],
  ['rust', ['thorns', 'spikeBlock', 'splash', 'boomerang', 'flies']],
  ['sea', ['xp', 'ap', 'startAp', 'killAp', 'multiHit', 'agi']],
  ['rose', ['lck', 'bossDmg', 'debuffDmg', 'slowBurn']],
  ['nature', ['vit', 'hp', 'hpDmg', 'crowd', 'aoeDmg']],
  ['earth', ['str', 'def', 'dmg']],
];
const INK_NAMES = INK_OF.map(([n]) => n);

function inkFor(good: Eff, bad?: Eff): string {
  const keys = [...Object.keys(bad ?? {}), ...Object.keys(good)];
  for (const k of keys) for (const [n, ks] of INK_OF) if (ks.includes(k)) return n;
  return 'earth';
}

// A forged item's accent ink: the ink of its next effect, else one that sets off the main.
const FOIL: Record<string, string> = {
  fire: 'gold', ice: 'holy', poison: 'void', blood: 'shadow', gold: 'blood', shadow: 'neon', holy: 'gold', earth: 'rust',
  storm: 'gold', nature: 'earth', neon: 'void', void: 'neon', steel: 'blood', rose: 'holy', sea: 'steel', rust: 'steel',
};
function accentFor(main: string, good: Eff, bad?: Eff): string {
  for (const k of [...Object.keys(good), ...Object.keys(bad ?? {})]) for (const [n, ks] of INK_OF) if (n !== main && ks.includes(k)) return n;
  return FOIL[main];
}

// Every forged item is drawn as one of its slot's shapes (sprites/), picked to fit its
// name, in a main and an accent ink. Two items never look the same, compared as drawn.
const drawn = new Set<string>(Object.values(BASE).map((b) => JSON.stringify(b.gear?.map((g) => g.rows) ?? b.icon)));
const worn = new Map<string, number>(); // slot/shape -> items drawn with it

function render(sh: Shape, main: string, accent: string): { gear?: Gear[]; icon?: string[] } {
  const m = INKS[main];
  const a = INKS[accent];
  if (sh.icon) return { icon: paint(sh.icon, m, a) };
  return { gear: sh.parts.map((g) => ({ ...g, rows: paint(g.rows, m, a), alt: g.alt && paint(g.alt, m, a) })) };
}

// a stable spread for items no word places, so neighbours in a list differ
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function dress(slot: Slot, id: string, name: string, main: string, accent: string): { gear?: Gear[]; icon?: string[] } {
  const lib = SHAPES[slot]!;
  const all = Object.keys(lib);
  const n = (s: string) => worn.get(`${slot}/${s}`) ?? 0;
  const fit = fits(slot, id, name, main).filter((s) => lib[s]);
  const spread = [...all].sort((x, y) => n(x) - n(y) || (hash(id + x) % 997) - (hash(id + y) % 997));
  const rest = spread.filter((s) => !fit.includes(s));
  const mains = [main, ...INK_NAMES.filter((i) => i !== main)];
  const accents = (m: string) => [accent, ...INK_NAMES.filter((i) => i !== accent && i !== m), m];
  // a shape that fits the name in any ink beats one that doesn't in the right ink
  const tries: [string, string][] = [
    ...fit.sort((x, y) => n(x) - n(y)).flatMap((s) => mains.map((m): [string, string] => [s, m])),
    ...mains.flatMap((m) => rest.map((s): [string, string] => [s, m])),
  ];
  for (const [s, mainInk] of tries)
    for (const acc of accents(mainInk)) {
      const out = render(lib[s], mainInk, acc);
      const key = JSON.stringify(out.gear?.map((g) => g.rows) ?? out.icon);
      if (drawn.has(key)) continue;
      drawn.add(key);
      worn.set(`${slot}/${s}`, n(s) + 1);
      LOOKS.set(id, `${s}/${mainInk}/${acc}`);
      return out;
    }
  throw new Error(`no looks left for ${slot}`);
}

// shape/main/accent of every forged item, for tools and previews
export const LOOKS = new Map<string, string>();

// ---------------------------------------------------------------- items

export interface Line {
  id: string;
  name: string;
  rarity: Rarity;
  tags: string; // 'crit trash'
  look?: string; // a main ink, or nothing to follow the effects
  good: Eff;
  bad?: Eff;
}

// The upside and the catch of every forged item, kept apart for tools/content-check.ts.
export const PARTS = new Map<string, { good: Eff; bad?: Eff }>();

export function makeItem(slot: Slot, l: Line, set?: string): ItemDef {
  PARTS.set(l.id, { good: l.good, bad: l.bad });
  const good = l.good;
  const bad = l.bad;
  const main = l.look || inkFor(good, bad);
  const art = dress(slot, l.id, l.name, main, accentFor(main, good, bad));
  const desc = [describeEff(good), bad ? describeEff(bad) : ''].filter(Boolean).join(', ');
  return {
    id: l.id,
    name: l.name,
    rarity: l.rarity,
    slot,
    tags: (l.tags ? l.tags.split(' ') : []) as Tag[],
    desc,
    gear: art.gear,
    icon: art.icon,
    needsBoss: l.rarity === 4 || undefined,
    set,
    risky: !!bad,
    bonus: (b, lvl) => {
      applyBonus(b, good, lvl);
      if (bad) applyBonus(b, bad, null);
    },
    fx: (lvl) => {
      const f = fxOf(good, lvl);
      if (bad) for (const [k, v] of Object.entries(fxOf(bad, null))) f[k as FxKey] = (f[k as FxKey] ?? 0) + v!;
      return f;
    },
  };
}

// it('id', 'NAME', rarity, 'tags', { good }, { bad }?, 'look'?)
export function forge(slot: Slot) {
  return (id: string, name: string, rarity: Rarity, tags: string, good: Eff, bad?: Eff, lk?: string) => makeItem(slot, { id, name, rarity, tags, look: lk, good, bad });
}

// ---------------------------------------------------------------- sets

// [slot, id, name, rarity, tags, { good }, { bad }?]; every piece wears the set's ink.
export type Piece = [Slot, string, string, Rarity, string, Eff, Eff?];
export interface SetStep {
  n: number;
  good: Eff;
  bad?: Eff;
}

export function makeSet(id: string, name: string, color: number, inkName: string, pieces: Piece[], steps: SetStep[]): { set: SetDef; items: ItemDef[] } {
  const items = pieces.map(([slot, pid, pname, rarity, tags, good, bad]) => makeItem(slot, { id: pid, name: pname, rarity, tags, look: inkName, good, bad }, id));
  const risky = steps.some((s) => s.bad) || items.some((i) => i.risky);
  const set: SetDef = {
    id,
    name,
    color,
    risky,
    pieces: items.map((i) => i.id),
    bonuses: steps.map((s) => {
      const fx = fxOf(s.good, null);
      if (s.bad) for (const [k, v] of Object.entries(fxOf(s.bad, null))) fx[k as FxKey] = (fx[k as FxKey] ?? 0) + v!;
      return {
        n: s.n,
        desc: [describeEff(s.good), s.bad ? describeEff(s.bad) : ''].filter(Boolean).join(', '),
        bonus: (b: Bonus) => {
          applyBonus(b, s.good, null);
          if (s.bad) applyBonus(b, s.bad, null);
        },
        fx,
      };
    }),
  };
  return { set, items };
}
