import type { BiomeDef, EncounterDef, EnemyDef, EventDef, ItemDef, PackDef, SkillDef } from './types';

export const packs: PackDef[] = [];
export const items = new Map<string, ItemDef>();
export const skills = new Map<string, SkillDef>();
export const enemies = new Map<string, EnemyDef>();
export const events: EventDef[] = [];
export const biomes: BiomeDef[] = [];
export const sharedEncounters: EncounterDef[] = [];

export function registerPack(p: PackDef) {
  packs.push(p);
  p.items?.forEach((i) => items.set(i.id, { ...i, pack: p.id }));
  p.skills?.forEach((s) => skills.set(s.id, { ...s, pack: p.id }));
  p.enemies?.forEach((e) => enemies.set(e.id, e));
  p.events?.forEach((e) => events.push(e));
  p.encounters?.forEach((e) => sharedEncounters.push(e));
  if (p.biome) biomes.push(p.biome);
}

export const RARITY = [
  { name: 'COMMON', color: 0x94b0c2, price: 14, weight: 60 },
  { name: 'UNCOMMON', color: 0x38b764, price: 24, weight: 28 },
  { name: 'RARE', color: 0x41a6f6, price: 38, weight: 12 },
  { name: 'EPIC', color: 0xb05ccf, price: 58, weight: 5 },
  { name: 'LEGENDARY', color: 0xffa300, price: 90, weight: 1.6 },
];

export const TAGS: Record<string, { name: string; color: number; two: string; four: string }> = {
  speed: { name: 'SPEED', color: 0x73eff7, two: '+3 AGILITY', four: 'DODGING A HIT STRIKES BACK' },
  tank: { name: 'TANK', color: 0x94b0c2, two: '+2 DEFENSE', four: '5 BLOCK EVERY TURN' },
  scav: { name: 'SCAVENGER', color: 0xffcd75, two: '+25% SHINIES', four: 'SHOPS 30% CHEAPER' },
  crit: { name: 'CRIT', color: 0xef7d57, two: '+3 LUCK', four: 'CRITS FINISH FOES UNDER 30% HP' },
  trash: { name: 'TRASH', color: 0xa7f070, two: '+2 STRENGTH', four: 'KILLS BURST FOR 6 TO ALL FOES' },
};

export const SLOT_NAMES: Record<string, string> = {
  head: 'HEAD',
  face: 'FACE',
  body: 'BODY',
  back: 'BACK',
  paw: 'PAW',
  tail: 'TAIL',
  aura: 'AURA',
};

export const STAT_INFO = {
  str: { name: 'STRENGTH', short: 'STR', desc: 'HIT HARDER', color: 0xb13e53 },
  def: { name: 'DEFENSE', short: 'DEF', desc: 'TAKE LESS DAMAGE, BETTER BLOCKS', color: 0x94b0c2 },
  agi: { name: 'AGILITY', short: 'AGI', desc: 'DODGE HITS, +1 AP AT 10', color: 0x73eff7 },
  lck: { name: 'LUCK', short: 'LCK', desc: 'MORE CRITS AND SHINIES', color: 0xffcd75 },
  vit: { name: 'VITALITY', short: 'VIT', desc: '+5 MAX HEALTH', color: 0x38b764 },
} as const;
