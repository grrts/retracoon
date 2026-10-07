// Headless balance check: a simple bot plays many runs and we print how far it gets.
import { loadContent } from '../src/content';
import { biomes, enemies, sharedEncounters, items } from '../src/content/registry';
import { Combat } from '../src/game/combat';
import { newRun, danger, gainXp, maxHp, skillChoices, learnSkill, randomItem, equip, STAT_KEYS, LEG_NODES, RunState } from '../src/game/run';

loadContent();

function encounter(r: RunState) {
  const b = biomes[r.area % biomes.length];
  const d = danger(r);
  const pool = [...sharedEncounters, ...b.encounters].filter((e) => d >= e.minDanger && (!e.maxDanger || d <= e.maxDanger));
  const tot = pool.reduce((a, e) => a + e.weight, 0);
  let x = Math.random() * tot;
  for (const e of pool) { x -= e.weight; if (x <= 0) return e.foes; }
  return pool[0].foes;
}

function bot(c: Combat) {
  let guard = 0;
  while (!c.outcome() && guard++ < 200) {
    // incoming damage this turn
    const incoming = c.alive().reduce((a, f) => a + c.intentDamage(f) * (f.intent.hits ?? 1), 0);
    let acted = false;
    const order = c.run.skills.map((_, i) => i);
    for (const i of order) {
      const s = c.skillAt(i)!;
      if (!c.canUse(i)) continue;
      const e = s.def.effect(s.lvl);
      if (e.block && !e.dmg && c.block >= incoming) continue;
      if (e.heal && c.hp > c.maxHp * 0.6) continue;
      const t = c.alive().sort((a, b) => a.hp - b.hp)[0];
      c.use(i, t?.uid);
      acted = true;
      break;
    }
    if (!acted) c.endTurn();
  }
}

function simRun() {
  const r = newRun();
  let shinies = 0;
  for (let step = 0; step < 300; step++) {
    const kind = LEG_NODES[r.node];
    if (kind === 'fork') {
      // buy/receive an item
      const it = randomItem(r);
      if (it) equip(r, it);
    } else {
      const b = biomes[r.area % biomes.length];
      const foes = kind === 'boss' ? [b.boss] : encounter(r);
      const c = new Combat(r, foes, danger(r), { boss: kind === 'boss', hazard: b.hazard, hooks: { shinies: () => shinies, addShinies: (n) => (shinies += n) } });
      c.start();
      bot(c);
      r.hp = c.hp;
      if (c.outcome() !== 'win') return { area: r.area, node: r.node, level: r.level, d: danger(r) };
      const xp = c.killed.reduce((a, f) => a + f.def.xp, 0);
      const ups = gainXp(r, xp);
      for (let u = 0; u < ups; u++) {
        while (r.statPoints > 0) { r.stats[STAT_KEYS[Math.floor(Math.random() * 5)]]++; r.statPoints--; }
        const ch = skillChoices(r);
        if (ch.length) learnSkill(r, ch[0].id, 1 + Math.floor(Math.random() * 3));
        r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.25));
      }
      r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1));
      if (kind === 'boss' && Math.random() < 1) { const it = randomItem(r, 2); if (it) equip(r, it); }
    }
    r.node++;
    if (r.node >= LEG_NODES.length) { r.node = 0; r.area++; }
  }
  return { area: r.area, node: r.node, level: r.level, d: danger(r) };
}

const N = Number(process.argv[2] ?? 200);
const res = Array.from({ length: N }, simRun);
const hist: Record<string, number> = {};
for (const x of res) { const k = `a${x.area}n${x.node}`; hist[k] = (hist[k] ?? 0) + 1; }
console.log('enemies', enemies.size, 'items', items.size);
console.log(hist);
console.log('avg danger at death', (res.reduce((a, x) => a + x.d, 0) / N).toFixed(1), 'avg level', (res.reduce((a, x) => a + x.level, 0) / N).toFixed(1));
