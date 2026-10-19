// Starting a run: signed in and online, the run is played on a server ticket (its seed
// and starting raccoon come from the server) so its score can count on the boards.
// Otherwise it is played from this device's banked raccoon and isn't ranked.
import { dailyDay, newRun, STAT_KEYS, type RunState } from '../game/run';
import type { StatKey } from '../content/types';
import { store, save } from '../save';
import { flushRuns, runTicket } from './online';

export interface RunStart {
  run: RunState;
  ticket: string | null;
}

export async function prepareRun(daily: boolean): Promise<RunStart> {
  let day = dailyDay();
  // A normal run that never reached its end (the app was closed mid-run) counts as a
  // death, so closing the app in a losing fight can't keep the banked raccoon.
  if (!daily && store.runOpen) {
    store.kept = null;
    store.runOpen = false;
    save();
  }
  // Results still waiting on this device go first, so the server's raccoon is current.
  await flushRuns();
  const k = store.kept;
  const t = await runTicket(daily ? 'daily' : 'normal', day, k ? { l: k.level, st: STAT_KEYS.map((s) => k.stats[s]), p: k.statPoints } : null);
  if (!t) return { run: daily ? newRun('daily', day) : newRun(), ticket: null };
  if (daily) {
    day = t.day ?? day;
    return { run: newRun('daily', day, undefined, { seed: t.seed }), ticket: t.id };
  }
  // The account's banked raccoon replaces this device's.
  store.kept = t.kept ? { level: t.kept.l, stats: Object.fromEntries(STAT_KEYS.map((s, i) => [s, t.kept!.st[i]])) as Record<StatKey, number>, statPoints: t.kept.p } : null;
  save();
  return { run: newRun('normal', day, undefined, { seed: t.seed, kept: store.kept }), ticket: t.id };
}
