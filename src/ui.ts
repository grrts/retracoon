import Phaser from 'phaser';
import { sfx } from './audio';

export function fmt(str: string) {
  return str.toUpperCase().replace(/(\d)X/g, '$1x');
}

export function text(scene: Phaser.Scene, x: number, y: number, str: string, opts: { color?: number; scale?: number; origin?: number; originY?: number } = {}) {
  const t = scene.add.bitmapText(x, y, 'px', fmt(str));
  t.setLetterSpacing(-1);
  t.setScale(opts.scale ?? 1);
  t.setOrigin(opts.origin ?? 0.5, opts.originY ?? 0.5);
  if (opts.color !== undefined) t.setTint(opts.color);
  return t;
}

// Chunky pixel panel drawn into a Graphics object.
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, border: number, light?: number) {
  g.fillStyle(0x1a1c2c, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(border, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillStyle(fill, 1);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (light !== undefined) {
    g.fillStyle(light, 1);
    g.fillRect(x + 3, y + 2, w - 6, 1);
  }
}

export interface Button {
  c: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.BitmapText;
  setEnabled(on: boolean): void;
  setColors(fill: number, border: number, light?: number): void;
  w: number;
  h: number;
}

// A tappable pixel button. Fires on release over the button.
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: { fill?: number; border?: number; light?: number; color?: number; depth?: number } = {},
): Button {
  const c = scene.add.container(x, y).setDepth(opts.depth ?? 50);
  const g = scene.add.graphics();
  let fill = opts.fill ?? 0x29366f;
  let border = opts.border ?? 0x1a1c2c;
  let light = opts.light ?? 0x3b5dc9;
  let enabled = true;
  const draw = (down = false) => {
    g.clear();
    if (!enabled) panel(g, -w / 2, -h / 2, w, h, 0x333c57, 0x1a1c2c);
    else panel(g, -w / 2, -h / 2 + (down ? 1 : 0), w, h - (down ? 1 : 0), fill, border, down ? undefined : light);
  };
  draw();
  const t = text(scene, 0, 0, label, { color: opts.color ?? 0xf4f4f4 });
  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  let pressed = false;
  c.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    draw(true);
    t.y = 1;
  });
  c.on('pointerout', () => {
    pressed = false;
    draw();
    t.y = 0;
  });
  c.on('pointerup', () => {
    if (!enabled || !pressed) return;
    pressed = false;
    draw();
    t.y = 0;
    sfx.select();
    onClick();
  });
  return {
    c,
    g,
    label: t,
    w,
    h,
    setEnabled(on: boolean) {
      enabled = on;
      t.setAlpha(on ? 1 : 0.45);
      draw();
    },
    setColors(f: number, b: number, l?: number) {
      fill = f;
      border = b;
      light = l ?? light;
      draw();
    },
  };
}

export function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((res) => scene.time.delayedCall(ms, res));
}
