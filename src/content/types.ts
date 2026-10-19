// Shared shapes for everything a content pack can add. Adding content means writing data
// against these types; the core game only reads from the registry.

export type Rarity = 0 | 1 | 2 | 3 | 4;
export type Tag = 'speed' | 'tank' | 'scav' | 'crit' | 'trash';
export type Slot = 'head' | 'face' | 'body' | 'back' | 'paw' | 'tail' | 'aura';
export type StatKey = 'str' | 'def' | 'agi' | 'lck' | 'vit';
// poison: loses N at turn start, then N-1   burn: loses N at turn start, then N halves
// bleed: loses N more every time it is hit, fades 1 a turn   chill: 5 stacks freeze (stun)
// mark: hits on it always crit, one mark per hit   regen: heals N at turn start, then N-1
// focus (raccoon): your next N hits crit   evade (raccoon): dodge the next N hits this round
// fuse (foe): blows up when it runs out   shell (foe): each hit only cracks one layer
// taunt (foe): your single-target skills must hit it
export type StatusKey = 'poison' | 'weak' | 'vuln' | 'stun' | 'rage' | 'thorns' | 'burn' | 'bleed' | 'mark' | 'chill' | 'focus' | 'evade' | 'regen' | 'fuse' | 'shell' | 'taunt';

// ---------------------------------------------------------------- player

// Bonuses that items and set bonuses add on top of the trained stats.
export interface Bonus {
  str: number;
  def: number;
  agi: number;
  lck: number;
  vit: number;
  ap: number; // extra action points per turn
  critMult: number; // added to the base 1.75x
  shinyMult: number; // added to 1x
  discount: number; // 0..1 off shop prices
  dodge: number; // added to the agility dodge chance
  dmg: number; // +fraction damage (passives)
  hp: number; // flat max health (passives)
  crit: number; // added to crit chance (passives)
  armor: number; // fraction of damage cut on top of DEF (passives)
  taken: number; // +fraction damage taken (drawbacks; negative takes less)
  healMul: number; // +fraction healing received (drawbacks use negative)
  hpMul: number; // +fraction max health
  xp: number; // +fraction XP from fights
}

// Mechanics items switch on. Values add up across items.
export type FxKey =
  | 'thorns' // attackers take this much damage
  | 'hurtBlock' // gain block when hit
  | 'startBlock' // block at the start of every turn
  | 'firstStrike' // damage to all foes when a fight starts
  | 'laser' // damage to the toughest foe at the start of each turn
  | 'flies' // damage to a random foe at the end of each turn
  | 'stink' // poison all foes at the start of a fight
  | 'chain' // single-target hits splash this fraction to a random other foe (%)
  | 'execute' // crits kill foes under this % hp
  | 'killHeal' // heal on kill
  | 'killAp' // gain AP on kill (combo)
  | 'rage' // +% damage while under 35% hp
  | 'moneyArmor' // block per 10 shinies held, each turn
  | 'interest' // % of held shinies gained after each fight
  | 'firstCrit' // the first attack each fight always crits
  | 'dodgeStrike' // dodging hits back for this much
  | 'regen' // heal this much at the start of each turn
  | 'splash' // single-target hits also hit every other foe for this % of the damage
  | 'boomerang' // at the end of your turn, hit all foes for this much
  | 'killBurst' // kills deal this much to all other foes
  // ---- on-hit: your skill hits do this to whatever they hit
  | 'lifesteal' // heal this % of damage dealt
  | 'poisonHit' // poison this much
  | 'burnHit' // burn this much
  | 'bleedHit' // bleed this much
  | 'chillHit' // chill this much
  | 'stunChance' // % chance to stun (not bosses)
  | 'goldHit' // gain this many shinies
  | 'hpDmg' // add this % of your max health to the hit
  | 'blockDmg' // add this % of your block to the hit
  | 'critHeal' // heal this on a crit
  | 'critBlock' // gain this much block on a crit
  // ---- damage multipliers (%)
  | 'bossDmg' // vs bosses and elites
  | 'aoeDmg' // skills that hit every foe
  | 'soloDmg' // single-target skills
  | 'stunDmg' // vs stunned foes
  | 'debuffDmg' // per kind of debuff on the target
  | 'ambush' // during your first turn
  | 'slowBurn' // per turn the fight has lasted (from turn 2)
  | 'crowd' // per living foe beyond the first
  | 'duel' // when only one foe is left
  | 'richDmg' // per 10 shinies held (up to +100%)
  | 'statusAmp' // poison, burn and bleed you apply
  // ---- turn and fight flow
  | 'multiHit' // skills that hit more than once hit this many more times
  | 'echo' // % chance a skill fires a second time for free
  | 'refund' // % chance a skill gives its AP back
  | 'quickCd' // % chance each turn that cooldowns tick twice
  | 'startAp' // extra AP on your first turn
  | 'focusStart' // start fights with this many sure crits
  | 'evadeStart' // dodge this many hits in the first round
  | 'markStart' // every foe starts marked this many times
  | 'blockKeep' // keep this % of your block into the next turn
  | 'spikeBlock' // when block soaks a hit, the attacker takes this % of what was soaked
  | 'overBlock' // healing beyond full health becomes block (this % of it)
  | 'dodgeHeal' // heal this when you dodge
  | 'killBlock' // gain this much block on a kill
  | 'killFocus' // a kill gives this many sure crits
  | 'poisonSpread' // when a poisoned foe dies, this % of its poison jumps to the others
  | 'cheatDeath' // once a fight, a lethal hit leaves you at 1 health
  | 'trip' // % chance a foe trips and loses its turn
  | 'chaos' // every turn something random happens, good or bad
  | 'fightHeal' // heal this % of max health after each fight
  // ---- drawbacks
  | 'turnHurt' // lose this much health at the start of each turn
  | 'selfPoison' // you start each fight poisoned this much
  | 'foeHp' // foes have this % more health
  | 'foeDmg' // foes deal this % more damage
  | 'cdPlus' // every skill waits this many more turns
  | 'fightTax' // lose this % of your shinies after each fight
  | 'fightHurt'; // lose this % of max health after each fight

export type Fx = Partial<Record<FxKey, number>>;

// A piece of gear drawn on the raccoon. x/y place the top-left pixel of `rows`
// relative to the anchor point (see gfx/coon.ts ANCHORS), so it follows the animation.
export interface Gear {
  anchor: 'head' | 'face' | 'body' | 'back' | 'paw' | 'tail';
  rows: string[];
  x: number;
  y: number;
  behind?: boolean; // drawn behind the raccoon (backpacks, capes)
  alt?: string[]; // optional second animation frame
}

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  slot: Slot;
  tags: Tag[];
  desc: string;
  icon?: string[]; // defaults to the gear art
  gear?: Gear[];
  bonus?: (b: Bonus, lvl: number) => void;
  fx?: (lvl: number) => Fx;
  needsBoss?: boolean; // only appears after the player has ever beaten a boss
  set?: string; // id of the SetDef this piece belongs to
  risky?: boolean; // has a real drawback; the card says so
  pack?: string;
}

// A themed set: wearing at least `n` of its pieces switches on each bonus (2 is always
// the first step; bigger sets add more steps).
export interface SetBonus {
  n: number;
  desc: string;
  bonus?: (b: Bonus) => void;
  fx?: Fx;
}

export interface SetDef {
  id: string;
  name: string;
  color: number;
  risky?: boolean; // its bonuses come with drawbacks
  pieces: string[]; // item ids, one per slot
  bonuses: SetBonus[];
}

// ---------------------------------------------------------------- skills

export type Target = 'one' | 'all' | 'self' | 'random';

export interface SkillEffect {
  dmg?: number; // multiplier of attack power
  hits?: number;
  block?: number; // flat block, plus DEF scaling
  heal?: number; // fraction of max hp
  apply?: Partial<Record<StatusKey, number>>; // statuses on the target(s)
  self?: Partial<Record<StatusKey, number>>; // statuses on yourself
  crit?: boolean; // always crits
  ap?: number; // gain AP
  hpCost?: number; // lose hp
  scale?: StatKey; // which stat scales the damage (default str)
  // ---- added with the big skill book
  hpPct?: number; // lose this fraction of max health
  pierce?: boolean; // ignores armor and block
  lifesteal?: number; // heal this fraction of the damage dealt
  blockDmg?: number; // add this fraction of your block to the damage
  spendBlock?: boolean; // and the block is used up
  missing?: number; // +this much damage at 0 health, in step with health missing
  per?: { key: StatusKey; mult: number }; // +mult damage per stack of key on the target
  detonate?: { key: StatusKey; mult: number }; // removes key from the target: mult damage per stack, like poison it ignores armor
  execute?: number; // a hit foe (not a boss) left under this fraction of health dies
  shiny?: number; // add this many damage per shiny held
  shinyCost?: number; // costs this many shinies (cannot be used without them)
  cleanse?: boolean; // clears poison, burn, bleed, weak and vuln from you
  refresh?: boolean; // every other skill comes off cooldown
  allAp?: boolean; // spends all AP left: one more hit for each
  combo?: number; // +this much damage per skill already used this turn
  gamble?: number; // chance the damage triples; otherwise it halves
  stack?: number; // +this much damage every time it was used this fight
  pctHp?: number; // + this fraction of the target's current health (a third vs bosses)
  crowd?: number; // +this much damage per other living foe
  spread?: StatusKey; // after the hit, copy the target's stacks of this to every foe
  shatter?: boolean; // strips the target's block first
  maxHpDmg?: number; // add this fraction of your max health to the damage
  killAp?: number; // AP back if this kills
  killHeal?: number; // heal this fraction of max health if this kills
  blockMul?: number; // multiply your block after the skill
  steal?: boolean; // single target: take its buffs (rage, thorns, regen)
}

// What a skill can scale with besides its own rank: the raccoon's level and stats.
export interface SkillCtx {
  level: number;
  stats: Record<StatKey, number>;
}

// Level-locked skills ask for a character level, stat-locked ones for a stat, some both.
export interface SkillReq {
  level?: number;
  stat?: StatKey;
  min?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: (lvl: number, ctx?: SkillCtx) => string;
  icon: string[];
  cost: number; // action points
  cooldown: number; // turns
  target: Target;
  max: number;
  effect: (lvl: number, ctx?: SkillCtx) => SkillEffect;
  req?: SkillReq;
  pack?: string;
  look?: string; // 'shape/ink' as written in the book; the ink is the skill's element (combat FX)
}

// ---------------------------------------------------------------- enemies

export type Intent = 'attack' | 'multi' | 'block' | 'buff' | 'debuff' | 'heal' | 'summon' | 'charge' | 'steal' | 'flee';

export interface MoveDef {
  id: string;
  name: string;
  intent: Intent;
  dmg?: number;
  hits?: number;
  block?: number;
  heal?: number; // fraction of own max hp
  apply?: Partial<Record<StatusKey, number>>; // on the player
  buff?: Partial<Record<StatusKey, number>>; // on self/allies
  allies?: boolean; // buff and heal go to all living allies (including itself)
  guard?: boolean; // block goes to the weakest ally
  summon?: string;
  steal?: number;
  apDrain?: number; // the player gets fewer AP next turn
  drain?: number; // heals itself this share of the damage it deals
  mirror?: number; // hits back for this share of the raccoon's biggest hit this turn (no dmg needed)
  flee?: boolean; // leaves the fight (no XP), with any shinies it stole
  blast?: boolean; // the fuse ran out: this hit and then it is gone (no XP)
  weight?: number;
  after?: string; // forced follow-up move (for wind-ups)
  once?: boolean;
}

export type Role = 'brute' | 'guard' | 'support' | 'trickster' | 'charger';

export interface EnemyDef {
  id: string;
  name: string;
  family?: string; // which family it belongs to (themes pick foes by family)
  role?: Role;
  minStage?: number; // earliest stage it may show up in a normal fight
  armor?: number; // flat damage removed from every non-crit hit
  regen?: number; // heals this much at the start of its turn
  // Bosses: at this fraction of health they switch to a second move set.
  phase2?: { at: number; name: string; moves: MoveDef[]; frames?: string[][]; heal?: number };
  frames: string[][];
  fps?: number;
  hp: number;
  dodge?: number;
  moves: MoveDef[];
  opener?: string; // first move
  xp: number;
  shinies: number;
  colors: number[]; // death burst palette
  flyer?: boolean;
  boss?: boolean;
  onDeath?: 'revive' | 'burst' | 'split';
  split?: string; // enemy id spawned twice when it dies with onDeath 'split'
  fuse?: number; // turns until it uses its blast move and is gone
  shell?: number; // starts with this many shell layers
  twin?: boolean; // gets back up if another twin is still standing when the turn ends
  pair?: string; // enemy id that always comes along (its twin)
}

export interface EncounterDef {
  id: string;
  minDanger: number;
  maxDanger?: number;
  weight: number;
  foes: string[];
}

// ---------------------------------------------------------------- events

// Temporary effects that last for a number of fights. Blessings help, curses hurt.
export type BlessingId =
  | 'shield' // start each fight with 10 block (scales with stage)
  | 'sharp' // +25% damage
  | 'lucky' // +15% crit chance
  | 'friend' // a critter friend bites a random foe each turn
  | 'swift' // +1 AP every turn
  | 'slow' // curse: -1 AP every turn
  | 'fragile' // curse: take 25% more damage
  | 'hexed'; // curse: foes start fights with block

export interface RunAPI {
  hp: number;
  maxHp: number;
  shinies: number;
  danger: number; // current difficulty, grows by about 1 per stage
  stage: number; // stages cleared this run
  theme: string; // current theme id
  itemCount: number;
  addCaps(n: number): void; // Bottle Caps, the meta currency kept after the run
  addBlessing(id: BlessingId, fights: number): void;
  learnRandomSkill(): string; // returns the skill name, or '' if none left
  upgradeRandomSkill(): string; // returns the skill name, or '' if none
  giveItem(id: string): string; // returns the item name
  addShinies(n: number): void;
  hurt(n: number): void;
  heal(n: number): void;
  addStat(k: StatKey, n: number): void;
  giveRandomItem(minRarity: number, maxRarity?: number): string;
  removeRandomItem(): string | null;
  addXp(n: number): void;
  addDistance(m: number): void;
  addHeat(n: number): void;
  eliteNext(): void;
}

export interface EventOption {
  label: string;
  detail: string;
  can?: (r: RunAPI) => boolean;
  run: (r: RunAPI) => string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string[];
  art?: string; // texture key of an existing sprite (e.g. an enemy id + '_0')
  artRows?: string[]; // or a pixel map drawn for this event (max 48x32)
  minDanger?: number;
  weight?: number; // default 1
  themes?: string[]; // only happens in these theme ids (default: anywhere)
  options: EventOption[];
}

// ---------------------------------------------------------------- areas

export interface AreaHazard {
  name: string; // shown in the fight HUD
  every: number; // turns between triggers
  desc: string;
  // pot: something falls on a random fighter (foes take double)
  // fumes: poison everyone   sprinkler: washes away your block
  // quake: everyone takes damage   spores: weakens everyone   lightning: a big hit on a random fighter
  kind: 'pot' | 'fumes' | 'sprinkler' | 'quake' | 'spores' | 'lightning';
  power: number;
}

export interface BiomeDef {
  id: string;
  name: string;
  sky: [string, string]; // gradient top/bottom
  paintFar: (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, pal: Record<string, string>) => void;
  paintNear: (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, pal: Record<string, string>) => void;
  paintGround: (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, pal: Record<string, string>) => void;
  encounters: EncounterDef[];
  elites: string[];
  boss: string;
  hazard?: AreaHazard;
}

export interface PackDef {
  id: string;
  name: string;
  biome?: BiomeDef;
  enemies?: EnemyDef[];
  encounters?: EncounterDef[]; // available in every area
  items?: ItemDef[];
  skills?: SkillDef[];
  events?: EventDef[];
}
