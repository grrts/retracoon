import type { EnemyDef, EventDef, ItemDef, SkillDef } from './types';
import type { SeasonDef, ThemeDef } from '../world/types';
import type { SkinDef } from '../meta/types';

// Everything the game knows about, filled once at boot by content/index.ts.
export const items = new Map<string, ItemDef>();
export const skills = new Map<string, SkillDef>();
export const enemies = new Map<string, EnemyDef>();
export const families = new Map<string, string[]>();
export const events: EventDef[] = [];
export const themes = new Map<string, ThemeDef>();
export const seasons: SeasonDef[] = [];
export const skins = new Map<string, SkinDef>();

export function themesByTier(tier: number): ThemeDef[] {
  return [...themes.values()].filter((t) => t.tier === tier);
}

export const RARITY = [
  { name: 'COMMON', color: 0x94b0c2, price: 14, weight: 60 },
  { name: 'UNCOMMON', color: 0x38b764, price: 24, weight: 28 },
  { name: 'RARE', color: 0x41a6f6, price: 38, weight: 12 },
  { name: 'EPIC', color: 0xb05ccf, price: 58, weight: 5 },
  { name: 'LEGENDARY', color: 0xffa300, price: 90, weight: 1.6 },
];

export const TAGS: Record<string, { name: string; color: number; two: string; four: string }> = {
  speed: { name: 'SPEED', color: 0x73eff7, two: '+3 AGILITY', four: 'DODGES STRIKE BACK' },
  tank: { name: 'TANK', color: 0x94b0c2, two: '+2 DEFENSE', four: '5 BLOCK EVERY TURN' },
  scav: { name: 'SCAVENGER', color: 0xffcd75, two: '+25% SHINIES', four: 'SHOPS 30% CHEAPER' },
  crit: { name: 'CRIT', color: 0xef7d57, two: '+3 LUCK', four: 'CRITS FINISH WEAK FOES' },
  trash: { name: 'TRASH', color: 0xa7f070, two: '+2 STRENGTH', four: 'KILLS BURST FOR 6' },
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
  str: { name: 'STRENGTH', short: 'STR', desc: 'HIT HARDER', color: 0xef7d57 },
  def: { name: 'DEFENSE', short: 'DEF', desc: 'TAKE LESS DAMAGE', color: 0x94b0c2 },
  agi: { name: 'AGILITY', short: 'AGI', desc: 'DODGE, AIM, +AP AT 10', color: 0x73eff7 },
  lck: { name: 'LUCK', short: 'LCK', desc: 'CRITS PIERCE ARMOR', color: 0xffcd75 },
  vit: { name: 'VITALITY', short: 'VIT', desc: 'MORE MAX HEALTH', color: 0x38b764 },
} as const;
