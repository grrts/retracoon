// The skill book's shorthand. Each skill is one line: its numbers as plain values or
// [rank 1, added per rank], and what unlocks it. The card text is written from the
// numbers, so the description can never drift from what the skill does.
//
// Scaling, so locked skills keep up with the raccoon that unlocked them:
//   level-locked  damage and amounts grow 2% per character level above the lock
//   stat-locked   damage uses that stat (attack power), amounts grow 3% per point above the lock
// Amounts are block, healing, lifesteal, poison, burn, bleed, thorns, regen and the like.
// Durations, hits, AP and chances never scale: a level 100 raccoon still stuns for 1 turn.
import type { SkillCtx, SkillDef, SkillEffect, SkillReq, StatKey, StatusKey, Target } from '../types';
import { ICONS } from './icons';
import { skillIcon } from './looks';

type N = number | [number, number];

export interface Spec {
  dmg?: N;
  hits?: N;
  block?: N;
  heal?: N;
  apply?: Partial<Record<StatusKey, N>>;
  self?: Partial<Record<StatusKey, N>>;
  crit?: boolean;
  ap?: N;
  hpCost?: N;
  hpPct?: N;
  scale?: StatKey;
  pierce?: boolean;
  lifesteal?: N;
  blockDmg?: N;
  spendBlock?: boolean;
  missing?: N;
  per?: { key: StatusKey; mult: N };
  detonate?: { key: StatusKey; mult: N };
  execute?: N;
  shiny?: N;
  shinyCost?: N;
  cleanse?: boolean;
  refresh?: boolean;
  allAp?: boolean;
  combo?: N;
  gamble?: N;
  stack?: N;
  pctHp?: N;
  crowd?: N;
  spread?: StatusKey;
  shatter?: boolean;
  maxHpDmg?: N;
  killAp?: N;
  killHeal?: N;
  blockMul?: N;
  steal?: boolean;
}

// Statuses whose number is an amount (scales); the rest are turns or counts (don't).
const AMOUNT_STATUS: StatusKey[] = ['poison', 'burn', 'bleed', 'thorns', 'regen'];

export const LEVEL_GROWTH = 0.02;
export const STAT_GROWTH = 0.03;

export function levelFactor(req: SkillReq | undefined, ctx?: SkillCtx) {
  if (!req?.level || !ctx) return 1;
  return 1 + LEVEL_GROWTH * Math.max(0, ctx.level - req.level);
}

export function statFactor(req: SkillReq | undefined, ctx?: SkillCtx) {
  if (!req?.stat || !ctx) return 1;
  return 1 + STAT_GROWTH * Math.max(0, ctx.stats[req.stat] - (req.min ?? 0));
}

const at = (n: N | undefined, rank: number) => (n === undefined ? undefined : typeof n === 'number' ? n : n[0] + n[1] * (rank - 1));
const r2 = (n: number) => Math.round(n * 100) / 100;

// Turn the shorthand into the numbers the engine uses, for one rank and one raccoon.
export function resolve(spec: Spec, rank: number, req?: SkillReq, ctx?: SkillCtx): SkillEffect {
  const fl = levelFactor(req, ctx);
  const amt = fl * statFactor(req, ctx);
  const dmgF = (n: N | undefined) => (n === undefined ? undefined : r2(at(n, rank)! * fl));
  const amtF = (n: N | undefined, cap = Infinity) => (n === undefined ? undefined : r2(Math.min(cap, at(n, rank)! * amt)));
  const whole = (n: N | undefined) => (n === undefined ? undefined : Math.round(at(n, rank)! * amt));
  const plain = (n: N | undefined) => at(n, rank);
  const sts = (m: Partial<Record<StatusKey, N>> | undefined) => {
    if (!m) return undefined;
    const out: Partial<Record<StatusKey, number>> = {};
    for (const [k, v] of Object.entries(m)) out[k as StatusKey] = AMOUNT_STATUS.includes(k as StatusKey) ? Math.round(at(v, rank)! * amt) : at(v, rank)!;
    return out;
  };
  const e: SkillEffect = {
    dmg: dmgF(spec.dmg),
    hits: plain(spec.hits),
    block: whole(spec.block),
    heal: amtF(spec.heal, 0.6),
    apply: sts(spec.apply),
    self: sts(spec.self),
    crit: spec.crit,
    ap: plain(spec.ap),
    hpCost: plain(spec.hpCost),
    hpPct: plain(spec.hpPct),
    scale: spec.scale ?? (spec.dmg !== undefined ? req?.stat : undefined),
    pierce: spec.pierce,
    lifesteal: amtF(spec.lifesteal, 0.6),
    blockDmg: amtF(spec.blockDmg),
    spendBlock: spec.spendBlock,
    missing: dmgF(spec.missing),
    per: spec.per && { key: spec.per.key, mult: plain(spec.per.mult)! },
    detonate: spec.detonate && { key: spec.detonate.key, mult: amtF(spec.detonate.mult)! },
    execute: plain(spec.execute),
    shiny: amtF(spec.shiny),
    shinyCost: plain(spec.shinyCost),
    cleanse: spec.cleanse,
    refresh: spec.refresh,
    allAp: spec.allAp,
    combo: dmgF(spec.combo),
    gamble: plain(spec.gamble),
    stack: dmgF(spec.stack),
    pctHp: amtF(spec.pctHp, 0.35),
    crowd: dmgF(spec.crowd),
    spread: spec.spread,
    shatter: spec.shatter,
    maxHpDmg: amtF(spec.maxHpDmg),
    killAp: plain(spec.killAp),
    killHeal: amtF(spec.killHeal, 0.5),
    blockMul: plain(spec.blockMul),
    steal: spec.steal,
  };
  for (const k of Object.keys(e) as (keyof SkillEffect)[]) if (e[k] === undefined) delete e[k];
  return e;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const STATUS_WORD: Record<StatusKey, string> = {
  poison: 'POISON',
  burn: 'BURN',
  bleed: 'BLEED',
  chill: 'CHILL',
  mark: 'MARK',
  stun: 'STUN',
  weak: 'WEAKEN',
  vuln: 'EXPOSE',
  rage: 'RAGE',
  thorns: 'THORNS',
  focus: 'FOCUS',
  evade: 'EVADE',
  regen: 'REGEN',
  fuse: 'FUSE',
  shell: 'SHELL',
  taunt: 'TAUNT',
};
const SELF_WORD: Partial<Record<StatusKey, string>> = { weak: 'YOU WEAK', vuln: 'YOU EXPOSED', poison: 'POISON YOU', burn: 'BURN YOU' };
const STAT_SHORT: Record<StatKey, string> = { str: 'STR', def: 'DEF', agi: 'AGI', lck: 'LCK', vit: 'VIT' };

// The card text for one rank, written from the resolved numbers.
export function describe(e: SkillEffect, target: Target): string {
  const p: string[] = [];
  if (e.hpCost) p.push(`LOSE ${e.hpCost} HP`);
  if (e.hpPct) p.push(`LOSE ${pct(e.hpPct)} HP`);
  if (e.shinyCost) p.push(`PAY ${e.shinyCost} SHINIES`);
  if (e.cleanse) p.push('CLEANSE');
  if (e.steal) p.push('STEAL ITS BUFFS');
  if (e.shatter) p.push('BREAK BLOCK');
  if (e.dmg !== undefined) {
    const hits = e.hits ?? 1;
    if (target === 'random') p.push(`${hits} RANDOM HIT${hits > 1 ? 'S' : ''} ${pct(e.dmg)}`);
    else p.push(`HIT${target === 'all' ? ' ALL' : ''}${hits > 1 ? ` ${hits}X` : ''} ${pct(e.dmg)}`);
    if (e.allAp) p.push('+1 HIT PER AP LEFT');
    if (e.scale && e.scale !== 'str') p.push(`USES ${STAT_SHORT[e.scale]}`);
    if (e.crit) p.push('SURE CRIT');
    if (e.pierce) p.push('PIERCES');
    if (e.combo) p.push(`+${pct(e.combo)} PER COMBO`);
    if (e.stack) p.push(`+${pct(e.stack)} EACH USE`);
    if (e.crowd) p.push(`${e.crowd > 0 ? '+' : '-'}${pct(Math.abs(e.crowd))} PER OTHER FOE`);
    if (e.missing) p.push(`+${pct(e.missing)} LOW HP`);
    if (e.per) p.push(`+${pct(e.per.mult)} PER ${STATUS_WORD[e.per.key]}`);
    if (e.blockDmg) p.push(`+${pct(e.blockDmg)} OF BLOCK`);
    if (e.spendBlock) p.push('USES UP BLOCK');
    if (e.maxHpDmg) p.push(`+${pct(e.maxHpDmg)} MAX HP`);
    if (e.shiny) p.push(`+${e.shiny} PER SHINY`);
    if (e.pctHp) p.push(`+${pct(e.pctHp)} FOE HP`);
    if (e.gamble) p.push(`${pct(e.gamble)}: X3 OR HALF`);
    if (e.lifesteal) p.push(`DRAIN ${pct(e.lifesteal)}`);
    if (e.execute) p.push(`KILLS UNDER ${pct(e.execute)}`);
    if (e.killAp) p.push(`KILL: +${e.killAp} AP`);
    if (e.killHeal) p.push(`KILL: HEAL ${pct(e.killHeal)}`);
  }
  if (e.block) p.push(`+${e.block} BLOCK`);
  if (e.blockMul) p.push(e.blockMul === 2 ? 'DOUBLE BLOCK' : `BLOCK X${e.blockMul}`);
  if (e.heal) p.push(`HEAL ${pct(e.heal)}`);
  if (e.ap) p.push(`+${e.ap} AP`);
  if (e.apply) {
    const all = target === 'all' && e.dmg === undefined ? ' ALL' : '';
    for (const [k, n] of Object.entries(e.apply)) p.push(`${STATUS_WORD[k as StatusKey]}${all} ${n}`);
  }
  if (e.detonate) p.push(`POP ${STATUS_WORD[e.detonate.key]} X${e.detonate.mult}`);
  if (e.spread) p.push(`SPREAD ${STATUS_WORD[e.spread]}`);
  if (e.self) for (const [k, n] of Object.entries(e.self)) p.push(`${SELF_WORD[k as StatusKey] ?? STATUS_WORD[k as StatusKey]} ${n}`);
  if (e.refresh) p.push('RESET COOLDOWNS');
  return p.join(', ');
}

// One line per skill: id, name, look ('flame' or 'claw/fire'; see looks.ts), AP cost, cooldown,
// target, numbers, and what unlocks it.
export function sk(id: string, name: string, look: string, cost: number, cooldown: number, target: Target, spec: Spec, req?: SkillReq, max = 3): SkillDef {
  const shape = look.split('/')[0];
  if (!ICONS[shape]) throw new Error(`skill ${id}: no icon ${shape}`);
  return {
    id,
    name,
    look,
    icon: skillIcon(id, name, look),
    cost,
    cooldown,
    target,
    max,
    req,
    effect: (lvl, ctx) => resolve(spec, lvl, req, ctx),
    desc: (lvl, ctx) => describe(resolve(spec, lvl, req, ctx), target),
  };
}

// Shorthands for the unlocks.
export const lv = (level: number): SkillReq => ({ level });
export const st = (stat: StatKey, min: number): SkillReq => ({ stat, min });
export const both = (level: number, stat: StatKey, min: number): SkillReq => ({ level, stat, min });

// What a lock reads as on a card: "LV 40", "STR 20", "LV 40 STR 20".
export function reqLabel(req?: SkillReq) {
  if (!req) return '';
  const parts: string[] = [];
  if (req.level) parts.push(`LV ${req.level}`);
  if (req.stat) parts.push(`${STAT_SHORT[req.stat]} ${req.min}`);
  return parts.join(' ');
}
