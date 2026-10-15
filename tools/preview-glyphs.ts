// Renders skill glyphs in sample inks, one row of inks per glyph group.
//   npx tsx tools/preview-glyphs.ts out.png [a|b|c|d] [main accent ...]
import { Sheet } from './png';
import { PAL } from '../src/gfx/palette';
import { INKS } from '../src/content/skills/icons';
import { paint } from '../src/content/items/sprites/shape';
import { GLYPHS_A } from '../src/content/skills/glyphs/a';
import { GLYPHS_B } from '../src/content/skills/glyphs/b';
import { GLYPHS_C } from '../src/content/skills/glyphs/c';
import { GLYPHS_D } from '../src/content/skills/glyphs/d';

const GROUPS: Record<string, Record<string, string[]>> = { a: GLYPHS_A, b: GLYPHS_B, c: GLYPHS_C, d: GLYPHS_D };
const [out = 'glyphs.png', group = 'a', ...inks] = process.argv.slice(2);
const pairs = (inks.length ? inks : ['fire', 'gold', 'ice', 'holy', 'poison', 'void', 'steel', 'blood']).reduce<[string, string][]>((p, x, i, a) => (i % 2 ? p : [...p, [x, a[i + 1] ?? x]]), []);
const list = Object.entries(GROUPS[group] ?? {});
const cols = 6;
const cw = pairs.length * 13 + 4;
const s = new Sheet(cols * cw, Math.ceil(list.length / cols) * 14 + 2);
list.forEach(([, rows], i) => pairs.forEach(([m, a], j) => s.map(paint(rows, INKS[m], INKS[a]), (i % cols) * cw + 2 + j * 13, Math.floor(i / cols) * 14 + 2, PAL)));
s.save(out, Number(process.env.SCALE ?? 6));
console.log(list.map(([k], i) => `${i}:${k}`).join(' '));
