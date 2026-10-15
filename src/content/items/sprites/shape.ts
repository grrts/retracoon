// New gear art for the forged items. Shapes are drawn in five channels that the forge
// paints per item: 1-4 the main ink from light to dark, 5-6 an accent ink (light, dark).
// 'k' is outline and any other palette key stays as drawn.
import type { Gear } from '../../types';

export type AnchorKey = Gear['anchor'];

export interface Shape {
  parts: Gear[];
  icon?: string[]; // aura shapes are icons only
}

// One piece of gear. x/y are relative to the slot's anchor (see gfx/coon.ts).
export const piece = (anchor: AnchorKey, x: number, y: number, rows: string[], behind = false): Shape => ({ parts: [{ anchor, x, y, rows, behind: behind || undefined }] });

// Hats: centred on the head, bottom row resting on the brow (y 4).
export const hat = (rows: string[], shift = 0): Shape => piece('head', -Math.ceil(Math.max(...rows.map((r) => r.length)) / 2) + shift, 2 - rows.length, rows);

export const INK_KEYS = '123456';

// Paint a shape's channels with a main ink and an accent ink (4-letter palette ramps).
export function paint(rows: string[], main: string, accent: string): string[] {
  const map: Record<string, string> = { '1': main[0], '2': main[1], '3': main[2], '4': main[3], '5': accent[1], '6': accent[3] };
  return rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join(''));
}
