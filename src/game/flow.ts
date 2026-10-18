// The run from one choice to the next, with no rendering. The run scene and its
// overlays show what this holds and call its methods for every choice the player makes:
// arrive at the next stop, fight or retreat, use a skill, pick a road, buy, take an
// item, spend a stat point. Everything that follows from a choice happens inside the
// call, up to the next choice, so a run is fully described by its seed, the raccoon it
// started with and the list of choices. Each choice is written to `acts`; the server
// replays that list through this same class (tools/replay.ts) and only counts the run
// if it ends on the score the game sent.
//
// A method returns false (and changes nothing) when the choice isn't allowed right
// now. The scenes never ask for one; a replayed log that does is rejected.
import type { EventDef, ItemDef, RunAPI, StatKey } from '../content/types';
import { events, items, skills, themes, RARITY } from '../content/registry';
import { Combat, type Ev } from './combat';
import { pickFoes, pickElite, eliteChance, fightRewards } from './encounters';
import { fightStarts, fightEnds, note } from './ledger';
import { rules } from './mutators';
import { rand } from './rng';
import {
  type LevelChoice,
  type RunState,
  STAT_KEYS,
  SKILL_SLOTS,
  addBlessing,
  addPassive,
  afterFight,
  bossFoes,
  danger,
  equip,
  forgetSkill,
  gainXp,
  itemPrice,
  learnSkill,
  levelUpChoices,
  maxHp,
  nextTheme,
  randomItem,
  roll,
  rollBossAt,
  skillChoices,
  tickBlessings,
} from './run';

export type FightKind = 'fight' | 'elite' | 'boss';
export type StopKind = 'shop' | 'event' | 'camp' | 'chest';
export const STOP_KINDS: StopKind[] = ['shop', 'event', 'camp', 'chest'];
const STOP_WEIGHT: Record<StopKind, number> = { shop: 3, event: 4, camp: 2, chest: 1 };

// Meters walked before each stop: 1.8 s (1.2 s after a road stop) at 80 px/s, 6 px/m.
export const WALK = { long: { sec: 1.8, m: 24 }, short: { sec: 1.2, m: 16 } };

// What an open overlay shows. Content is rolled when the step opens.
export type Step =
  | { key: 'Reward'; title: string; choices: ItemDef[] }
  | { key: 'LevelUp'; statsOnly: boolean; spent: Record<StatKey, number>; choices: LevelChoice[] | null }
  | { key: 'Fork'; picks: StopKind[] }
  | { key: 'Shop'; stock: (ItemDef | null)[]; rerolls: number; healed: number }
  | { key: 'Camp' }
  | { key: 'Event'; ev: EventDef; result: string | null };

type Spec = { key: 'Reward'; title: string; min?: number; fixed?: string[] } | { key: 'LevelUp'; statsOnly?: boolean } | { key: 'Fork' | 'Shop' | 'Camp' | 'Event' };

export interface Victory {
  xp: number;
  shinies: number;
  ups: number;
  heal: number;
  hurt: number;
  tax: number;
  boss: boolean;
  elite: boolean;
}

// One choice: ms since the previous one, a code, then its arguments.
//   a arrive   b fight   u skill, foe   e end turn   r retreat
//   f road     t take    n skip/leave   s buy   h heal   x restock
//   c camp     v event option   k stat, +1/-1   o confirm stats   p pick   z forget
export type Act = [number, string, ...number[]];

export const HEAL_SHARE = 0.3;
export const shopHealPrice = (r: RunState, healed: number) => Math.round((8 + r.stage * 0.8) * (1 + healed * 0.6));
export const restockPrice = (rerolls: number) => 5 + rerolls * 4;
export const napHeal = (r: RunState) => Math.round(maxHp(r) * 0.25);
export const forageShinies = (r: RunState) => 8 + Math.round(danger(r) * 1.5);

export class RunFlow {
  readonly r: RunState;
  phase: 'walk' | 'prompt' | 'fight' | 'step' | 'over' = 'walk';
  kind: FightKind | null = null;
  combat: Combat | null = null;
  step: Step | null = null;
  victory: Victory | null = null;
  // Set when the steps after a boss closed and the run moved on to a new area.
  areaChanged = false;
  ended: 'death' | 'retreat' | null = null;
  readonly acts: Act[] = [];
  private queue: Spec[] = [];
  private afterFork = false;
  private walkNext = WALK.long;
  private lastAt: number;

  constructor(
    r: RunState,
    private readonly clock: () => number = Date.now,
  ) {
    this.r = r;
    this.lastAt = clock();
  }

  get walkSeconds() {
    return this.walkNext.sec;
  }

  get walkMeters() {
    return this.walkNext.m;
  }

  private rec(code: string, ...args: number[]) {
    const t = this.clock();
    this.acts.push([Math.max(0, t - this.lastAt), code, ...args]);
    this.lastAt = t;
  }

  // ---------------------------------------------------------------- the road

  // The walk is over: what's next, a fight or a fork in the road.
  arrive(): boolean {
    if (this.phase !== 'walk') return false;
    this.rec('a');
    const r = this.r;
    r.distance += this.walkNext.m;
    this.walkNext = WALK.long;
    this.areaChanged = false;
    this.victory = null;
    roll(r, 'arrive');
    if (r.areaStage + 1 >= r.bossAt) {
      this.approach('boss');
      return true;
    }
    // A road stop every two or three fights.
    if (r.sinceStop >= 3 || (r.sinceStop >= 2 && rand() < 0.55)) {
      r.sinceStop = 0;
      this.afterFork = true;
      this.queue.push({ key: 'Fork' });
      this.openNext();
      return true;
    }
    this.approach(r.eliteNext || rand() < eliteChance(r) ? 'elite' : 'fight');
    return true;
  }

  private approach(kind: FightKind) {
    const r = this.r;
    const theme = themes.get(r.theme) ?? [...themes.values()][0];
    let foes: string[];
    let tiers: number[] = [];
    if (kind === 'boss') foes = bossFoes(r, theme.boss);
    else {
      const pick = kind === 'elite' ? pickElite(r, theme) : pickFoes(r, theme);
      foes = pick.ids;
      tiers = pick.tiers;
    }
    roll(r, 'combat');
    this.combat = new Combat(r, foes, danger(r), {
      elite: kind === 'elite',
      boss: kind === 'boss',
      tiers,
      hazard: theme.hazard,
      hooks: { shinies: () => r.shinies, addShinies: (n) => (r.shinies = Math.max(0, r.shinies + n)) },
    });
    fightStarts(r);
    this.kind = kind;
    this.phase = 'prompt';
  }

  retreat(): boolean {
    if (this.phase !== 'prompt') return false;
    this.rec('r');
    this.finish('retreat');
    return true;
  }

  // ---------------------------------------------------------------- fights

  begin(): Ev[] | false {
    if (this.phase !== 'prompt' || !this.combat) return false;
    this.rec('b');
    this.r.fights++;
    this.phase = 'fight';
    return this.after(this.combat.start());
  }

  // `foe` is the target's place in combat.foes (-1: none picked).
  use(i: number, foe = -1): Ev[] | false {
    const c = this.combat;
    if (this.phase !== 'fight' || !c || !c.canUse(i)) return false;
    this.rec('u', i, foe);
    return this.after(c.use(i, foe >= 0 ? c.foes[foe]?.uid : undefined));
  }

  // The turn ends by itself once no skill that costs AP can be used, and not before.
  endTurn(): Ev[] | false {
    const c = this.combat;
    if (this.phase !== 'fight' || !c || c.canSpend()) return false;
    this.rec('e');
    return this.after(c.endTurn());
  }

  foeIndex(uid: number | null | undefined) {
    return uid == null ? -1 : (this.combat?.foes.findIndex((f) => f.uid === uid) ?? -1);
  }

  private after(evs: Ev[]): Ev[] {
    const r = this.r;
    // Two or more kills in one turn pay a bonus.
    for (const e of evs) {
      if (e.t !== 'combo') continue;
      r.shinies += e.n * 2;
      r.shiniesEarned += e.n * 2;
    }
    const o = this.combat!.outcome();
    if (o === 'win') this.win();
    else if (o === 'lose') this.lose();
    return evs;
  }

  private win() {
    const c = this.combat!;
    const r = this.r;
    const boss = this.kind === 'boss';
    const elite = this.kind === 'elite';
    r.hp = c.hp;
    roll(r, 'after');
    const { xp, shinies } = fightRewards(r, c.killed);
    fightEnds(r, c, true);
    r.shinies += shinies;
    r.shiniesEarned += shinies;
    r.bestCombo = Math.max(r.bestCombo, c.bestCombo);
    r.stage++;
    r.areaStage++;
    r.sinceStop++;
    tickBlessings(r);
    if (boss) r.bosses++;
    if (elite) {
      r.elites++;
      r.eliteNext = false;
    }
    const ups = gainXp(r, xp);
    if (ups > 0) r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1 * ups));
    const aft = afterFight(r);
    this.victory = { xp, shinies, ups, ...aft, boss, elite };
    if (boss) this.queue.push({ key: 'Reward', title: 'BOSS LOOT', min: 2 });
    else if (elite) this.queue.push({ key: 'Reward', title: 'ELITE STASH', min: 2 });
    else if ((roll(r, 'drop'), rand() < 0.15 * rules(r).dropMul) && !rules(r).noDrops) {
      const it = randomItem(r, 0, 2);
      if (it) this.queue.push({ key: 'Reward', title: 'A CRITTER DROPPED THIS', fixed: [it.id] });
    }
    for (let k = 0; k < ups; k++) this.queue.push({ key: 'LevelUp' });
    this.openNext();
  }

  private lose() {
    fightEnds(this.r, this.combat!, false);
    this.r.hp = 0;
    this.finish('death');
  }

  private finish(reason: 'death' | 'retreat') {
    this.phase = 'over';
    this.ended = reason;
    this.step = null;
    this.queue = [];
  }

  // ---------------------------------------------------------------- steps (overlays)

  // Open the next queued step, rolling what it offers. With none left, the run walks
  // on (into a new area after a boss).
  private openNext() {
    const r = this.r;
    const spec = this.queue.shift();
    if (!spec) {
      this.step = null;
      if (this.victory?.boss && !this.areaChanged) this.changeArea();
      if (this.afterFork) this.walkNext = WALK.short;
      this.afterFork = false;
      this.phase = 'walk';
      return;
    }
    this.phase = 'step';
    // Daily runs: every player gets the same cards, roads and shop on the same stage.
    roll(r, spec.key);
    switch (spec.key) {
      case 'Reward': {
        let choices: ItemDef[] = [];
        if (spec.fixed) choices = spec.fixed.map((id) => items.get(id)!).filter(Boolean);
        else
          for (let i = 0; i < 3; i++) {
            const it = randomItem(r, spec.min ?? 0, 4, choices.map((c) => c.id));
            if (it) choices.push(it);
          }
        this.step = { key: 'Reward', title: spec.title, choices };
        return;
      }
      case 'LevelUp': {
        const step: Step = { key: 'LevelUp', statsOnly: !!spec.statsOnly, spent: { str: 0, def: 0, agi: 0, lck: 0, vit: 0 }, choices: null };
        this.step = step;
        // Points left from an earlier level-up were spent there: straight to the cards.
        if (r.statPoints <= 0) this.cards(step);
        return;
      }
      case 'Fork': {
        const picks: StopKind[] = [];
        while (picks.length < 2) {
          const total = STOP_KINDS.filter((k) => !picks.includes(k)).reduce((a, k) => a + STOP_WEIGHT[k], 0);
          let x = rand() * total;
          for (const k of STOP_KINDS) {
            if (picks.includes(k)) continue;
            x -= STOP_WEIGHT[k];
            if (x <= 0) {
              picks.push(k);
              break;
            }
          }
        }
        this.step = { key: 'Fork', picks };
        return;
      }
      case 'Shop':
        this.step = { key: 'Shop', stock: this.stock(), rerolls: 0, healed: 0 };
        return;
      case 'Camp':
        this.step = { key: 'Camp' };
        return;
      case 'Event':
        this.step = { key: 'Event', ev: pickEvent(r), result: null };
        return;
    }
  }

  private closeStep(next?: Spec) {
    if (next) this.queue.unshift(next);
    this.openNext();
  }

  private stock(): (ItemDef | null)[] {
    const out: (ItemDef | null)[] = [];
    for (let i = 0; i < 3; i++) out.push(randomItem(this.r, 0, 4, out.filter(Boolean).map((s) => s!.id)));
    return out;
  }

  private changeArea() {
    const r = this.r;
    r.area++;
    r.areaStage = 0;
    roll(r, 'area');
    r.bossAt = rollBossAt(r.area, rules(r).bossRush);
    r.theme = nextTheme(r);
    r.themesVisited.push(r.theme);
    this.areaChanged = true;
  }

  // Close a reward or level-up card step without taking anything, or leave the shop.
  skip(): boolean {
    const s = this.step;
    if (this.phase !== 'step' || !s) return false;
    if (s.key !== 'Reward' && s.key !== 'Shop' && !(s.key === 'LevelUp' && s.choices)) return false;
    this.rec('n');
    this.closeStep();
    return true;
  }

  take(i: number): boolean {
    const s = this.step;
    if (this.phase !== 'step' || s?.key !== 'Reward' || !s.choices[i]) return false;
    this.rec('t', i);
    equip(this.r, s.choices[i]);
    this.closeStep();
    return true;
  }

  road(i: number): boolean {
    const s = this.step;
    if (this.phase !== 'step' || s?.key !== 'Fork' || !s.picks[i]) return false;
    this.rec('f', i);
    const k = s.picks[i];
    this.closeStep(k === 'shop' ? { key: 'Shop' } : k === 'event' ? { key: 'Event' } : k === 'camp' ? { key: 'Camp' } : { key: 'Reward', title: 'TREASURE!', min: 1 });
    return true;
  }

  // ---------------------------------------------------------------- shop

  buy(i: number): boolean {
    const s = this.step;
    const r = this.r;
    const it = s?.key === 'Shop' ? s.stock[i] : null;
    if (this.phase !== 'step' || s?.key !== 'Shop' || !it || r.shinies < itemPrice(r, it)) return false;
    this.rec('s', i);
    r.shinies -= itemPrice(r, it);
    equip(r, it);
    s.stock[i] = null;
    return true;
  }

  // Healing gets pricier each time in the same shop and with depth: HP is the scarce resource.
  heal(): boolean {
    const s = this.step;
    const r = this.r;
    if (this.phase !== 'step' || s?.key !== 'Shop') return false;
    const price = shopHealPrice(r, s.healed);
    if (r.shinies < price || r.hp >= maxHp(r)) return false;
    this.rec('h');
    r.shinies -= price;
    s.healed++;
    r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * HEAL_SHARE));
    return true;
  }

  restock(): boolean {
    const s = this.step;
    const r = this.r;
    if (this.phase !== 'step' || s?.key !== 'Shop' || r.shinies < restockPrice(s.rerolls)) return false;
    this.rec('x');
    r.shinies -= restockPrice(s.rerolls);
    s.rerolls++;
    s.stock = this.stock();
    return true;
  }

  // ---------------------------------------------------------------- camp

  // 0 nap, 1 train (+1 stat point, then spend it), 2 forage.
  camp(i: number): boolean {
    const r = this.r;
    if (this.phase !== 'step' || this.step?.key !== 'Camp' || ![0, 1, 2].includes(i)) return false;
    if (i === 0 && rules(r).noNaps) return false;
    this.rec('c', i);
    if (i === 0) r.hp = Math.min(maxHp(r), r.hp + napHeal(r));
    else if (i === 2) {
      const n = forageShinies(r);
      r.shinies += n;
      r.shiniesEarned += n;
    } else {
      r.statPoints += 1;
      note(r, ['p', 1]);
      this.closeStep({ key: 'LevelUp', statsOnly: true });
      return true;
    }
    this.closeStep();
    return true;
  }

  // ---------------------------------------------------------------- events

  // Whether an event option can be picked right now (some cost shinies or health).
  canChoose(i: number) {
    const s = this.step;
    const o = s?.key === 'Event' && s.result === null ? s.ev.options[i] : undefined;
    return !!o && (!o.can || o.can(this.api()));
  }

  // Pick an option: its outcome shows in step.result until the scene moves on.
  choose(i: number): string | false {
    const s = this.step;
    if (this.phase !== 'step' || s?.key !== 'Event' || !this.canChoose(i)) return false;
    this.rec('v', i);
    const res = s.ev.options[i].run(this.api());
    if (this.r.hp <= 0) this.r.hp = 1;
    // Level-ups an event gave come right after it.
    this.closeStep();
    return res;
  }

  api(): RunAPI {
    const r = this.r;
    return {
      get hp() {
        return r.hp;
      },
      get maxHp() {
        return maxHp(r);
      },
      get shinies() {
        return r.shinies;
      },
      get danger() {
        return danger(r);
      },
      get stage() {
        return r.stage;
      },
      get theme() {
        return r.theme;
      },
      get itemCount() {
        return Object.values(r.gear).filter(Boolean).length;
      },
      addCaps: (n) => (r.bonusCaps += Math.round(n)),
      addBlessing: (id, fights) => addBlessing(r, id, fights),
      learnRandomSkill: () => {
        const owned = new Set(r.skills.map((s) => s.id));
        const pick = skillChoices(r, 6).find((s) => !owned.has(s.id) && r.skills.length < SKILL_SLOTS) ?? skillChoices(r, 1)[0];
        if (!pick) return '';
        learnSkill(r, pick.id);
        return pick.name;
      },
      upgradeRandomSkill: () => {
        const up = r.skills.filter((s) => s.lvl < (skills.get(s.id)?.max ?? 1));
        if (!up.length) return '';
        const o = up[Math.floor(rand() * up.length)];
        o.lvl++;
        return skills.get(o.id)!.name;
      },
      giveItem: (id) => {
        const it = items.get(id);
        if (!it) return '';
        equip(r, it);
        return it.name;
      },
      addShinies: (n) => {
        r.shinies = Math.max(0, r.shinies + Math.round(n));
        if (n > 0) r.shiniesEarned += Math.round(n);
      },
      hurt: (n) => (r.hp = Math.max(1, r.hp - Math.round(n))),
      heal: (n) => (r.hp = Math.min(maxHp(r), r.hp + Math.round(n))),
      addStat: (k: StatKey, n: number) => {
        const was = r.stats[k];
        r.stats[k] = Math.max(0, r.stats[k] + n);
        note(r, ['s', r.stats[k] - was]);
        r.hp = Math.min(r.hp, maxHp(r));
      },
      giveRandomItem: (min, max) => {
        const it = randomItem(r, min, max ?? 4);
        if (!it) return 'NOTHING';
        equip(r, it);
        return `${RARITY[it.rarity].name} ${it.name}`;
      },
      removeRandomItem: () => {
        const slots = Object.keys(r.gear).filter((k) => r.gear[k as keyof typeof r.gear]);
        if (!slots.length) return null;
        const k = slots[Math.floor(rand() * slots.length)] as keyof typeof r.gear;
        const name = items.get(r.gear[k]!.id)?.name ?? '';
        delete r.gear[k];
        r.hp = Math.min(r.hp, maxHp(r));
        return name;
      },
      addXp: (n) => {
        const ups = gainXp(r, n);
        for (let k = 0; k < ups; k++) this.queue.unshift({ key: 'LevelUp' });
      },
      addDistance: (m) => (r.distance += m),
      addHeat: (n) => (r.heat += n),
      eliteNext: () => (r.eliteNext = true),
    };
  }

  // ---------------------------------------------------------------- level-ups

  // Move one stat point (+1 or -1; only points placed in this level-up can come back).
  stat(k: number, d: number): boolean {
    const s = this.step;
    const r = this.r;
    const key = STAT_KEYS[k];
    if (this.phase !== 'step' || s?.key !== 'LevelUp' || s.choices || !key || (d !== 1 && d !== -1)) return false;
    if (d > 0 && r.statPoints <= 0) return false;
    if (d < 0 && s.spent[key] <= 0) return false;
    this.rec('k', k, d);
    r.stats[key] += d;
    r.statPoints -= d;
    s.spent[key] += d;
    if (key === 'vit') r.hp = Math.max(1, Math.min(maxHp(r), r.hp + 6 * d));
    return true;
  }

  // Every point spent: then the cards (or done, after training).
  confirm(): boolean {
    const s = this.step;
    if (this.phase !== 'step' || s?.key !== 'LevelUp' || s.choices || this.r.statPoints > 0) return false;
    this.rec('o');
    if (s.statsOnly) this.closeStep();
    else this.cards(s);
    return true;
  }

  private cards(s: Extract<Step, { key: 'LevelUp' }>) {
    s.choices = levelUpChoices(this.r, 3);
    if (!s.choices.length) this.closeStep();
  }

  pick(i: number): boolean {
    const s = this.step;
    const c = s?.key === 'LevelUp' ? s.choices?.[i] : undefined;
    if (this.phase !== 'step' || !c) return false;
    this.rec('p', i);
    if (c.kind === 'skill') learnSkill(this.r, c.def.id);
    else addPassive(this.r, c.def.id);
    this.closeStep();
    return true;
  }

  // With every slot full, a card can be traded for dropping one of your skills.
  forget(i: number): boolean {
    const s = this.step;
    const r = this.r;
    if (this.phase !== 'step' || s?.key !== 'LevelUp' || !s.choices || r.skills.length < SKILL_SLOTS || !r.skills[i]) return false;
    this.rec('z', i);
    forgetSkill(r, r.skills[i].id);
    this.closeStep();
    return true;
  }

  // ---------------------------------------------------------------- replay

  // Apply one logged choice. False when it isn't allowed at that point of the run.
  apply(a: Act): boolean {
    const [, code, x = -1, y = -1] = a;
    switch (code) {
      case 'a':
        return this.arrive();
      case 'b':
        return this.begin() !== false;
      case 'u':
        return this.use(x, y) !== false;
      case 'e':
        return this.endTurn() !== false;
      case 'r':
        return this.retreat();
      case 'f':
        return this.road(x);
      case 't':
        return this.take(x);
      case 'n':
        return this.skip();
      case 's':
        return this.buy(x);
      case 'h':
        return this.heal();
      case 'x':
        return this.restock();
      case 'c':
        return this.camp(x);
      case 'v':
        return this.choose(x) !== false;
      case 'k':
        return this.stat(x, y);
      case 'o':
        return this.confirm();
      case 'p':
        return this.pick(x);
      case 'z':
        return this.forget(x);
      default:
        return false;
    }
  }
}

function pickEvent(r: RunState): EventDef {
  const d = danger(r);
  const pool = events.filter((e) => (!e.minDanger || d >= e.minDanger) && (!e.themes || e.themes.includes(r.theme)));
  // Theme-specific events are rarer overall, so give them a nudge when they fit.
  const w = (e: EventDef) => (e.weight ?? 1) * (e.themes ? 2 : 1);
  const total = pool.reduce((a, e) => a + w(e), 0);
  let x = rand() * total;
  for (const e of pool) {
    x -= w(e);
    if (x <= 0) return e;
  }
  return pool[0];
}
