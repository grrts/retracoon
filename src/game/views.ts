import Phaser from 'phaser';
import type { ItemDef, Slot } from '../content/types';
import { items, skins, RARITY, SLOT_NAMES, TAGS } from '../content/registry';
import { RunState, tagCounts } from './run';
import { text, panel, wrapPx, LINE_H } from '../ui';
import { ANCHORS, ANCHOR_PART, COON_H, POSE_OFFSETS, Pose } from '../gfx/coon';
import { coonKey, ensureCoon } from '../gfx/coonTex';
import { mainColor } from '../gfx/pixels';
import type { Gear } from '../content/types';

type Anim = 'idle' | 'walk' | 'attack' | 'hurt';

interface GearImg {
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  key: string;
  alt?: string;
  g: Gear;
  rarity: number;
  lvl: number;
}

// Top-left of the base sprite relative to the container origin (feet at 0,0).
const OX = -18;
const OY = -COON_H;

// The raccoon, drawn with its skin and every equipped item on top. The character is the
// inventory: rarer and higher-level gear glows, a full kit shines, set banners fly.
export class RaccoonView extends Phaser.GameObjects.Container {
  base: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private gear: GearImg[] = [];
  private extras: Phaser.GameObjects.GameObject[] = [];
  private auraColors: number[] = [];
  private effect?: string;
  private effectColor = 0xffffff;
  private skin = 'classic';
  private fullKit = false;
  anim: Anim = 'idle';
  private t = 0;
  private animT = 0;
  private altOn = false;
  private emitT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, run?: RunState | null, skinId?: string) {
    super(scene, x, y);
    this.skin = ensureCoon(scene, skinId ?? 'classic');
    this.glow = scene.add.image(OX - 1, OY - 1, `coon_${this.skin}_glow`).setOrigin(0).setTint(0xffcd75).setAlpha(0);
    this.base = scene.add.image(OX, OY, coonKey(this.skin, 'idle0')).setOrigin(0);
    this.add([this.glow, this.base]);
    scene.add.existing(this);
    this.setGear(run ?? null);
  }

  setSkin(id: string, run?: RunState | null) {
    this.skin = ensureCoon(this.scene, id);
    this.glow.setTexture(`coon_${this.skin}_glow`);
    this.setGear(run ?? null);
  }

  // Rebuild every attached piece: outfit from the skin, then the run's gear.
  setGear(run: RunState | null, lastGear?: { slot: string; id: string; lvl: number }[]) {
    this.gear.forEach((g) => (g.img.destroy(), g.glow?.destroy()));
    this.extras.forEach((e) => e.destroy());
    this.gear = [];
    this.extras = [];
    this.auraColors = [];
    const skin = skins.get(this.skin);
    this.effect = skin?.effect;
    this.effectColor = skin?.glow ? parseInt(skin.glow.slice(1), 16) : 0xffffff;

    const pieces: { g: Gear; key: string; alt?: string; rarity: number; lvl: number }[] = [];
    skin?.outfit?.forEach((g, i) => pieces.push({ g, key: `outfit_${this.skin}_${i}`, alt: g.alt ? `outfit_${this.skin}_${i}_alt` : undefined, rarity: 0, lvl: 1 }));

    const owned: { slot: string; id: string; lvl: number }[] = run
      ? Object.entries(run.gear)
          .filter(([, o]) => !!o)
          .map(([slot, o]) => ({ slot, id: o!.id, lvl: o!.lvl }))
      : lastGear ?? [];
    const order: Slot[] = ['back', 'tail', 'body', 'paw', 'face', 'head', 'aura'];
    for (const slot of order) {
      const o = owned.find((x) => x.slot === slot);
      const def = o && items.get(o.id);
      if (!def) continue;
      if (slot === 'aura') {
        this.auraColors.push(def.icon ? mainColor(def.icon) : RARITY[def.rarity].color);
        continue;
      }
      def.gear?.forEach((g, i) => pieces.push({ g, key: `gear_${def.id}_${i}`, alt: g.alt ? `gear_${def.id}_${i}_alt` : undefined, rarity: def.rarity, lvl: o!.lvl }));
    }

    const behind: GearImg[] = [];
    const front: GearImg[] = [];
    for (const p of pieces) {
      if (!this.scene.textures.exists(p.key)) continue;
      const img = this.scene.add.image(0, 0, p.key).setOrigin(0);
      let glow: Phaser.GameObjects.Image | undefined;
      // Rare and better gear (and anything levelled to 2+) gets a coloured outline.
      if ((p.rarity >= 2 || p.lvl >= 2) && this.scene.textures.exists(p.key.replace('gear_', 'gearglow_'))) {
        const col = p.rarity >= 2 ? RARITY[p.rarity].color : 0xf4f4f4;
        glow = this.scene.add.image(0, 0, p.key.replace('gear_', 'gearglow_')).setOrigin(0).setTint(col).setAlpha(p.rarity >= 2 ? 0.9 : 0.5);
      }
      const gi: GearImg = { img, glow, key: p.key, alt: p.alt, g: p.g, rarity: p.rarity, lvl: p.lvl };
      (p.g.behind ? behind : front).push(gi);
    }
    // behind pieces go under the body
    behind.reverse().forEach((g) => {
      this.addAt(g.img, 0);
      if (g.glow) this.addAt(g.glow, 0);
    });
    front.forEach((g) => {
      if (g.glow) this.add(g.glow);
      this.add(g.img);
    });
    this.gear = [...behind, ...front];

    // Loot pile: the more shinies you carry, the bigger the sack on your back.
    if (run && run.shinies >= 25) {
      const size = run.shinies >= 200 ? 3 : run.shinies >= 80 ? 2 : 1;
      const sack = this.scene.add.image(OX + ANCHORS.back.x - 8 - size, OY + ANCHORS.back.y - 3 - size * 2, `sack${size}`).setOrigin(0);
      this.addAt(sack, 0);
      this.extras.push(sack);
    }
    // Set banners: a little flag per active set bonus.
    if (run) {
      const t = tagCounts(run);
      let i = 0;
      for (const [k, n] of Object.entries(t)) {
        if (n < 2) continue;
        const flag = this.scene.add.image(OX + 4 + i * 4, OY - 2, n >= 4 ? 'flag_big' : 'flag').setOrigin(0, 1).setTint(TAGS[k].color);
        this.addAt(flag, 0);
        this.extras.push(flag);
        i++;
      }
    }
    // A full kit (every slot filled) makes the raccoon shine.
    this.fullKit = !!run && (['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'] as Slot[]).every((s) => run.gear[s]);
    this.glow.setAlpha(this.fullKit ? 0.6 : 0);
    this.place();
  }

  play(a: Anim, hold = 0.25) {
    this.anim = a;
    this.animT = a === 'attack' || a === 'hurt' ? hold : 0;
  }

  private pose(): Pose {
    if (this.anim === 'idle') return Math.floor(this.t * 2) % 2 === 1 ? 'idle1' : 'idle0';
    if (this.anim === 'walk') return Math.floor(this.t * 8) % 2 === 0 ? 'walk0' : 'walk1';
    return this.anim;
  }

  private place() {
    const pose = this.pose();
    this.base.setTexture(coonKey(this.skin, pose));
    const off = POSE_OFFSETS[pose];
    for (const g of this.gear) {
      const a = ANCHORS[g.g.anchor];
      const [dx, dy] = off[ANCHOR_PART[g.g.anchor]];
      const x = OX + a.x + g.g.x + dx;
      const y = OY + a.y + g.g.y + dy;
      g.img.setPosition(x, y);
      g.glow?.setPosition(x - 1, y - 1);
    }
  }

  update(dt: number) {
    this.t += dt;
    if (this.animT > 0) {
      this.animT -= dt;
      if (this.animT <= 0 && (this.anim === 'attack' || this.anim === 'hurt')) this.anim = 'idle';
    }
    this.place();
    const alt = Math.floor(this.t * 8) % 2 === 0;
    if (alt !== this.altOn) for (const g of this.gear) if (g.alt) g.img.setTexture(alt ? g.alt : g.key);
    this.altOn = alt;
    // Epic gear pulses, legendary gear pulses and sparkles, level 3 gear flashes.
    for (const g of this.gear) {
      if (g.glow && g.rarity >= 3) g.glow.setAlpha(0.55 + 0.45 * Math.sin(this.t * 4));
      if (g.lvl >= 3) {
        if (Math.floor(this.t * 10) % 20 === 0) g.img.setTintFill(0xffffff);
        else g.img.clearTint();
      }
    }
    if (this.fullKit) this.glow.setAlpha(0.35 + 0.3 * Math.sin(this.t * 3));
    this.emitT -= dt;
    if (this.emitT <= 0 && this.visible && this.alpha > 0.5) {
      this.emitT = 0.12;
      for (const c of this.auraColors) if (Math.random() < 0.5) this.puff('pt_dot', c, 0.5);
      if (this.gear.some((g) => g.rarity >= 4) && Math.random() < 0.4) this.puff('pt_spark', 0xffa300, 0.6);
      if (this.effect) this.skinEffect();
    }
  }

  private skinEffect() {
    const e = this.effect;
    if (e === 'sparkle' && Math.random() < 0.5) this.puff('pt_spark', 0xfff3b0, 0.7);
    if (e === 'hearts' && Math.random() < 0.3) this.puff('pt_heart', 0xff77c8, 0.8);
    if (e === 'snow' && Math.random() < 0.5) this.puff('pt_flake', 0xf4f4f4, 0.8, true);
    if (e === 'flames' && Math.random() < 0.6) this.puff('pt_flame', Math.random() < 0.5 ? 0xffa300 : 0xff4b1f, 0.7);
    if (e === 'bubbles' && Math.random() < 0.3) this.puff('pt_bubble', 0x73eff7, 0.8);
    if (e === 'notes' && Math.random() < 0.25) this.puff('pt_note', 0xffcd75, 0.9);
    if (e === 'glow') this.glow.setTint(this.effectColor).setAlpha(Math.max(this.glow.alpha, 0.4 + 0.3 * Math.sin(this.t * 3)));
    if (e === 'trail' && this.anim === 'walk') this.puff('pt_dot', this.effectColor, 0.6, false, true);
  }

  private puff(key: string, tint: number, alpha: number, falling = false, trail = false) {
    const sx = this.scaleX;
    const x = this.x + (trail ? -14 * sx : Phaser.Math.Between(-16, 16) * sx);
    const y = this.y - Phaser.Math.Between(trail ? 2 : 4, trail ? 8 : COON_H + 4) * this.scaleY;
    const p = this.scene.add.image(x, y, key).setTint(tint).setDepth(this.depth + (Math.random() < 0.5 ? 1 : -1)).setAlpha(alpha).setScale(sx > 1 ? Math.max(1, Math.floor(sx / 2)) : 1);
    this.scene.tweens.add({
      targets: p,
      y: p.y + (falling ? 10 : -10) * this.scaleY,
      x: p.x + (trail ? -12 : 0),
      alpha: 0,
      duration: 800,
      onComplete: () => p.destroy(),
    });
  }
}

// A card describing an item, used by rewards and the shop. Text wraps to the card.
export function itemCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, def: ItemDef, run: RunState | null, extra?: string) {
  const c = scene.add.container(Math.round(x), Math.round(y));
  const g = scene.add.graphics();
  const rar = RARITY[def.rarity];
  panel(g, -w / 2, -h / 2, w, h, 0x29366f, rar.color, 0x3b5dc9);
  c.add(g);
  const icon = scene.add.image(-w / 2 + 16, -h / 2 + 16, `item_${def.id}`);
  const s = Math.min(2, 24 / Math.max(icon.width, icon.height));
  icon.setScale(Math.max(1, Math.floor(s)));
  c.add(icon);
  const left = -w / 2 + 31;
  c.add(text(scene, left, -h / 2 + 10, def.name, { origin: 0, color: 0xf4f4f4, maxWidth: w - 36, maxLines: 1 }));
  c.add(text(scene, left, -h / 2 + 20, `${rar.name}`, { origin: 0, color: rar.color }));
  const lines = wrapPx(def.desc, w - 12).slice(0, 4);
  lines.forEach((ln, i) => c.add(text(scene, -w / 2 + 6, -h / 2 + 36 + i * LINE_H, ln, { origin: 0, color: 0xc9d1dd })));
  let tx = -w / 2 + 6;
  for (const t of def.tags) {
    const tag = TAGS[t];
    const lbl = text(scene, tx, h / 2 - 20, tag.name, { origin: 0, color: tag.color });
    c.add(lbl);
    tx += lbl.width + 4;
  }
  const cur = run?.gear[def.slot];
  let note = `${SLOT_NAMES[def.slot]} - NEW`;
  let noteCol = 0xa7f070;
  if (cur?.id === def.id) {
    note = cur.lvl >= 3 ? 'MAXED' : `LEVEL UP TO ${cur.lvl + 1}`;
    noteCol = 0xffcd75;
  } else if (cur) {
    note = `REPLACES ${items.get(cur.id)?.name ?? ''}`;
    noteCol = 0xef7d57;
  }
  c.add(text(scene, -w / 2 + 6, h / 2 - 9, extra ?? note, { origin: 0, color: extra ? 0xffcd75 : noteCol, maxWidth: w - 12, maxLines: 1 }));
  c.setSize(w, h);
  return c;
}
