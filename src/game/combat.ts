// Turn-based combat rules. The engine mutates its own state and returns a list of events
// that the scene plays back as animations. No Phaser in here.
import type { AreaHazard, EnemyDef, Fx, MoveDef, SkillCtx, SkillDef, SkillEffect, StatusKey } from '../content/types';
import { enemies, skills } from '../content/registry';
import {
  RunState,
  accuracy,
  apPerTurn,
  attackPower,
  computeBonus,
  critChance,
  damageTaken,
  dodgeChance,
  hasBlessing,
  healMul,
  maxHp,
  skillCtx,
  totalStat,
} from './run';
import { rand } from './rng';
import { rules } from './mutators';

const TWIN = 0.6;
const TWIN_UPS = 2; // times a twin can get back up
const MIRROR_CAP = 0.4; // a copied hit is at most this share of the raccoon's max health

export type Statuses = Partial<Record<StatusKey, number>>;
export type Who = 'p' | number; // 'p' = raccoon, number = foe uid

export type EliteMod = 'tough' | 'brutal' | 'spiky' | 'armored' | 'swift';
export const ELITE_INFO: Record<EliteMod, { name: string; color: number }> = {
  tough: { name: 'TOUGH', color: 0xb13e53 },
  brutal: { name: 'BRUTAL', color: 0xef7d57 },
  spiky: { name: 'SPIKY', color: 0x94b0c2 },
  armored: { name: 'ARMORED', color: 0x41a6f6 },
  swift: { name: 'SWIFT', color: 0x73eff7 },
};

// Enemy tiers: the same critter comes back meaner the further you get.
export const TIERS = [
  { name: '', hp: 1, dmg: 1, color: 0xf4f4f4 },
  { name: 'MEAN', hp: 1.4, dmg: 1.2, color: 0xef7d57 },
  { name: 'FERAL', hp: 2, dmg: 1.4, color: 0xb13e53 },
  { name: 'MYTHIC', hp: 3, dmg: 1.7, color: 0xb05ccf },
];

export function rollTier(stage: number): number {
  const p3 = Math.max(0, Math.min(0.5, (stage - 24) / 25));
  const p2 = Math.max(0, Math.min(0.5, (stage - 14) / 20));
  const p1 = Math.max(0, Math.min(0.6, (stage - 6) / 15));
  const r = rand();
  if (r < p3) return 3;
  if (r < p3 + p2) return 2;
  if (r < p3 + p2 + p1) return 1;
  return 0;
}

// Difficulty curves: exponential, never capped. Each point of danger (about one fight)
// makes foes GROWTH times tougher, so every run ends eventually.
export const GROWTH = 1.16;
export const HP_BASE = 1.3;
export const DMG_BASE = 1.3;
export function hpScale(d: number) {
  return HP_BASE * Math.pow(GROWTH, d - 1);
}
export function dmgScale(d: number) {
  return DMG_BASE * Math.pow(GROWTH, d - 1);
}

// Boss strength by fights cleared: lighter in the first few fights, full from BOSS_FULL on.
export const BOSS_EASE_MIN = 0.45;
export const BOSS_FULL = 6;
export function bossEase(stage: number) {
  return Math.min(1, BOSS_EASE_MIN + ((1 - BOSS_EASE_MIN) * stage) / BOSS_FULL);
}

export interface Foe {
  uid: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  block: number;
  status: Statuses;
  intent: MoveDef;
  moves: MoveDef[];
  last?: string;
  dmgMul: number;
  armor: number;
  regen: number;
  tier: number;
  elite?: EliteMod;
  revived?: boolean;
  phase: 1 | 2;
  dead: boolean;
  gone?: boolean; // fled or blew up: out of the fight, but not a kill
  loot: number; // shinies it stole, given back if it is killed
  downTurn?: number; // turn it was knocked out (twins)
  ups: number; // times a twin got back up
  used: Set<string>;
}

export type Ev =
  | { t: 'act'; who: Who; name: string; kind?: string; skill?: string; target?: Who }
  | { t: 'hit'; who: Who; src: Who | 'env'; dmg: number; blocked: number; crit?: boolean; armor?: number; hp: number; block: number }
  | { t: 'dodge'; who: Who }
  | { t: 'block'; who: Who; amount: number; block: number }
  | { t: 'heal'; who: Who; amount: number; hp: number }
  | { t: 'status'; who: Who; key: StatusKey; n: number }
  | { t: 'die'; who: Who }
  | { t: 'gone'; who: Who; how: 'flee' | 'blast' }
  | { t: 'revive'; who: Who; hp: number }
  | { t: 'summon'; who: Who }
  | { t: 'phase'; who: Who; name: string }
  | { t: 'steal'; n: number }
  | { t: 'ap'; ap: number }
  | { t: 'hazard'; name: string; desc: string }
  | { t: 'combo'; n: number }
  | { t: 'msg'; who: Who; text: string; color?: number }
  | { t: 'turn'; side: 'player' | 'foes' };

export interface CombatHooks {
  shinies: () => number;
  addShinies: (n: number) => void;
}

let uidSeq = 1;

export class Combat {
  run: RunState;
  fx: Fx;
  foes: Foe[] = [];
  hp: number;
  maxHp: number;
  block = 0;
  status: Statuses = {};
  ap = 0;
  apDrain = 0;
  turn = 0;
  cooldowns: number[];
  firstHitDone = false;
  hazard?: AreaHazard;
  hazardIn = 0;
  // What dealt the blow that ended the run: a foe, or a hazard, status or own cost.
  killedBy: { foe?: Foe; what?: string } | null = null;
  danger: number;
  stage: number;
  killed: Foe[] = [];
  killsThisTurn = 0;
  bestCombo = 0;
  usedThisTurn = 0; // skills used this turn (combo)
  uses: number[]; // times each skill was used this fight (stack)
  cheated = false; // cheatDeath spent
  apBonus = 0; // extra AP for the coming turn
  bigHit = 0; // the biggest single skill hit this turn (for foes that copy it)
  ctx: SkillCtx;
  hooks: CombatHooks;
  private ev: Ev[] = [];

  constructor(run: RunState, foeIds: string[], danger: number, opts: { elite?: boolean; boss?: boolean; hazard?: AreaHazard; hooks: CombatHooks; tiers?: number[] }) {
    this.run = run;
    this.fx = computeBonus(run).fx;
    this.hp = run.hp;
    this.maxHp = maxHp(run);
    this.danger = danger;
    this.stage = run.stage;
    this.hooks = opts.hooks;
    this.cooldowns = run.skills.map(() => 0);
    this.uses = run.skills.map(() => 0);
    this.ctx = skillCtx(run);
    this.hazard = opts.hazard;
    this.hazardIn = opts.hazard ? opts.hazard.every : 0;
    foeIds.forEach((id, i) => this.addFoe(id, opts.elite && (i === 0 || rand() < 0.4), opts.tiers?.[i] ?? 0));
  }

  // ---------------------------------------------------------------- setup

  addFoe(id: string, elite = false, tier = 0): Foe | null {
    const def = enemies.get(id);
    if (!def) return null;
    const T = TIERS[def.boss ? 0 : tier];
    // Bosses can hide as early as the second fight, so early ones come in lighter.
    // TWIN BOSSES: each twin is a little over half a boss, so the pair is a step up, not double.
    const ease = def.boss ? bossEase(this.stage) * (rules(this.run).twinBoss ? TWIN : 1) : 1;
    const hp = Math.round(def.hp * hpScale(this.danger) * T.hp * ease * (1 + (this.fx.foeHp ?? 0) / 100));
    const f: Foe = {
      uid: uidSeq++,
      def,
      hp,
      maxHp: hp,
      block: 0,
      status: {},
      intent: def.moves[0],
      moves: def.moves,
      dmgMul: dmgScale(this.danger) * T.dmg * (def.boss ? Math.sqrt(ease) : 1) * (1 + (this.fx.foeDmg ?? 0) / 100),
      armor: Math.round((def.armor ?? 0) * (1 + this.danger * 0.03)),
      regen: Math.round((def.regen ?? 0) * hpScale(this.danger)),
      tier: def.boss ? 0 : tier,
      phase: 1,
      dead: false,
      loot: 0,
      ups: 0,
      used: new Set(),
    };
    if (def.fuse) f.status.fuse = def.fuse;
    if (def.shell) f.status.shell = def.shell + Math.floor(this.danger / 12);
    // Higher tiers learn a trick.
    if (f.tier >= 2) {
      const trick = Math.floor(rand() * 3);
      if (trick === 0) f.armor += 2 + Math.round(this.danger * 0.05);
      else if (trick === 1) f.regen += Math.round(f.maxHp * 0.05);
      else f.status.thorns = 2 + Math.round(this.danger * 0.05);
    }
    if (f.tier >= 3) f.regen += Math.round(f.maxHp * 0.04);
    if (elite && !def.boss) {
      const mods: EliteMod[] = ['tough', 'brutal', 'spiky', 'armored', 'swift'];
      f.elite = mods[Math.floor(rand() * mods.length)];
      f.maxHp = f.hp = Math.round(f.hp * (f.elite === 'tough' ? 2.2 : 1.6));
      if (f.elite === 'brutal') f.dmgMul *= 1.5;
    }
    if (hasBlessing(this.run, 'hexed') || rules(this.run).foeBlock) f.block = Math.round(6 * (1 + this.danger * 0.05));
    f.intent = def.opener ? f.moves.find((m) => m.id === def.opener) ?? this.pickMove(f) : this.pickMove(f);
    this.foes.push(f);
    return f;
  }

  alive() {
    return this.foes.filter((f) => !f.dead);
  }

  foe(uid: number) {
    return this.foes.find((f) => f.uid === uid);
  }

  outcome(): 'win' | 'lose' | null {
    if (this.hp <= 0) return 'lose';
    if (this.alive().length === 0) return 'win';
    return null;
  }

  private flush() {
    const e = this.ev;
    this.ev = [];
    return e;
  }

  // ---------------------------------------------------------------- turn flow

  start(): Ev[] {
    if (this.fx.stink) this.alive().forEach((f) => this.applyStatus(f.uid, 'poison', this.fx.stink!));
    if (this.fx.markStart) this.alive().forEach((f) => this.applyStatus(f.uid, 'mark', this.fx.markStart!));
    if (this.fx.selfPoison) this.applyStatus('p', 'poison', this.fx.selfPoison);
    if (this.fx.focusStart) this.applyStatus('p', 'focus', this.fx.focusStart);
    if (this.fx.firstStrike) {
      this.ev.push({ t: 'act', who: 'p', name: 'FIRST STRIKE', kind: 'laser' });
      for (const f of this.alive()) this.damageFoe(f, this.fx.firstStrike, false, false);
    }
    if (hasBlessing(this.run, 'shield')) this.gainBlock('p', Math.round(10 * (1 + this.danger * 0.04)));
    this.startPlayerTurn();
    if (this.hp > 0 && this.fx.evadeStart) this.applyStatus('p', 'evade', this.fx.evadeStart);
    if (this.hp > 0 && this.fx.startAp) {
      this.ap += this.fx.startAp;
      this.ev.push({ t: 'ap', ap: this.ap });
    }
    return this.flush();
  }

  private startPlayerTurn() {
    this.turn++;
    this.killsThisTurn = 0;
    this.usedThisTurn = 0;
    this.bigHit = 0;
    this.ev.push({ t: 'turn', side: 'player' });
    this.block = this.fx.blockKeep ? Math.floor((this.block * Math.min(100, this.fx.blockKeep)) / 100) : 0;
    this.status.thorns = 0;
    this.status.evade = 0;
    if (this.fx.turnHurt) {
      this.hurtPlayerDirect(this.fx.turnHurt, 'env', 'RISKY GEAR');
      if (this.hp <= 0) return;
    }
    const startBlock = (this.fx.startBlock ?? 0) + (this.fx.moneyArmor ? Math.floor(this.hooks.shinies() / 10) * this.fx.moneyArmor : 0);
    if (startBlock > 0) this.gainBlock('p', startBlock);
    if (this.fx.regen && this.hp < this.maxHp) this.healP(this.fx.regen);
    this.tickRegen('p');
    this.tickPoison('p');
    this.tickBurn('p');
    if (this.hp <= 0) return;
    if (this.fx.chaos) this.chaos();
    if (this.hp <= 0) return;
    if (this.fx.laser) {
      const t = this.alive().sort((a, b) => b.hp - a.hp)[0];
      if (t) {
        this.ev.push({ t: 'act', who: 'p', name: 'LASER EYES', kind: 'laser' });
        this.damageFoe(t, this.fx.laser, false, false);
      }
    }
    if ((hasBlessing(this.run, 'friend') || rules(this.run).pal) && this.alive().length) {
      const t = this.alive()[Math.floor(rand() * this.alive().length)];
      this.ev.push({ t: 'act', who: 'p', name: 'CRITTER PAL BITES', kind: 'laser' });
      this.damageFoe(t, attackPower(this.run) * 0.6, false, false);
    }
    const tick = this.fx.quickCd && rand() < this.fx.quickCd / 100 ? 2 : 1;
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - tick));
    this.ap = Math.max(0, apPerTurn(this.run) - this.apDrain + this.apBonus);
    this.apBonus = 0;
    if (this.apDrain) this.ev.push({ t: 'msg', who: 'p', text: `-${this.apDrain} AP`, color: 0x94b0c2 });
    this.apDrain = 0;
    this.ev.push({ t: 'ap', ap: this.ap });
  }

  skillAt(i: number): { def: SkillDef; lvl: number } | null {
    const s = this.run.skills[i];
    const def = s && skills.get(s.id);
    return def ? { def, lvl: s.lvl } : null;
  }

  canUse(i: number): boolean {
    const s = this.skillAt(i);
    if (!s || this.outcome()) return false;
    const cost = s.def.effect(s.lvl, this.ctx).shinyCost ?? 0;
    if (cost > 0 && this.hooks.shinies() < cost) return false;
    return this.ap >= s.def.cost && this.cooldowns[i] === 0;
  }

  // Spending AP is mandatory: the turn goes on while some skill that costs AP can be
  // used, and ends by itself once none can (free skills don't keep it going).
  canSpend(): boolean {
    if (this.outcome() || this.ap <= 0) return false;
    return this.run.skills.some((_, i) => (this.skillAt(i)?.def.cost ?? 0) > 0 && this.canUse(i));
  }

  // Damage a skill would do to one target right now (no crit), for the skill card.
  previewDamage(i: number): number {
    const s = this.skillAt(i);
    if (!s) return 0;
    const e = s.def.effect(s.lvl, this.ctx);
    if (!e.dmg) return 0;
    const flat = (e.blockDmg ?? 0) * this.block + (e.maxHpDmg ?? 0) * this.maxHp + (e.shiny ?? 0) * this.hooks.shinies();
    return Math.round((attackPower(this.run, e.scale ?? 'str') * e.dmg + flat) * this.outMul('p'));
  }

  use(i: number, targetUid?: number): Ev[] {
    const s = this.skillAt(i);
    if (!s || !this.canUse(i)) return [];
    const { def, lvl } = s;
    const e = def.effect(lvl, this.ctx);
    this.ap -= def.cost;
    const cd = def.id === 'trick' && lvl >= 3 ? 0 : def.cooldown;
    this.cooldowns[i] = cd > 0 ? cd + (this.fx.cdPlus ?? 0) : 0;
    if (e.shinyCost) this.hooks.addShinies(-e.shinyCost);
    this.resolve(i, def, e, targetUid);
    // Echo: the same skill again, free. Refund: the AP comes back.
    if (this.fx.echo && !this.outcome() && rand() < this.fx.echo / 100) {
      this.ev.push({ t: 'msg', who: 'p', text: 'ECHO!', color: 0xb05ccf });
      this.resolve(i, def, { ...e, hpCost: 0, hpPct: 0, shinyCost: 0, allAp: false, ap: 0 }, targetUid);
    }
    if (this.fx.refund && def.cost > 0 && rand() < this.fx.refund / 100) {
      this.ap += def.cost;
      this.ev.push({ t: 'msg', who: 'p', text: 'REFUND!', color: 0x73eff7 });
    }
    this.usedThisTurn++;
    this.uses[i]++;
    this.ev.push({ t: 'ap', ap: this.ap });
    return this.flush();
  }

  private resolve(i: number, def: SkillDef, e: SkillEffect, targetUid?: number) {
    this.ev.push({ t: 'act', who: 'p', name: def.name, kind: e.dmg ? 'attack' : 'self', skill: def.id, target: targetUid });

    if (e.hpCost) this.hurtPlayerDirect(e.hpCost, 'env', def.name);
    if (e.hpPct) this.hurtPlayerDirect(Math.max(1, Math.round(this.maxHp * e.hpPct)), 'env', def.name);
    if (this.hp <= 0) return;
    if (e.cleanse) for (const k of ['poison', 'burn', 'bleed', 'weak', 'vuln'] as StatusKey[]) if (this.status[k]) this.setStatus('p', k, 0);
    if (e.ap) this.ap += e.ap;
    if (e.block) this.gainBlock('p', Math.round(e.block * (1 + this.danger * 0.03) + totalStat(this.run, 'def') * 1.5));
    if (e.heal) this.healP(Math.round(this.maxHp * e.heal));
    if (e.self) for (const [k, n] of Object.entries(e.self)) this.applyStatus('p', k as StatusKey, n!);

    const targets = (): Foe[] => {
      const alive = this.alive();
      if (def.target === 'all') return alive;
      if (def.target === 'one') {
        // A taunting foe takes every single-target skill.
        const pick = alive.find((f) => f.uid === targetUid) ?? alive[0];
        const t = pick && !pick.status.taunt ? alive.find((f) => (f.status.taunt ?? 0) > 0) ?? pick : pick;
        return t ? [t] : [];
      }
      return [];
    };
    const first = targets()[0];
    if (first && def.target === 'one' && targetUid !== undefined && first.uid !== targetUid && this.foe(targetUid) && !this.foe(targetUid)!.dead) {
      this.ev.push({ t: 'msg', who: first.uid, text: 'TAUNTED!', color: 0xef7d57 });
    }
    if (e.shatter) for (const f of targets()) if (f.block) this.setBlock(f, 0);
    if (e.steal && first) {
      for (const k of ['rage', 'thorns', 'regen'] as StatusKey[]) {
        const n = first.status[k] ?? 0;
        if (n <= 0) continue;
        this.setStatus(first.uid, k, 0);
        this.applyStatus('p', k, n);
      }
    }

    // Random skills put their statuses on every foe they struck, once per hit.
    const struck: Foe[] = [];
    if (e.dmg) {
      const power = attackPower(this.run, e.scale ?? 'str');
      let hits = e.hits ?? 1;
      if (hits > 1 && this.fx.multiHit) hits += this.fx.multiHit;
      if (e.allAp && this.ap > 0) {
        hits += this.ap;
        this.ap = 0;
      }
      for (let h = 0; h < hits; h++) {
        const list = def.target === 'random' ? this.alive().sort(() => rand() - 0.5).slice(0, 1) : targets();
        if (!list.length) break;
        for (const f of list) {
          this.skillHit(i, def, e, f, power);
          if (def.target === 'random') struck.push(f);
        }
      }
      if (e.spendBlock && this.block > 0) {
        this.block = 0;
        this.ev.push({ t: 'block', who: 'p', amount: 0, block: 0 });
      }
    }
    const hitList = def.target === 'random' ? (struck.length ? struck : this.alive().slice(0, 1)) : targets();
    if (e.apply) {
      for (const f of hitList) {
        if (f.dead) continue;
        for (const [k, n] of Object.entries(e.apply)) this.applyStatus(f.uid, k as StatusKey, this.amp(k as StatusKey, n!));
      }
    }
    if (e.detonate) {
      for (const f of [...new Set(hitList)]) {
        const n = f.status[e.detonate.key] ?? 0;
        if (n <= 0) continue;
        this.setStatus(f.uid, e.detonate.key, 0);
        this.ev.push({ t: 'msg', who: f.uid, text: 'BOOM!', color: 0xffa300 });
        this.damageFoe(f, n * e.detonate.mult, false, false, true);
      }
    }
    if (e.spread && first && !first.dead) {
      const n = first.status[e.spread] ?? 0;
      if (n > 0) for (const o of this.alive()) if (o !== first) this.applyStatus(o.uid, e.spread, n);
    }
    if (e.blockMul && this.block > 0) this.gainBlock('p', Math.round(this.block * (e.blockMul - 1)));
    if (e.refresh) this.cooldowns = this.cooldowns.map((c, k) => (k === i ? c : 0));
  }

  // One hit of a damaging skill on one foe, with everything that rides on it.
  private skillHit(i: number, def: SkillDef, e: SkillEffect, f: Foe, power: number) {
    if (f.dead) return;
    const alive = this.alive().length;
    let mult = e.dmg!;
    mult += (e.combo ?? 0) * this.usedThisTurn;
    mult += (e.stack ?? 0) * this.uses[i];
    mult += (e.crowd ?? 0) * Math.max(0, alive - 1);
    mult += (e.missing ?? 0) * (1 - this.hp / this.maxHp);
    if (e.per) mult *= 1 + Math.min(3, e.per.mult * (f.status[e.per.key] ?? 0));
    let raw = power * mult;
    raw += (e.blockDmg ?? 0) * this.block + (e.maxHpDmg ?? 0) * this.maxHp + (e.shiny ?? 0) * this.hooks.shinies();
    raw += ((this.fx.hpDmg ?? 0) / 100) * this.maxHp + ((this.fx.blockDmg ?? 0) / 100) * this.block;
    if (e.pctHp) raw += f.hp * e.pctHp * (f.def.boss ? 1 / 3 : 1);
    let crit = !!e.crit || rand() < critChance(this.run) || (!!this.fx.firstCrit && !this.firstHitDone);
    if (!crit && (this.status.focus ?? 0) > 0) {
      crit = true;
      this.setStatus('p', 'focus', this.status.focus! - 1);
    } else if (!crit && (f.status.mark ?? 0) > 0) {
      crit = true;
      this.setStatus(f.uid, 'mark', f.status.mark! - 1);
    }
    this.firstHitDone = true;
    raw *= this.outMul('p') * this.fxMul(f, def) * (crit ? 1.75 + computeBonus(this.run).bonus.critMult : 1);
    if (e.gamble) {
      const win = rand() < e.gamble;
      raw *= win ? 3 : 0.5;
      this.ev.push({ t: 'msg', who: f.uid, text: win ? 'JACKPOT!' : 'BUST', color: win ? 0xffcd75 : 0x94b0c2 });
    }
    const dealt = this.damageFoe(f, raw, crit, true, !!e.pierce);
    if (dealt <= 0) return;
    this.bigHit = Math.max(this.bigHit, dealt);
    if (def.target === 'one') this.afterSingleHit(f, dealt);
    this.onHit(f, dealt, crit, e);
    if (!f.dead && e.execute && !f.def.boss && f.hp < f.maxHp * e.execute) {
      this.ev.push({ t: 'msg', who: f.uid, text: 'FINISHED!', color: 0xef7d57 });
      this.ev.push({ t: 'hit', who: f.uid, src: 'p', dmg: f.hp, blocked: 0, hp: 0, block: f.block });
      f.hp = 0;
      this.killFoe(f);
    }
    if (f.dead) {
      if (e.killAp) {
        this.ap += e.killAp;
        this.ev.push({ t: 'ap', ap: this.ap });
      }
      if (e.killHeal) this.healP(Math.round(this.maxHp * e.killHeal));
    }
  }

  // Item and passive effects on every skill hit that landed.
  private onHit(f: Foe, dealt: number, crit: boolean, e: SkillEffect) {
    const fx = this.fx;
    const steal = (e.lifesteal ?? 0) + (fx.lifesteal ?? 0) / 100;
    if (steal > 0) this.healP(Math.max(1, Math.round(dealt * steal)));
    if (crit && fx.critHeal) this.healP(fx.critHeal);
    if (crit && fx.critBlock) this.gainBlock('p', fx.critBlock);
    if (fx.goldHit) this.hooks.addShinies(fx.goldHit);
    if (f.dead) return;
    if (fx.poisonHit) this.applyStatus(f.uid, 'poison', this.amp('poison', fx.poisonHit));
    if (fx.burnHit) this.applyStatus(f.uid, 'burn', this.amp('burn', fx.burnHit));
    if (fx.bleedHit) this.applyStatus(f.uid, 'bleed', this.amp('bleed', fx.bleedHit));
    if (fx.chillHit) this.applyStatus(f.uid, 'chill', fx.chillHit);
    if (fx.stunChance && !f.def.boss && !f.status.stun && rand() < fx.stunChance / 100) this.applyStatus(f.uid, 'stun', 1);
  }

  // statusAmp makes poison, burn and bleed you apply stronger.
  private amp(k: StatusKey, n: number) {
    if (!this.fx.statusAmp || (k !== 'poison' && k !== 'burn' && k !== 'bleed')) return n;
    return Math.round(n * (1 + this.fx.statusAmp / 100));
  }

  // Damage multipliers from items and passives, for a skill hit on this foe.
  private fxMul(f: Foe, def: SkillDef) {
    const fx = this.fx;
    let m = 1;
    if (fx.bossDmg && (f.def.boss || f.elite)) m *= 1 + fx.bossDmg / 100;
    if (fx.aoeDmg && def.target === 'all') m *= 1 + fx.aoeDmg / 100;
    if (fx.soloDmg && def.target === 'one') m *= 1 + fx.soloDmg / 100;
    if (fx.stunDmg && f.status.stun) m *= 1 + fx.stunDmg / 100;
    if (fx.debuffDmg) {
      const n = (['poison', 'weak', 'vuln', 'stun', 'burn', 'bleed', 'mark', 'chill'] as StatusKey[]).filter((k) => (f.status[k] ?? 0) > 0).length;
      m *= 1 + (fx.debuffDmg * n) / 100;
    }
    if (fx.ambush && this.turn === 1) m *= 1 + fx.ambush / 100;
    if (fx.slowBurn && this.turn > 1) m *= 1 + (fx.slowBurn * (this.turn - 1)) / 100;
    const alive = this.alive().length;
    if (fx.crowd && alive > 1) m *= 1 + (fx.crowd * (alive - 1)) / 100;
    if (fx.duel && alive === 1) m *= 1 + fx.duel / 100;
    if (fx.richDmg) m *= 1 + Math.min(100, fx.richDmg * Math.floor(this.hooks.shinies() / 10)) / 100;
    return m;
  }

  endTurn(): Ev[] {
    if (this.outcome()) return [];
    if (this.fx.boomerang && this.alive().length) {
      this.ev.push({ t: 'act', who: 'p', name: 'BOOMERANG', kind: 'boomerang' });
      for (const f of this.alive()) this.damageFoe(f, this.fx.boomerang, false, false);
    }
    if (this.fx.flies && this.alive().length) {
      const t = this.alive()[Math.floor(rand() * this.alive().length)];
      this.ev.push({ t: 'act', who: 'p', name: 'FLY SWARM', kind: 'flies' });
      this.damageFoe(t, this.fx.flies, false, false);
    }
    this.decay('p');
    if (this.outcome()) return this.flush();
    this.twinsGetUp();

    this.ev.push({ t: 'turn', side: 'foes' });
    this.runHazard();
    for (const f of [...this.foes]) {
      if (f.dead || this.hp <= 0) continue;
      this.foeTurn(f);
      if (f.elite === 'swift' && !f.dead && this.hp > 0) this.foeTurn(f);
    }
    if (this.hp > 0 && this.alive().length) this.startPlayerTurn();
    return this.flush();
  }

  // ---------------------------------------------------------------- foes

  // Twins knocked out this turn get back up while another twin still stands.
  private twinsGetUp() {
    const standing = this.alive().filter((f) => f.def.twin);
    if (!standing.length) return;
    for (const f of this.foes) {
      if (!f.dead || f.gone || !f.def.twin || f.downTurn !== this.turn || f.ups >= TWIN_UPS) continue;
      f.dead = false;
      f.ups++;
      f.hp = Math.round(f.maxHp * 0.5);
      f.block = 0;
      f.status = {};
      this.killed = this.killed.filter((k) => k !== f);
      this.ev.push({ t: 'summon', who: f.uid });
      this.ev.push({ t: 'msg', who: f.uid, text: 'WOUND BACK UP!', color: 0xffcd75 });
    }
  }

  // Out of the fight without being beaten: no XP, no kill.
  private leave(f: Foe, how: 'flee' | 'blast') {
    f.dead = true;
    f.gone = true;
    this.ev.push({ t: 'gone', who: f.uid, how });
  }

  private foeTurn(f: Foe) {
    f.block = f.elite === 'armored' ? Math.round(6 * (1 + this.danger * 0.05)) : 0;
    if (f.block) this.ev.push({ t: 'block', who: f.uid, amount: f.block, block: f.block });
    if (f.regen && f.hp < f.maxHp) {
      const amt = Math.min(f.regen, f.maxHp - f.hp);
      f.hp += amt;
      this.ev.push({ t: 'heal', who: f.uid, amount: amt, hp: f.hp });
    }
    this.tickRegen(f.uid);
    this.tickPoison(f.uid);
    if (!f.dead) this.tickBurn(f.uid);
    if (f.dead) return;
    if (!f.status.stun && this.fx.trip && !f.def.boss && rand() < this.fx.trip / 100) {
      this.ev.push({ t: 'msg', who: f.uid, text: 'TRIPPED!', color: 0xffcd75 });
      this.decay(f.uid);
      f.intent = this.pickMove(f);
      return;
    }
    if (f.status.stun) {
      f.status.stun--;
      this.ev.push({ t: 'msg', who: f.uid, text: 'STUNNED!', color: 0xffcd75 });
      this.ev.push({ t: 'status', who: f.uid, key: 'stun', n: f.status.stun });
      f.intent = this.pickMove(f);
      return;
    }
    const m = f.intent;
    this.ev.push({ t: 'act', who: f.uid, name: m.name, kind: m.intent });
    f.used.add(m.id);
    f.last = m.id;

    let dealt = 0;
    if (m.dmg) {
      const hits = m.hits ?? 1;
      for (let h = 0; h < hits && this.hp > 0 && !f.dead; h++) dealt += this.foeHitsPlayer(f, this.foeRaw(f, m.dmg));
    }
    if (m.mirror && this.hp > 0 && !f.dead) {
      const d = this.mirrorDamage(f, m.mirror);
      if (d > 0) dealt += this.foeHitsPlayer(f, d);
      else this.ev.push({ t: 'msg', who: f.uid, text: 'NOTHING TO COPY', color: 0x94b0c2 });
    }
    if (m.drain && dealt > 0 && !f.dead) {
      const amt = Math.min(f.maxHp - f.hp, Math.round(dealt * m.drain));
      if (amt > 0) {
        f.hp += amt;
        this.ev.push({ t: 'heal', who: f.uid, amount: amt, hp: f.hp });
      }
    }
    if (m.blast) {
      this.setStatus(f.uid, 'fuse', 0);
      if (!f.dead) this.leave(f, 'blast');
      return;
    }
    if (m.steal) {
      const n = Math.min(this.hooks.shinies(), Math.round(m.steal * (1 + this.danger * 0.05)));
      if (n > 0) {
        this.hooks.addShinies(-n);
        f.loot += n;
        this.ev.push({ t: 'steal', n });
      }
    }
    if (m.flee && !f.dead) {
      this.leave(f, 'flee');
      return;
    }
    if (m.apDrain) this.apDrain += m.apDrain;
    if (m.apply) for (const [k, n] of Object.entries(m.apply)) this.applyStatus('p', k as StatusKey, k === 'poison' ? Math.round(n! * (1 + this.danger * 0.04)) : n!);
    if (m.block) {
      const target = m.guard ? this.alive().filter((a) => a !== f).sort((a, b) => a.hp - b.hp)[0] ?? f : f;
      this.gainBlock(target.uid, Math.round(m.block * hpScale(this.danger) * 0.8));
    }
    if (m.buff) {
      const who = m.allies ? this.alive() : [f];
      for (const a of who) for (const [k, n] of Object.entries(m.buff)) this.applyStatus(a.uid, k as StatusKey, n!);
    }
    if (m.heal) {
      const who = m.allies ? this.alive() : [f];
      for (const a of who) {
        const amt = Math.min(a.maxHp - a.hp, Math.round(a.maxHp * m.heal));
        if (amt <= 0) continue;
        a.hp += amt;
        this.ev.push({ t: 'heal', who: a.uid, amount: amt, hp: a.hp });
      }
    }
    if (m.summon && this.alive().length < 4) {
      const n = f.def.boss ? 2 : 1;
      for (let i = 0; i < n && this.alive().length < 4; i++) {
        const s = this.addFoe(m.summon, false, Math.min(f.tier, 1));
        if (s) this.ev.push({ t: 'summon', who: s.uid });
      }
    }
    this.decay(f.uid);
    if (f.status.fuse) this.setStatus(f.uid, 'fuse', f.status.fuse - 1);
    f.intent = this.pickMove(f);
  }

  pickMove(f: Foe): MoveDef {
    const moves = f.moves;
    // The fuse is about to run out: the next move is the blast.
    const blast = f.status.fuse === 1 && moves.find((m) => m.blast);
    if (blast) return blast;
    if (f.last) {
      const lastMove = moves.find((m) => m.id === f.last);
      if (lastMove?.after) {
        const nx = moves.find((m) => m.id === lastMove.after);
        if (nx) return nx;
      }
    }
    const allies = this.foes.filter((a) => !a.dead).length;
    const hurtAlly = this.alive().some((a) => a.hp < a.maxHp * 0.7);
    const pool = moves.filter((m) => {
      if ((m.weight ?? 1) <= 0) return false;
      if (m.once && f.used.has(m.id)) return false;
      if (m.summon && allies >= 4) return false;
      if (m.heal && !(m.allies ? hurtAlly : f.hp < f.maxHp * 0.7)) return false;
      if (m.guard && allies < 2) return false;
      if (m.steal && this.hooks.shinies() <= 0) return false;
      if (m.id === f.last && moves.length > 2) return false;
      return true;
    });
    const list = pool.length ? pool : moves.filter((m) => (m.weight ?? 1) > 0);
    const total = list.reduce((a, m) => a + (m.weight ?? 1), 0);
    let r = rand() * total;
    for (const m of list) {
      r -= m.weight ?? 1;
      if (r <= 0) return m;
    }
    return list[0];
  }

  // Predicted damage per hit, for the intent label.
  intentDamage(f: Foe): number {
    const m = f.intent;
    if (m.mirror) return this.mirrorDamage(f, m.mirror);
    if (!m.dmg) return 0;
    return this.foeRaw(f, m.dmg);
  }

  // A copy of the raccoon's biggest hit this turn: already as strong as the raccoon, so
  // the foe's own scaling doesn't apply, only weak, rage and defense.
  private mirrorDamage(f: Foe, share: number) {
    if (this.bigHit <= 0) return 0;
    return this.foeRaw(f, Math.min(this.bigHit * share, this.maxHp * MIRROR_CAP), false);
  }

  private foeRaw(f: Foe, base: number, scaled = true) {
    let d = base * (scaled ? f.dmgMul : 1);
    if (f.status.weak) d *= 0.75;
    if (f.status.rage) d *= 1.5;
    if (this.status.vuln) d *= 1.5;
    return Math.max(1, Math.round(d * damageTaken(this.run)));
  }

  // Takes the hit's damage after the foe's modifiers (foeRaw); returns what got through.
  private foeHitsPlayer(f: Foe, raw: number): number {
    const evade = (this.status.evade ?? 0) > 0;
    if (evade) this.setStatus('p', 'evade', this.status.evade! - 1);
    if (evade || rand() < dodgeChance(this.run)) {
      this.ev.push({ t: 'dodge', who: 'p' });
      if (this.fx.dodgeStrike) this.damageFoe(f, this.fx.dodgeStrike, false, false);
      if (this.fx.dodgeHeal) this.healP(this.fx.dodgeHeal);
      return 0;
    }
    let amt = raw;
    const blocked = Math.min(this.block, amt);
    this.block -= blocked;
    amt -= blocked;
    this.hp = Math.max(0, this.hp - amt);
    this.cheat();
    this.ev.push({ t: 'hit', who: 'p', src: f.uid, dmg: amt, blocked, hp: this.hp, block: this.block });
    if (this.hp <= 0) {
      this.killedBy = { foe: f };
      this.ev.push({ t: 'die', who: 'p' });
      return amt;
    }
    if (this.fx.spikeBlock && blocked > 0) this.damageFoe(f, (blocked * this.fx.spikeBlock) / 100, false, false);
    if (f.dead) return amt;
    if (this.fx.hurtBlock && amt > 0) this.gainBlock('p', this.fx.hurtBlock);
    const thorns = (this.fx.thorns ?? 0) + (this.status.thorns ?? 0);
    if (thorns > 0) this.damageFoe(f, thorns, false, false);
    return amt;
  }

  // ---------------------------------------------------------------- damage & statuses

  private outMul(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status ?? {};
    let m = 1;
    if (st.weak) m *= 0.75;
    if (st.rage) m *= 1.5;
    if (who === 'p' && this.fx.rage && this.hp < this.maxHp * 0.35) m *= 1 + this.fx.rage / 100;
    return m;
  }

  // Returns damage dealt to hp. Pierce ignores armor and block.
  damageFoe(f: Foe, raw: number, crit: boolean, dodgeable: boolean, pierce = false): number {
    if (f.dead) return 0;
    if (dodgeable && f.def.dodge && rand() < Math.max(0, f.def.dodge - accuracy(this.run) * f.def.dodge)) {
      this.ev.push({ t: 'dodge', who: f.uid });
      return 0;
    }
    // A shell turns every hit into one crack, however hard. Pierce goes through.
    if ((f.status.shell ?? 0) > 0 && !pierce) {
      this.setStatus(f.uid, 'shell', f.status.shell! - 1);
      this.ev.push({ t: 'msg', who: f.uid, text: f.status.shell ? 'CRACK!' : 'SHELL BROKEN!', color: 0x94b0c2 });
      return 0;
    }
    let amt = raw;
    if (f.status.vuln) amt *= 1.5;
    // Armour shrugs off plain hits; crits go straight through.
    let armor = 0;
    if (f.armor && !crit && !pierce) {
      armor = Math.min(f.armor, Math.max(0, Math.round(amt) - 1));
      amt -= armor;
    }
    // Bleeding foes lose extra on every attack that lands.
    if (dodgeable && f.status.bleed) amt += f.status.bleed;
    amt = Math.max(1, Math.round(amt));
    const blocked = pierce ? 0 : Math.min(f.block, amt);
    f.block -= blocked;
    amt -= blocked;
    f.hp = Math.max(0, f.hp - amt);
    if (crit && this.fx.execute && f.hp > 0 && f.hp < f.maxHp * (this.fx.execute / 100) && !f.def.boss) {
      amt += f.hp;
      f.hp = 0;
      this.ev.push({ t: 'msg', who: f.uid, text: 'FINISHED!', color: 0xef7d57 });
    }
    this.ev.push({ t: 'hit', who: f.uid, src: 'p', dmg: amt, blocked, crit, armor, hp: f.hp, block: f.block });
    if (dodgeable && (f.elite === 'spiky' || f.status.thorns)) this.hurtPlayerDirect(f.elite === 'spiky' ? 3 : f.status.thorns ?? 0, f.uid);
    if (f.hp <= 0) this.killFoe(f);
    else this.checkPhase(f);
    return amt;
  }

  private checkPhase(f: Foe) {
    const p2 = f.def.phase2;
    if (!p2 || f.phase === 2 || f.hp > f.maxHp * p2.at) return;
    f.phase = 2;
    f.moves = p2.moves;
    f.last = undefined;
    if (p2.heal) f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * p2.heal));
    this.ev.push({ t: 'phase', who: f.uid, name: p2.name });
    f.intent = this.pickMove(f);
  }

  private afterSingleHit(f: Foe, dealt: number) {
    const others = this.alive().filter((o) => o !== f);
    if (!others.length) return;
    if (this.fx.splash) for (const o of others) this.damageFoe(o, (dealt * this.fx.splash) / 100, false, false);
    if (this.fx.chain) {
      const o = others[Math.floor(rand() * others.length)];
      if (!o.dead) {
        this.ev.push({ t: 'msg', who: o.uid, text: 'ZAP!', color: 0x73eff7 });
        this.damageFoe(o, (dealt * this.fx.chain) / 100, false, false);
      }
    }
  }

  private killFoe(f: Foe) {
    if (f.def.onDeath === 'revive' && !f.revived) {
      f.revived = true;
      f.hp = Math.round(f.maxHp * 0.4);
      this.ev.push({ t: 'msg', who: f.uid, text: 'PLAYED DEAD!', color: 0xf5a5b8 });
      this.ev.push({ t: 'revive', who: f.uid, hp: f.hp });
      return;
    }
    f.dead = true;
    f.downTurn = this.turn;
    this.killed.push(f);
    this.killsThisTurn++;
    this.ev.push({ t: 'die', who: f.uid });
    if (f.loot) {
      this.hooks.addShinies(f.loot);
      this.ev.push({ t: 'msg', who: f.uid, text: `GOT ${f.loot} BACK!`, color: 0xffcd75 });
      f.loot = 0;
    }
    if (this.killsThisTurn >= 2) {
      this.bestCombo = Math.max(this.bestCombo, this.killsThisTurn);
      this.ev.push({ t: 'combo', n: this.killsThisTurn });
    }
    if (f.def.onDeath === 'burst') {
      this.ev.push({ t: 'msg', who: f.uid, text: 'POP!', color: 0xef7d57 });
      this.hurtPlayerDirect(Math.max(1, Math.round(4 * f.dmgMul * damageTaken(this.run))), f.uid);
    }
    if (f.def.onDeath === 'split' && f.def.split) {
      for (let i = 0; i < 2 && this.alive().length < 4; i++) {
        const s = this.addFoe(f.def.split, false, f.tier);
        if (s) this.ev.push({ t: 'summon', who: s.uid });
      }
    }
    if (this.fx.killHeal) this.healP(this.fx.killHeal);
    if (this.fx.killBlock) this.gainBlock('p', this.fx.killBlock);
    if (this.fx.killFocus) this.applyStatus('p', 'focus', this.fx.killFocus);
    if (this.fx.poisonSpread && f.status.poison) {
      const n = Math.round((f.status.poison * this.fx.poisonSpread) / 100);
      if (n > 0) for (const o of this.alive()) this.applyStatus(o.uid, 'poison', n);
    }
    if (this.fx.killAp) {
      this.ap += this.fx.killAp;
      this.ev.push({ t: 'ap', ap: this.ap });
    }
    if (this.fx.killBurst) for (const o of this.alive()) this.damageFoe(o, this.fx.killBurst, false, false);
  }

  // what: names a source that isn't a foe, for the end screen ("TAKEN OUT BY POISON").
  private hurtPlayerDirect(n: number, src: Who | 'env' = 'env', what?: string) {
    if (n <= 0) return;
    this.hp = Math.max(0, this.hp - n);
    this.cheat();
    this.ev.push({ t: 'hit', who: 'p', src, dmg: n, blocked: 0, hp: this.hp, block: this.block });
    if (this.hp <= 0) {
      this.killedBy = typeof src === 'number' ? { foe: this.foe(src) } : { what };
      this.ev.push({ t: 'die', who: 'p' });
    }
  }

  // Once a fight, cheatDeath turns a lethal blow into 1 health.
  private cheat() {
    if (this.hp > 0 || !this.fx.cheatDeath || this.cheated) return;
    this.cheated = true;
    this.hp = 1;
    this.ev.push({ t: 'msg', who: 'p', text: 'NOT TODAY!', color: 0xffcd75 });
  }

  private healP(n: number) {
    const before = this.hp;
    const amt = Math.round(n * healMul(this.run));
    this.hp = Math.min(this.maxHp, this.hp + amt);
    if (this.hp > before) this.ev.push({ t: 'heal', who: 'p', amount: this.hp - before, hp: this.hp });
    const over = amt - (this.hp - before);
    if (this.fx.overBlock && over > 0) this.gainBlock('p', Math.round((over * this.fx.overBlock) / 100));
  }

  private setBlock(f: Foe, n: number) {
    f.block = n;
    this.ev.push({ t: 'block', who: f.uid, amount: 0, block: n });
  }

  setStatus(who: Who, key: StatusKey, n: number) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st) return;
    st[key] = Math.max(0, n);
    this.ev.push({ t: 'status', who, key, n: st[key]! });
  }

  // Chaos: something random every turn. Half of it helps.
  private chaos() {
    const foes = this.alive();
    const foe = foes[Math.floor(rand() * foes.length)];
    const roll = Math.floor(rand() * 8);
    const say = (text: string, color: number) => this.ev.push({ t: 'msg', who: 'p', text, color });
    if (roll === 0) {
      say('CHAOS: +1 AP', 0x73eff7);
      this.apBonus++;
    } else if (roll === 1) {
      say('CHAOS: SURE CRIT', 0xffcd75);
      this.applyStatus('p', 'focus', 1);
    } else if (roll === 2 && foe) {
      say('CHAOS: FOE DAZED', 0xffcd75);
      this.applyStatus(foe.uid, foe.def.boss ? 'weak' : 'stun', 1);
    } else if (roll === 3) {
      say('CHAOS: SNACK', 0x38b764);
      this.healP(Math.round(this.maxHp * 0.08));
    } else if (roll === 4) {
      say('CHAOS: OUCH', 0xb13e53);
      this.hurtPlayerDirect(Math.max(1, Math.round(this.maxHp * 0.06)), 'env', 'CHAOS');
    } else if (roll === 5 && foe) {
      say('CHAOS: FOE ANGRY', 0xb13e53);
      this.applyStatus(foe.uid, 'rage', 1);
    } else if (roll === 6) {
      say('CHAOS: SHIELD', 0x41a6f6);
      this.gainBlock('p', Math.round(10 * (1 + this.danger * 0.04)));
    } else if (foe) {
      say('CHAOS: FOE HEALS', 0xb13e53);
      const amt = Math.min(foe.maxHp - foe.hp, Math.round(foe.maxHp * 0.1));
      if (amt > 0) {
        foe.hp += amt;
        this.ev.push({ t: 'heal', who: foe.uid, amount: amt, hp: foe.hp });
      }
    }
  }

  private gainBlock(who: Who, n: number) {
    if (who === 'p') {
      this.block += n;
      this.ev.push({ t: 'block', who, amount: n, block: this.block });
    } else {
      const f = this.foe(who);
      if (!f) return;
      f.block += n;
      this.ev.push({ t: 'block', who, amount: n, block: f.block });
    }
  }

  applyStatus(who: Who, key: StatusKey, n: number) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st || n <= 0) return;
    st[key] = (st[key] ?? 0) + n;
    this.ev.push({ t: 'status', who, key, n: st[key]! });
    // Chill freezes at 5 stacks (8 for bosses): a stun, and the chill starts over.
    if (key === 'chill' && who !== 'p') {
      const f = this.foe(who as number)!;
      if (st.chill! >= (f.def.boss ? 8 : 5)) {
        st.chill = 0;
        this.ev.push({ t: 'status', who, key: 'chill', n: 0 });
        this.ev.push({ t: 'msg', who, text: 'FROZEN!', color: 0x73eff7 });
        st.stun = (st.stun ?? 0) + 1;
        this.ev.push({ t: 'status', who, key: 'stun', n: st.stun });
      }
    }
  }

  // Burn: a big hit at the start of the turn that halves each time.
  private tickBurn(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st?.burn) return;
    const n = st.burn;
    st.burn = Math.floor(n / 2);
    if (who === 'p') this.hurtPlayerDirect(n, 'env', 'BURNS');
    else {
      const f = this.foe(who)!;
      f.hp = Math.max(0, f.hp - n);
      this.ev.push({ t: 'hit', who, src: 'env', dmg: n, blocked: 0, hp: f.hp, block: f.block });
      if (f.hp <= 0) this.killFoe(f);
    }
    this.ev.push({ t: 'status', who, key: 'burn', n: st.burn });
  }

  private tickRegen(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st?.regen) return;
    const n = st.regen;
    st.regen--;
    if (who === 'p') this.healP(n);
    else {
      const f = this.foe(who)!;
      const amt = Math.min(n, f.maxHp - f.hp);
      if (amt > 0) {
        f.hp += amt;
        this.ev.push({ t: 'heal', who, amount: amt, hp: f.hp });
      }
    }
    this.ev.push({ t: 'status', who, key: 'regen', n: st.regen });
  }

  private tickPoison(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st?.poison) return;
    const n = st.poison;
    st.poison--;
    if (who === 'p') this.hurtPlayerDirect(n, 'env', 'POISON');
    else {
      const f = this.foe(who)!;
      f.hp = Math.max(0, f.hp - n);
      this.ev.push({ t: 'hit', who, src: 'env', dmg: n, blocked: 0, hp: f.hp, block: f.block });
      if (f.hp <= 0) this.killFoe(f);
    }
    this.ev.push({ t: 'status', who, key: 'poison', n: st.poison });
  }

  private decay(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st) return;
    for (const k of ['weak', 'vuln', 'rage', 'bleed', 'chill', 'taunt'] as StatusKey[]) {
      if (st[k]) {
        st[k]!--;
        this.ev.push({ t: 'status', who, key: k, n: st[k]! });
      }
    }
  }

  private runHazard() {
    const h = this.hazard;
    if (!h) return;
    this.hazardIn--;
    if (this.hazardIn > 0) return;
    this.hazardIn = h.every;
    this.ev.push({ t: 'hazard', name: h.name, desc: h.desc });
    const pow = Math.round(h.power * dmgScale(this.danger) * 0.8);
    const everyone: Who[] = ['p', ...this.alive().map((f) => f.uid)];
    const hitWho = (t: Who, n: number) => (t === 'p' ? this.hurtPlayerDirect(n, 'env', h.name) : this.damageFoe(this.foe(t)!, n, false, false));
    if (h.kind === 'pot') {
      const t = everyone[Math.floor(rand() * everyone.length)];
      hitWho(t, t === 'p' ? pow : pow * 2);
    } else if (h.kind === 'lightning') {
      const t = everyone[Math.floor(rand() * everyone.length)];
      hitWho(t, t === 'p' ? pow * 2 : pow * 3);
    } else if (h.kind === 'quake') {
      for (const t of everyone) hitWho(t, t === 'p' ? Math.ceil(pow * 0.6) : pow);
    } else if (h.kind === 'fumes') {
      for (const t of everyone) this.applyStatus(t, 'poison', h.power);
    } else if (h.kind === 'spores') {
      for (const t of everyone) this.applyStatus(t, 'weak', 1);
    } else if (h.kind === 'sprinkler') {
      if (this.block > 0) {
        this.block = 0;
        this.ev.push({ t: 'block', who: 'p', amount: 0, block: 0 });
      }
      for (const f of this.alive()) if (f.block) {
        f.block = 0;
        this.ev.push({ t: 'block', who: f.uid, amount: 0, block: 0 });
      }
      this.ev.push({ t: 'msg', who: 'p', text: 'SOAKED!', color: 0x41a6f6 });
    }
  }
}
