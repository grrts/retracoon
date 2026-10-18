import Phaser from 'phaser';
import { W, H } from '../config';
import { text, panel, measure } from '../ui';
import type { RunState } from '../game/run';
import type { RunFlow, Step } from '../game/flow';

export interface OverlayData {
  run: RunState;
  flow: RunFlow;
  done: () => void;
}

export const TITLE_BAND = 26; // height of the dark band behind overlay titles

// Base for the screens that pop up over a paused run.
export class Overlay<D extends OverlayData = OverlayData> extends Phaser.Scene {
  d!: D;
  protected dim!: Phaser.GameObjects.Rectangle;

  init(data: D) {
    this.d = data;
  }

  // The flow's open step, which this overlay shows. Its content was rolled when it opened.
  protected step<K extends Step['key']>(key: K): Extract<Step, { key: K }> {
    const s = this.d.flow.step;
    if (s?.key !== key) throw new Error(`${this.scene.key}: no ${key} step open`);
    return s as Extract<Step, { key: K }>;
  }

  protected backdrop(alpha = 0.8) {
    this.dim = this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0).setOrigin(0).setInteractive();
    this.tweens.add({ targets: this.dim, fillAlpha: alpha, duration: 180 });
  }

  // Big title in a dark band; drops to normal size if it would not fit.
  protected title(str: string, color: number, sub?: string, subColor = 0xc9d1dd) {
    const band = this.add.rectangle(0, 0, W, TITLE_BAND + (sub ? 8 : 0), 0x1a1c2c, 0.92).setOrigin(0);
    const scale = measure(str) * 2 <= W - 16 ? 2 : 1;
    const t = text(this, W / 2, 11, str, { scale, color });
    t.setScale(0);
    this.tweens.add({ targets: t, scale, duration: 220, ease: 'Back.out' });
    const parts: Phaser.GameObjects.GameObject[] = [band, t];
    if (sub) parts.push(text(this, W / 2, 25, sub, { color: subColor, maxWidth: W - 16, maxLines: 1 }));
    return parts;
  }

  protected box(x: number, y: number, w: number, h: number, border = 0x1a1c2c) {
    const g = this.add.graphics();
    panel(g, x, y, w, h, 0x29366f, border, 0x3b5dc9);
    return g;
  }

  // Close this overlay and hand control back to the run, which opens the next step.
  protected close() {
    this.scene.stop();
    this.scene.resume('Run');
    this.d.done();
  }
}
