// The item forge: one line per item. An item names its slot, rarity, tags, a look (an
// existing piece of gear repainted in one of the ink themes, so every item is drawn on
// the raccoon) and its effects. The card text is written from the effects.
//
// Item levels (picking up a duplicate): stats grow x1/x2/x3, percentages and most item
// effects x1/x1.5/x2, and on/off effects (cheat death, chaos, +AP) don't grow.
// Drawbacks never grow, so levelling up a risky item is how you outgrow its catch.
import type { Bonus, FxKey, Fx, Gear, ItemDef, Rarity, SetDef, Slot, Tag } from '../types';
import { ink } from '../skills/icons';
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

// 'baseball_cap/fire': that item's gear (or aura icon), repainted.
export function look(spec: string, slot: Slot): { gear?: Gear[]; icon?: string[] } {
  const [id, theme] = spec.split('/');
  const b = BASE[id];
  if (!b) throw new Error(`no base look ${id}`);
  if (b.slot !== slot) throw new Error(`look ${id} is a ${b.slot} item, not ${slot}`);
  return {
    gear: b.gear?.map((g) => ({ ...g, rows: ink(g.rows, theme), alt: g.alt && ink(g.alt, theme) })),
    icon: b.icon && ink(b.icon, theme),
  };
}

// ---------------------------------------------------------------- inks

// Every item wears a unique look: one of its slot's base pieces in one ink. Unless a
// line names its look, the ink follows what the item does (burn is fire, gold is gold)
// and the base is the next one of that slot not yet worn in that ink.
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

// Two inks can paint a simple piece identically, so looks are compared as drawn.
const used = new Set<string>();
const drawn = new Set<string>(Object.values(BASE).map((b) => JSON.stringify(b.gear?.map((g) => g.rows) ?? b.icon)));
const art = (spec: string, slot: Slot) => {
  const a = look(spec, slot);
  return JSON.stringify(a.gear?.map((g) => g.rows) ?? a.icon);
};

function take(spec: string, slot: Slot) {
  const a = art(spec, slot);
  if (used.has(spec) || drawn.has(a)) return false;
  used.add(spec);
  drawn.add(a);
  return true;
}

function claim(slot: Slot, want: string): string {
  const bases = Object.values(BASE).filter((b) => b.slot === slot).map((b) => b.id);
  const order = [want, ...INK_NAMES.filter((n) => n !== want)];
  for (const n of order) for (const b of bases) if (take(`${b}/${n}`, slot)) return `${b}/${n}`;
  throw new Error(`no looks left for ${slot}`);
}

function pick(slot: Slot, spec: string | undefined, good: Eff, bad?: Eff) {
  if (spec && spec.includes('/')) {
    if (!take(spec, slot)) throw new Error(`look ${spec} is taken`);
    return spec;
  }
  return claim(slot, spec || inkFor(good, bad));
}

// ---------------------------------------------------------------- items

export interface Line {
  id: string;
  name: string;
  rarity: Rarity;
  tags: string; // 'crit trash'
  look?: string; // 'base/ink', just 'ink', or nothing
  good: Eff;
  bad?: Eff;
}

// The upside and the catch of every forged item, kept apart for tools/content-check.ts.
export const PARTS = new Map<string, { good: Eff; bad?: Eff }>();

export function makeItem(slot: Slot, l: Line, set?: string): ItemDef {
  PARTS.set(l.id, { good: l.good, bad: l.bad });
  const good = l.good;
  const bad = l.bad;
  const art = look(pick(slot, l.look, good, bad), slot);
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
