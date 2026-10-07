import Phaser from 'phaser';

export function text(scene: Phaser.Scene, x: number, y: number, str: string, opts: { color?: number; scale?: number; origin?: number } = {}) {
  const t = scene.add.bitmapText(x, y, 'px', str.toUpperCase().replace(/(\d)X/g, '$1x'));
  t.setLetterSpacing(-1);
  t.setScale(opts.scale ?? 1);
  t.setOrigin(opts.origin ?? 0.5, 0.5);
  if (opts.color !== undefined) t.setTint(opts.color);
  return t;
}

// Draws a chunky pixel panel into a Graphics object.
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
