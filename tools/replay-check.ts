// Round trip for the server's replay: a bot plays runs through RunFlow making random
// legal choices of every kind (fights, retreats, roads, shops, camps, events, rewards,
// stat points, cards, FORGET), then each run is replayed from its seed and choices and
// must land on exactly the same result. Fails on any difference, so a rule that reads
// something outside the run (Math.random, the clock, the save) shows up here.
//   npx tsx tools/replay-check.ts [runs]
import { loadContent } from '../src/content';
import { RunFlow } from '../src/game/flow';
import { replay, type ReplayStart } from '../src/game/replay';
import { newRun, newSeed, STAT_KEYS, maxHp, type RunMode } from '../src/game/run';
import { mulberry32 } from '../src/game/rng';

loadContent();

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 120);
// The bot's own dice, apart from the game's.
const dice = mulberry32(12345);
const pick = <T>(a: T[]) => a[Math.floor(dice() * a.length)];
const chance = (p: number) => dice() < p;

const seen: Record<string, number> = {};

function play(flow: RunFlow, push: number) {
  const r = flow.r;
  let last: unknown = null;
  for (let guard = 0; guard < 50000 && flow.phase !== 'over'; guard++) {
    const c = flow.combat;
    const s = flow.step;
    if (s && s !== last) seen[s.key] = (seen[s.key] ?? 0) + 1;
    last = s;
    switch (flow.phase) {
      case 'walk':
        flow.arrive();
        break;
      case 'prompt':
        if (r.stage >= push || (r.stage >= 3 && r.hp < maxHp(r) * 0.3)) flow.retreat();
        else flow.begin();
        break;
      case 'fight': {
        if (!c!.canSpend()) {
          flow.endTurn();
          break;
        }
        // Mostly sensible: hit the weakest foe with the first skill that works.
        const usable = r.skills.map((_, i) => i).filter((i) => c!.canUse(i));
        const foes = c!.foes.map((f, i) => (f.dead ? -1 : i)).filter((i) => i >= 0);
        const weakest = foes.reduce((a, b) => (c!.foes[b].hp < c!.foes[a].hp ? b : a), foes[0]);
        flow.use(chance(0.7) ? usable[0] : pick(usable), chance(0.1) ? -1 : chance(0.7) ? weakest : pick(foes));
        break;
      }
      case 'step':
        if (!s) throw new Error('step phase without a step');
        if (s.key === 'Reward') {
          if (s.choices.length && chance(0.8)) flow.take(Math.floor(dice() * s.choices.length));
          else flow.skip();
        } else if (s.key === 'Fork') flow.road(chance(0.5) ? 0 : 1);
        else if (s.key === 'Shop') {
          const ok = (chance(0.3) && flow.heal()) || (chance(0.2) && flow.restock()) || (chance(0.5) && flow.buy(Math.floor(dice() * 3)));
          if (!ok && chance(0.6)) flow.skip();
        } else if (s.key === 'Camp') {
          if (!flow.camp(Math.floor(dice() * 3))) flow.camp(2);
        } else if (s.key === 'Event') {
          const opts = s.ev.options.map((_, i) => i).filter((i) => flow.canChoose(i));
          if (!opts.length) throw new Error(`event ${s.ev.id} has no option to pick`);
          flow.choose(pick(opts));
        } else if (s.key === 'LevelUp') {
          if (!s.choices) {
            if (r.statPoints > 0) {
              const k = Math.floor(dice() * STAT_KEYS.length);
              flow.stat(k, 1);
              if (chance(0.15)) flow.stat(k, -1);
            } else flow.confirm();
          } else if (chance(0.1) && flow.forget(Math.floor(dice() * r.skills.length))) {
            /* forgot a skill */
          } else if (s.choices.length && chance(0.9)) flow.pick(Math.floor(dice() * s.choices.length));
          else flow.skip();
        }
        break;
    }
  }
  if (flow.phase !== 'over') throw new Error('run never ended');
}

let fails = 0;
let tampered = 0;
let missed = 0;
let acts = 0;
let stages = 0;
for (let i = 0; i < N; i++) {
  const mode: RunMode = i % 4 === 3 ? 'daily' : 'normal';
  const day = new Date(Date.UTC(2026, 9, 1) + i * 86400000).toISOString().slice(0, 10);
  // Some runs start from a strong banked raccoon, so they get deep (bosses, new areas).
  const kept = i % 3 === 1 ? { l: 30 + (i % 9), st: [40, 25, 20, 10, 40], p: 0 } : i % 3 === 2 ? { l: 6, st: [6, 4, 5, 3, 6], p: 2 } : null;
  const start: ReplayStart = { mode, day: mode === 'daily' ? day : null, seed: newSeed(), kept: mode === 'daily' ? null : kept, leg: i % 2 === 0 };
  const k = start.kept;
  const r = newRun(mode, day, undefined, { seed: start.seed, kept: k ? { level: k.l, stats: { str: k.st[0], def: k.st[1], agi: k.st[2], lck: k.st[3], vit: k.st[4] }, statPoints: k.p } : null, legendary: start.leg });
  // A fake clock that always moves on enough for the replay's speed checks.
  let t = 0;
  const flow = new RunFlow(r, () => (t += 1500));
  play(flow, kept && kept.l >= 30 ? 60 : 4 + (i % 20));
  const res = replay(start, JSON.parse(JSON.stringify(flow.acts)));
  const want = { end: flow.ended, stage: r.stage, level: r.level, distance: Math.floor(r.distance) };
  const got = { end: res.end, stage: res.stage, level: res.level, distance: res.distance };
  acts += flow.acts.length;
  stages += r.stage;
  seen.newArea = (seen.newArea ?? 0) + r.area;
  if (!res.ok || JSON.stringify(want) !== JSON.stringify(got)) {
    fails++;
    console.error(`run ${i} (${mode}): played ${JSON.stringify(want)}, replayed ${JSON.stringify(got)} ok=${res.ok} ${res.reason ?? ''} at ${res.at ?? '-'}`);
  }
  // A forged log has to fail: another seed (normal runs), or a few fights cut out.
  if (r.stage >= 2) {
    tampered++;
    const other = mode === 'normal' ? replay({ ...start, seed: start.seed ^ 0x5a5a5a5a }, flow.acts) : null;
    const cut = flow.acts.filter((a, k) => !(a[1] === 'u' && k % 7 === 0));
    const lies = [other, replay(start, cut)].filter(Boolean);
    if (lies.every((x) => x!.ok && x!.stage === r.stage && x!.level === r.level)) {
      missed++;
      console.error(`run ${i}: a tampered log replayed to the same score`);
    }
  }
}
console.log(`replay: ${N - fails}/${N} runs replayed to the same result (${acts} choices, ${(stages / N).toFixed(1)} stages a run)`);
console.log(`steps seen: ${JSON.stringify(seen)}`);
console.log(`tampered: ${tampered - missed}/${tampered} forged logs caught`);
if (fails || missed) process.exit(1);
