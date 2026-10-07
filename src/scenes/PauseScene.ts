import Phaser from 'phaser';
import { W, H } from '../config';
import { text, panel } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.75).setOrigin(0);
    text(this, W / 2, H * 0.3, 'PAUSED', { scale: 2, color: COL.white });

    const resume = () => {
      sfx.resume();
      sfx.select();
      this.scene.stop();
      this.scene.resume('Game');
    };
    const items: [string, () => void][] = [
      ['RESUME', resume],
      [sfx.muted ? 'SOUND: OFF' : 'SOUND: ON', () => {
        sfx.resume();
        sfx.setMuted(!sfx.muted);
        labels[1].setText(sfx.muted ? 'SOUND: OFF' : 'SOUND: ON');
      }],
      ['QUIT RUN', () => {
        sfx.resume();
        sfx.stopMusic();
        this.scene.stop('Game');
        this.scene.stop();
        this.scene.start('Title');
      }],
    ];
    const labels: Phaser.GameObjects.BitmapText[] = [];
    items.forEach(([label, fn], i) => {
      const y = H * 0.42 + i * 26;
      const g = this.add.graphics();
      panel(g, W / 2 - 50, y - 10, 100, 20, 0x29366f, 0x1a1c2c, 0x3b5dc9);
      const t = text(this, W / 2, y, label, { color: COL.white });
      labels.push(t);
      const zone = this.add.zone(W / 2, y, 100, 20).setInteractive();
      zone.on('pointerup', fn);
    });
    const kb = this.input.keyboard!;
    kb.on('keydown-P', resume);
    kb.on('keydown-ESC', resume);
    kb.on('keydown-SPACE', resume);
    kb.on('keydown-ENTER', resume);
  }
}
