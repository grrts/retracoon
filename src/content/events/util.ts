// Small helpers shared by the event files.
import type { BlessingId, EventOption, RunAPI, StatKey } from '../types';

export const pctHp = (r: RunAPI, f: number) => Math.max(1, Math.round(r.maxHp * f));
export const hurt = (r: RunAPI, f: number) => {
  const n = pctHp(r, f);
  r.hurt(n);
  return n;
};
export const heal = (r: RunAPI, f: number) => {
  const n = pctHp(r, f);
  r.heal(n);
  return n;
};
export const roll = (p: number) => Math.random() < p;
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

// Options that cost health need the raccoon to survive paying it.
export const canHurt = (f: number) => (r: RunAPI) => r.hp > r.maxHp * f;
export const canPay = (n: number) => (r: RunAPI) => r.shinies >= n;
export const hasItem = (r: RunAPI) => r.itemCount > 0;

export const BLESS_NAME: Record<BlessingId, string> = {
  shield: 'SHIELD',
  sharp: 'SHARP CLAWS',
  lucky: 'LUCKY',
  friend: 'CRITTER FRIEND',
  swift: 'SWIFT',
  slow: 'SLOW',
  fragile: 'FRAGILE',
  hexed: 'HEXED',
};
export const STAT_NAME: Record<StatKey, string> = { str: 'STR', def: 'DEF', agi: 'AGI', lck: 'LCK', vit: 'VIT' };

export const bless = (r: RunAPI, id: BlessingId, fights: number) => {
  r.addBlessing(id, fights);
  return `${BLESS_NAME[id]} FOR ${fights} FIGHTS`;
};

// The no-risk way out.
export const leave = (msg: string, label = 'LEAVE'): EventOption => ({ label, detail: 'NOTHING HAPPENS', run: () => msg });
