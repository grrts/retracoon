// The run's ledger: an opening balance (the raccoon the run started with), one short
// entry for everything that changes the score along the way, and a closing balance.
// The server adds the entries up and checks they land on the score that was sent
// (server/src/Service/RunAudit.php). Levels aren't entries: the server works them out
// from the XP, the same way gainXp does.
//
// Entries, as short arrays to keep a long run small:
//   ['f', t0, t1, won, turns, meters]   a fight: start and end (ms into the run), 1 or 0,
//                                       turns taken, whole meters walked since the last entry
//   ['x', n]                            XP gained
//   ['p', n]                            stat points from a road stop (TRAIN)
//   ['s', n]                            stats changed by an event (sum over all stats)
//   ['d', meters]                       meters walked after the last fight
import type { Combat } from './combat';
import { STAT_KEYS, type RunState } from './run';

export const LEDGER_VERSION = 2;
const MAX_ENTRIES = 2000;

type Raccoon = { l: number; st: number[]; p: number };
export type Entry = ['f', number, number, 0 | 1, number, number] | ['x' | 'p' | 's' | 'd', number];

export interface Ledger {
  v: number;
  ver: string; // game version
  mode: RunState['mode'];
  day: string | null;
  open: Raccoon;
  e: Entry[];
  close?: Raccoon;
}

// Ledgers live beside the run, so the rules in run.ts can write to them without the
// run's state knowing. Runs without one (the balance sim) write nothing.
const books = new WeakMap<RunState, { book: Ledger; fightAt: number; meters: number }>();

const raccoon = (r: RunState): Raccoon => ({ l: r.level, st: STAT_KEYS.map((k) => r.stats[k]), p: r.statPoints });
const now = (r: RunState) => Date.now() - r.startedAt;

export function openLedger(r: RunState, ver: string): Ledger {
  const book: Ledger = { v: LEDGER_VERSION, ver, mode: r.mode, day: r.day, open: raccoon(r), e: [] };
  books.set(r, { book, fightAt: 0, meters: Math.floor(r.distance) });
  return book;
}

export function note(r: RunState, entry: Entry) {
  const b = books.get(r);
  if (b && b.book.e.length < MAX_ENTRIES && (entry[0] === 'f' || entry[1] !== 0)) b.book.e.push(entry);
}

// Whole meters walked since the last entry that counted them. Flooring the running
// total (not each step) means the entries add up to exactly the distance sent.
function walked(r: RunState) {
  const b = books.get(r);
  if (!b) return 0;
  const m = Math.floor(r.distance);
  const d = m - b.meters;
  b.meters = m;
  return d;
}

export function fightStarts(r: RunState) {
  const b = books.get(r);
  if (b) b.fightAt = now(r);
}

export function fightEnds(r: RunState, c: Combat, won: boolean) {
  const b = books.get(r);
  if (b) note(r, ['f', b.fightAt, now(r), won ? 1 : 0, c.turn, walked(r)]);
}

export function closeLedger(r: RunState): Ledger | undefined {
  const b = books.get(r);
  if (!b) return undefined;
  note(r, ['d', walked(r)]);
  b.book.close = raccoon(r);
  return b.book;
}
