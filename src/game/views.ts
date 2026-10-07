import Phaser from 'phaser';
import type { ItemDef, Slot } from '../content/types';
import { items, RARITY, SLOT_NAMES, TAGS } from '../content/registry';
import { RunState } from './run';
import { text, panel } from '../ui';

type Pose = 'idle' | 'walk' | 'attack' | 'hurt';

interface GearImg {
  img: Phaser.GameObjects.Image;
  key: string;
  alt?: string;
  slot: Slot;
  x: number;
  y: number;
}

// The raccoon, drawn with every equipped item on top. The character is the inventory.
export class RaccoonView extends Phaser.GameObjects.Container {
  base: Phaser.GameObjects.Image;
  private gear: GearImg[] = [];
  private aura: Phaser.GameObjects.Image[] = [];
  private auraKind: string[] = [];
  pose: Pose = 'idle';
  private t = 0;
  private poseT = 0;
  private altOn = false;

  constructor(scene: Phaser.Scene, x: number, y: number, run?: RunState) {
    super(scene, x, y);
    this.base = scene.add.image(-9, -15, 'coon_idle_0').setOrigin(0);
    this.add(this.base);
    scene.add.existing(this);
    if (run) this.setGear(run);
  }

  setGear(run: RunState) {
    this.gear.forEach((g) => g.img.destroy());
    this.aura.forEach((a) => a.destroy());
    this.gear = [];
    this.aura = [];
    this.auraKind = [];
    const order: Slot[] = ['back', 'tail', 'body', 'paw', 'face', 'head'];
    const behind: GearImg[] = [];
    const front: GearImg[] = [];
    for (const slot of order) {
      const owned = run.gear[slot];
      const def = owned && items.get(owned.id);
      if (!def?.gear) continue;
      def.gear.forEach((g, i) => {
        const key = `gear_${def.id}_${i}`;
        const img = this.scene.add.image(-9 + g.x, -15 + g.y, key).setOrigin(0);
        const gi: GearImg = { img, key, alt: g.alt ? key + '_alt' : undefined, slot, x: g.x, y: g.y };
        (g.behind ? behind : front).push(gi);
      });
    }
    behind.forEach((g) => this.addAt(g.img, 0));
    front.forEach((g) => this.add(g.img));
    this.gear = [...behind, ...front];
    const aura = run.gear.aura && items.get(run.gear.aura.id);
    if (aura) {
      if (aura.id === 'fly_swarm') {
        for (let i = 0; i < 2 + run.gear.aura!.lvl; i++) this.aura.push(this.scene.add.image(0, 0, 'px').setTint(0x1a1c2c).setScale(0.75));
      }
      this.auraKind.push(aura.id);
      this.aura.forEach((a) => this.add(a));
    }
  }

  play(p: Pose, hold = 0.25) {
    this.pose = p;
    this.poseT = p === 'attack' || p === 'hurt' ? hold : 0;
  }

  update(dt: number) {
    this.t += dt;
    if (this.poseT > 0) {
      this.poseT -= dt;
      if (this.poseT <= 0 && (this.pose === 'attack' || this.pose === 'hurt')) this.pose = 'idle';
    }
    let key = 'coon_idle_0';
    let headDy = 0;
    let dx = 0;
    if (this.pose === 'idle') {
      if (Math.floor(this.t * 2) % 2 === 1) {
        key = 'coon_idle_1';
        headDy = 1;
      }
    } else if (this.pose === 'walk') {
      key = Math.floor(this.t * 7) % 2 === 0 ? 'coon_idle_0' : 'coon_walk_1';
    } else if (this.pose === 'attack') {
      key = 'coon_attack';
      dx = 1;
    } else {
      key = 'coon_hurt';
      dx = -2;
    }
    this.base.setTexture(key);
    const alt = Math.floor(this.t * 8) % 2 === 0;
    for (const g of this.gear) {
      const bob = g.slot === 'head' || g.slot === 'face' ? headDy : 0;
      g.img.setPosition(-9 + g.x + dx, -15 + g.y + bob);
      if (g.alt && alt !== this.altOn) g.img.setTexture(alt ? g.alt : g.key);
    }
    this.altOn = alt;
    this.aura.forEach((a, i) => {
      const ang = this.t * 5 + (i / this.aura.length) * Math.PI * 2;
      a.setPosition(Math.cos(ang) * 13, -8 + Math.sin(ang * 1.3) * 7);
    });
    if (this.auraKind.includes('stink_cloud') && Math.random() < dt * 4) this.puff(0xa7f070);
    if (this.auraKind.includes('combo_fever') && Math.random() < dt * 3) this.puff(0xffcd75);
    if (this.auraKind.includes('rage_aura') && Math.random() < dt * 3) this.puff(0xb13e53);
  }

  private puff(tint: number) {
    const p = this.scene.add.image(this.x + Phaser.Math.Between(-10, 10), this.y - Phaser.Math.Between(2, 14), 'px').setTint(tint).setDepth(this.depth - 1).setAlpha(0.8);
    this.scene.tweens.add({ targets: p, y: p.y - 8, alpha: 0, duration: 700, onComplete: () => p.destroy() });
  }
}

// A card describing an item, used by rewards and the shop.
export function itemCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, def: ItemDef, run: RunState, extra?: string) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const rar = RARITY[def.rarity];
  panel(g, -w / 2, -h / 2, w, h, 0x29366f, rar.color, 0x3b5dc9);
  c.add(g);
  const icon = scene.add.image(-w / 2 + 16, -h / 2 + 16, `item_${def.id}`);
  const s = Math.min(2, 22 / Math.max(icon.width, icon.height));
  icon.setScale(Math.max(1, Math.floor(s)));
  c.add(icon);
  const left = -w / 2 + 31;
  c.add(text(scene, left, -h / 2 + 8, def.name, { origin: 0, color: 0xf4f4f4 }));
  c.add(text(scene, left, -h / 2 + 17, `${rar.name} ${SLOT_NAMES[def.slot]}`, { origin: 0, color: rar.color }));
  const lines = wrap(def.desc, Math.floor((w - 10) / 4));
  lines.forEach((ln, i) => c.add(text(scene, -w / 2 + 6, -h / 2 + 33 + i * 8, ln, { origin: 0, color: 0x94b0c2 })));
  let tx = -w / 2 + 6;
  for (const t of def.tags) {
    const tag = TAGS[t];
    const lbl = text(scene, tx, h / 2 - 16, tag.name, { origin: 0, color: tag.color });
    c.add(lbl);
    tx += lbl.width + 4;
  }
  const cur = run.gear[def.slot];
  let note = 'NEW';
  let noteCol = 0xa7f070;
  if (cur?.id === def.id) {
    note = cur.lvl >= 3 ? 'MAXED' : `LEVEL UP TO ${cur.lvl + 1}`;
    noteCol = 0xffcd75;
  } else if (cur) {
    note = `REPLACES ${items.get(cur.id)?.name ?? ''}`;
    noteCol = 0xef7d57;
  }
  c.add(text(scene, -w / 2 + 6, h / 2 - 7, extra ?? note, { origin: 0, color: extra ? 0xffcd75 : noteCol }));
  c.setSize(w, h);
  return c;
}

export function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      out.push(line.trim());
      line = word;
    } else line += ' ' + word;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}
