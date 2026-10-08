// Which foes you meet and what beating them pays. Pure logic, shared by the run scene
// and the balance simulator.
import { enemies, families } from '../content/registry';
import type { ThemeDef } from '../world/types';
import { rollTier, Foe } from './combat';
import { RunState, computeBonus, shinyMult } from './run';

export interface FoePick {
  ids: string[];
  tiers: number[];
}

// A group built from the theme's families. More and meaner foes as you go.
export function pickFoes(r: RunState, theme: ThemeDef): FoePick {
  const s = r.stage;
  const pool = theme.families
    .flatMap((f) => families.get(f) ?? [])
    .map((id) => enemies.get(id)!)
    .filter((e) => e && !e.boss && (e.minStage ?? 1) <= s + 3);
  const fallback = (families.get('street') ?? []).map((id) => enemies.get(id)!).filter(Boolean);
  const list = pool.length >= 2 ? pool : [...pool, ...fallback];
  let count = s < 2 ? 1 + (Math.random() < 0.3 ? 1 : 0) : s < 8 ? 2 : s < 20 ? 2 + (Math.random() < 0.5 ? 1 : 0) : s < 40 ? 3 : 3 + (Math.random() < 0.5 ? 1 : 0);
  count = Math.min(4, count);
  const ids: string[] = [];
  let supports = 0;
  let guards = 0;
  for (let i = 0; i < count; i++) {
    const choices = list.filter((e) => !(e.role === 'support' && supports >= 1) && !(e.role === 'guard' && guards >= 1) && !(s < 3 && (e.role === 'brute' || e.role === 'charger') && i > 0));
    const from = choices.length ? choices : list;
    const e = from[Math.floor(Math.random() * from.length)];
    if (e.role === 'support') supports++;
    if (e.role === 'guard') guards++;
    ids.push(e.id);
  }
  return { ids, tiers: ids.map(() => rollTier(s)) };
}

// Elites: the toughest one or two of a normal group, rolled as if a few stages deeper.
export function pickElite(r: RunState, theme: ThemeDef): FoePick {
  const pick = pickFoes(r, theme);
  const ids = pick.ids
    .map((id) => enemies.get(id)!)
    .sort((a, b) => b.hp - a.hp)
    .map((e) => e.id)
    .slice(0, r.stage >= 8 ? 2 : 1);
  return { ids, tiers: ids.map(() => rollTier(r.stage + 8)) };
}

export function eliteChance(r: RunState) {
  return r.stage >= 4 ? 0.1 + Math.min(0.15, r.stage * 0.003) : 0;
}

// XP and shinies for the foes killed in a fight.
export function fightRewards(r: RunState, killed: Foe[]) {
  let xp = 0;
  let sh = 0;
  for (const f of killed) {
    const mul = (f.elite ? 2 : 1) * (1 + f.tier * 0.5);
    xp += Math.round(f.def.xp * (1 + 0.06 * r.stage) * mul);
    sh += f.def.shinies * mul * (0.7 + Math.random() * 0.6) * (1 + r.stage * 0.03);
  }
  const fx = computeBonus(r).fx;
  sh = Math.round(sh * shinyMult(r));
  if (fx.interest) sh += Math.floor((r.shinies * fx.interest) / 100);
  return { xp, shinies: sh };
}
