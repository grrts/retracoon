// Everything about the current run. Pure data and rules, no rendering.
import type { BlessingId, Bonus, Fx, FxKey, ItemDef, SkillDef, Slot, StatKey, Tag } from '../content/types';
import { items, skills, RARITY, themesByTier, themes } from '../content/registry';
import { store } from '../save';
import { passives, type PassiveDef } from '../content/passives';

export interface OwnedItem {
  id: string;
  lvl: number;
}
export interface OwnedSkill {
  id: string;
  lvl: number;
}
export interface Blessing {
  id: BlessingId;
  fights: number;
}

export const SKILL_SLOTS = 4;
export const STAT_KEYS: StatKey[] = ['str', 'def', 'agi', 'lck', 'vit'];
export const BOSS_MIN = 4;
export const BOSS_MAX = 10;

export interface RunState {
  level: number;
  xp: number;
  statPoints: number;
  stats: Record<StatKey, number>;
  hp: number;
  skills: OwnedSkill[]; // index 0 is always CLAW
  passives: Record<string, number>; // passive id -> stacks, no limit
  gear: Partial<Record<Slot, OwnedItem>>;
  shinies: number;
  distance: number;
  stage: number; // fights cleared this run (the main difficulty clock)
  areaStage: number; // fights cleared in the current area
  bossAt: number; // secret: the area's boss is fight number bossAt (2..20)
  area: number; // areas cleared
  theme: string; // current theme id
  themesVisited: string[];
  sinceStop: number; // fights since the last road stop
  heat: number; // permanent extra danger (retreat penalty, shortcuts, curses)
  eliteNext: boolean;
  pendingLevelUps: number;
  blessings: Blessing[];
  // stats for the end screen
  kills: number;
  fights: number;
  elites: number;
  bosses: number;
  shiniesEarned: number;
  itemsFound: number;
  bonusCaps: number;
  bestCombo: number;
  startedAt: number;
}

export function rollBossAt() {
  return BOSS_MIN + Math.floor(Math.random() * (BOSS_MAX - BOSS_MIN + 1));
}

// The core loop: retreat in time and the same raccoon (level and stats) starts a fresh
// run from the street, so it can push further next time. Skills and items are lost.
// Dying wipes the bank and you start over at level 1.
export function newRun(): RunState {
  const kept = store.kept;
  const r: RunState = {
    level: kept?.level ?? 1,
    xp: 0,
    statPoints: kept?.statPoints ?? 0,
    stats: kept ? { ...kept.stats } : { str: 3, def: 2, agi: 2, lck: 2, vit: 3 },
    hp: 0,
    skills: [
      { id: 'claw', lvl: 1 },
      { id: 'guard', lvl: 1 },
    ],
    passives: {},
    gear: {},
    shinies: 0,
    distance: 0,
    stage: 0,
    areaStage: 0,
    bossAt: rollBossAt(),
    area: 0,
    theme: 'street',
    themesVisited: ['street'],
    sinceStop: 0,
    heat: 0,
    eliteNext: false,
    pendingLevelUps: 0,
    blessings: [],
    kills: 0,
    fights: 0,
    elites: 0,
    bosses: 0,
    shiniesEarned: 0,
    itemsFound: 0,
    bonusCaps: 0,
    bestCombo: 0,
    startedAt: Date.now(),
  };
  r.hp = maxHp(r);
  return r;
}

// Meters walked between two fights, roughly. Distance and fights cleared count equally.
export const DIST_STEP = 24;

// The difficulty clock: about one point per fight (half fights cleared, half distance),
// plus heat. Enemies grow exponentially with it (see combat.ts), so a fresh raccoon
// that doesn't retreat around the fifth fight dies soon after.
export function danger(r: RunState) {
  return 1 + (r.stage + r.distance / DIST_STEP) / 2 + r.heat;
}

// Theme for the next area: Town, then one area per tier, then anything goes.
export function nextTheme(r: RunState): string {
  const tier = Math.min(5, r.area) as 1 | 2 | 3 | 4 | 5;
  let pool = (r.area <= 5 ? themesByTier(Math.max(1, tier)) : [...themes.values()]).filter((t) => t.id !== 'street');
  const fresh = pool.filter((t) => !r.themesVisited.includes(t.id));
  if (fresh.length) pool = fresh;
  if (!pool.length) return 'street';
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function xpToLevel(level: number) {
  return 10 + (level - 1) * 7;
}

export function emptyBonus(): Bonus {
  return { str: 0, def: 0, agi: 0, lck: 0, vit: 0, ap: 0, critMult: 0, shinyMult: 0, discount: 0, dodge: 0, dmg: 0, hp: 0, crit: 0, armor: 0 };
}

export function equipped(r: RunState): { def: ItemDef; lvl: number }[] {
  return Object.values(r.gear)
    .filter((g): g is OwnedItem => !!g && items.has(g.id))
    .map((g) => ({ def: items.get(g.id)!, lvl: g.lvl }));
}

export function tagCounts(r: RunState) {
  const c: Record<Tag, number> = { speed: 0, tank: 0, scav: 0, crit: 0, trash: 0 };
  for (const { def } of equipped(r)) for (const t of def.tags) c[t]++;
  return c;
}

// Cached per gear and passive change: bonus math runs a lot during combat.
let cacheKey = '';
let cacheVal: { bonus: Bonus; fx: Fx } = { bonus: emptyBonus(), fx: {} };

export function computeBonus(r: RunState): { bonus: Bonus; fx: Fx } {
  const key = JSON.stringify(r.gear) + JSON.stringify(r.passives ?? {});
  if (key === cacheKey) return cacheVal;
  const b = emptyBonus();
  const fx: Fx = {};
  const add = (f: Fx) => {
    for (const [k, v] of Object.entries(f)) fx[k as FxKey] = (fx[k as FxKey] ?? 0) + (v ?? 0);
  };
  for (const { def, lvl } of equipped(r)) {
    def.bonus?.(b, lvl);
    if (def.fx) add(def.fx(lvl));
  }
  for (const [id, n] of Object.entries(r.passives ?? {})) {
    const p = passives.get(id);
    if (!p || n <= 0) continue;
    p.bonus?.(b, n);
    if (p.fx) add(p.fx(n));
  }
  const t = tagCounts(r);
  if (t.speed >= 2) b.agi += 3;
  if (t.speed >= 4) add({ dodgeStrike: 6 });
  if (t.tank >= 2) b.def += 2;
  if (t.tank >= 4) add({ startBlock: 5 });
  if (t.scav >= 2) b.shinyMult += 0.25;
  if (t.scav >= 4) b.discount += 0.3;
  if (t.crit >= 2) b.lck += 3;
  if (t.crit >= 4) add({ execute: 30 });
  if (t.trash >= 2) b.str += 2;
  if (t.trash >= 4) add({ killBurst: 6 });
  cacheKey = key;
  cacheVal = { bonus: b, fx };
  return cacheVal;
}

// Raw stat: trained points plus gear.
export function rawStat(r: RunState, k: StatKey) {
  return Math.max(0, r.stats[k] + computeBonus(r).bonus[k]);
}

// Every point counts in full: no diminishing returns.
export function totalStat(r: RunState, k: StatKey) {
  return rawStat(r, k);
}

// Percentage stats stop here, so there is always a sliver of risk left.
export const HARD_CAP = 0.95;

export function maxHp(r: RunState) {
  return Math.round(18 + totalStat(r, 'vit') * 6 + r.level * 2 + computeBonus(r).bonus.hp);
}

export function apPerTurn(r: RunState) {
  const agi = rawStat(r, 'agi');
  return 3 + computeBonus(r).bonus.ap + (agi >= 10 ? 1 : 0) + (agi >= 22 ? 1 : 0) + (hasBlessing(r, 'swift') ? 1 : 0) - (hasBlessing(r, 'slow') ? 1 : 0);
}

export function critChance(r: RunState) {
  return Math.min(HARD_CAP, 0.05 + totalStat(r, 'lck') * 0.03 + computeBonus(r).bonus.crit + (hasBlessing(r, 'lucky') ? 0.15 : 0));
}

export function dodgeChance(r: RunState) {
  return Math.min(HARD_CAP, totalStat(r, 'agi') * 0.02 + computeBonus(r).bonus.dodge);
}

// Accuracy against evasive foes: agility cancels out part of their dodge.
export function accuracy(r: RunState) {
  return Math.min(HARD_CAP, totalStat(r, 'agi') * 0.025);
}

export function attackPower(r: RunState, scale: StatKey = 'str') {
  return (4 + totalStat(r, scale) * 1.6) * (1 + computeBonus(r).bonus.dmg) * (hasBlessing(r, 'sharp') ? 1.25 : 1);
}

// Defence: a percentage cut, so it never makes you immune.
export function damageTaken(r: RunState) {
  const def = totalStat(r, 'def');
  const cut = 1 - (1 - def * 0.03) * (1 - computeBonus(r).bonus.armor);
  return (1 - Math.min(HARD_CAP, Math.max(0, cut))) * (hasBlessing(r, 'fragile') ? 1.25 : 1);
}

export function shinyMult(r: RunState) {
  return 1 + computeBonus(r).bonus.shinyMult + totalStat(r, 'lck') * 0.04;
}

export function discount(r: RunState) {
  return Math.min(0.6, computeBonus(r).bonus.discount);
}

export function hasBlessing(r: RunState, id: BlessingId) {
  return r.blessings.some((b) => b.id === id && b.fights > 0);
}

export function addBlessing(r: RunState, id: BlessingId, fights: number) {
  const b = r.blessings.find((x) => x.id === id);
  if (b) b.fights += fights;
  else r.blessings.push({ id, fights });
}

export function tickBlessings(r: RunState) {
  r.blessings.forEach((b) => b.fights--);
  r.blessings = r.blessings.filter((b) => b.fights > 0);
}

export const BLESSING_INFO: Record<BlessingId, { name: string; desc: string; good: boolean; color: number }> = {
  shield: { name: 'SHIELDED', desc: 'START FIGHTS WITH BLOCK', good: true, color: 0x41a6f6 },
  sharp: { name: 'SHARP', desc: '+25% DAMAGE', good: true, color: 0xef7d57 },
  lucky: { name: 'LUCKY', desc: '+15% CRIT CHANCE', good: true, color: 0xffcd75 },
  friend: { name: 'CRITTER PAL', desc: 'A FRIEND BITES A FOE EACH TURN', good: true, color: 0xa7f070 },
  swift: { name: 'SWIFT', desc: '+1 AP EVERY TURN', good: true, color: 0x73eff7 },
  slow: { name: 'SLUGGISH', desc: '-1 AP EVERY TURN', good: false, color: 0x566c86 },
  fragile: { name: 'FRAGILE', desc: 'TAKE 25% MORE DAMAGE', good: false, color: 0xb13e53 },
  hexed: { name: 'HEXED', desc: 'FOES START WITH BLOCK', good: false, color: 0xb05ccf },
};

// ---------------------------------------------------------------- meta payout

// Bottle Caps earned for a run: distance, depth, and the big fights.
export function capsForRun(r: RunState) {
  return Math.floor(r.distance / 12) + r.stage * 3 + r.elites * 5 + r.bosses * 25 + r.bonusCaps;
}

// ---------------------------------------------------------------- loot

export function rollRarity(r: RunState, min = 0, max = 4): number {
  const d = danger(r);
  const weights = RARITY.map((x, i) => {
    if (i < min || i > max) return 0;
    if (i === 4 && store.bossKills === 0) return 0;
    // Rarer items get more common the further you go.
    return x.weight * (1 + d * 0.15 * i);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.max(min, Math.min(max, 3));
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return min;
}

export function itemPool(r: RunState, rarity: number): ItemDef[] {
  return [...items.values()].filter((it) => it.rarity === rarity && (!it.needsBoss || store.bossKills > 0) && !(r.gear[it.slot]?.id === it.id && r.gear[it.slot]!.lvl >= 3));
}

export function randomItem(r: RunState, min = 0, max = 4, exclude: string[] = []): ItemDef | null {
  for (let tries = 0; tries < 12; tries++) {
    const rar = rollRarity(r, min, max);
    const pool = itemPool(r, rar).filter((i) => !exclude.includes(i.id));
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  const any = [...items.values()].filter((i) => !exclude.includes(i.id) && i.rarity >= min && i.rarity <= max);
  return any.length ? any[Math.floor(Math.random() * any.length)] : null;
}

// Equip an item: duplicates level up, otherwise it replaces whatever is in the slot.
export function equip(r: RunState, def: ItemDef): 'new' | 'level' | 'replace' {
  const cur = r.gear[def.slot];
  const before = maxHp(r);
  let res: 'new' | 'level' | 'replace';
  if (cur && cur.id === def.id) {
    cur.lvl = Math.min(3, cur.lvl + 1);
    res = 'level';
  } else {
    res = cur ? 'replace' : 'new';
    r.gear[def.slot] = { id: def.id, lvl: 1 };
  }
  r.itemsFound++;
  if (!store.seen.includes(def.id)) store.seen.push(def.id);
  const after = maxHp(r);
  if (after > before) r.hp += after - before;
  r.hp = Math.min(r.hp, after);
  return res;
}

export function itemPrice(r: RunState, def: ItemDef) {
  const base = RARITY[def.rarity].price * (1 + r.stage * 0.04);
  return Math.max(1, Math.round(base * (1 - discount(r))));
}

// ---------------------------------------------------------------- skills

// Skills on offer: upgrades for what you own, and new skills only while a slot is free.
// A full bar never gets new skills, so picking (and skipping) matters.
export function skillChoices(r: RunState, n = 3) {
  const owned = new Map(r.skills.map((s) => [s.id, s]));
  const room = r.skills.length < SKILL_SLOTS;
  const pool = [...skills.values()].filter((s) => {
    const o = owned.get(s.id);
    if (o) return o.lvl < s.max;
    return room && s.id !== 'claw';
  });
  const out = [];
  const copy = [...pool];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

export type LevelChoice = { kind: 'skill'; def: SkillDef } | { kind: 'passive'; def: PassiveDef };

// Level-up cards: skills first, passives fill the rest. Once every slot is full and
// maxed, every card is a passive.
export function levelUpChoices(r: RunState, n = 3): LevelChoice[] {
  const out: LevelChoice[] = skillChoices(r, n).map((def) => ({ kind: 'skill', def }));
  const pool = [...passives.values()];
  while (out.length < n && pool.length) out.push({ kind: 'passive', def: pool.splice(Math.floor(Math.random() * pool.length), 1)[0] });
  return out;
}

export function addPassive(r: RunState, id: string) {
  const before = maxHp(r);
  r.passives[id] = (r.passives[id] ?? 0) + 1;
  const after = maxHp(r);
  if (after > before) r.hp += after - before;
}

export function learnSkill(r: RunState, id: string) {
  const o = r.skills.find((s) => s.id === id);
  if (o) {
    o.lvl = Math.min(skills.get(id)?.max ?? 3, o.lvl + 1);
    return;
  }
  if (r.skills.length < SKILL_SLOTS) r.skills.push({ id, lvl: 1 });
}

export function gainXp(r: RunState, n: number): number {
  r.xp += n;
  let ups = 0;
  while (r.xp >= xpToLevel(r.level)) {
    r.xp -= xpToLevel(r.level);
    r.level++;
    r.statPoints += 3;
    ups++;
  }
  return ups;
}
