// A run as the server replays it: the ticket's seed and starting raccoon, plus the
// choices the flow logged (see flow.ts). The game sends replayOf(flow) with the score;
// tools/replay.ts runs replay() on the server's side and the run only counts if it
// lands on the same score.
import type { StatKey } from '../content/types';
import { BUILD } from '../platform/build';
import { RunFlow, type Act } from './flow';
import { newRun, STAT_KEYS, type RunMode } from './run';

export const REPLAY_VERSION = 1;
// A long run is a few thousand choices; far past that is not a run the game wrote.
export const MAX_ACTS = 60000;
// Before each stop the raccoon walks for at least 1.2 s; a skill or a turn plays its
// animation before the next one can start. Kept well under what the game takes.
export const MIN_WALK_MS = 1000;
export const MIN_ACT_MS = 100;

export interface Replay {
  v: number;
  build: string;
  leg: 0 | 1; // legendary loot unlocked before the run
  acts: Act[];
}

export interface Raccoon {
  l: number;
  st: number[]; // STAT_KEYS order
  p: number;
}

export interface ReplayStart {
  mode: RunMode;
  day: string | null; // daily runs
  seed: number; // normal runs (a daily run's seed comes from its day)
  kept: Raccoon | null; // normal runs: the banked raccoon it started from
  leg: boolean;
}

export interface ReplayResult {
  ok: boolean;
  reason?: string;
  at?: number; // the choice that failed
  end: 'death' | 'retreat' | null;
  stage: number;
  level: number;
  distance: number;
  ms: number; // the run's length, by its own clock
  close: Raccoon;
}

export function replayOf(flow: RunFlow): Replay {
  return { v: REPLAY_VERSION, build: BUILD, leg: flow.r.legendary ? 1 : 0, acts: flow.acts };
}

const isInt = (v: unknown, min = 0) => typeof v === 'number' && Number.isInteger(v) && v >= min;

function wellFormed(a: unknown): a is Act {
  if (!Array.isArray(a) || a.length < 2 || a.length > 4 || !isInt(a[0]) || typeof a[1] !== 'string' || a[1].length !== 1) return false;
  for (let i = 2; i < a.length; i++) if (!isInt(a[i], -1)) return false;
  return true;
}

export function replay(start: ReplayStart, acts: unknown): ReplayResult {
  const kept = start.kept ? { level: start.kept.l, stats: Object.fromEntries(STAT_KEYS.map((k, i) => [k, start.kept!.st[i]])) as Record<StatKey, number>, statPoints: start.kept.p } : null;
  const r = newRun(start.mode, start.day ?? undefined, undefined, { seed: start.seed, kept, legendary: start.leg });
  const flow = new RunFlow(r, () => 0);
  let ms = 0;
  const result = (ok: boolean, reason?: string, at?: number): ReplayResult => ({
    ok,
    reason,
    at,
    end: flow.ended,
    stage: r.stage,
    level: r.level,
    distance: Math.floor(r.distance),
    ms,
    close: { l: r.level, st: STAT_KEYS.map((k) => r.stats[k]), p: r.statPoints },
  });
  if (!Array.isArray(acts) || acts.length > MAX_ACTS) return result(false, 'malformed');
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    if (!wellFormed(a)) return result(false, 'malformed', i);
    if (a[0] < (a[1] === 'a' ? MIN_WALK_MS : a[1] === 'u' || a[1] === 'e' ? MIN_ACT_MS : 0)) return result(false, 'too_fast', i);
    ms += a[0];
    if (!flow.apply(a)) return result(false, 'illegal', i);
  }
  if (flow.phase !== 'over') return result(false, 'unfinished');
  return result(true);
}
