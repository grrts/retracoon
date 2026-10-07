import Phaser from 'phaser';
import { W, H, IS_TOUCH } from '../config';
import { Background } from '../game/background';
import { text } from '../ui';
import { store } from '../save';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';

export class TitleScene extends Phaser.Scene {
  private bg!: Background;
  private started = false;

  constructor() {
    super('Title');
  }

  create() {
    this.started = false;
    this.bg = new Background(this, 0);
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.35).setOrigin(0);

    const logoY = Math.round(H * 0.24);
    const l1 = text(this, W / 2, logoY, 'RETRA', { scale: 3, color: COL.light });
    const l2 = text(this, W / 2, logoY + 20, 'COON', { scale: 3, color: COL.white });
    this.tweens.add({ targets: [l1, l2], y: '-=2', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    text(this, W / 2, logoY + 38, 'AN ENDLESS TRASH RUN', { color: COL.yellow });

    const coon = this.add.sprite(W / 2, H * 0.55, 'raccoon_0').play('raccoon_run').setScale(2);
    this.add.image(W / 2, H * 0.55 + 17, 'shadow').setScale(2).setDepth(-1);
    this.tweens.add({ targets: coon, y: '-=3', yoyo: true, repeat: -1, duration: 260, ease: 'Sine.inOut' });

    const start = text(this, W / 2, H * 0.72, IS_TOUCH ? 'TAP TO START' : 'PRESS SPACE OR CLICK', { color: COL.white });
    this.tweens.add({ targets: start, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });

    if (store.bestDistance > 0) {
      text(this, W / 2, H * 0.72 + 14, `BEST ${store.bestDistance}M  SECTOR ${store.bestSector}`, { color: COL.yellow });
    }

    const hint = IS_TOUCH ? ['DRAG ANYWHERE TO MOVE', 'TAP DASH TO DODGE'] : ['ARROWS OR WASD TO MOVE', 'SPACE OR SHIFT TO DASH'];
    hint.forEach((h, i) => text(this, W / 2, H - 34 + i * 9, h, { color: COL.light }));
    text(this, W / 2, H - 10, 'YOU THROW AUTOMATICALLY', { color: COL.grey });

    const mute = text(this, W - 6, 8, sfx.muted ? 'SOUND OFF' : 'SOUND ON', { origin: 1, color: COL.light });
    mute.setInteractive(new Phaser.Geom.Rectangle(-4, -4, mute.width + 8, mute.height + 8), Phaser.Geom.Rectangle.Contains);
    mute.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      mute.setText(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });

    const go = () => {
      if (this.started) return;
      this.started = true;
      sfx.unlock();
      sfx.select();
      this.cameras.main.fadeOut(220, 26, 28, 44);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
    };
    this.input.on('pointerdown', go);
    this.input.keyboard?.on('keydown-SPACE', go);
    this.input.keyboard?.on('keydown-ENTER', go);
    this.cameras.main.fadeIn(250, 26, 28, 44);
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.bg.update(30 * dt, dt);
  }
}
