// The run's logbook: the raccoon it started with, then one line per fight with the
// raccoon going in and what came out. It goes to the server with the result, which
// checks the score adds up (server/src/Service/RunAudit.php). Keys are short because
// a long run has a few hundred lines and waits in local storage while offline.
import type { Combat } from './combat';
import { STAT_KEYS, maxHp, type RunState } from './run';

export const LOG_VERSION = 1;
const MAX_FIGHTS = 500;

export interface LogFight {
  s: number; // fights cleared before this one (RunState.stage)
  a: number; // areas cleared
  th: string; // theme id
  k: 'f' | 'e' | 'b'; // fight, elite, boss
  f: string[]; // foe ids
  tr: number[]; // foe tiers
  // the raccoon going in
  l: number;
  st: number[]; // stats in STAT_KEYS order
  p: number; // unspent stat points
  h: number;
  m: number; // max HP
  sh: number; // shinies
  d: number; // distance, whole meters
  t: number; // ms since the run started
  // what came out
  w?: 0 | 1;
  n?: number; // turns
  u?: number; // skills used
  x?: number; // XP gained
  h2?: number; // HP after
  t2?: number;
}

export interface Logbook {
  v: number;
  ver: string; // game version
  mode: RunState['mode'];
  day: string | null;
  seed: number | null;
  start: { l: number; st: number[]; p: number };
  fights: LogFight[];
}

const stats = (r: RunState) => STAT_KEYS.map((k) => r.stats[k]);

export function startLog(r: RunState, ver: string): Logbook {
  return { v: LOG_VERSION, ver, mode: r.mode, day: r.day, seed: r.seed, start: { l: r.level, st: stats(r), p: r.statPoints }, fights: [] };
}

export function logFightStart(log: Logbook, r: RunState, kind: LogFight['k'], foes: string[], tiers: number[]) {
  if (log.fights.length >= MAX_FIGHTS) return;
  log.fights.push({
    s: r.stage,
    a: r.area,
    th: r.theme,
    k: kind,
    f: foes,
    tr: foes.map((_, i) => tiers[i] ?? 0),
    l: r.level,
    st: stats(r),
    p: r.statPoints,
    h: r.hp,
    m: maxHp(r),
    sh: r.shinies,
    d: Math.floor(r.distance),
    t: Date.now() - r.startedAt,
  });
}

export function logFightEnd(log: Logbook, r: RunState, c: Combat, won: boolean, xp: number) {
  const f = log.fights[log.fights.length - 1];
  if (!f || f.w !== undefined || f.s !== c.stage) return;
  f.w = won ? 1 : 0;
  f.n = c.turn;
  f.u = c.uses.reduce((a, b) => a + b, 0);
  f.x = xp;
  f.h2 = c.hp;
  f.t2 = Date.now() - r.startedAt;
}
