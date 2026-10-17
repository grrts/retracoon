// The area map: every place the raccoon can walk through, one column per tier of
// danger. Areas you have reached show their sky and name; the rest are locked tiles.
// Read-only: it only shows how far you have got.
import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, BTN } from '../ui';
import { onAction } from '../input';
import { sfx, menuMusic } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';
import { themesByTier } from '../content/registry';
import type { ThemeDef } from '../world/types';

const TOP = 22;
const FOOT = 14;
const PAD = 4;
const GAP = 2;

export function areasFound() {
  const all = [1, 2, 3, 4, 5].flatMap((t) => themesByTier(t));
  return { found: all.filter((t) => store.themesSeen.includes(t.id)).length, total: all.length };
}

export class MapScene extends Phaser.Scene {
  private back = 'Title';
  private info!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Map');
  }

  init(data: { back?: string }) {
    this.back = data.back ?? 'Title';
  }

  create() {
    menuMusic(this);
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    this.add.rectangle(0, 0, W, TOP, 0x29366f).setOrigin(0);
    text(this, W / 2, 11, 'AREA MAP', { scale: 2, color: COL.yellow });
    button(this, W - 30, 11, 52, 16, 'BACK', () => this.leave(), BTN.red);
    onAction(this, 'back', () => this.leave());

    const cols = [1, 2, 3, 4, 5].map((t) => themesByTier(t));
    const rows = Math.max(...cols.map((c) => c.length));
    const cw = Math.floor((W - PAD * 2 - GAP * (cols.length - 1)) / cols.length);
    const pitch = Math.floor((H - TOP - PAD - FOOT) / rows);
    const left = Math.round((W - (cw * cols.length + GAP * (cols.length - 1))) / 2);
    cols.forEach((col, i) => col.forEach((t, j) => this.tile(t, left + i * (cw + GAP), TOP + PAD + j * pitch, cw, pitch - 1)));

    this.info = text(this, W / 2, H - FOOT / 2 - 1, '', { color: COL.light, maxWidth: W - 16, maxLines: 1 });
    this.summary();
    this.cameras.main.fadeIn(200, 26, 28, 44);
  }

  private summary() {
    const { found, total } = areasFound();
    this.info.setText(`${found}/${total} AREAS FOUND`).setTint(COL.light);
  }

  // Tiles are centred containers like buttons, so keys and pads can move between them.
  private tile(t: ThemeDef, x: number, y: number, w: number, h: number) {
    const seen = store.themesSeen.includes(t.id);
    const l = -Math.floor(w / 2);
    const top = -Math.floor(h / 2);
    const c = this.add.container(x - l, y - top);
    const g = this.add.graphics();
    g.fillStyle(0x1a1c2c, 1).fillRect(l, top, w, h);
    if (seen) {
      // The area's own sky, in chunky bands from top to bottom.
      const n = t.sky.length;
      for (let i = 0; i < n; i++) {
        const y0 = 1 + Math.round(((h - 2) * i) / n);
        const y1 = 1 + Math.round(((h - 2) * (i + 1)) / n);
        g.fillStyle(parseInt(t.sky[i].slice(1), 16), 1).fillRect(l + 1, top + y0, w - 2, y1 - y0);
      }
      c.add([g, text(this, 0, 0, t.name, { color: COL.white, maxWidth: w - 4, maxLines: 1 })]);
    } else {
      g.fillStyle(0x333c57, 1).fillRect(l + 1, top + 1, w - 2, h - 2);
      g.fillStyle(0x29366f, 1).fillRect(l + 1, top + h - 3, w - 2, 2);
      c.add([g, this.add.image(0, 0, 'lock')]);
    }
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    // The last tile touched stays named in the footer (touch fires no hover).
    const show = () => this.info.setText(seen ? t.name : 'NOT FOUND YET. KEEP WALKING!').setTint(seen ? COL.yellow : COL.light);
    c.on('pointerover', show);
    c.on('pointerup', show);
  }

  private leave() {
    sfx.select();
    this.scene.start(this.back);
  }
}
