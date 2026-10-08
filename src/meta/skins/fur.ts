// Fur skins: colour sets and patterns, no outfit pieces.
import { DEFAULT_FUR } from '../../gfx/coon';
import type { SkinDef, SkinRarity } from '../types';
import {
  fur, tone, pat, layer, only, fill, stripesV, stripesH, diag, checker, dots, blobs, rosettes, gradV, gradH, gradD,
  waves, zigzag, tigerStripes, ellipse, rnd, inHead, inTail, inBody, type Fur, type PatFn,
} from './util';

type Extra = Partial<Pick<SkinDef, 'effect' | 'glow'>>;
const sk = (id: string, name: string, rarity: SkinRarity, f: Fur, p?: PatFn, extra: Extra = {}): SkinDef => {
  const s: SkinDef = { id, name, rarity, group: 'fur', fur: f };
  if (p) s.pattern = pat(p);
  return Object.assign(s, extra);
};

// Region helpers used below.
const mask = (x: number, y: number, c: string) => inHead(x, y) && c === '2' && y >= 5;
const ears = (x: number, y: number) => inHead(x, y) && y <= 2;

const tailTip = (x: number, y: number) => inTail(x, y) && x <= 3;
const keep2 = (k: string): PatFn => (x, y, c) => (c === '2' && (inHead(x, y) || inTail(x, y)) ? k : undefined);
const onMask = (k: string): PatFn => (x, y, c) => (mask(x, y, c) ? k : undefined);
const onTail = (f: PatFn): PatFn => (x, y, c) => (inTail(x, y) ? f(x, y, c) : undefined);
const onBody = (f: PatFn): PatFn => (x, y, c) => (inBody(x, y) ? f(x, y, c) : undefined);

// Repaint the whole raccoon except the eye mask / outline details.
const coat = (f: PatFn): PatFn => only('13', f);

// Diamond lattice for argyle / harlequin.
const diamonds = (a: string, b: string | undefined, size = 4): PatFn => (x, y) => {
  const u = Math.floor((x + y) / size);
  const v = Math.floor((x - y + 64) / size);
  return (u + v) % 2 ? a : b;
};
// Big irregular patches (cells of `size` px, hashed).
const patches = (keys: (string | undefined)[], size: number, seed: number): PatFn => (x, y) => {
  const wob = rnd(Math.floor(x / 2), Math.floor(y / 2), seed + 50) < 0.3 ? 1 : 0;
  const cx = Math.floor((x + wob) / size);
  const cy = Math.floor((y + wob) / size);
  return keys[Math.floor(rnd(cx, cy, seed) * keys.length)];
};
// Giraffe: brown tiles split by pale lines.
const giraffe = (k: string, gap: string | undefined): PatFn => (x, y) => {
  const ox = Math.floor(y / 4) % 2 ? 2 : 0;
  return (x + ox) % 4 === 0 || y % 4 === 0 ? gap : k;
};
// Rings (target / tree rings) around a centre.
const rings = (keys: (string | undefined)[], cx: number, cy: number, w = 2): PatFn => (x, y) =>
  keys[Math.floor(Math.hypot(x - cx, (y - cy) * 1.3) / w) % keys.length];
// Honeycomb-ish hex outline.
const hexes = (k: string): PatFn => (x, y) => {
  const row = Math.floor(y / 3);
  const ox = row % 2 ? 3 : 0;
  const xx = (x + ox) % 6;
  return y % 3 === 0 ? (xx < 3 ? k : undefined) : xx === 0 ? k : undefined;
};
// Lightning bolt zigzag lines.
const bolts = (k: string, period = 9): PatFn => (x, y) => {
  const z = Math.abs((y % 6) - 3);
  return (x + z) % period === 0 ? k : undefined;
};
// Bricks.
const bricks = (k: string): PatFn => (x, y) => (y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0 ? k : undefined);
// Scales.
const scales = (k: string): PatFn => (x, y) => {
  const ox = Math.floor(y / 2) % 2 ? 2 : 0;
  const xx = (x + ox) % 4;
  return y % 2 === 0 ? (xx === 0 || xx === 3 ? k : undefined) : xx === 0 ? undefined : undefined;
};

export const FUR_SKINS: SkinDef[] = [
  { id: 'classic', name: 'CLASSIC', rarity: 0, group: 'fur', fur: { ...DEFAULT_FUR } },

  // ---------------------------------------------------------------- natural (common)
  sk('brown', 'MUDDY BROWN', 0, fur('#8f6a4e', '#3f2a1f', '#d2b48c', '#f4ead8', '#e8a0a0')),
  sk('cinnamon', 'CINNAMON', 0, fur('#b06a3b', '#5c2e1a', '#e8b48a', '#fff0dc')),
  sk('albino', 'ALBINO', 0, fur('#eeeae6', '#cfc4c8', '#fffaf6', '#ffffff', '#ff8fa8')),
  sk('melanistic', 'MIDNIGHT', 0, fur('#34364a', '#15161f', '#565a74', '#9aa0bc', '#8a4a6a')),
  sk('silver', 'SILVERBACK', 0, fur('#b9c4d2', '#55607a', '#e8edf2', '#ffffff')),
  sk('blonde', 'BLONDE', 0, fur('#dcb878', '#7a5a32', '#f6e6bc', '#fffaf0')),
  sk('ashen', 'ASHEN', 0, fur('#9a8c80', '#4a3f38', '#cfc4b8', '#f4f0ea')),
  sk('rusty', 'RUSTY', 0, fur('#a8482a', '#4a1f12', '#e09068', '#ffe0c8')),
  sk('chocolate', 'CHOCOLATE', 0, fur('#5c3a2e', '#24140e', '#8f6a55', '#d8c0a8')),
  sk('arctic', 'ARCTIC', 0, fur('#e2eaf2', '#6a7f9c', '#ffffff', '#ffffff', '#c7f2ff')),
  sk('swamp', 'SWAMP COON', 0, fur('#767c48', '#34381c', '#b0b07a', '#e6e6c0')),
  sk('blush', 'BLUSH', 0, fur('#c8a0a8', '#5a3a48', '#ecd4d8', '#fff4f6', '#ff77c8')),

  // ---------------------------------------------------------------- bright solids (common)
  sk('cherry', 'CHERRY', 0, tone('#c8384a')),
  sk('tangerine', 'TANGERINE', 0, tone('#f08a30')),
  sk('lemon', 'LEMON', 0, tone('#f2d84a', 0.6)),
  sk('lime', 'LIME', 0, tone('#94d858', 0.6)),
  sk('froggy', 'FROGGY', 0, tone('#38a454')),
  sk('mint', 'MINT', 0, tone('#90e4b8', 0.6)),
  sk('teal', 'TEAL', 0, tone('#24908e')),
  sk('sky', 'BLUE SKY', 0, tone('#5ab0f0')),
  sk('cobalt', 'COBALT', 0, tone('#3a56d0')),
  sk('grape', 'GRAPE', 0, tone('#8a48c8')),
  sk('magenta', 'MAGENTA', 0, tone('#c8389a')),
  sk('bubblegum', 'BUBBLEGUM', 0, tone('#ff84c8', 0.5)),
  sk('lavender', 'LAVENDER', 0, tone('#b8a2ea', 0.5)),
  sk('peach', 'PEACH', 0, tone('#f8b48c', 0.5)),
  sk('plum', 'PLUM', 0, tone('#6a2a6c', 0.6, 0.5)),
  sk('coral', 'CORAL', 0, tone('#ff6e64')),
  sk('denim', 'DENIM', 0, tone('#4a6a9c')),
  sk('sage', 'SAGE', 0, tone('#9ab08a', 0.6)),
  sk('burgundy', 'BURGUNDY', 0, tone('#7a1f3a', 0.6, 0.5)),
  sk('turquoise', 'TURQUOISE', 0, tone('#3ad8d0', 0.6)),
  sk('whitemask', 'WHITE MASK', 0, fur('#4a4a52', '#f4f4f4', '#6a6a74', '#f4f4f4', '#ff77c8')),
  sk('snowball', 'SNOWBALL', 0, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#c7f2ff')),

  // ---------------------------------------------------------------- simple patterns (common)
  sk('socks', 'SOCKS', 0, { ...DEFAULT_FUR, '2': '#f4f4f4' }, keep2('d')),
  sk('nomask', 'NO MASK', 0, fur('#a08670', '#5c4636', '#e0cdb8'), onMask('1')),
  sk('bluemask', 'BLUE BANDIT', 0, fur('#d8d0c4', '#2848b8', '#fff6e8'), undefined),
  sk('redmask', 'RED BANDIT', 0, fur('#3c4258', '#d83a3a', '#8b93a8', '#ffcd75')),
  sk('goldmask', 'GOLD BANDIT', 0, fur('#3a2a5a', '#ffa300', '#6a5a8a', '#fff3b0')),
  sk('inverted', 'INVERTED', 0, fur('#c9d1dd', '#8b93a8', '#3c4258', '#1a1c2c', '#94b0c2')),
  sk('pinstripe', 'PINSTRIPE', 0, fur('#3a3e50', '#1a1c2c', '#5a5e74', '#f4f4f4'), coat(stripesV('l', 3))),
  sk('striped', 'STRIPED', 0, tone('#5ab0f0'), only('1', onBody(stripesH('2', 3)))),
  sk('freckles', 'FRECKLES', 0, fur('#e0a070', '#7a3a20', '#f8d8b8'), only('13', dots('n', 0.1, 4))),
  sk('spotty', 'SPOTTY', 0, tone('#f2d84a', 0.6), coat(blobs('2', 0.25, 3, 2))),
  sk('polka', 'POLKA DOT', 0, tone('#ff84c8', 0.5), coat((x, y) => ((x % 4 === 1 && y % 4 === 1) || (x % 4 === 3 && y % 4 === 3) ? 'w' : undefined))),
  sk('moldy', 'MOLDY', 0, fur('#8a9a8a', '#3a4a3a', '#c0ccb8'), coat(layer(blobs('z', 0.3, 3, 5), dots('L', 0.06, 6)))),
  sk('mudsplat', 'MUD SPLAT', 0, fur('#c9b8a0', '#4d3b24', '#efe2cc'), coat(layer(blobs('j', 0.3, 3, 8), dots('j', 0.08, 9)))),
  sk('banana', 'BANANA PEEL', 0, fur('#f2d84a', '#5c3a2e', '#fff3b0'), coat(dots('N', 0.08, 11))),
  sk('mintchip', 'MINT CHIP', 0, fur('#9be2b0', '#4d3b24', '#d8f6e2'), coat(dots('N', 0.12, 12))),
  sk('sprinkles', 'SPRINKLES', 0, fur('#ff9ed0', '#7a3a20', '#ffd8ec'), coat((x, y) => {
    const r = rnd(x, y, 13);
    return r < 0.04 ? 'c' : r < 0.08 ? 'y' : r < 0.12 ? 'w' : r < 0.15 ? 'L' : undefined;
  })),
  sk('cardboard', 'CARDBOARD', 0, fur('#c49a62', '#7a5a32', '#e0c08a', '#f4e2b8'), coat(layer(stripesH('s', 6, 1, 3), (x, y) => (inBody(x, y) && y >= 15 && y <= 16 ? 'J' : undefined)))),
  sk('dumpster', 'DUMPSTER', 0, fur('#2d6a3e', '#16382c', '#5a9a5a', '#c0e0b0'), coat(layer(dots('U', 0.08, 14), dots('S', 0.04, 15)))),
  sk('tuxedo', 'TUXEDO', 0, fur('#22242e', '#0e0f1a', '#f4f4f4', '#f4f4f4', '#f5a5b8'), (x, y) =>
    y === 13 && x >= 23 && x <= 26 ? (x === 24 || x === 25 ? 'R' : 'r') : y === 14 && (x === 23 || x === 26) ? 'r' : undefined),
  sk('siamese', 'SIAMESE', 0, fur('#f0e2c8', '#4a3226', '#fff6e8', '#ffffff', '#c89a8a'), layer(only('1', onTail(fill('2'))), (x, y, c) => (inHead(x, y) && y >= 8 && x >= 25 && c !== '4' ? '2' : undefined))),
  sk('skunk', 'SKUNK', 0, fur('#1e2030', '#0e0f1a', '#2a2c3e', '#f4f4f4', '#f5a5b8'), layer(
    (x, y, c) => (c === '1' && ((inBody(x, y) && y <= 14) || (inHead(x, y) && y <= 5 && x >= 19 && x <= 26)) ? 'w' : undefined),
    only('1', onTail((x) => (x >= 3 && x <= 6 ? 'w' : undefined))),
  )),
  sk('badger', 'BADGER', 0, fur('#7a7a80', '#1e2030', '#c0c0c8', '#f4f4f4'), (x, y, c) =>
    inHead(x, y) && x >= 21 && x <= 24 && y <= 8 && c !== '4' ? 'w' : undefined),
  sk('piebald', 'PIEBALD', 0, fur('#8f6a4e', '#3f2a1f', '#f4ead8'), coat(blobs('w', 0.3, 4, 16))),
  sk('patchwork', 'PATCHWORK', 0, fur('#b06a3b', '#3f2a1f', '#e8b48a'), coat(layer(patches(['n', undefined, 'r', 'z', 'S', undefined], 4, 17), (x, y) => (x % 4 === 0 || y % 4 === 0) && rnd(x, y, 18) < 0.25 ? 'Y' : undefined))),
  sk('confetti', 'CONFETTI', 0, fur('#f4f4f4', '#566c86', '#ffffff', '#ffffff'), coat((x, y) => {
    const r = rnd(x, y, 19);
    return r < 0.05 ? 'r' : r < 0.1 ? 'c' : r < 0.15 ? 'y' : r < 0.2 ? 'G' : r < 0.24 ? 'v' : undefined;
  })),
  sk('halfhalf', 'HALF & HALF', 0, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#c0c0c0'), only('13', (x) => (x <= 17 ? 'd' : undefined))),
  sk('dipped', 'DIPPED', 0, fur('#ffcd75', '#5c3a2e', '#fff3b0'), only('13', (_x, y) => (y >= 17 ? 'N' : undefined))),
  sk('hotfoot', 'HOT FEET', 0, fur('#566c86', '#ff4b1f', '#94b0c2'), layer(keep2('d'), only('1', onTail((x) => (x <= 3 ? 'o' : undefined))))),
  sk('bigbelly', 'BIG BELLY', 0, fur('#7a4a33', '#3a1f12', '#ffcd75', '#fff3b0'), ellipse('3', 20, 16, 9, 4.5)),
  sk('earmuffs', 'PINK EARS', 0, fur('#94b0c2', '#333c57', '#f4f4f4', '#ffffff', '#ff77c8'), (x, y) => (ears(x, y) ? 'h' : undefined)),
  sk('neapolitan', 'NEAPOLITAN', 0, fur('#fff6e0', '#5c3a2e', '#ffffff', '#ffffff'), only('13', (_x, y) => (y <= 13 ? 'P' : y >= 18 ? 'n' : undefined))),
  sk('ringtail', 'RING MASTER', 0, fur('#d6a77a', '#b13e53', '#fff6e0'), onTail(stripesH('r', 2))),

  // ---------------------------------------------------------------- rare
  sk('tiger', 'TIGER', 1, fur('#ec7a2a', '#1a1c2c', '#fff6e0', '#ffffff'), only('1', tigerStripes('k', 4, 3))),
  sk('whitetiger', 'WHITE TIGER', 1, fur('#eef0f4', '#2a2c3e', '#ffffff', '#ffffff', '#ff8fa8'), only('13', tigerStripes('a', 4, 21))),
  sk('zebra', 'ZEBRA', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff'), only('13', (x, y) => ((x + Math.round(Math.sin(y / 2) * 1)) % 4 < 2 ? 'k' : undefined))),
  sk('leopard', 'LEOPARD', 1, fur('#e8b860', '#4a2a10', '#fff0c8'), only('13', rosettes('N', 'S', 0.55, 22))),
  sk('cheetah', 'CHEETAH', 1, fur('#f0c060', '#2a1a10', '#fff4d8'), only('13', dots('N', 0.16, 23))),
  sk('giraffe', 'GIRAFFE', 1, fur('#fff0c8', '#7a4a33', '#fff6e0'), only('1', giraffe('S', undefined))),
  sk('dalmatian', 'DALMATIAN', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff'), only('13', blobs('k', 0.22, 2, 24))),
  sk('cow', 'MOO COON', 1, fur('#f4f4f4', '#1a1c2c', '#ffd8e0', '#ffffff'), only('1', blobs('k', 0.4, 5, 25))),
  sk('panda', 'PANDA', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff', '#566c86'), layer((x, y, c) => (c === '1' && inBody(x, y) && y >= 12 && y <= 14 ? '2' : undefined), (x, y) => (ears(x, y) ? '2' : undefined), only('1', onTail(fill('2'))))),
  sk('fox', 'FOX', 1, fur('#ea6e22', '#3a1a10', '#f4f4f4', '#ffffff', '#3a1a10'), layer(onMask('1'), only('2', onTail(fill('1'))), (x, y) => (tailTip(x, y) ? 'w' : undefined), (x, y) => (inHead(x, y) && y >= 9 && x >= 23 ? '3' : undefined))),
  sk('redpanda', 'RED PANDA', 1, fur('#c4501c', '#3a1408', '#f0e0d0', '#ffffff', '#3a1408'), only('2', onTail(fill('U')))),
  sk('calico', 'CALICO', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff'), only('1', patches(['o', 'k', undefined, undefined, 'o'], 4, 26))),
  sk('tortie', 'TORTOISESHELL', 1, fur('#2a1a10', '#1a1c2c', '#c87a3a'), only('13', (x, y) => (rnd(x, y, 27) < 0.35 ? 'o' : rnd(x, y, 28) < 0.2 ? 'S' : undefined))),
  sk('camo', 'CAMO', 1, fur('#6a8f3a', '#16382c', '#86745a', '#c0c0a0'), only('13', layer(blobs('F', 0.4, 3, 29, true), blobs('j', 0.3, 3, 30, true), blobs('E', 0.2, 2, 31)))),
  sk('desertcamo', 'DESERT CAMO', 1, fur('#e0c890', '#7a5a32', '#f4e2b8'), only('13', layer(blobs('S', 0.4, 3, 32), blobs('T', 0.35, 3, 33), blobs('J', 0.15, 2, 34)))),
  sk('snowcamo', 'SNOW CAMO', 1, fur('#f4f4f4', '#566c86', '#ffffff', '#ffffff'), only('13', layer(blobs('l', 0.35, 3, 35), blobs('g', 0.15, 2, 36)))),
  sk('urbancamo', 'URBAN CAMO', 1, fur('#94b0c2', '#1a1c2c', '#c0d0dc'), only('13', layer(patches(['g', 'd', undefined, 'l'], 3, 37)))),
  sk('checker', 'CHECKERED', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff'), only('13', checker('k', undefined, 2))),
  sk('tartan', 'TARTAN', 1, fur('#b13e53', '#29366f', '#d86a7a', '#ffcd75'), only('13', (x, y) => {
    const v = x % 6 < 2;
    const h = y % 6 < 2;
    return v && h ? 'B' : v || h ? 'R' : x % 6 === 4 || y % 6 === 4 ? 'y' : undefined;
  })),
  sk('argyle', 'ARGYLE', 1, fur('#7a4a8f', '#3b1f5c', '#b05ccf', '#fff3b0'), only('13', layer(diamonds('v', 'e', 4), (x, y) => ((x + y) % 8 === 0 || (x - y + 64) % 8 === 0 ? 'Y' : undefined)))),
  sk('zigzag', 'ZIGZAG', 1, tone('#38b764'), only('13', zigzag('Y', 4, 3))),
  sk('wavy', 'WAVY', 1, tone('#3b5dc9'), only('13', layer(waves('C', 4, 1, 4), waves('c', 4, 1, 4 + 0.5)))),
  sk('sunset', 'SUNSET', 1, fur('#ef7d57', '#5d275d', '#ffcd75'), only('13', gradV(['y', 'y', 'o', 'o', 'r', 'M', 'p'], 2, 22))),
  sk('ocean', 'DEEP BLUE', 1, fur('#1e6fbf', '#0e0f1a', '#73eff7'), only('13', gradV(['C', 't', 'c', 'A', 'b', 'B', 'I'], 0, 22))),
  sk('watermelon', 'WATERMELON', 1, fur('#38b764', '#1a1c2c', '#ff4b1f', '#a7f070'), layer(only('3', (x, y) => (rnd(x, y, 38) < 0.1 ? 'k' : 'q')), only('1', stripesV('F', 3)))),
  sk('bee', 'BUMBLEBEE', 1, fur('#ffcd75', '#1a1c2c', '#fff3b0'), layer(only('13', onBody(stripesV('k', 5, 2))), only('1', onTail(fill('y'))))),
  sk('ladybug', 'LADYBUG', 1, fur('#d82838', '#1a1c2c', '#ff6e64'), only('13', layer(blobs('k', 0.3, 3, 39), (x, y) => (inBody(x, y) && x === 17 && y <= 19 ? 'k' : undefined)))),
  sk('poisonfrog', 'DART FROG', 1, fur('#2a7ae8', '#1a1c2c', '#73eff7'), only('13', blobs('k', 0.35, 3, 40))),
  sk('koi', 'KOI', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff'), only('1', patches(['q', 'q', undefined, undefined, 'O'], 5, 41))),
  sk('moth', 'MOTH', 1, fur('#b8a890', '#4a3f38', '#e0d4c0'), only('13', layer(rings(['J', undefined, undefined], 12, 16, 2), ellipse('N', 12, 16, 1.5, 1.5), ellipse('N', 22, 17, 1.5, 1.5)))),
  sk('tanuki', 'TANUKI', 1, fur('#a07848', '#2a1a10', '#e0c890', '#fff0d8'), layer((x, y, c) => (inBody(x, y) && y <= 13 && c === '1' ? 'N' : undefined))),
  sk('possum', 'POSSUM PAL', 1, fur('#c0c0c8', '#4a4a52', '#f4f4f4', '#ffffff', '#ff77c8'), layer(onMask('4'), only('12', onTail(fill('P'))))),
  sk('trashbag', 'TRASH BAG', 1, fur('#23262f', '#0e0f14', '#3a3e4c', '#94b0c2'), only('13', layer(diag('a', 7, 1, -1), (x, y) => (rnd(x, y, 42) < 0.04 ? 'g' : undefined)))),
  sk('newsprint', 'NEWSPRINT', 1, fur('#e8e4d8', '#1a1c2c', '#f4f4f4', '#ffffff'), only('13', (x, y) => (y % 2 === 0 && rnd(Math.floor(x / 3), y, 43) < 0.75 ? 'l' : undefined))),
  sk('sodacan', 'SODA CAN', 1, fur('#c8282e', '#1a1c2c', '#f4f4f4', '#ffffff'), only('13', layer((x, y) => (y >= 14 + Math.round(Math.sin(x / 3) * 1.5) && y <= 16 + Math.round(Math.sin(x / 3) * 1.5) ? 'w' : 'r'), (x, y) => (y <= 2 + 0 ? undefined : x % 7 === 3 && y <= 12 ? 'q' : undefined)))),
  sk('pizza', 'PIZZA', 1, fur('#ffcd75', '#b88a4a', '#fff3b0'), only('13', layer(blobs('r', 0.28, 3, 44), dots('G', 0.04, 45)))),
  sk('coffee', 'COFFEE STAIN', 1, fur('#fff6e0', '#5c3a2e', '#ffffff', '#ffffff'), only('13', layer(rings(['n', undefined, undefined, undefined], 12, 17, 1), rings(['T', undefined, undefined], 24, 15, 1)))),
  sk('graffiti', 'GRAFFITI', 1, fur('#566c86', '#1a1c2c', '#94b0c2'), only('13', layer(waves('h', 5, 2, 3), zigzag('L', 7, 2), dots('y', 0.05, 46)))),
  sk('stickers', 'STICKER BOMB', 1, fur('#f4f4f4', '#333c57', '#ffffff', '#ffffff'), only('13', (x, y) => {
    const r = rnd(Math.floor(x / 3), Math.floor(y / 3), 47);
    const k = ['r', 'c', 'y', 'G', 'h', 'v', 'o', undefined, undefined][Math.floor(r * 9)];
    return x % 3 === 2 || y % 3 === 2 ? undefined : k;
  })),
  sk('honeycomb', 'HONEYCOMB', 0, fur('#ffa300', '#5c3a2e', '#ffcd75'), only('13', hexes('S'))),
  sk('bricks', 'BRICK WALL', 0, fur('#b13e53', '#3a1408', '#d86a7a', '#e8e4d8'), only('13', bricks('l'))),
  sk('scaly', 'SCALY', 0, fur('#38b764', '#16382c', '#a7f070'), only('13', scales('F'))),
  sk('harlequin', 'HARLEQUIN', 1, fur('#f4f4f4', '#1a1c2c', '#ffffff'), only('13', diamonds('r', 'k', 3))),

  // ---------------------------------------------------------------- epic
  sk('galaxy', 'GALAXY', 2, fur('#29366f', '#0e0f1a', '#3b1f5c', '#c7f2ff', '#ff77c8'), only('13', layer(gradD(['I', 'u', 'B', 'H', 'u'], 4), dots('w', 0.05, 48), dots('Y', 0.03, 49), dots('h', 0.02, 50))), { effect: 'sparkle' }),
  sk('lava', 'MOLTEN', 2, fur('#333c57', '#0e0f1a', '#ff4b1f', '#ffcd75', '#ffa300'), only('13', layer(zigzag('q', 5, 2), zigzag('O', 10, 2), dots('y', 0.04, 51))), { effect: 'flames' }),
  sk('aurora', 'AURORA', 2, fur('#24305e', '#0e0f1a', '#5fd3c9', '#c7f2ff'), only('13', layer(waves('m', 6, 2, 5), waves('t', 6, 2, 4), waves('v', 7, 2, 6))), { effect: 'glow', glow: '#9be2b0' }),
  sk('oilslick', 'OIL SLICK', 2, fur('#1e2030', '#0e0f14', '#3b1f5c', '#73eff7'), only('13', (x, y) => ['u', 'D', 'e', 'A', 'M', 'z', undefined, undefined][Math.floor(x / 2 + Math.sin(y / 2) * 2 + 16) % 8]), { effect: 'glow', glow: '#b05ccf' }),
  sk('toxic', 'TOXIC WASTE', 2, fur('#2d6a3e', '#16382c', '#6a8f3a', '#a7f070', '#a7f070'), only('13', layer(blobs('L', 0.3, 3, 52), dots('Y', 0.06, 53))), { effect: 'bubbles' }),
  sk('neon', 'NEON NIGHT', 2, fur('#0e0f1a', '#ff77c8', '#24305e', '#73eff7', '#73eff7'), only('13', layer(stripesH('h', 5, 1, 1), stripesH('C', 5, 1, 3))), { effect: 'glow', glow: '#ff77c8' }),
  sk('circuit', 'CIRCUIT', 2, fur('#16382c', '#0e0f1a', '#2d6a3e', '#a7f070'), only('13', (x, y) => {
    if (y % 4 === 1 && rnd(Math.floor(x / 4), y, 54) < 0.7) return 'L';
    if (x % 5 === 2 && rnd(x, Math.floor(y / 4), 55) < 0.5) return 'L';
    return rnd(x, y, 56) < 0.03 ? 'O' : undefined;
  }), { effect: 'glow', glow: '#a7f070' }),
  sk('amethyst', 'AMETHYST', 2, fur('#b05ccf', '#3b1f5c', '#f5a5b8', '#ffffff', '#ff77c8'), only('13', layer(diamonds('v', 'e', 3), diag('P', 9, 1), dots('w', 0.04, 70))), { effect: 'sparkle' }),
  sk('thunder', 'THUNDERCOON', 2, fur('#29366f', '#0e0f1a', '#3b5dc9', '#fff3b0', '#ffcd75'), only('13', bolts('y', 8)), { effect: 'glow', glow: '#ffcd75' }),
  sk('glitch', 'GLITCH', 2, fur('#94b0c2', '#1a1c2c', '#f4f4f4'), only('13', (x, y) => {
    const r = rnd(0, y, 57);
    if (r < 0.25) return x % 2 ? 'h' : 'C';
    if (r < 0.4 && x > 8 + r * 30) return 'L';
    return undefined;
  }), { effect: 'sparkle' }),
  sk('frostbite', 'FROSTBITE', 2, fur('#c7f2ff', '#24305e', '#ffffff', '#ffffff', '#73eff7'), only('13', layer(gradV([undefined, 'i', 'C', 'c'], 10, 22), dots('w', 0.06, 58))), { effect: 'snow' }),
  sk('disco', 'DISCO BALL', 2, fur('#94b0c2', '#333c57', '#f4f4f4'), only('13', (x, y) => (x % 2 === 0 && y % 2 === 0 ? 'w' : x % 2 && y % 2 ? (rnd(x, y, 59) < 0.3 ? 'h' : rnd(x, y, 60) < 0.3 ? 'c' : 'g') : 'l')), { effect: 'notes' }),
  sk('sweetheart', 'SWEETHEART', 2, fur('#ff77c8', '#c0398e', '#fff0f6', '#ffffff'), only('13', (x, y) => {
    const xx = x % 6;
    const yy = y % 5;
    const heart = ['.r.r.', 'rrrrr', '.rrr.', '..r..'];
    return yy < 4 && xx < 5 && heart[yy][xx] === 'r' && rnd(Math.floor(x / 6), Math.floor(y / 5), 61) < 0.6 ? 'r' : undefined;
  }), { effect: 'hearts' }),
  sk('abyss', 'ABYSS', 2, fur('#1e6fbf', '#0e0f1a', '#5fd3c9', '#c7f2ff'), only('13', layer(gradV(['A', 'A', 'B', 'I', 'H'], 4, 22), dots('t', 0.05, 62))), { effect: 'bubbles' }),
  sk('smolder', 'SMOLDER', 2, fur('#333c57', '#0e0f1a', '#566c86', '#ffcd75', '#ff4b1f'), only('13', (x, y) => { const r = rnd(x, y, 63); const t = (y - 6) / 22; return r < t * 0.35 ? 'q' : r < t * 0.5 ? 'O' : r < t * 0.55 ? 'y' : undefined; }), { effect: 'trail' }),

  // ---------------------------------------------------------------- legendary
  sk('golden', 'GOLDEN COON', 3, fur('#ffa300', '#7a4a33', '#ffcd75', '#fff3b0', '#fff3b0'), only('13', layer(diag('y', 7, 2), diag('Y', 7, 1))), { effect: 'sparkle' }),
  sk('rainbow', 'RAINBOW', 3, fur('#f4f4f4', '#1a1c2c', '#ffffff', '#ffffff', '#ff77c8'), only('13', gradD(['r', 'o', 'y', 'L', 'c', 'b', 'v'], 2)), { effect: 'trail' }),
  sk('cosmic', 'COSMIC', 3, fur('#3b1f5c', '#0e0f1a', '#c0398e', '#ffcd75', '#73eff7'), only('13', layer(rings(['u', 'e', 'M', 'e', 'u', 'I'], 18, 15, 2), dots('w', 0.06, 64), dots('C', 0.03, 65))), { effect: 'glow', glow: '#ff77c8' }),
  sk('phoenix', 'PHOENIX', 3, fur('#ff4b1f', '#6e1f2e', '#ffcd75', '#fff3b0', '#ffa300'), layer(only('13', gradH(['R', 'r', 'q', 'o', 'O', 'y'], 1, 30)), only('2', onTail((x, y) => (rnd(x, y, 66) < 0.5 ? 'y' : 'O')))), { effect: 'flames' }),
  sk('prism', 'PRISMATIC', 3, fur('#f4f4f4', '#3b1f5c', '#ffffff', '#ffffff', '#73eff7'), only('13', layer(diamonds('C', 'h', 3), diamonds('Y', undefined, 6), dots('w', 0.08, 67))), { effect: 'sparkle' }),
];


