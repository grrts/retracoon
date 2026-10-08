// Headless balance check: bots play the real combat engine and stage flow.
//   npx tsx tools/sim.ts [runs]      full report
//   npx tsx tools/sim.ts --quick     a fast smoke test for CI (fails on crashes)
//   npx tsx tools/sim.ts --all-str   the skilled bot dumps every point into STR, for comparison
//
// Two bots:
//   casual   dumps every point into STR, takes the first skill offered, never retreats.
//   skilled  spreads points, keeps block up, retreats before a fight when HP is low,
//            and keeps playing the same raccoon across retreats until it dies.
import { loadContent } from '../src/content';
import { enemies, themes, items, skills, skins, events } from '../src/content/registry';
import { Combat } from '../src/game/combat';
import { pickFoes, pickElite, eliteChance, fightRewards } from '../src/game/encounters';
import { newRun, danger, gainXp, maxHp, skillChoices, learnSkill, randomItem, equip, itemPrice, nextTheme, rollBossAt, tickBlessings, STAT_KEYS, SKILL_SLOTS, RunState } from '../src/game/run';
import { store } from '../src/save';
import type { StatKey } from '../src/content/types';

loadContent();

type Bot = 'casual' | 'skilled';

function fight(c: Combat, bot: Bot) {
  c.start();
  let guard = 0;
  while (!c.outcome() && guard++ < 400) {
    const incoming = c.alive().reduce((a, f) => a + c.intentDamage(f) * (f.intent.hits ?? 1), 0);
    let acted = false;
    for (let i = 0; i < c.run.skills.length; i++) {
      const s = c.skillAt(i);
      if (!s || !c.canUse(i)) continue;
      const e = s.def.effect(s.lvl);
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
    if (!acted) c.endTurn();
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
  const ch = skillChoices(r);
  if (!ch.length) return;
  const owned = ch.find((s) => r.skills.some((o) => o.id === s.id));
  const pick = bot === 'skilled' && owned ? owned : ch[0];
  if (r.skills.some((o) => o.id === pick.id) || r.skills.length < SKILL_SLOTS) learnSkill(r, pick.id);
  else if (bot === 'skilled') learnSkill(r, pick.id, 1 + Math.floor(Math.random() * (SKILL_SLOTS - 1)));
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
    r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.25));
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

function playRun(bot: Bot): Result {
  const r = newRun();
  let theme = themes.get(r.theme)!;
  for (let guard = 0; guard < 600; guard++) {
    if (bot === 'skilled' && r.stage > 3 && r.hp < maxHp(r) * 0.35) return { stage: r.stage, level: r.level, reason: 'retreat', bosses: r.bosses, r };
    if (r.sinceStop >= 3 || (r.sinceStop >= 2 && Math.random() < 0.55)) {
      r.sinceStop = 0;
      roadStop(r);
    }
    const boss = r.areaStage + 1 >= r.bossAt;
    const elite = !boss && (r.eliteNext || Math.random() < eliteChance(r));
    const pick = boss ? { ids: [theme.boss], tiers: [0] } : elite ? pickElite(r, theme) : pickFoes(r, theme);
    const c = new Combat(r, pick.ids, danger(r), { boss, elite, tiers: pick.tiers, hazard: theme.hazard, hooks: { shinies: () => r.shinies, addShinies: (n) => (r.shinies = Math.max(0, r.shinies + n)) } });
    const won = fight(c, bot);
    r.hp = c.hp;
    if (!won) return { stage: r.stage, level: r.level, reason: 'death', bosses: r.bosses, r };
    const rw = fightRewards(r, c.killed);
    r.shinies += rw.shinies;
    r.stage++;
    r.areaStage++;
    r.sinceStop++;
    tickBlessings(r);
    const ups = gainXp(r, rw.xp);
    if (ups) r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1 * ups));
    for (let u = 0; u < ups; u++) {
      spendPoints(r, bot);
      pickSkill(r, bot);
    }
    if (boss || elite) {
      const it = randomItem(r, 2);
      if (it) equip(r, it);
      if (boss) r.bosses++;
    } else if (Math.random() < 0.15) {
      const it = randomItem(r, 0, 2);
      if (it) equip(r, it);
    }
    if (boss) {
      r.area++;
      r.areaStage = 0;
      r.bossAt = rollBossAt();
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
    const res = playRun('skilled');
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
      `retreats ${res.filter((x) => x.reason === 'retreat').length}, hit cap ${res.filter((x) => x.reason === 'cap').length}`,
  );
}

const careers = Array.from({ length: quick ? 5 : Math.max(20, Math.floor(N / 5)) }, () => career());
const cb = careers.map((c) => c.best);
console.log(`skilled career (retreat and replay one raccoon): median best stage ${pct(cb, 0.5)}, p90 ${pct(cb, 0.9)}, max ${Math.max(...cb)}, avg runs ${(careers.reduce((a, c) => a + c.runs, 0) / careers.length).toFixed(1)}`);
