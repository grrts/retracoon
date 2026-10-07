// Turn-based combat rules. The engine mutates its own state and returns a list of events
// that the scene plays back as animations. No Phaser in here.
import type { AreaHazard, EnemyDef, Fx, MoveDef, SkillDef, StatusKey } from '../content/types';
import { enemies, skills } from '../content/registry';
import { RunState, apPerTurn, attackPower, computeBonus, critChance, dodgeChance, maxHp, totalStat } from './run';

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

export interface Foe {
  uid: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  block: number;
  status: Statuses;
  intent: MoveDef;
  last?: string;
  dmgMul: number;
  elite?: EliteMod;
  revived?: boolean;
  dead: boolean;
  used: Set<string>;
}

export type Ev =
  | { t: 'act'; who: Who; name: string; kind?: string }
  | { t: 'hit'; who: Who; src: Who | 'env'; dmg: number; blocked: number; crit?: boolean; hp: number; block: number }
  | { t: 'dodge'; who: Who }
  | { t: 'block'; who: Who; amount: number; block: number }
  | { t: 'heal'; who: Who; amount: number; hp: number }
  | { t: 'status'; who: Who; key: StatusKey; n: number }
  | { t: 'die'; who: Who }
  | { t: 'revive'; who: Who; hp: number }
  | { t: 'summon'; who: Who }
  | { t: 'steal'; n: number }
  | { t: 'ap'; ap: number }
  | { t: 'hazard'; name: string }
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
  danger: number;
  killed: Foe[] = [];
  hooks: CombatHooks;
  private ev: Ev[] = [];

  constructor(run: RunState, foeIds: string[], danger: number, opts: { elite?: boolean; boss?: boolean; hazard?: AreaHazard; hooks: CombatHooks }) {
    this.run = run;
    this.fx = computeBonus(run).fx;
    this.hp = run.hp;
    this.maxHp = maxHp(run);
    this.danger = danger;
    this.hooks = opts.hooks;
    this.cooldowns = run.skills.map(() => 0);
    this.hazard = opts.hazard;
    this.hazardIn = opts.hazard ? opts.hazard.every : 0;
    foeIds.forEach((id, i) => this.addFoe(id, opts.elite && (i === 0 || Math.random() < 0.4)));
  }

  // ---------------------------------------------------------------- setup

  hpMul() {
    const d = this.danger - 1;
    return 1 + 0.17 * d + 0.012 * d * d;
  }
  dmgMul() {
    return 1.15 + 0.1 * (this.danger - 1);
  }

  addFoe(id: string, elite = false): Foe | null {
    const def = enemies.get(id);
    if (!def) return null;
    const hp = Math.round(def.hp * this.hpMul());
    const f: Foe = { uid: uidSeq++, def, hp, maxHp: hp, block: 0, status: {}, intent: def.moves[0], dmgMul: this.dmgMul(), dead: false, used: new Set() };
    if (elite && !def.boss) {
      const mods: EliteMod[] = ['tough', 'brutal', 'spiky', 'armored', 'swift'];
      f.elite = mods[Math.floor(Math.random() * mods.length)];
      f.maxHp = f.hp = Math.round(f.hp * (f.elite === 'tough' ? 2.2 : 1.6));
      if (f.elite === 'brutal') f.dmgMul *= 1.5;
    }
    f.intent = def.opener ? def.moves.find((m) => m.id === def.opener) ?? this.pickMove(f) : this.pickMove(f);
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
    this.startPlayerTurn();
    return this.flush();
  }

  private startPlayerTurn() {
    this.turn++;
    this.ev.push({ t: 'turn', side: 'player' });
    this.block = 0;
    this.status.thorns = 0;
    const startBlock = (this.fx.startBlock ?? 0) + (this.fx.moneyArmor ? Math.floor(this.hooks.shinies() / 10) * this.fx.moneyArmor : 0);
    if (startBlock > 0) this.gainBlock('p', startBlock);
    if (this.fx.regen && this.hp < this.maxHp) this.healP(this.fx.regen);
    this.tickPoison('p');
    if (this.hp <= 0) return;
    if (this.fx.laser) {
      const t = this.alive().sort((a, b) => b.hp - a.hp)[0];
      if (t) {
        this.ev.push({ t: 'act', who: 'p', name: 'LASER EYES', kind: 'laser' });
        this.damageFoe(t, this.fx.laser, false, false);
      }
    }
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - 1));
    this.ap = Math.max(0, apPerTurn(this.run) - this.apDrain);
    if (this.apDrain) this.ev.push({ t: 'msg', who: 'p', text: `-${this.apDrain} AP (NET)`, color: 0x94b0c2 });
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
    return this.ap >= s.def.cost && this.cooldowns[i] === 0;
  }

  use(i: number, targetUid?: number): Ev[] {
    const s = this.skillAt(i);
    if (!s || !this.canUse(i)) return [];
    const { def, lvl } = s;
    const e = def.effect(lvl);
    this.ap -= def.cost;
    this.cooldowns[i] = def.id === 'trick' && lvl >= 3 ? 0 : def.cooldown;
    this.ev.push({ t: 'act', who: 'p', name: def.name, kind: e.dmg ? 'attack' : 'self' });

    if (e.hpCost) this.hurtPlayerDirect(e.hpCost);
    if (e.ap) {
      this.ap += e.ap;
    }
    if (e.block) this.gainBlock('p', e.block + totalStat(this.run, 'def') * 2);
    if (e.heal) this.healP(Math.round(this.maxHp * e.heal));
    if (e.self) for (const [k, n] of Object.entries(e.self)) this.applyStatus('p', k as StatusKey, n!);

    const targets = (): Foe[] => {
      const alive = this.alive();
      if (def.target === 'all') return alive;
      if (def.target === 'one') {
        const t = alive.find((f) => f.uid === targetUid) ?? alive[0];
        return t ? [t] : [];
      }
      return [];
    };

    if (e.dmg) {
      const power = attackPower(this.run, e.scale ?? 'str');
      const hits = e.hits ?? 1;
      for (let h = 0; h < hits; h++) {
        const list = def.target === 'random' ? this.alive().sort(() => Math.random() - 0.5).slice(0, 1) : targets();
        if (!list.length) break;
        for (const f of list) {
          const crit = !!e.crit || Math.random() < critChance(this.run) || (!!this.fx.firstCrit && !this.firstHitDone);
          this.firstHitDone = true;
          const raw = power * e.dmg * this.outMul('p') * (crit ? 1.75 + computeBonus(this.run).bonus.critMult : 1);
          const dealt = this.damageFoe(f, raw, crit, true);
          if (dealt > 0 && def.target === 'one') this.afterSingleHit(f, dealt);
        }
      }
    }
    if (e.apply) {
      for (const f of def.target === 'random' ? this.alive().slice(0, 1) : targets())
        for (const [k, n] of Object.entries(e.apply)) this.applyStatus(f.uid, k as StatusKey, n!);
    }
    this.ev.push({ t: 'ap', ap: this.ap });
    return this.flush();
  }

  endTurn(): Ev[] {
    if (this.outcome()) return [];
    // end-of-turn item effects
    if (this.fx.boomerang && this.alive().length) {
      this.ev.push({ t: 'act', who: 'p', name: 'BOOMERANG LID', kind: 'boomerang' });
      for (const f of this.alive()) this.damageFoe(f, this.fx.boomerang, false, false);
    }
    if (this.fx.flies && this.alive().length) {
      const t = this.alive()[Math.floor(Math.random() * this.alive().length)];
      this.ev.push({ t: 'act', who: 'p', name: 'FLY SWARM', kind: 'flies' });
      this.damageFoe(t, this.fx.flies, false, false);
    }
    this.decay('p');
    if (this.outcome()) return this.flush();

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

  private foeTurn(f: Foe) {
    f.block = f.elite === 'armored' ? 6 : 0;
    if (f.block) this.ev.push({ t: 'block', who: f.uid, amount: f.block, block: f.block });
    this.tickPoison(f.uid);
    if (f.dead) return;
    if (f.status.stun) {
      f.status.stun--;
      this.ev.push({ t: 'msg', who: f.uid, text: 'STUNNED!', color: 0xffcd75 });
      return;
    }
    const m = f.intent;
    this.ev.push({ t: 'act', who: f.uid, name: m.name, kind: m.intent });
    f.used.add(m.id);
    f.last = m.id;

    if (m.dmg) {
      const hits = m.hits ?? 1;
      for (let h = 0; h < hits && this.hp > 0 && !f.dead; h++) this.foeHitsPlayer(f, m.dmg);
    }
    if (m.steal) {
      const n = Math.min(this.hooks.shinies(), m.steal);
      if (n > 0) {
        this.hooks.addShinies(-n);
        this.ev.push({ t: 'steal', n });
      }
    }
    if (m.apDrain) this.apDrain += m.apDrain;
    if (m.apply) for (const [k, n] of Object.entries(m.apply)) this.applyStatus('p', k as StatusKey, n!);
    if (m.block) {
      const target = m.guard ? this.alive().filter((a) => a !== f).sort((a, b) => a.hp - b.hp)[0] ?? f : f;
      this.gainBlock(target.uid, Math.round(m.block * (1 + 0.08 * (this.danger - 1))));
    }
    if (m.buff) {
      const who = m.allies ? this.alive() : [f];
      for (const a of who) for (const [k, n] of Object.entries(m.buff)) this.applyStatus(a.uid, k as StatusKey, n!);
    }
    if (m.heal) {
      const amt = Math.round(f.maxHp * m.heal);
      f.hp = Math.min(f.maxHp, f.hp + amt);
      this.ev.push({ t: 'heal', who: f.uid, amount: amt, hp: f.hp });
    }
    if (m.summon && this.alive().length < 4) {
      const n = f.def.boss ? 2 : 1;
      for (let i = 0; i < n && this.alive().length < 4; i++) {
        const s = this.addFoe(m.summon);
        if (s) this.ev.push({ t: 'summon', who: s.uid });
      }
    }
    this.decay(f.uid);
    f.intent = this.pickMove(f);
  }

  pickMove(f: Foe): MoveDef {
    const moves = f.def.moves;
    if (f.last) {
      const lastMove = moves.find((m) => m.id === f.last);
      if (lastMove?.after) {
        const nx = moves.find((m) => m.id === lastMove.after);
        if (nx) return nx;
      }
    }
    const allies = this.foes.filter((a) => !a.dead).length;
    const pool = moves.filter((m) => {
      if ((m.weight ?? 1) <= 0) return false;
      if (m.once && f.used.has(m.id)) return false;
      if (m.summon && allies >= 4) return false;
      if (m.heal && f.hp > f.maxHp * 0.7) return false;
      if (m.guard && allies < 2) return false;
      if (m.steal && this.hooks.shinies() <= 0) return false;
      if (m.id === f.last && moves.length > 2) return false;
      return true;
    });
    const list = pool.length ? pool : moves.filter((m) => (m.weight ?? 1) > 0);
    const total = list.reduce((a, m) => a + (m.weight ?? 1), 0);
    let r = Math.random() * total;
    for (const m of list) {
      r -= m.weight ?? 1;
      if (r <= 0) return m;
    }
    return list[0];
  }

  // Predicted damage for the intent label.
  intentDamage(f: Foe): number {
    const m = f.intent;
    if (!m.dmg) return 0;
    return this.foeRaw(f, m.dmg);
  }

  private foeRaw(f: Foe, base: number) {
    let d = base * f.dmgMul;
    if (f.status.weak) d *= 0.75;
    if (f.status.rage) d *= 1.5;
    if (this.status.vuln) d *= 1.5;
    return Math.max(1, Math.round(d) - Math.floor(totalStat(this.run, 'def') * 0.5));
  }

  private foeHitsPlayer(f: Foe, base: number) {
    if (Math.random() < dodgeChance(this.run)) {
      this.ev.push({ t: 'dodge', who: 'p' });
      if (this.fx.dodgeStrike) this.damageFoe(f, this.fx.dodgeStrike, false, false);
      return;
    }
    let amt = this.foeRaw(f, base);
    const blocked = Math.min(this.block, amt);
    this.block -= blocked;
    amt -= blocked;
    this.hp = Math.max(0, this.hp - amt);
    this.ev.push({ t: 'hit', who: 'p', src: f.uid, dmg: amt, blocked, hp: this.hp, block: this.block });
    if (this.hp <= 0) {
      this.ev.push({ t: 'die', who: 'p' });
      return;
    }
    if (this.fx.hurtBlock && amt > 0) this.gainBlock('p', this.fx.hurtBlock);
    const thorns = (this.fx.thorns ?? 0) + (this.status.thorns ?? 0);
    if (thorns > 0) this.damageFoe(f, thorns, false, false);
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

  // Returns damage dealt to hp.
  damageFoe(f: Foe, raw: number, crit: boolean, dodgeable: boolean): number {
    if (f.dead) return 0;
    if (dodgeable && f.def.dodge && Math.random() < f.def.dodge) {
      this.ev.push({ t: 'dodge', who: f.uid });
      return 0;
    }
    let amt = raw;
    if (f.status.vuln) amt *= 1.5;
    amt = Math.max(1, Math.round(amt));
    const blocked = Math.min(f.block, amt);
    f.block -= blocked;
    amt -= blocked;
    f.hp = Math.max(0, f.hp - amt);
    if (crit && this.fx.execute && f.hp > 0 && f.hp < f.maxHp * (this.fx.execute / 100)) {
      amt += f.hp;
      f.hp = 0;
      this.ev.push({ t: 'msg', who: f.uid, text: 'FINISHED!', color: 0xef7d57 });
    }
    this.ev.push({ t: 'hit', who: f.uid, src: 'p', dmg: amt, blocked, crit, hp: f.hp, block: f.block });
    if (f.elite === 'spiky' && dodgeable) this.hurtPlayerDirect(3, f.uid);
    if (f.hp <= 0) this.killFoe(f);
    return amt;
  }

  private afterSingleHit(f: Foe, dealt: number) {
    const others = this.alive().filter((o) => o !== f);
    if (!others.length) return;
    if (this.fx.splash) for (const o of others) this.damageFoe(o, (dealt * this.fx.splash) / 100, false, false);
    if (this.fx.chain) {
      const o = others[Math.floor(Math.random() * others.length)];
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
    this.killed.push(f);
    this.ev.push({ t: 'die', who: f.uid });
    if (this.fx.killHeal) this.healP(this.fx.killHeal);
    if (this.fx.killAp) {
      this.ap += this.fx.killAp;
      this.ev.push({ t: 'ap', ap: this.ap });
    }
    if (this.fx.killBurst) for (const o of this.alive()) this.damageFoe(o, this.fx.killBurst, false, false);
  }

  private hurtPlayerDirect(n: number, src: Who | 'env' = 'env') {
    this.hp = Math.max(0, this.hp - n);
    this.ev.push({ t: 'hit', who: 'p', src, dmg: n, blocked: 0, hp: this.hp, block: this.block });
    if (this.hp <= 0) this.ev.push({ t: 'die', who: 'p' });
  }

  private healP(n: number) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp > before) this.ev.push({ t: 'heal', who: 'p', amount: this.hp - before, hp: this.hp });
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
    if (!st) return;
    st[key] = (st[key] ?? 0) + n;
    this.ev.push({ t: 'status', who, key, n: st[key]! });
  }

  private tickPoison(who: Who) {
    const st = who === 'p' ? this.status : this.foe(who as number)?.status;
    if (!st?.poison) return;
    const n = st.poison;
    st.poison--;
    if (who === 'p') {
      this.hp = Math.max(0, this.hp - n);
      this.ev.push({ t: 'hit', who, src: 'env', dmg: n, blocked: 0, hp: this.hp, block: this.block });
      if (this.hp <= 0) this.ev.push({ t: 'die', who: 'p' });
    } else {
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
    for (const k of ['weak', 'vuln', 'rage'] as StatusKey[]) {
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
    this.ev.push({ t: 'hazard', name: h.name });
    const pow = Math.round(h.power * (1 + 0.1 * (this.danger - 1)));
    if (h.kind === 'pot') {
      const targets: Who[] = ['p', ...this.alive().map((f) => f.uid)];
      const t = targets[Math.floor(Math.random() * targets.length)];
      if (t === 'p') this.hurtPlayerDirect(pow);
      else this.damageFoe(this.foe(t)!, pow * 2, false, false);
    } else if (h.kind === 'fumes') {
      this.applyStatus('p', 'poison', h.power);
      for (const f of this.alive()) this.applyStatus(f.uid, 'poison', h.power);
    } else if (h.kind === 'sprinkler') {
      if (this.block > 0) {
        this.block = 0;
        this.ev.push({ t: 'block', who: 'p', amount: 0, block: 0 });
      }
      this.ev.push({ t: 'msg', who: 'p', text: 'SOAKED!', color: 0x41a6f6 });
    }
  }
}
