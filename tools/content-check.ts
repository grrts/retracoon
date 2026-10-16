// Content lint: every skill, passive, item and set must load, be unique, fit its card on
// the narrowest phone screen, and sit inside its power budget.
//   npx tsx tools/content-check.ts           check, print a summary, exit non-zero on errors
//   npx tsx tools/content-check.ts --list    also print every item's budget score
import { loadContent } from '../src/content';
import { items, skills, sets, RARITY } from '../src/content/registry';
import { PAL } from '../src/gfx/palette';
import { passives } from '../src/content/passives';
import { FONT } from '../src/gfx/font';
import { emptyBonus, newRun } from '../src/game/run';
import { ACHIEVEMENTS } from '../src/platform/achievements';
import { readFileSync } from 'node:fs';
import { levelFactor, statFactor } from '../src/content/skills/book';
import type { Bonus, Fx, ItemDef, SkillEffect } from '../src/content/types';
import { PARTS, applyBonus, fxOf, type Eff } from '../src/content/items/forge';

loadContent();

const errors: string[] = [];
const warns: string[] = [];
const err = (s: string) => errors.push(s);
const warn = (s: string) => warns.push(s);

// ---------------------------------------------------------------- text (mirrors ui.ts)

const fmt = (s: string) => s.toUpperCase().replace(/(\d)X/g, '$1x');
function measure(s: string) {
  let w = 0;
  for (const ch of fmt(s)) w += (FONT[ch]?.[0].length ?? 3) + 1;
  return Math.max(0, w - 1);
}
function lines(s: string, maxW: number) {
  const out: string[] = [];
  for (const para of fmt(s).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}
const fits = (s: string, w: number, n: number) => lines(s, w).length <= n && lines(s, w).every((l) => measure(l) <= w);
for (const ch of new Set(fmt([...items.values()].map((i) => i.name + i.desc).join('')))) if (!FONT[ch]) err(`font has no glyph for '${ch}'`);

// Narrowest layouts (W = 360): reward and shop cards are 110 wide, level-up cards 110,
// the replace-a-skill screen 81.
const ITEM_DESC_W = 98;
const ITEM_NAME_W = 74;
const SKILL_W = 71;
const PASSIVE_W = 100;

// ---------------------------------------------------------------- uniqueness

const ids = new Map<string, string>();
const seenName = (what: string) => {
  const names = new Map<string, string>();
  return (id: string, name: string) => {
    if (names.has(name)) err(`${what} name ${name} used by ${names.get(name)} and ${id}`);
    names.set(name, id);
  };
};
for (const [what, map] of [['item', items], ['skill', skills], ['passive', passives], ['set', sets]] as const) {
  const nm = seenName(what);
  for (const x of map.values()) {
    const key = `${what}:${x.id}`;
    if (ids.has(key)) err(`duplicate ${key}`);
    ids.set(key, x.id);
    nm(x.id, x.name);
  }
}

// ---------------------------------------------------------------- items

function sample(def: ItemDef, lvl: number): { b: Bonus; fx: Fx } {
  const b = emptyBonus();
  def.bonus?.(b, lvl);
  return { b, fx: def.fx?.(lvl) ?? {} };
}

// Rough power in "stat points": what one point of STR/DEF/AGI/LCK/VIT is worth.
const UNIT: Record<string, number> = {
  str: 1, def: 1, agi: 1, lck: 1, vit: 1, hp: 1 / 6,
  ap: 6, critMult: 4, shinyMult: 8, discount: 8, dodge: 30, dmg: 15, crit: 30, armor: 30, taken: -25, healMul: 6, hpMul: 18, xp: 10,
  thorns: 0.6, hurtBlock: 0.6, startBlock: 1.1, firstStrike: 0.4, laser: 0.7, flies: 0.5, stink: 0.5, chain: 0.12, execute: 0.12,
  killHeal: 0.4, killAp: 4, rage: 0.04, moneyArmor: 1.5, interest: 0.3, firstCrit: 1.5, dodgeStrike: 0.4, regen: 1.2, splash: 0.1,
  boomerang: 0.8, killBurst: 0.3, lifesteal: 0.15, poisonHit: 1.1, burnHit: 1.1, bleedHit: 1.2, chillHit: 1.1, stunChance: 0.25,
  goldHit: 1.2, hpDmg: 0.6, blockDmg: 0.1, critHeal: 0.5, critBlock: 0.5, bossDmg: 0.06, aoeDmg: 0.08, soloDmg: 0.12, stunDmg: 0.05,
  debuffDmg: 0.3, ambush: 0.03, slowBurn: 0.35, crowd: 0.2, duel: 0.08, richDmg: 0.6, statusAmp: 0.06, multiHit: 3, echo: 0.2,
  refund: 0.2, quickCd: 0.12, startAp: 1.6, focusStart: 1.6, evadeStart: 1.6, markStart: 1.1, blockKeep: 0.06, spikeBlock: 0.06,
  overBlock: 0.03, dodgeHeal: 0.5, killBlock: 0.4, killFocus: 1.5, poisonSpread: 0.03, cheatDeath: 4, trip: 0.2, chaos: 1.5, fightHeal: 0.25,
  turnHurt: -2, selfPoison: -0.8, foeHp: -0.15, foeDmg: -0.2, cdPlus: -3, fightTax: -0.2, fightHurt: -0.3,
};
const effScore = (e: Eff | undefined) => {
  if (!e) return 0;
  const b = emptyBonus();
  applyBonus(b, e, null);
  return score(b, fxOf(e, null));
};
function score(b: Bonus, fx: Fx) {
  let s = 0;
  for (const [k, v] of Object.entries(b)) if (v) s += v * (UNIT[k] ?? 0);
  for (const [k, v] of Object.entries(fx)) if (v) s += v * (UNIT[k] ?? 0);
  return s;
}
// Budget per rarity; risky items are allowed more because their catch is subtracted.
const BUDGET = [2, 2.8, 3.8, 5, 8]; // about the median of the original hand-made items
const looks = new Map<string, string>();
const sigs = new Map<string, string>();
const scores: [string, number, number][] = [];
for (const it of items.values()) {
  // the 90 hand-drawn items keep their original texts and budgets
  const legacy = !it.set && !/^[hfbkpta]_/.test(it.id);
  // looks: every item drawn differently
  const art = JSON.stringify(it.gear?.map((g) => [g.anchor, g.x, g.y, g.rows]) ?? it.icon);
  if (looks.has(art)) err(`items ${looks.get(art)} and ${it.id} look the same`);
  looks.set(art, it.id);
  if (!legacy) {
    if (!fits(it.desc, ITEM_DESC_W, it.set ? 3 : 4)) err(`item ${it.id} text too long: ${lines(it.desc, ITEM_DESC_W).join(' / ')}`);
    if (measure(it.name) > ITEM_NAME_W) err(`item ${it.id} name ${it.name} too wide (${measure(it.name)}px)`);
    if (it.rarity === 4 && !it.needsBoss) err(`legendary ${it.id} should need a boss kill`);
  }
  const { b, fx } = sample(it, 1);
  const sig = JSON.stringify([it.slot, Object.entries(b).filter(([, v]) => v), Object.entries(fx).filter(([, v]) => v)]);
  if (sigs.has(sig)) (legacy ? warn : err)(`items ${sigs.get(sig)} and ${it.id} do exactly the same thing`);
  sigs.set(sig, it.id);
  const sc = score(b, fx);
  scores.push([it.id, it.rarity, sc]);
  const drawback = Object.entries(b).some(([k, v]) => (k === 'taken' ? v > 0 : v < 0)) || ['turnHurt', 'selfPoison', 'foeHp', 'foeDmg', 'cdPlus', 'fightTax', 'fightHurt'].some((k) => fx[k as keyof Fx]);
  if (it.risky && !drawback) err(`risky item ${it.id} has no drawback`);
  if (!it.risky && drawback && !legacy) err(`item ${it.id} has a drawback but is not marked risky`);
  if (!legacy) {
    // Set pieces lean on their set's steps, so they may sit lower on their own. A risky
    // item's upside runs over budget, its catch must be real, and it must still be worth it.
    const B = BUDGET[it.rarity];
    const part = PARTS.get(it.id)!;
    for (const [k, v] of Object.entries({ ...part.good, ...part.bad })) {
      if (!v) err(`item ${it.id} has an empty ${k}`);
      if (['str', 'def', 'agi', 'lck', 'vit', 'hp', 'ap'].includes(k) && !Number.isInteger(v)) err(`item ${it.id} has a fractional ${k}`);
    }
    const good = effScore(part.good);
    const bad = effScore(part.bad);
    const name = `item ${it.id} (${RARITY[it.rarity].name})`;
    if (!it.risky && (good < B * (it.set ? 0.3 : 0.55) || good > B * 1.6)) warn(`${name} scores ${good.toFixed(1)}, budget ${B}`);
    if (it.risky) {
      if (good < B * 1.0 || good > B * 2.4) warn(`${name} upside ${good.toFixed(1)}, budget ${B}`);
      if (bad > -B * 0.2) warn(`${name} catch ${bad.toFixed(1)} is too mild`);
      if (good + bad < B * 0.45) warn(`${name} is not worth its catch (${(good + bad).toFixed(1)})`);
    }
  }
}

// ---------------------------------------------------------------- sets

for (const s of sets.values()) {
  const slots = new Set<string>();
  if (s.pieces.length < 3) err(`set ${s.id} has only ${s.pieces.length} pieces`);
  for (const id of s.pieces) {
    const it = items.get(id);
    if (!it) err(`set ${s.id} lists missing item ${id}`);
    else {
      if (it.set !== s.id) err(`item ${id} does not point back at set ${s.id}`);
      if (slots.has(it.slot)) err(`set ${s.id} has two ${it.slot} pieces`);
      slots.add(it.slot);
      if (it.needsBoss) err(`set piece ${id} needs a boss kill`);
    }
  }
  if (s.bonuses[0]?.n !== 2) err(`set ${s.id} must start at 2 pieces`);
  for (let i = 1; i < s.bonuses.length; i++) if (s.bonuses[i].n <= s.bonuses[i - 1].n) err(`set ${s.id} steps out of order`);
  if (s.bonuses.at(-1)!.n > s.pieces.length) err(`set ${s.id} top step needs more pieces than it has`);
  if (measure(`${s.name} ${s.pieces.length}/${s.pieces.length}`) > ITEM_DESC_W) err(`set ${s.id} name too wide`);
  for (const b of s.bonuses) if (!b.desc) err(`set ${s.id} step ${b.n} has no text`);
}

// ---------------------------------------------------------------- skills

const effSig = (e: SkillEffect) => JSON.stringify(Object.entries(e).sort());
const skillSigs = new Map<string, string>();
const reqKinds = { free: 0, level: 0, stat: 0, both: 0 };
const icons = new Map<string, string>();
for (const s of skills.values()) {
  // icons: every skill drawn differently, 11x11, in palette keys only
  const art = s.icon.join('|');
  if (icons.has(art)) err(`skills ${icons.get(art)} and ${s.id} have the same icon`);
  icons.set(art, s.id);
  if (s.icon.length !== 11 || s.icon.some((r) => r.length !== 11 || [...r].some((ch) => ch !== '.' && !(ch in PAL)))) err(`skill ${s.id} icon is not an 11x11 palette map`);
  const req = s.req;
  const kind = !req ? 'free' : req.level && req.stat ? 'both' : req.level ? 'level' : 'stat';
  reqKinds[kind]++;
  // Text must fit at the extremes: freshly unlocked rank 1, and a maxed late-game raccoon.
  const lo = { level: req?.level ?? 1, stats: { str: 0, def: 0, agi: 0, lck: 0, vit: 0, ...(req?.stat ? { [req.stat]: req.min ?? 0 } : {}) } };
  const hi = { level: 150, stats: { str: 150, def: 150, agi: 150, lck: 150, vit: 150 } };
  for (const [lvl, ctx] of [[1, lo], [s.max ?? 3, hi]] as const) {
    const d = s.desc(lvl, ctx);
    if (!fits(d, SKILL_W, 6)) err(`skill ${s.id} text too long at rank ${lvl}: ${d}`);
  }
  const sig = effSig(s.effect(1, lo)) + s.target + s.cost;
  if (skillSigs.has(sig)) err(`skills ${skillSigs.get(sig)} and ${s.id} do exactly the same thing`);
  skillSigs.set(sig, s.id);
  if (req?.level && (req.level < 1 || req.level > 100)) err(`skill ${s.id} unlock level ${req.level} out of range`);
}

// Level-locked skills: modest at 10, exceptionally strong at 100.
const STATS0 = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
const growthLv = levelFactor({ level: 10 }, { level: 100, stats: STATS0 });
const growthSt = statFactor({ stat: 'str', min: 10 }, { level: 1, stats: { ...STATS0, str: 100 } });

// ---------------------------------------------------------------- passives

for (const p of passives.values()) {
  if (!fits(p.each, PASSIVE_W, 3)) err(`passive ${p.id} text too long: ${p.each}`);
  for (const n of [1, 3, 6]) if (!fits(`TOTAL ${p.desc(n)}`, PASSIVE_W + 2, 2)) err(`passive ${p.id} total too long at ${n}: ${p.desc(n)}`);
}

// ---------------------------------------------------------------- achievements

// The ids are Steamworks API names, entered by hand in Steamworks from docs/STEAM.md.
{
  const doc = readFileSync(new URL('../docs/STEAM.md', import.meta.url), 'utf8');
  const ids = new Set<string>();
  const run = newRun();
  for (const a of ACHIEVEMENTS) {
    if (ids.has(a.id)) err(`achievement ${a.id} listed twice`);
    ids.add(a.id);
    if (!/^[A-Z0-9_]{1,64}$/.test(a.id)) err(`achievement ${a.id}: API names are A-Z, 0-9 and _`);
    if (!doc.includes(`\`${a.id}\``)) err(`achievement ${a.id} is missing from docs/STEAM.md`);
    if (a.stat && !doc.includes(`\`${a.stat}\``)) err(`stat ${a.stat} is missing from docs/STEAM.md`);
    try {
      a.test(run);
      a.test(null);
    } catch (e) {
      err(`achievement ${a.id} test throws: ${(e as Error).message}`);
    }
  }
  console.log(`achievements: ${ACHIEVEMENTS.length}`);
}

// ---------------------------------------------------------------- report

const byRarity = RARITY.map((r, i) => {
  const xs = scores.filter(([, rr]) => rr === i).map(([, , s]) => s).sort((a, b) => a - b);
  return `${r.name} ${xs.length} (median ${xs[Math.floor(xs.length / 2)]?.toFixed(1)})`;
});
const risky = [...items.values()].filter((i) => i.risky).length;
console.log(`items: ${items.size} (${[...items.values()].filter((i) => i.set).length} in ${sets.size} sets, ${risky} risky, ${[...sets.values()].filter((s) => s.risky).length} risky sets)`);
console.log(`  by rarity: ${byRarity.join(', ')}`);
const slots: Record<string, number> = {};
for (const i of items.values()) slots[i.slot] = (slots[i.slot] ?? 0) + 1;
console.log(`  by slot: ${Object.entries(slots).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`skills: ${skills.size} (free ${reqKinds.free}, level ${reqKinds.level}, stat ${reqKinds.stat}, both ${reqKinds.both}); a level-10 skill at level 100: x${growthLv.toFixed(2)}, a STR-10 skill at STR 100: x${growthSt.toFixed(2)}`);
console.log(`passives: ${passives.size}`);
if (process.argv.includes('--list')) for (const [id, r, s] of scores.sort((a, b) => a[1] - b[1] || a[2] - b[2])) console.log(`  ${RARITY[r].name.padEnd(9)} ${s.toFixed(1).padStart(5)} ${id}`);
for (const w of warns) console.log(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(`${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
