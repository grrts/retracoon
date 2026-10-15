// Renders the forge's gear shapes for one slot on the raccoon, in two sample inks.
//   npx tsx tools/preview-shapes.ts out.png head
import { Sheet } from './png';
import { buildPose, DEFAULT_FUR, COON_W, COON_H, ANCHORS } from '../src/gfx/coon';
import { PAL } from '../src/gfx/palette';
import { INKS } from '../src/content/skills/icons';
import { SHAPES } from '../src/content/items/sprites';
import { paint } from '../src/content/items/sprites/shape';

const pal: Record<string, string> = { ...PAL, ...DEFAULT_FUR };
const [out = 'shapes.png', slot = 'head', a = 'gold', b = 'blood', c = 'ice', d = 'poison'] = process.argv.slice(2);
const list = Object.entries(SHAPES[slot as keyof typeof SHAPES]);
const cw = COON_W + 12;
const ch = COON_H + 14;
const cols = Number(process.env.COLS ?? 5);
const s = new Sheet(cols * 2 * cw, Math.ceil(list.length / cols) * ch);
const base = buildPose('idle0');
list.forEach(([, sh], i) => {
  [[a, b], [c, d]].forEach(([m, x], j) => {
    const ox = ((i % cols) * 2 + j) * cw + 6;
    const oy = Math.floor(i / cols) * ch + 10;
    const draw = (behind: boolean) => sh.parts.filter((g) => !!g.behind === behind).forEach((g) => s.map(paint(g.rows, INKS[m], INKS[x]), ox + ANCHORS[g.anchor].x + g.x, oy + ANCHORS[g.anchor].y + g.y, pal));
    draw(true);
    if (sh.parts.length) s.map(base, ox, oy, pal);
    draw(false);
    if (sh.icon) s.map(paint(sh.icon, INKS[m], INKS[x]), ox + 4, oy, pal);
  });
});
s.save(out, Number(process.env.SCALE ?? 5));
console.log(list.map(([k], i) => `${i}:${k}`).join(' '));
