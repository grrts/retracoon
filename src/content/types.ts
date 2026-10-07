// Shared shapes for everything a content pack can add. Adding content means writing data
// against these types; the core game only reads from the registry.

export type Rarity = 0 | 1 | 2 | 3 | 4;
export type Tag = 'speed' | 'tank' | 'scav' | 'crit' | 'trash';
export type Slot = 'head' | 'face' | 'body' | 'back' | 'paw' | 'tail' | 'aura';
export type StatKey = 'str' | 'def' | 'agi' | 'lck' | 'vit';
export type StatusKey = 'poison' | 'weak' | 'vuln' | 'stun' | 'rage' | 'thorns';

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
  | 'killBurst'; // kills deal this much to all other foes

export type Fx = Partial<Record<FxKey, number>>;

export interface Gear {
  rows: string[];
  x: number; // offset from the raccoon sprite's top-left corner
  y: number;
  behind?: boolean;
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
  pack?: string;
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
}

export interface SkillDef {
  id: string;
  name: string;
  desc: (lvl: number) => string;
  icon: string[];
  cost: number; // action points
  cooldown: number; // turns
  target: Target;
  max: number;
  effect: (lvl: number) => SkillEffect;
  pack?: string;
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
  allies?: boolean; // buff/block/heal goes to all allies
  guard?: boolean; // block goes to the weakest ally
  summon?: string;
  steal?: number;
  apDrain?: number; // the player gets fewer AP next turn
  weight?: number;
  after?: string; // forced follow-up move (for wind-ups)
  once?: boolean;
}

export interface EnemyDef {
  id: string;
  name: string;
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
  onDeath?: 'revive' | 'burst';
}

export interface EncounterDef {
  id: string;
  minDanger: number;
  maxDanger?: number;
  weight: number;
  foes: string[];
}

// ---------------------------------------------------------------- events

export interface RunAPI {
  hp: number;
  maxHp: number;
  shinies: number;
  danger: number;
  itemCount: number;
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
  art?: string;
  minDanger?: number;
  options: EventOption[];
}

// ---------------------------------------------------------------- areas

export interface AreaHazard {
  name: string; // shown in the fight HUD
  every: number; // turns between triggers
  desc: string;
  kind: 'pot' | 'fumes' | 'sprinkler';
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
