import Phaser from 'phaser';

export type Kind = 'rat' | 'pigeon' | 'cat' | 'crow' | 'dog' | 'can' | 'van' | 'ratking';

export interface FoeDef {
  tex: string;
  anim?: string;
  hp: number;
  hw: number; // hitbox half sizes
  hh: number;
  touch: boolean; // hurts on contact
  score: number;
  boss?: boolean;
}

export const FOES: Record<Kind, FoeDef> = {
  rat: { tex: 'rat_0', anim: 'rat_run', hp: 2, hw: 4, hh: 4, touch: true, score: 10 },
  pigeon: { tex: 'pigeon_0', anim: 'pigeon_fly', hp: 1, hw: 5, hh: 4, touch: true, score: 10 },
  cat: { tex: 'cat_0', anim: 'cat_walk', hp: 6, hw: 5, hh: 5, touch: true, score: 25 },
  crow: { tex: 'crow_0', anim: 'crow_fly', hp: 4, hw: 5, hh: 4, touch: true, score: 30 },
  dog: { tex: 'dog_0', anim: 'dog_walk', hp: 16, hw: 6, hh: 6, touch: true, score: 50 },
  can: { tex: 'can', hp: 4, hw: 5, hh: 6, touch: false, score: 5 },
  van: { tex: 'van_0', anim: 'van_siren', hp: 110, hw: 15, hh: 11, touch: true, score: 500, boss: true },
  ratking: { tex: 'ratking_0', anim: 'ratking_walk', hp: 120, hw: 9, hh: 10, touch: true, score: 500, boss: true },
};

export class Foe extends Phaser.GameObjects.Sprite {
  kind: Kind;
  def: FoeDef;
  hp: number;
  maxHp: number;
  t = 0; // age in seconds
  st = 0; // behaviour state
  stT = 0; // time in current state
  vx = 0;
  vy = 0;
  ax = 0; // generic scratch values
  ay = 0;
  shootT = 0;
  spd = 1;
  elite = false;
  dead = false;
  flashT = 0;
  orbitCd = 0;
  shadow: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, kind: Kind, x: number, y: number, hpMul: number, spd: number) {
    const def = FOES[kind];
    super(scene, x, y, def.tex);
    this.kind = kind;
    this.def = def;
    this.maxHp = this.hp = Math.max(1, Math.round(def.hp * hpMul));
    this.spd = spd;
    if (def.anim) this.play({ key: def.anim, startFrame: Math.floor(Math.random() * 2) });
    scene.add.existing(this);
    this.setDepth(def.boss ? 4 : kind === 'can' ? 1 : 3);
    // Flyers cast a shadow further below, which sells the height.
    const sw = (def.hw * 2) / 12;
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(0).setScale(sw, Math.max(1, sw * 0.8));
    this.syncShadow();
  }

  syncShadow() {
    if (!this.shadow) return;
    const lift = this.kind === 'pigeon' || this.kind === 'crow' ? 9 : 2;
    this.shadow.setPosition(this.x, this.y + this.def.hh + lift);
    this.shadow.setAlpha(this.alpha);
  }

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    this.shadow = null;
    super.destroy(fromScene);
  }

  makeElite() {
    this.elite = true;
    this.hp = this.maxHp = Math.round(this.maxHp * 1.8);
    this.spd *= 1.2;
    this.restoreTint();
  }

  restoreTint() {
    if (this.elite) this.setTint(0xff9a9a);
    else this.clearTint();
  }

  flash() {
    this.flashT = 0.06;
    this.setTintFill(0xffffff);
  }
}
