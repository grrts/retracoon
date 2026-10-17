// How to play: a short recap from the title screen. New players learn in their first run.
import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN } from '../ui';
import { onAction } from '../input';
import { sfx, menuMusic } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';
import { RaccoonView } from '../game/views';
import { ensureEnemy, enemyKey } from '../gfx/textures';
import { items } from '../content/registry';
import type { RunState } from '../game/run';

interface Page {
  title: string;
  color: number;
  lines: string[];
  art: (s: TutorialScene, x: number, y: number) => void;
}

const foe = (s: Phaser.Scene, id: string, x: number, y: number, scale = 2) => {
  ensureEnemy(s, id);
  if (s.textures.exists(enemyKey(id, 0))) s.add.image(x, y, enemyKey(id, 0)).setOrigin(0.5, 1).setScale(scale);
};

// One idea per page, a line or two each. The first run teaches the rest with one-time hints.
const PAGES: Page[] = [
  {
    title: 'GO FAR',
    color: COL.yellow,
    lines: ['THE ROAD NEVER ENDS.', 'GET AS FAR AS YOU CAN.'],
    art: (s, x, y) => {
      s.coon(x - 40, y);
      s.add.image(x + 40, y, 'flag_big').setOrigin(0.5, 1).setScale(3).setTint(0xffcd75);
    },
  },
  {
    title: 'FIGHT',
    color: COL.red,
    lines: ['TAP SKILLS TO SPEND AP.', 'FOE ICONS SHOW THEIR NEXT MOVE.'],
    art: (s, x, y) => {
      s.coon(x - 50, y);
      foe(s, 'rat', x + 40, y);
      s.add.image(x + 40, y - 46, 'in_attack').setScale(2);
      s.add.image(x - 8, y - 30, 'skill_claw').setScale(2);
    },
  },
  {
    title: 'GROW',
    color: COL.lime,
    lines: ['LEVEL UP AND SPREAD YOUR STATS.', 'YOUR RACCOON WEARS ITS LOOT.'],
    art: (s, x, y) => s.coon(x, y, ['wizard_hat', 'golf_club', 'leaf_cape']),
  },
  {
    title: 'RETREAT?',
    color: COL.ice,
    lines: ['RETREAT KEEPS YOUR LEVEL.', 'DYING RESETS IT.'],
    art: (s, x, y) => {
      s.coon(x - 40, y);
      s.add.image(x + 30, y, 'can').setOrigin(0.5, 1).setScale(3);
    },
  },
];

export class TutorialScene extends Phaser.Scene {
  private page = 0;
  private next = 'Title';
  private layer: Phaser.GameObjects.GameObject[] = [];
  private coons: RaccoonView[] = [];

  constructor() {
    super('Tutorial');
  }

  init(data: { next?: string }) {
    this.next = data.next ?? 'Title';
    this.page = 0;
    this.layer = [];
    this.coons = [];
  }

  create() {
    menuMusic(this);
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    button(this, W - 30, 12, 52, 16, 'SKIP', () => this.finish(), BTN.red);
    onAction(this, ['right', 'confirm'], () => this.go(1));
    onAction(this, 'left', () => this.go(-1));
    onAction(this, 'back', () => this.finish());
    this.draw();
  }

  update(_t: number, d: number) {
    this.coons.forEach((c) => c.update(d / 1000));
  }

  // A raccoon for the art, optionally wearing some items.
  coon(x: number, y: number, gear: string[] = []) {
    const owned = gear
      .map((id) => items.get(id))
      .filter((it): it is NonNullable<typeof it> => !!it)
      .map((it) => ({ slot: it.slot, id: it.id, lvl: 2 }));
    this.layer.push(this.add.image(x, y, 'shadow').setScale(2));
    const v = new RaccoonView(this, x, y, null as RunState | null, store.skin).setScale(2);
    v.setGear(null, owned);
    this.coons.push(v);
    this.layer.push(v);
  }

  private draw() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    this.coons = [];
    const p = PAGES[this.page];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.layer.push(o), o);
    add(text(this, W / 2, 12, 'HOW TO PLAY', { color: COL.light }));
    add(text(this, W / 2, 30, p.title, { scale: 2, color: p.color }));
    const g = add(this.add.graphics());
    const pw = Math.min(W - 16, 360);
    panel(g, W / 2 - pw / 2, 44, pw, 70, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    // Track whatever the page's art adds so it is cleared on the next page.
    const n0 = this.children.list.length;
    p.art(this, W / 2, 108);
    for (const o of this.children.list.slice(n0)) if (!this.layer.includes(o)) this.layer.push(o);
    let y = 124;
    for (const ln of p.lines) {
      const t = add(text(this, W / 2, y, ln, { originY: 0, color: COL.white, maxWidth: W - 24, maxLines: 2 }));
      y += t.height + 4;
    }
    // page dots
    PAGES.forEach((_, i) => add(this.add.rectangle(W / 2 + (i - (PAGES.length - 1) / 2) * 8, H - 30, 4, 4, i === this.page ? 0xffcd75 : 0x566c86)));
    const last = this.page === PAGES.length - 1;
    const back = add(button(this, W / 2 - 70, H - 14, 90, 20, 'BACK', () => this.go(-1)).c);
    back.setVisible(this.page > 0);
    add(button(this, W / 2 + 70, H - 14, 110, 20, last ? "LET'S GO!" : 'NEXT', () => this.go(1), last ? BTN.red : BTN.green).c);
  }

  private go(d: number) {
    const n = this.page + d;
    if (n < 0) return;
    if (n >= PAGES.length) return this.finish();
    sfx.select();
    this.page = n;
    this.draw();
  }

  private finish() {
    this.scene.start(this.next);
  }
}
