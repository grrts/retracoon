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

Run it with `npx tsx path/to/script.ts`.

## Where content lives

- Enemies and bosses: `src/content/enemies/` (one file per family, plus `bosses.ts`).
- Items: `src/content/items/`. Skills: `src/content/skills.ts`. Events: `src/content/events/`.
- Themes (backgrounds): `src/world/themes/`, built from painters in `src/world/painters.ts`.
  Holiday overlays: `src/world/seasons.ts`.
- Skins: `src/meta/skins/`.
- Types for all of these: `src/content/types.ts`, `src/world/types.ts`, `src/meta/types.ts`.
