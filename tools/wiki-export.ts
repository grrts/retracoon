// Exports every piece of game content for the wiki on the website (server/, Symfony).
// Writes the data the wiki pages read and one sprite sheet per kind of content, all
// straight from the game's own content files, so the wiki never drifts from the game.
//   npm run wiki             rewrite server/wiki/content.json and server/public/wiki-sprites/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sheet } from './png';
import { buildPose, DEFAULT_FUR, COON_BASE, COON_W, ANCHORS, type Pose } from '../src/gfx/coon';
import { PAL } from '../src/gfx/palette';
import { CAN, PIZZA } from '../src/gfx/art';
import { loadContent } from '../src/content';
import { items, sets, skills, enemies, families, events, themes, seasons, skins, RARITY, TAGS, SLOT_NAMES, STAT_INFO } from '../src/content/registry';
import { passives } from '../src/content/passives';
import type { Gear, SkillCtx, SkillDef, StatKey } from '../src/content/types';
import type { SkinDef } from '../src/meta/types';

loadContent();

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(root, 'server/wiki/content.json');
const IMG = join(root, 'server/public/wiki-sprites');
mkdirSync(dirname(DATA), { recursive: true });
mkdirSync(IMG, { recursive: true });

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

// ---------------------------------------------------------------- sprite sheets

type Rect = [number, number, number, number]; // x, y, w, h on the sheet

// Packs pixel maps into one sheet, row by row, and saves it at 1x (the wiki scales it up
// with nearest-neighbour). Each draw callback paints into its cell.
class Atlas {
  cells: { key: string; w: number; h: number; draw: (s: Sheet, x: number, y: number) => void }[] = [];
  rects: Record<string, Rect> = {};
  add(key: string, w: number, h: number, draw: (s: Sheet, x: number, y: number) => void) {
    this.cells.push({ key, w, h, draw });
  }
  save(file: string, width = 1024) {
    let x = 0;
    let y = 0;
    let rowH = 0;
    const placed: [number, number][] = [];
    for (const c of this.cells) {
      if (x + c.w > width) (x = 0), (y += rowH + 1), (rowH = 0);
      placed.push([x, y]);
      this.rects[c.key] = [x, y, c.w, c.h];
      x += c.w + 1;
      rowH = Math.max(rowH, c.h);
    }
    const s = new Sheet(width, Math.max(1, y + rowH), null);
    this.cells.forEach((c, i) => c.draw(s, placed[i][0], placed[i][1]));
    s.save(join(IMG, file), 1);
    return { file: `${file}`, w: width, h: s.h };
  }
}

const bbox = (rows: string[]) => ({ w: Math.max(0, ...rows.map((r) => r.length)), h: rows.length });

// The raccoon with gear on, in a cell big enough for hats, capes and auras.
const CW = COON_W + 14;
const CH = 25 + 16;
const OX = 8;
const OY = 10;
function drawCoon(s: Sheet, x: number, y: number, pal: Record<string, string>, base: string[], gear: Gear[]) {
  const at = (g: Gear) => s.map(g.rows, x + OX + ANCHORS[g.anchor].x + g.x, y + OY + ANCHORS[g.anchor].y + g.y, pal);
  gear.filter((g) => g.behind).forEach(at);
  s.map(base, x + OX, y + OY, pal);
  gear.filter((g) => !g.behind).forEach(at);
}

// Mirrors gfx/coonTex.ts (which needs Phaser): a skin's pattern painted onto the fur.
const FUR = new Set(['1', '2', '3', '4', 'p']);
function skinPose(p: Pose, skin: SkinDef) {
  if (!skin.pattern) return buildPose(p);
  const base = COON_BASE.map((r, y) =>
    [...r.padEnd(COON_W, '.')]
      .map((c, x) => {
        const pc = skin.pattern![y]?.[x];
        return pc && pc !== '.' && pc !== ' ' && FUR.has(c) && c !== 'p' ? pc : c;
      })
      .join(''),
  );
  return buildPose(p, base);
}
const skinPal = (skin?: SkinDef): Record<string, string> => {
  const f = skin?.fur ?? DEFAULT_FUR;
  return { ...PAL, '1': f['1'], '2': f['2'], '3': f['3'], '4': f['4'], p: f.p ?? DEFAULT_FUR.p };
};

const coonPal = skinPal();
const idle = buildPose('idle0');

// ---------------------------------------------------------------- items and sets

const itemSheet = new Atlas();
const itemList = [...items.values()];
for (const it of itemList) itemSheet.add(it.id, CW, CH, (s, x, y) => drawCoon(s, x, y, coonPal, idle, it.gear ?? []));
const setList = [...sets.values()];
for (const st of setList) {
  const gear = st.pieces.flatMap((id) => items.get(id)?.gear ?? []);
  itemSheet.add(`set:${st.id}`, CW, CH, (s, x, y) => drawCoon(s, x, y, coonPal, idle, gear));
}

const itemOut = itemList.map((it) => ({
  id: it.id,
  name: it.name,
  rarity: it.rarity,
  slot: it.slot,
  tags: it.tags,
  desc: it.desc,
  set: it.set ?? null,
  risky: !!it.risky,
  needsBoss: !!it.needsBoss,
}));
const setOut = setList.map((s) => ({
  id: s.id,
  name: s.name,
  color: hex(s.color),
  risky: !!s.risky,
  pieces: s.pieces,
  bonuses: s.bonuses.map((b) => ({ n: b.n, desc: b.desc })),
}));

// ---------------------------------------------------------------- skills and passives

const iconSheet = new Atlas();
const skillList = [...skills.values()];
for (const sk of skillList) {
  const { w, h } = bbox(sk.icon);
  iconSheet.add(sk.id, w, h, (s, x, y) => s.map(sk.icon, x, y, PAL));
}
const passiveList = [...passives.values()];
for (const p of passiveList) {
  const { w, h } = bbox(p.icon);
  iconSheet.add(`passive:${p.id}`, w, h, (s, x, y) => s.map(p.icon, x, y, PAL));
}

// The text a skill shows on its card. Locked skills scale with the level or stat that
// unlocked them, so they are described for a raccoon that has just unlocked them.
const START: Record<StatKey, number> = { str: 3, def: 2, agi: 2, lck: 2, vit: 3 };
function ctxFor(sk: SkillDef): SkillCtx {
  const stats = { ...START };
  if (sk.req?.stat) stats[sk.req.stat] = Math.max(stats[sk.req.stat], sk.req.min ?? 0);
  return { level: Math.max(1, sk.req?.level ?? 1), stats };
}
const kind = (sk: SkillDef) => (sk.req?.level && sk.req?.stat ? 'mastery' : sk.req?.level ? 'level' : sk.req?.stat ? 'stat' : 'open');
const skillOut = skillList.map((sk) => {
  const ctx = ctxFor(sk);
  return {
    id: sk.id,
    name: sk.name,
    cost: sk.cost,
    cooldown: sk.cooldown,
    target: sk.target,
    max: sk.max,
    kind: kind(sk),
    req: sk.req ? { level: sk.req.level ?? null, stat: sk.req.stat ?? null, min: sk.req.min ?? null } : null,
    ranks: Array.from({ length: sk.max }, (_, i) => sk.desc(i + 1, ctx)),
  };
});
const passiveOut = passiveList.map((p) => ({
  id: p.id,
  name: p.name,
  color: hex(p.color),
  each: p.each,
  max: p.max ?? null,
  stacks: [1, 2, 3, 5].filter((n) => !p.max || n <= p.max).map((n) => ({ n, desc: p.desc(n) })),
}));

// ---------------------------------------------------------------- enemies

const foeSheet = new Atlas();
const enemyList = [...enemies.values()];
for (const e of enemyList) {
  const f = e.frames[0];
  const { w, h } = bbox(f);
  foeSheet.add(e.id, w, h, (s, x, y) => s.map(f, x, y, PAL));
  const p2 = e.phase2?.frames?.[0];
  if (p2) {
    const b = bbox(p2);
    foeSheet.add(`${e.id}:2`, b.w, b.h, (s, x, y) => s.map(p2, x, y, PAL));
  }
}
const familyOf = new Map<string, string>();
for (const [fam, ids] of families) for (const id of ids) familyOf.set(id, fam);
const move = (m: (typeof enemyList)[number]['moves'][number]) => ({
  name: m.name,
  intent: m.intent,
  dmg: m.dmg ?? null,
  hits: m.hits ?? null,
  block: m.block ?? null,
  heal: m.heal ?? null,
  apply: m.apply ?? null,
  buff: m.buff ?? null,
  summon: m.summon ?? null,
  steal: m.steal ?? null,
  apDrain: m.apDrain ?? null,
  windup: m.weight === 0,
  once: !!m.once,
});
const enemyOut = enemyList.map((e) => ({
  id: e.id,
  name: e.name,
  boss: !!e.boss,
  family: e.family ?? familyOf.get(e.id) ?? null,
  role: e.role ?? null,
  minStage: e.minStage ?? null,
  hp: e.hp,
  armor: e.armor ?? null,
  regen: e.regen ?? null,
  dodge: e.dodge ?? null,
  flyer: !!e.flyer,
  onDeath: e.onDeath ?? null,
  split: e.split ?? null,
  xp: e.xp,
  shinies: e.shinies,
  moves: e.moves.map(move),
  phase2: e.phase2 ? { at: e.phase2.at, name: e.phase2.name, moves: e.phase2.moves.map(move) } : null,
}));

// ---------------------------------------------------------------- areas, events, seasons

const areaOut = [...themes.values()].map((t) => ({
  id: t.id,
  name: t.name,
  tier: t.tier,
  sky: t.sky,
  weather: t.weather?.kind ?? null,
  night: t.light !== undefined && t.light !== 0xffffff,
  families: t.families,
  boss: t.boss,
  hazard: t.hazard ? { name: t.hazard.name, every: t.hazard.every, desc: t.hazard.desc } : null,
  events: t.events ?? [],
}));

const eventSheet = new Atlas();
const PROPS: Record<string, string[]> = { can: CAN, pizza: PIZZA };
const eventOut = events.map((ev) => {
  let art: string | null = null;
  if (ev.artRows) {
    const { w, h } = bbox(ev.artRows);
    eventSheet.add(ev.id, w, h, (s, x, y) => s.map(ev.artRows!, x, y, PAL));
    art = `event:${ev.id}`;
  } else if (ev.art) {
    // A texture key: an enemy's frame, or one of the game's loose sprites.
    const foe = ev.art.replace(/_\d+$/, '');
    const loose = PROPS[ev.art];
    if (enemies.has(foe)) art = `foe:${foe}`;
    else if (loose) {
      const { w, h } = bbox(loose);
      eventSheet.add(ev.id, w, h, (s, x, y) => s.map(loose, x, y, PAL));
      art = `event:${ev.id}`;
    }
  }
  return {
    id: ev.id,
    title: ev.title,
    text: ev.text,
    art,
    minDanger: ev.minDanger ?? null,
    themes: ev.themes ?? [],
    options: ev.options.map((o) => ({ label: o.label, detail: o.detail })),
  };
});

const seasonOut = seasons.map((s) => ({ id: s.id, name: s.name, from: s.from, to: s.to, banner: s.banner }));

// ---------------------------------------------------------------- skins

const skinSheet = new Atlas();
const skinList = [...skins.values()];
for (const sk of skinList) skinSheet.add(sk.id, CW, CH, (s, x, y) => drawCoon(s, x, y, skinPal(sk), skinPose('idle0', sk), sk.outfit ?? []));
const skinOut = skinList.map((s) => ({ id: s.id, name: s.name, rarity: s.rarity, group: s.group, season: s.season ?? null, effect: s.effect ?? null }));

// ---------------------------------------------------------------- write

const sheets = {
  items: { ...itemSheet.save('items.png'), rects: itemSheet.rects },
  icons: { ...iconSheet.save('icons.png', 512), rects: iconSheet.rects },
  foes: { ...foeSheet.save('foes.png'), rects: foeSheet.rects },
  events: { ...eventSheet.save('events.png'), rects: eventSheet.rects },
  skins: { ...skinSheet.save('skins.png'), rects: skinSheet.rects },
};

const out = {
  rarities: RARITY.map((r) => ({ name: r.name, color: hex(r.color) })),
  skinRarities: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'],
  tags: Object.fromEntries(Object.entries(TAGS).map(([k, t]) => [k, { name: t.name, color: hex(t.color), two: t.two, four: t.four }])),
  slots: SLOT_NAMES,
  stats: Object.fromEntries(Object.entries(STAT_INFO).map(([k, s]) => [k, { name: s.name, short: s.short, desc: s.desc, color: hex(s.color) }])),
  items: itemOut,
  sets: setOut,
  skills: skillOut,
  passives: passiveOut,
  enemies: enemyOut,
  families: Object.fromEntries(families),
  areas: areaOut,
  events: eventOut,
  seasons: seasonOut,
  skins: skinOut,
  sheets,
};
writeFileSync(DATA, JSON.stringify(out) + '\n');

const n = (k: keyof typeof out) => (Array.isArray(out[k]) ? (out[k] as unknown[]).length : 0);
console.log(
  `wiki: ${n('items')} items, ${n('sets')} sets, ${n('skills')} skills, ${n('passives')} passives, ${n('enemies')} enemies, ` +
    `${n('areas')} areas, ${n('events')} events, ${n('skins')} skins -> ${DATA.replace(root + '/', '')}`,
);
