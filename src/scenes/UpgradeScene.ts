import Phaser from 'phaser';
import { W, H } from '../config';
import { rollChoices, Upgrade } from '../game/upgrades';
import { text, panel } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import type { GameScene } from './GameScene';

export class UpgradeScene extends Phaser.Scene {
  private choices: Upgrade[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private sel = 0;
  private ready = false;
  private picked = false;
  private downOn = -1;

  constructor() {
    super('Upgrade');
  }

  create(data: { sector: number }) {
    const game = this.scene.get('Game') as GameScene;
    this.choices = rollChoices(game.stats, game.levels, 3);
    this.cards = [];
    this.sel = 0;
    this.ready = false;
    this.picked = false;
    this.downOn = -1;

    const dim = this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 200 });

    const top = Math.round(H / 2 - 92);
    text(this, W / 2, top, 'PICK A REWARD', { scale: 2, color: COL.yellow });
    text(this, W / 2, top + 14, `SECTOR ${data.sector + 1} WILL BE TOUGHER`, { color: COL.light });

    this.choices.forEach((u, i) => {
      const y = top + 46 + i * 56;
      const c = this.add.container(W / 2, y);
      const g = this.add.graphics();
      c.add(g);
      c.add(this.add.image(-58, 0, 'icon_' + u.id).setScale(2));
      const lvl = game.levels[u.id] ?? 0;
      c.add(text(this, -40, -9, u.name, { origin: 0, color: COL.white }));
      c.add(text(this, -40, 2, u.desc(lvl), { origin: 0, color: COL.light }));
      if (u.max > 1 && u.max < 99) {
        for (let p = 0; p < u.max; p++) {
          const pip = this.add.rectangle(-40 + p * 6, 13, 4, 3, p < lvl ? 0xffcd75 : p === lvl ? 0xa7f070 : 0x333c57).setOrigin(0, 0.5);
          c.add(pip);
        }
      }
      c.setData('g', g);
      c.setSize(160, 48);
      c.setInteractive();
      c.on('pointerdown', () => {
        if (!this.ready) return;
        this.downOn = i;
        this.setSel(i);
      });
      c.on('pointerup', () => {
        if (this.ready && this.downOn === i) this.pick(i);
      });
      c.on('pointerover', () => this.ready && this.setSel(i));
      c.x -= W;
      this.tweens.add({ targets: c, x: W / 2, delay: 80 * i, duration: 280, ease: 'Back.out' });
      this.cards.push(c);
    });
    this.drawCards();

    text(this, W / 2, top + 46 + 3 * 56 - 6, 'TAP A CARD', { color: COL.grey });

    // Ignore taps for a moment so a dragging finger doesn't pick by accident.
    this.time.delayedCall(450, () => (this.ready = true));

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.setSel((this.sel + 2) % 3));
    kb.on('keydown-W', () => this.setSel((this.sel + 2) % 3));
    kb.on('keydown-DOWN', () => this.setSel((this.sel + 1) % 3));
    kb.on('keydown-S', () => this.setSel((this.sel + 1) % 3));
    kb.on('keydown-ONE', () => this.pick(0));
    kb.on('keydown-TWO', () => this.pick(1));
    kb.on('keydown-THREE', () => this.pick(2));
    kb.on('keydown-ENTER', () => this.pick(this.sel));
    kb.on('keydown-SPACE', () => this.pick(this.sel));
  }

  private setSel(i: number) {
    if (i >= this.cards.length || this.picked) return;
    if (i !== this.sel) sfx.select();
    this.sel = i;
    this.drawCards();
  }

  private drawCards() {
    this.cards.forEach((c, i) => {
      const g = c.getData('g') as Phaser.GameObjects.Graphics;
      g.clear();
      const on = i === this.sel;
      panel(g, -80, -24, 160, 48, on ? 0x3b5dc9 : 0x29366f, on ? 0xffcd75 : 0x1a1c2c, on ? 0x41a6f6 : 0x3b5dc9);
      c.setScale(on ? 1.04 : 1);
    });
  }

  private pick(i: number) {
    if (!this.ready || this.picked || i >= this.choices.length) return;
    this.picked = true;
    this.sel = i;
    this.drawCards();
    const c = this.cards[i];
    this.tweens.add({ targets: c, scale: 1.15, duration: 90, yoyo: true });
    this.cards.forEach((o, j) => j !== i && this.tweens.add({ targets: o, alpha: 0, duration: 150 }));
    this.time.delayedCall(260, () => {
      const game = this.scene.get('Game') as GameScene;
      this.scene.stop();
      this.scene.resume('Game');
      game.applyUpgrade(this.choices[i]);
    });
  }
}
