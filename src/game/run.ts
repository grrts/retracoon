// Everything about the current run. Pure data and rules, no rendering.
import type { BlessingId, Bonus, Fx, FxKey, ItemDef, Slot, StatKey, Tag } from '../content/types';
import { items, skills, RARITY, themesByTier, themes } from '../content/registry';
import { store } from '../save';

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
export const BOSS_MIN = 2;
export const BOSS_MAX = 20;

export interface RunState {
  level: number;
  xp: number;
  statPoints: number;
  stats: Record<StatKey, number>;
  hp: number;
  skills: OwnedSkill[]; // index 0 is always CLAW
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

// The difficulty clock: one point per fight cleared, plus heat.
export function danger(r: RunState) {
  return 1 + r.stage + r.heat + (r.distance / 10);
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
  return { str: 0, def: 0, agi: 0, lck: 0, vit: 0, ap: 0, critMult: 0, shinyMult: 0, discount: 0, dodge: 0 };
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

// Cached per gear change: bonus math runs a lot during combat.
let cacheKey = '';
let cacheVal: { bonus: Bonus; fx: Fx } = { bonus: emptyBonus(), fx: {} };

export function computeBonus(r: RunState): { bonus: Bonus; fx: Fx } {
  const key = JSON.stringify(r.gear);
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

// Effective stat with diminishing returns: full value up to 10, half up to 20,
// a quarter after that. Pouring everything into one stat stops paying off.
export function effective(n: number) {
  if (n <= 10) return n;
  if (n <= 20) return 10 + (n - 10) * 0.5;
  return 15 + (n - 20) * 0.25;
}

export function totalStat(r: RunState, k: StatKey) {
  return effective(rawStat(r, k));
}

export function maxHp(r: RunState) {
  return Math.round(18 + totalStat(r, 'vit') * 6 + r.level * 2);
}

export function apPerTurn(r: RunState) {
  const agi = rawStat(r, 'agi');
  return 3 + computeBonus(r).bonus.ap + (agi >= 10 ? 1 : 0) + (agi >= 22 ? 1 : 0) + (hasBlessing(r, 'swift') ? 1 : 0) - (hasBlessing(r, 'slow') ? 1 : 0);
}

export function critChance(r: RunState) {
  return Math.min(0.75, 0.05 + totalStat(r, 'lck') * 0.03 + (hasBlessing(r, 'lucky') ? 0.15 : 0));
}

export function dodgeChance(r: RunState) {
  return Math.min(0.45, totalStat(r, 'agi') * 0.02 + computeBonus(r).bonus.dodge);
}

// Accuracy against evasive foes: agility cancels out part of their dodge.
export function accuracy(r: RunState) {
  return Math.min(0.6, totalStat(r, 'agi') * 0.025);
}

export function attackPower(r: RunState, scale: StatKey = 'str') {
  return (4 + totalStat(r, scale) * 1.6) * (hasBlessing(r, 'sharp') ? 1.25 : 1);
}

// Defence: a percentage cut, so it never makes you immune.
export function damageTaken(r: RunState) {
  const def = totalStat(r, 'def');
  return (1 - Math.min(0.6, def * 0.03)) * (hasBlessing(r, 'fragile') ? 1.25 : 1);
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
    return x.weight * (1 + d * 0.06 * i);
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

export function skillChoices(r: RunState, n = 3) {
  const owned = new Map(r.skills.map((s) => [s.id, s]));
  const pool = [...skills.values()].filter((s) => {
    const o = owned.get(s.id);
    if (o) return o.lvl < s.max;
    return s.id !== 'claw';
  });
  const out = [];
  const copy = [...pool];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

export function learnSkill(r: RunState, id: string, replaceIndex?: number) {
  const o = r.skills.find((s) => s.id === id);
  if (o) {
    o.lvl++;
    return;
  }
  if (r.skills.length < SKILL_SLOTS) r.skills.push({ id, lvl: 1 });
  else if (replaceIndex !== undefined && replaceIndex > 0) r.skills[replaceIndex] = { id, lvl: 1 };
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
