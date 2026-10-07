import Phaser from 'phaser';
import { W, H, IS_TOUCH } from '../config';
import { text, panel } from '../ui';
import { sfx } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';

interface Result {
  distance: number;
  sector: number;
  kills: number;
  bosses: number;
  newBest: boolean;
  levels: Record<string, number>;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(r: Result) {
    const dim = this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.8, duration: 300 });

    const top = Math.round(H * 0.2);
    const title = text(this, W / 2, top, 'WIPED OUT', { scale: 2, color: COL.red });
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 2, duration: 300, ease: 'Back.out' });

    const g = this.add.graphics();
    panel(g, 20, top + 16, W - 40, 104, 0x29366f, 0x1a1c2c, 0x3b5dc9);

    text(this, W / 2, top + 28, 'DISTANCE', { color: COL.light });
    const dist = text(this, W / 2, top + 42, '0M', { scale: 3, color: COL.white });
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: r.distance,
      duration: Math.min(1200, 300 + r.distance),
      ease: 'Cubic.out',
      onUpdate: () => dist.setText(`${Math.floor(counter.v)}M`),
      onComplete: () => {
        if (r.newBest) {
          const nb = text(this, W / 2, top + 58, 'NEW BEST!', { color: COL.yellow });
          this.tweens.add({ targets: nb, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
          sfx.upgrade();
        }
      },
    });
    if (!r.newBest) text(this, W / 2, top + 58, `BEST ${store.bestDistance}M`, { color: COL.yellow });

    const rows: [string, string][] = [
      ['SECTOR', `${r.sector}`],
      ['CRITTERS BONKED', `${r.kills}`],
      ['BOSSES BEATEN', `${r.bosses}`],
    ];
    rows.forEach(([k, v], i) => {
      text(this, 30, top + 74 + i * 10, k, { origin: 0, color: COL.light });
      text(this, W - 30, top + 74 + i * 10, v, { origin: 1, color: COL.white });
    });

    // Build summary: the upgrade icons this run collected.
    const ids = Object.keys(r.levels);
    ids.forEach((id, i) => {
      const x = W / 2 - ((ids.length - 1) * 12) / 2 + i * 12;
      this.add.image(x, top + 106, 'icon_' + id);
      if (r.levels[id] > 1) text(this, x + 5, top + 112, `${r.levels[id]}`, { color: COL.yellow });
    });

    const again = text(this, W / 2, H * 0.8, IS_TOUCH ? 'TAP TO RUN AGAIN' : 'SPACE TO RUN AGAIN', { color: COL.white }).setAlpha(0);
    const menu = text(this, W / 2, H * 0.8 + 16, 'MENU', { color: COL.grey }).setAlpha(0);

    let armed = false;
    this.time.delayedCall(900, () => {
      armed = true;
      again.setAlpha(1);
      menu.setAlpha(1);
      this.tweens.add({ targets: again, alpha: 0.25, yoyo: true, repeat: -1, duration: 450 });
    });

    const restart = () => {
      if (!armed) return;
      armed = false;
      sfx.select();
      this.scene.stop();
      this.scene.stop('Game');
      this.scene.start('Game');
    };
    const toMenu = () => {
      if (!armed) return;
      armed = false;
      this.scene.stop('Game');
      this.scene.start('Title');
    };
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.y - menu.y) < 8 && Math.abs(p.x - W / 2) < 30) toMenu();
      else restart();
    });
    this.input.keyboard!.on('keydown-SPACE', restart);
    this.input.keyboard!.on('keydown-ENTER', restart);
    this.input.keyboard!.on('keydown-ESC', toMenu);
  }
}
