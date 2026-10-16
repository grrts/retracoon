// Headless balance check: bots play the real combat engine and stage flow.
//   npx tsx tools/sim.ts [runs]      full report
//   npx tsx tools/sim.ts --quick     a fast smoke test for CI (fails on crashes)
//   npx tsx tools/sim.ts --all-str   the skilled bot dumps every point into STR, for comparison
//   npx tsx tools/sim.ts --daily     checks that daily runs give every player the same road
//   npx tsx tools/sim.ts --mutators  daily runs under each weekly rule, against no rule
//
// Two bots:
//   casual   dumps every point into STR, takes the first skill offered, never retreats.
//   skilled  spreads points, keeps block up, retreats before a fight when HP is low,
//            and keeps playing the same raccoon across retreats until it dies.
import { loadContent } from '../src/content';
import { enemies, themes, items, skills, skins, events } from '../src/content/registry';
import { Combat } from '../src/game/combat';
import { pickFoes, pickElite, eliteChance, fightRewards } from '../src/game/encounters';
import { MUTATOR_ORDER, hasMutator, type MutatorId } from '../src/game/mutators';
import { roll, newRun, bossFoes, danger, DIST_STEP, gainXp, maxHp, levelUpChoices, addPassive, learnSkill, randomItem, equip, itemPrice, afterFight, nextTheme, rollBossAt, tickBlessings, STAT_KEYS, SKILL_SLOTS, RunState } from '../src/game/run';
import { store } from '../src/save';
import { rand } from '../src/game/rng';
import type { RunMode } from '../src/game/run';
import type { StatKey } from '../src/content/types';

loadContent();

type Bot = 'casual' | 'skilled';

function fight(c: Combat, bot: Bot) {
  c.start();
  let guard = 0;
  while (!c.outcome() && guard++ < 400) {
    if (!c.canSpend()) {
      c.endTurn();
      continue;
    }
    const incoming = c.alive().reduce((a, f) => a + c.intentDamage(f) * (f.intent.hits ?? 1), 0);
    let acted = false;
    for (let i = 0; i < c.run.skills.length; i++) {
      const s = c.skillAt(i);
      if (!s || !c.canUse(i)) continue;
      const e = s.def.effect(s.lvl, c.ctx);
      if (bot === 'skilled') {
        if (e.block && !e.dmg && c.block >= incoming) continue;
        if (e.heal && c.hp > c.maxHp * 0.6) continue;
        if (e.hpCost && c.hp <= e.hpCost * 2) continue;
      } else if (!e.dmg && Math.random() < 0.5) continue;
      const t = c.alive().sort((a, b) => a.hp - b.hp)[0];
      c.use(i, t?.uid);
      acted = true;
      break;
    }
    // Points must be spent: with nothing it wanted, the bot takes the first skill that costs AP.
    if (!acted) {
      const i = c.run.skills.findIndex((_, k) => (c.skillAt(k)?.def.cost ?? 0) > 0 && c.canUse(k));
      c.use(i, c.alive().sort((a, b) => a.hp - b.hp)[0]?.uid);
    }
  }
  return c.outcome() === 'win';
}

function spendPoints(r: RunState, bot: Bot) {
  while (r.statPoints > 0) {
    let k: StatKey = 'str';
    if (bot === 'skilled' && !process.argv.includes('--all-str')) {
      // keep the lowest of STR/VIT/DEF/AGI moving, with a little LCK
      const order: StatKey[] = ['str', 'vit', 'def', 'agi', 'str', 'vit', 'lck'];
      k = order[(r.level * 3 + r.statPoints) % order.length];
    }
    r.stats[k]++;
    r.statPoints--;
    if (k === 'vit') r.hp += 6;
  }
  r.hp = Math.min(r.hp, maxHp(r));
}

function pickSkill(r: RunState, bot: Bot) {
  const ch = levelUpChoices(r);
  if (!ch.length) return;
  const owned = ch.find((c) => c.kind === 'skill' && r.skills.some((o) => o.id === c.def.id));
  const pick = bot === 'skilled' && owned ? owned : ch[0];
  if (pick.kind === 'skill') learnSkill(r, pick.def.id);
  else addPassive(r, pick.def.id);
}

function roadStop(r: RunState) {
  const roll = Math.random();
  if (roll < 0.3) {
    // shop: heal if hurt, then buy the best affordable item
    const heal = Math.round(8 + r.stage * 0.8);
    if (r.hp < maxHp(r) * 0.6 && r.shinies >= heal) {
      r.shinies -= heal;
      r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.3));
    }
    for (let i = 0; i < 3; i++) {
      const it = randomItem(r);
      if (it && r.shinies >= itemPrice(r, it)) {
        r.shinies -= itemPrice(r, it);
        equip(r, it);
      }
    }
  } else if (roll < 0.65) {
    // event: on average a small gain
    if (Math.random() < 0.5) r.shinies += 10 + r.stage;
    else r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.15));
  } else if (roll < 0.9) {
    // camp: nap, or forage when NO NAPS is on
    if (hasMutator(r, 'nonaps')) r.shinies += 8 + Math.round(danger(r) * 1.5);
    else r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.25));
  } else {
    const it = randomItem(r, 1);
    if (it) equip(r, it);
  }
}

interface Result {
  stage: number;
  level: number;
  reason: 'death' | 'retreat' | 'cap';
  bosses: number;
  r: RunState;
}

// The same rolls, in the same order, as the run scene (see roll() in run.ts), so a
// daily run here meets what a player would.
// `mutator` null plays a daily run with no weekly rule, for comparison.
function playRun(bot: Bot, push = 4, mode: RunMode = 'normal', log?: string[], day = '2026-11-14', mutator?: MutatorId | null): Result {
  const r = newRun(mode, day, mutator);
  let theme = themes.get(r.theme)!;
  for (let guard = 0; guard < 600; guard++) {
    if (bot === 'skilled' && r.stage >= 3 && (r.stage >= push || r.hp < maxHp(r) * 0.5)) return { stage: r.stage, level: r.level, reason: 'retreat', bosses: r.bosses, r };
    roll(r, 'arrive');
    const boss = r.areaStage + 1 >= r.bossAt;
    if (!boss && (r.sinceStop >= 3 || (r.sinceStop >= 2 && rand() < 0.55))) {
      r.sinceStop = 0;
      roll(r, 'Fork');
      roadStop(r);
      roll(r, 'arrive');
    }
    const elite = !boss && (r.eliteNext || rand() < eliteChance(r));
    const pick = boss ? { ids: bossFoes(r, theme.boss), tiers: [0, 0] } : elite ? pickElite(r, theme) : pickFoes(r, theme);
    log?.push(`${r.stage}:${r.theme}:${pick.ids.join('+')}:${pick.tiers.join('')}`);
    roll(r, 'combat');
    const c = new Combat(r, pick.ids, danger(r), { boss, elite, tiers: pick.tiers, hazard: theme.hazard, hooks: { shinies: () => r.shinies, addShinies: (n) => (r.shinies = Math.max(0, r.shinies + n)) } });
    const won = fight(c, bot);
    r.hp = c.hp;
    if (!won) return { stage: r.stage, level: r.level, reason: 'death', bosses: r.bosses, r };
    roll(r, 'after');
    const rw = fightRewards(r, c.killed);
    r.shinies += rw.shinies;
    r.stage++;
    r.distance += DIST_STEP;
    r.areaStage++;
    r.sinceStop++;
    tickBlessings(r);
    const ups = gainXp(r, rw.xp);
    if (ups) r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1 * ups));
    afterFight(r);
    for (let u = 0; u < ups; u++) {
      spendPoints(r, bot);
      pickSkill(r, bot);
    }
    if (boss || elite) {
      const it = randomItem(r, 2);
      if (it) equip(r, it);
      if (boss) r.bosses++;
    } else if ((roll(r, 'drop'), rand() < 0.15) && !hasMutator(r, 'flea')) {
      const it = randomItem(r, 0, 2);
      if (it) equip(r, it);
    }
    if (boss) {
      r.area++;
      r.areaStage = 0;
      roll(r, 'area');
      r.bossAt = rollBossAt(r.area, hasMutator(r, 'bossrush'));
      r.theme = nextTheme(r);
      r.themesVisited.push(r.theme);
      theme = themes.get(r.theme)!;
    }
  }
  return { stage: r.stage, level: r.level, reason: 'cap', bosses: r.bosses, r };
}

// A "career": the skilled bot keeps retreating with the same raccoon until it dies,
// exactly as the game banks level and stats on retreat.
function career(maxRuns = 30) {
  store.kept = null;
  let best = 0;
  let runs = 0;
  for (; runs < maxRuns; runs++) {
    // Push one fight deeper than the best so far, then bank the raccoon.
    const res = playRun('skilled', Math.max(4, best + 1));
    best = Math.max(best, res.stage);
    if (res.reason !== 'retreat') break;
    store.kept = { level: res.r.level, stats: { ...res.r.stats }, statPoints: res.r.statPoints };
  }
  store.kept = null;
  return { best, runs: runs + 1 };
}

function pct(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

// Two very different players on the same daily seed must meet the same foes on every
// stage both reach. Exits non-zero if they don't.
if (process.argv.includes('--daily')) {
  let shared = 0;
  for (let i = 0; i < 40; i++) {
    const a: string[] = [];
    const b: string[] = [];
    playRun('casual', 99, 'daily', a);
    playRun('skilled', 99, 'daily', b);
    // A level-up or road stop can differ, but the encounter on each stage may not.
    const n = Math.min(a.length, b.length);
    for (let k = 0; k < n; k++) {
      if (a[k] !== b[k]) {
        console.error(`daily runs differ at fight ${k + 1}: ${a[k]} vs ${b[k]}`);
        process.exit(1);
      }
    }
    shared += n;
  }
  console.log(`daily: 40 pairs of runs met the same foes on all ${shared} shared fights`);
  process.exit(0);
}

// Every weekly rule should change the daily run, not make it trivial or hopeless: both
// bots play many days' daily runs under each rule and under no rule. Fails when a rule
// moves the median stage reached by more than half (either way) for either bot.
if (process.argv.includes('--mutators')) {
  const days = Array.from({ length: Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 300) }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10));
  const rules: (MutatorId | null)[] = [null, ...MUTATOR_ORDER];
  const base: Record<Bot, number> = { casual: 0, skilled: 0 };
  let bad = 0;
  for (const m of rules) {
    const line: string[] = [];
    for (const bot of ['casual', 'skilled'] as Bot[]) {
      const res = days.map((d) => playRun(bot, 99, 'daily', undefined, d, m));
      const st = res.map((x) => x.stage);
      const med = pct(st, 0.5);
      if (m === null) base[bot] = med;
      const off = m !== null && (med < base[bot] * 0.5 || med > base[bot] * 1.5);
      if (off) bad++;
      line.push(`${bot} median ${String(med).padStart(2)} p10 ${String(pct(st, 0.1)).padStart(2)} p90 ${String(pct(st, 0.9)).padStart(2)} bosses ${(res.reduce((a, x) => a + x.bosses, 0) / res.length).toFixed(2)}${off ? ' <- OFF' : ''}`);
    }
    console.log(`${(m ?? 'none').padEnd(9)} ${line.join('   ')}`);
  }
  if (bad) {
    console.error(`${bad} rule/bot pairs moved the median stage by more than half`);
    process.exit(1);
  }
  process.exit(0);
}

const quick = process.argv.includes('--quick');
const N = quick ? 20 : Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 300);
console.log(`content: ${enemies.size} enemies, ${themes.size} themes, ${items.size} items, ${skills.size} skills, ${events.length} events, ${skins.size} skins`);

for (const bot of ['casual', 'skilled'] as Bot[]) {
  store.kept = null;
  const res = Array.from({ length: N }, () => playRun(bot));
  const st = res.map((x) => x.stage);
  console.log(
    `${bot.padEnd(8)} one run: median stage ${pct(st, 0.5)}, p10 ${pct(st, 0.1)}, p90 ${pct(st, 0.9)}, max ${Math.max(...st)}, ` +
      `avg level ${(res.reduce((a, x) => a + x.level, 0) / N).toFixed(1)}, bosses/run ${(res.reduce((a, x) => a + x.bosses, 0) / N).toFixed(2)}, ` +
      `retreats ${res.filter((x) => x.reason === 'retreat').length}, hit cap ${res.filter((x) => x.reason === 'cap').length}, ` +
      `left area 1 in ${Math.round((100 * res.filter((x) => x.bosses > 0).length) / N)}% of runs`,
  );
}

const careers = Array.from({ length: quick ? 5 : Math.max(20, Math.floor(N / 5)) }, () => career());
const cb = careers.map((c) => c.best);
console.log(`skilled career (retreat and replay one raccoon): median best stage ${pct(cb, 0.5)}, p90 ${pct(cb, 0.9)}, max ${Math.max(...cb)}, avg runs ${(careers.reduce((a, c) => a + c.runs, 0) / careers.length).toFixed(1)}`);
