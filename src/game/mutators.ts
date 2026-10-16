// The daily run's weekly rule: one twist on the run, the same for everyone, that changes
// every Monday (UTC). It comes from the week of the daily run's day, so every daily run
// of a day (and so every row on that day's board) plays under the same rule.
import type { RunState } from './run';

export type MutatorId = 'twin' | 'nonaps' | 'armored' | 'goldrush' | 'glass' | 'elites' | 'risky' | 'swift' | 'lucky' | 'bossrush' | 'toxic' | 'flea' | 'brawl' | 'pal';

export const MUTATORS: Record<MutatorId, { name: string; desc: string }> = {
  twin: { name: 'TWIN BOSSES', desc: 'EVERY BOSS BRINGS ITS TWIN' },
  nonaps: { name: 'NO NAPS', desc: 'CAMPS CANNOT HEAL' },
  armored: { name: 'ARMORED FOES', desc: 'FOES START FIGHTS WITH BLOCK' },
  goldrush: { name: 'GOLD RUSH', desc: 'DOUBLE SHINIES, 25% LESS HP' },
  glass: { name: 'GLASS CANNON', desc: 'DEAL AND TAKE 50% MORE DAMAGE' },
  elites: { name: 'ELITE WEEK', desc: 'ELITES ARE THREE TIMES AS COMMON' },
  risky: { name: 'RISKY LOOT', desc: 'EVERY ITEM IS RARE AND HAS A CATCH' },
  swift: { name: 'QUICK PAWS', desc: '+1 AP EVERY TURN, FOES HIT 25% HARDER' },
  lucky: { name: 'LUCKY WEEK', desc: '+20% CRIT CHANCE, 20% LESS HP' },
  bossrush: { name: 'BOSS RUSH', desc: 'BOSSES SHOW UP AS EARLY AS THEY CAN' },
  toxic: { name: 'STINKY WEEK', desc: 'EVERYONE STARTS FIGHTS POISONED' },
  flea: { name: 'FLEA MARKET', desc: 'HALF-PRICE SHOPS, CRITTERS DROP NOTHING' },
  brawl: { name: 'BRAWLERS', desc: 'FOES HIT 40% HARDER, 30% LESS HP' },
  pal: { name: 'CRITTER PAL', desc: 'A PAL BITES EACH TURN, FOES +25% HP' },
};

// One after another, so the same rule never comes back two weeks running.
export const MUTATOR_ORDER: MutatorId[] = ['twin', 'goldrush', 'armored', 'risky', 'nonaps', 'glass', 'elites', 'bossrush', 'pal', 'toxic', 'swift', 'flea', 'brawl', 'lucky'];

const DAY_MS = 86400000;
const FIRST_MONDAY = Date.UTC(1970, 0, 5);

// Weeks since the first Monday of 1970, for a UTC day (YYYY-MM-DD).
export function weekNo(day: string) {
  return Math.floor((Date.parse(`${day}T00:00:00Z`) - FIRST_MONDAY) / (7 * DAY_MS));
}

export function weeklyMutator(day: string): MutatorId {
  const n = MUTATOR_ORDER.length;
  return MUTATOR_ORDER[((weekNo(day) % n) + n) % n];
}

export const hasMutator = (r: RunState, id: MutatorId) => r.mutator === id;

// "TWIN BOSSES: EVERY BOSS BRINGS ITS TWIN"
export const mutatorLine = (id: MutatorId) => `${MUTATORS[id].name}: ${MUTATORS[id].desc}`;
