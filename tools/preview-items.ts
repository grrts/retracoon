// Renders items on the raccoon, or skill icons, into a contact sheet for checking art.
//   npx tsx tools/preview-items.ts out.png head        every head item
//   npx tsx tools/preview-items.ts out.png h_ 40        ids starting with h_, 40 per sheet page 0
//   npx tsx tools/preview-items.ts out.png skills       every skill icon
import { Sheet } from './png';
import { buildPose, DEFAULT_FUR, COON_W, COON_H, ANCHORS } from '../src/gfx/coon';
import { PAL } from '../src/gfx/palette';
import { loadContent } from '../src/content';
import { items, skills } from '../src/content/registry';

loadContent();
const pal: Record<string, string> = { ...PAL, ...DEFAULT_FUR };
const [out = 'items.png', filter = 'head', perArg, pageArg] = process.argv.slice(2);
const per = Number(perArg ?? 60);
const page = Number(pageArg ?? 0);

if (filter === 'skills' || filter.startsWith('skill:')) {
  const pre = filter.split(':')[1] ?? '';
  const list = [...skills.values()].filter((s) => s.id.startsWith(pre)).slice(page * per, (page + 1) * per);
  const cols = 12;
  const s = new Sheet(cols * 14 + 2, Math.ceil(list.length / cols) * 14 + 2);
  list.forEach((sk, i) => s.map(sk.icon, 2 + (i % cols) * 14, 2 + Math.floor(i / cols) * 14, pal));
  s.save(out, 5);
} else {
  const list = [...items.values()].filter((it) => it.slot === filter || it.id.startsWith(filter)).slice(page * per, (page + 1) * per);
  const cols = 10;
  const cw = COON_W + 14;
  const ch = COON_H + 16;
  const s = new Sheet(cols * cw, Math.ceil(list.length / cols) * ch);
  const base = buildPose('idle0');
  list.forEach((it, i) => {
    const ox = (i % cols) * cw + 8;
    const oy = Math.floor(i / cols) * ch + 10;
    const gear = it.gear ?? [];
    for (const g of gear.filter((g) => g.behind)) s.map(g.rows, ox + ANCHORS[g.anchor].x + g.x, oy + ANCHORS[g.anchor].y + g.y, pal);
    s.map(base, ox, oy, pal);
    for (const g of gear.filter((g) => !g.behind)) s.map(g.rows, ox + ANCHORS[g.anchor].x + g.x, oy + ANCHORS[g.anchor].y + g.y, pal);
    if (it.icon) s.map(it.icon, ox - 6, oy - 8, pal);
  });
  s.save(out, 4);
}
