import Phaser from 'phaser';
import { W, H } from '../config';
import { text, panel } from '../ui';
import type { RunState } from '../game/run';

export interface OverlayData {
  run: RunState;
  done: () => void;
}

// Base for the screens that pop up over a paused run.
export class Overlay<D extends OverlayData = OverlayData> extends Phaser.Scene {
  d!: D;
  protected dim!: Phaser.GameObjects.Rectangle;

  init(data: D) {
    this.d = data;
  }

  protected backdrop(alpha = 0.78) {
    this.dim = this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0).setOrigin(0);
    this.tweens.add({ targets: this.dim, fillAlpha: alpha, duration: 180 });
  }

  protected title(str: string, color: number, y = 12) {
    // A dark band so the title never fights with the run HUD underneath.
    this.add.rectangle(0, 0, W, y + 22, 0x1a1c2c, 0.85).setOrigin(0);
    const t = text(this, W / 2, y, str, { scale: 2, color });
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 2, duration: 220, ease: 'Back.out' });
    return t;
  }

  protected box(x: number, y: number, w: number, h: number, border = 0x1a1c2c) {
    const g = this.add.graphics();
    panel(g, x, y, w, h, 0x29366f, border, 0x3b5dc9);
    return g;
  }

  // Close this overlay and hand control back to the run (or to the next step).
  protected close(next?: { key: string; data: object }) {
    // Level-ups earned outside of fights (events) are handled before returning.
    if (!next && this.d.run.pendingLevelUps > 0 && this.scene.key !== 'LevelUp') {
      this.d.run.pendingLevelUps--;
      next = { key: 'LevelUp', data: {} };
    }
    this.scene.stop();
    if (next) {
      this.scene.launch(next.key, { ...next.data, run: this.d.run, done: this.d.done });
      return;
    }
    this.scene.resume('Run');
    this.d.done();
  }
}
