// Everything about the current run. Pure data and rules, no rendering.
import type { Bonus, Fx, FxKey, ItemDef, Slot, StatKey, Tag } from '../content/types';
import { items, skills, RARITY } from '../content/registry';
import { store } from '../save';

export interface OwnedItem {
  id: string;
  lvl: number;
}
export interface OwnedSkill {
  id: string;
  lvl: number;
}

export const SKILL_SLOTS = 4;
export const STAT_KEYS: StatKey[] = ['str', 'def', 'agi', 'lck', 'vit'];
export const LEG_NODES = ['fight', 'fight', 'fork', 'fight', 'fight', 'fork', 'boss'] as const;
export type NodeKind = (typeof LEG_NODES)[number];

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
  area: number; // how many areas cleared
  node: number; // position in LEG_NODES
  heat: number; // permanent danger added by shortcuts and curses
  eliteNext: boolean;
  pendingLevelUps: number;
  // stats for the end screen
  kills: number;
  fights: number;
  elites: number;
  bosses: number;
  shiniesEarned: number;
  itemsFound: number;
  startedAt: number;
}

// A retreat banks level and stats into the next run; dying wipes them.
export function newRun(): RunState {
  const kept = store.kept;
  const r: RunState = {
    level: kept?.level ?? 1,
    xp: 0,
    statPoints: kept?.statPoints ?? 0,
    stats: kept ? { ...kept.stats } : { str: 3, def: 1, agi: 2, lck: 2, vit: 3 },
    hp: 0,
    skills: [
      { id: 'claw', lvl: 1 },
      { id: 'guard', lvl: 1 },
    ],
    gear: {},
    shinies: 0,
    distance: 0,
    area: 0,
    node: 0,
    heat: 0,
    eliteNext: false,
    pendingLevelUps: 0,
    kills: 0,
    fights: 0,
    elites: 0,
    bosses: 0,
    shiniesEarned: 0,
    itemsFound: 0,
    startedAt: Date.now(),
  };
  r.hp = maxHp(r);
  return r;
}

export function danger(r: RunState) {
  return 1 + r.area * 5 + Math.floor(r.node * 0.7) + r.heat;
}

export function xpToLevel(level: number) {
  return 8 + (level - 1) * 6;
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

export function computeBonus(r: RunState): { bonus: Bonus; fx: Fx } {
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
  return { bonus: b, fx };
}

export function totalStat(r: RunState, k: StatKey) {
  return Math.max(0, r.stats[k] + computeBonus(r).bonus[k]);
}

export function maxHp(r: RunState) {
  return 15 + totalStat(r, 'vit') * 5;
}

export function apPerTurn(r: RunState) {
  return 3 + computeBonus(r).bonus.ap + (totalStat(r, 'agi') >= 10 ? 1 : 0) + (totalStat(r, 'agi') >= 20 ? 1 : 0);
}

export function critChance(r: RunState) {
  return Math.min(0.8, 0.05 + totalStat(r, 'lck') * 0.03);
}

export function dodgeChance(r: RunState) {
  return Math.min(0.45, totalStat(r, 'agi') * 0.02 + computeBonus(r).bonus.dodge);
}

export function attackPower(r: RunState, scale: StatKey = 'str') {
  return 4 + totalStat(r, scale) * 1.5;
}

export function shinyMult(r: RunState) {
  return 1 + computeBonus(r).bonus.shinyMult + totalStat(r, 'lck') * 0.04;
}

export function discount(r: RunState) {
  return Math.min(0.6, computeBonus(r).bonus.discount);
}

// ---------------------------------------------------------------- loot

export function rollRarity(r: RunState, min = 0, max = 4): number {
  const d = danger(r);
  const weights = RARITY.map((x, i) => {
    if (i < min || i > max) return 0;
    if (i === 4 && store.bossKills === 0) return 0;
    // Rarer items get more common the further you go.
    return x.weight * (1 + d * 0.08 * i);
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
  const base = RARITY[def.rarity].price * (1 + r.area * 0.35);
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
