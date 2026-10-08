import Phaser from 'phaser';
import { sfx } from './audio';
import { FONT } from './gfx/font';

export const LINE_H = 10; // pixel height of one line of text, including spacing

export function fmt(str: string) {
  return str.toUpperCase().replace(/(\d)X/g, '$1x');
}

// Width in pixels of a single line of text (before scaling).
export function measure(str: string) {
  let w = 0;
  for (const ch of fmt(str)) w += (FONT[ch]?.[0].length ?? 3) + 1;
  return Math.max(0, w - 1);
}

// Break text into lines that fit `maxW` pixels.
export function wrapPx(str: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of fmt(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export interface TextOpts {
  color?: number;
  scale?: number;
  origin?: number;
  originY?: number;
  maxWidth?: number; // wrap to this many pixels
  maxLines?: number; // truncate with an ellipsis-like dot run
  align?: 'left' | 'center' | 'right';
}

// Pixel text. With maxWidth it wraps; lines are LINE_H apart.
export function text(scene: Phaser.Scene, x: number, y: number, str: string, opts: TextOpts = {}) {
  const scale = opts.scale ?? 1;
  let s = fmt(str);
  if (opts.maxWidth) {
    let lines = wrapPx(s, opts.maxWidth / scale);
    if (opts.maxLines && lines.length > opts.maxLines) {
      lines = lines.slice(0, opts.maxLines);
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\S*$/, '') + '..';
    }
    s = lines.join('\n');
  }
  const t = scene.add.bitmapText(x, y, 'px', s);
  t.setLineSpacing(LINE_H - 9);
  t.setScale(scale);
  t.setOrigin(opts.origin ?? 0.5, opts.originY ?? 0.5);
  const align = opts.align ?? (opts.origin === 0 ? 'left' : opts.origin === 1 ? 'right' : 'center');
  t.align = align === 'left' ? 0 : align === 'center' ? 1 : 2;
  if (opts.color !== undefined) t.setTint(opts.color);
  return t;
}

// Height in pixels a block of wrapped text will take.
export function textHeight(str: string, maxWidth: number, scale = 1) {
  return wrapPx(str, maxWidth / scale).length * LINE_H * scale;
}

// Chunky pixel panel drawn into a Graphics object.
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, border: number, light?: number) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
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
  setLabel(s: string): void;
  w: number;
  h: number;
}

export const BTN = {
  blue: { fill: 0x29366f, light: 0x3b5dc9 },
  red: { fill: 0xb13e53, light: 0xef7d57 },
  green: { fill: 0x257179, light: 0x38b764 },
  gold: { fill: 0x8f563b, light: 0xffcd75 },
  violet: { fill: 0x5d275d, light: 0xb05ccf },
};

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
  const c = scene.add.container(Math.round(x), Math.round(y)).setDepth(opts.depth ?? 50);
  const g = scene.add.graphics();
  let fill = opts.fill ?? BTN.blue.fill;
  let border = opts.border ?? 0x1a1c2c;
  let light = opts.light ?? BTN.blue.light;
  let enabled = true;
  const draw = (down = false) => {
    g.clear();
    if (!enabled) panel(g, -w / 2, -h / 2, w, h, 0x333c57, 0x1a1c2c);
    else panel(g, -w / 2, -h / 2 + (down ? 1 : 0), w, h - (down ? 1 : 0), fill, border, down ? undefined : light);
  };
  draw();
  const t = text(scene, 0, 0, label, { color: opts.color ?? 0xf4f4f4, maxWidth: w - 6, maxLines: 2 });
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
    setLabel(s: string) {
      t.setText(fmt(s));
    },
  };
}

export function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((res) => scene.time.delayedCall(ms, res));
}

// Floating combat text that never lands on top of other floating text: each new
// float near an anchor is pushed above the ones still alive there.
export class Floaters {
  private live: { x: number; t: Phaser.GameObjects.BitmapText; born: number }[] = [];
  constructor(private scene: Phaser.Scene, private depth = 65) {}

  add(x: number, y: number, str: string, color: number, big = false) {
    const now = this.scene.time.now;
    this.live = this.live.filter((f) => f.t.active);
    const near = this.live.filter((f) => Math.abs(f.x - x) < 28 && now - f.born < 700);
    const lift = near.length * (LINE_H + 1);
    const t = text(this.scene, Math.round(x), Math.round(y - lift), str, { color, scale: big ? 2 : 1 }).setDepth(this.depth);
    this.live.push({ x, t, born: now });
    this.scene.tweens.add({ targets: t, y: t.y - 14, duration: 700, ease: 'Cubic.out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300, onComplete: () => t.destroy() });
    if (big) {
      t.setScale(3);
      this.scene.tweens.add({ targets: t, scale: 2, duration: 160, ease: 'Back.out' });
    }
    return t;
  }
}
