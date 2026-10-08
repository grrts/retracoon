// Counts the distinct pieces of art the game ships. Run: npm run assets:count
import { loadContent } from '../src/content';
import { enemies, themes, seasons, skins, items, skills, events } from '../src/content/registry';
import { STATUS_ICONS, INTENT_ICONS } from '../src/gfx/art';
import { TIERS } from '../src/game/combat';

loadContent();

const rows: [string, number][] = [];
const en = [...enemies.values()];
rows.push(['enemies (drawn, incl. animation frames)', en.reduce((a, e) => a + e.frames.length, 0)]);
rows.push(['boss phase-2 forms', en.reduce((a, e) => a + (e.phase2?.frames?.length ?? 0), 0)]);
const th = [...themes.values()];
rows.push(['background layers (sky, scenery, ground, foreground)', th.reduce((a, t) => a + 2 + t.layers.length + (t.front ? 1 : 0), 0)]);
rows.push(['holiday overlays (props, foreground, weather)', seasons.reduce((a, s) => a + (s.props ? 1 : 0) + (s.front ? 1 : 0) + (s.weather ? 1 : 0), 0)]);
const sk = [...skins.values()];
rows.push(['raccoon skins', sk.length]);
rows.push(['skin outfit pieces', sk.reduce((a, s) => a + (s.outfit?.length ?? 0), 0)]);
const it = [...items.values()];
rows.push(['items (icons)', it.length]);
rows.push(['item gear pieces drawn on the raccoon', it.reduce((a, i) => a + (i.gear?.length ?? 0), 0)]);
rows.push(['skill icons', skills.size]);
rows.push(['event illustrations', events.filter((e) => e.artRows).length]);
rows.push(['status and intent icons', Object.keys(STATUS_ICONS).length + Object.keys(INTENT_ICONS).length]);
const drawn = rows.reduce((a, [, n]) => a + n, 0);
const variants = en.filter((e) => !e.boss).length * (TIERS.length - 1);

const w = Math.max(...rows.map(([k]) => k.length));
for (const [k, n] of rows) console.log(`${k.padEnd(w)}  ${String(n).padStart(5)}`);
console.log(`${'TOTAL hand-made assets'.padEnd(w)}  ${String(drawn).padStart(5)}`);
console.log(`${'+ enemy tier recolours (Mean, Feral, Mythic)'.padEnd(w)}  ${String(variants).padStart(5)}`);
console.log(`themes ${th.length}, events ${events.length}, seasons ${seasons.length}`);
