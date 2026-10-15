# Making content for Retracoon

All art is pixel maps in TypeScript: arrays of equal-length strings, one character per
pixel. `.` (or space) is transparent; every other character is a palette key from
`src/gfx/palette.ts`. Nothing is loaded from image files; the game turns these maps into
textures at startup.

## Screen and scale

- Logical screen: 216 px tall, 360 to 480 px wide. The ground line is at y = 160.
- The raccoon is 36 x 25 px (`src/gfx/coon.ts`). Regular enemies are 14 to 36 px wide and
  10 to 32 px tall; bosses 40 to 72 px wide and 32 to 60 px tall. Sprites stand on the
  ground with their bottom row.
- Every sprite has a 1 px dark outline (`k`) around its silhouette. Light comes from the
  top left: use a lighter shade on top/left edges and a darker one on bottom/right.
- Critters face **left** (towards the raccoon, who faces right).

## Palette keys

Sweetie-16 plus extras. Common ones:

| key | colour | key | colour | key | colour |
| --- | --- | --- | --- | --- | --- |
| k | near black (outline) | w | white | l | light grey |
| g | grey | d | dark grey | a | asphalt |
| r | red | o | orange | y | yellow |
| O | gold | L | lime | G | green |
| D | teal | B | navy | b | blue |
| c | sky | C | ice | n | brown |
| N | dark brown | P | pink | p | plum |
| v | violet | e | dark violet | H | night |
| u | deep purple | M | magenta | h | hot pink |
| R | dark red | q | lava | Y | pale yellow |
| Q | cream | s | sand | S | dark sand |
| T | tan | U | brick | E | deep forest |
| F | forest | z | moss | m | mint |
| t | light teal | i | frost | A | ocean |
| I | indigo | j | mud | J | driftwood |

Digits `1`-`4` and `p` are reserved for the raccoon's fur channels (skins recolour them).

## Previewing

`tools/png.ts` has a tiny software canvas (`Sheet`) that writes PNGs, so art can be
checked without a browser:

```ts
import { Sheet } from './tools/png';
import { PAL } from './src/gfx/palette';
const s = new Sheet(64, 40);
s.map(MY_SPRITE, 2, 2, PAL);
s.save('preview.png', 8); // 8x zoom
```

Run it with `npx tsx path/to/script.ts`. Ready-made sheets:

- `npx tsx tools/preview-items.ts out.png head` every head item on the raccoon (or `skills`).
- `npx tsx tools/preview-shapes.ts out.png paw` one slot's shape library in sample inks.
- `npx tsx tools/preview-glyphs.ts out.png a` one batch of skill glyphs in sample inks.

`npm run content:check` lints all content: unique ids, names and art, card text that fits,
item power within its rarity's budget, risky items that really have a catch, and sets.

## Where content lives

- Enemies and bosses: `src/content/enemies/` (one file per family, plus `bosses.ts`).
- Items: `src/content/items/`. The hand-made ones sit in one file per slot; the big
  catalogue is one line per item in `items/forged/` and `items/sets.ts`, built by
  `items/forge.ts`, which writes each card's text from its effects.
- Item art for forged items: `items/sprites/`, one library of shapes per slot drawn in
  paint channels (`1`-`4` main ink light to dark, `5`-`6` accent ink). The forge picks the
  shape from words in the item's name (`sprites/match.ts`) and the inks from its effects,
  and never draws two items alike.
- Skills: `src/content/skills/` (`base.ts` the originals, `free.ts`, `levels.ts` and
  `stats.ts` the big book, one `sk()` line each). Icons: `skills/glyphs/` in the same paint
  channels; `skills/looks.ts` matches a glyph to the skill's name.
- Passives: `src/content/passives.ts`. Events: `src/content/events/`.
- Themes (backgrounds): `src/world/themes/`, built from painters in `src/world/painters.ts`.
  Holiday overlays: `src/world/seasons.ts`.
- Skins: `src/meta/skins/`.
- Types for all of these: `src/content/types.ts`, `src/world/types.ts`, `src/meta/types.ts`.
