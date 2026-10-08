// Tier 2: WILD. Forests, fields and water just outside town.
import type { ThemeDef } from '../types';
import * as P from '../painters';
import { PAL as K, SPR, mix } from '../painters';

const grassGround = (top: [string, string, string], body: string, deep: string, extra: Partial<P.SoilOpts> = {}) =>
  P.soil({ top: [top[0], top[1], top[1], top[2]], body, deep, edge: 'ragged', edgeColor: top[2], edgeDepth: 5, blades: top[0], stones: [K.g, K.l, K.d], stoneCount: 8, specks: [[mix(body, K.k, 0.3), 20], [mix(body, K.w, 0.2), 6]], ...extra });

// ---------------------------------------------------------------- WOODS (summer day)
const woodHaze = '#a8d8c0';
const woods: ThemeDef = {
  id: 'woods',
  name: 'THE WOODS',
  tier: 2,
  sky: ['#41a6f6', '#73eff7', '#c7f2ff'],
  layers: [
    { speed: 0.03, paint: P.clouds({ count: 4, y: [24, 60], size: [40, 80], colors: [K.w, mix(K.l, K.C, 0.4), K.w] }) },
    { speed: 0.08, paint: P.hills({ color: mix(K.D, woodHaze, 0.55), y: 96, amp: 14, trees: { color: mix(K.D, woodHaze, 0.55), r: [6, 10], gap: 8 } }) },
    { speed: 0.16, paint: P.trees({ leaves: [mix(K.E, woodHaze, 0.45), mix(K.F, woodHaze, 0.45), mix(K.G, woodHaze, 0.45)], trunk: [mix(K.N, woodHaze, 0.45), mix(K.N, woodHaze, 0.5)], count: 9, h: [56, 76], r: [14, 20], baseY: 166 }) },
    { speed: 0.3, paint: P.trees({ leaves: [K.E, K.F, K.G, K.L], trunk: [K.n, K.N], count: 5, h: [70, 96], r: [20, 28], baseY: 166 }) },
    { speed: 0.38, paint: P.lightRays({ color: K.Y, count: 3, top: 0, len: 130, width: [6, 12], slant: 0.35, density: 0.16 }) },
    { speed: 0.55, paint: P.stack(P.bushes({ colors: [K.E, K.F, K.G], count: 5, r: [7, 11], baseY: 164 }), P.grass({ colors: [K.F, K.G, K.L], count: 10, h: [6, 10], baseY: 164 })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.stump, 2], [SPR.rock, 2], [SPR.shroom, 2], [SPR.flowers, 1]], count: 6, baseY: 162 }) },
  ],
  ground: grassGround([K.L, K.G, K.F], K.N, K.j),
  front: { speed: 1.35, paint: P.grass({ colors: [K.E, K.F, K.E], count: 5, h: [16, 28], baseY: 220, blades: [6, 10], width: 3 }) },
  weather: { kind: 'leaves', density: 14, colors: [K.G, K.L, K.F] },
  families: ['strays', 'bugs'],
  boss: 'bear',
  hazard: { name: 'ACORNS', every: 3, desc: 'AN ACORN FALLS ON SOMEONE', kind: 'pot', power: 4 },
};

// ---------------------------------------------------------------- PINE FOREST (misty dusk)
const pineSky = '#9a8ab8';
const pines: ThemeDef = {
  id: 'pines',
  name: 'PINE FOREST',
  tier: 2,
  sky: ['#29366f', '#7a4a8f', '#f5a5b8'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 30, colors: [K.w, K.l], y: [0, 50] }), P.moon({ x: 360, y: 40, r: 8, color: K.Q, phase: -5 })) },
    { speed: 0.06, paint: P.mountains({ color: mix(K.B, pineSky, 0.5), light: mix(K.e, K.P, 0.5), snow: mix(K.w, K.P, 0.3), snowDepth: 10, peaks: 4, top: [56, 84], baseY: 170 }) },
    { speed: 0.12, paint: P.stack(P.pines({ colors: [mix(K.I, pineSky, 0.55), mix(K.I, pineSky, 0.5)], count: 26, h: [30, 48], baseY: 170 }), P.mist({ color: mix(K.P, pineSky, 0.4), y: 130, h: 30, solid: 20 })) },
    { speed: 0.22, paint: P.stack(P.pines({ colors: [mix(K.E, K.I, 0.5), mix(K.E, pineSky, 0.3), mix(K.F, pineSky, 0.35)], trunk: K.k, count: 14, h: [50, 80], baseY: 170 }), P.mist({ color: mix(K.e, pineSky, 0.4), y: 140, h: 24, solid: 10, d: 0.6 })) },
    { speed: 0.42, paint: P.pines({ colors: [K.E, K.F, mix(K.F, K.z, 0.4)], trunk: K.N, count: 6, h: [90, 130], baseY: 168, outline: K.k }) },
    { speed: 0.65, paint: P.stack(P.rocks({ colors: [K.l, K.g, K.d], count: 3, size: [6, 10], baseY: 164, outline: K.k, moss: K.z }), P.grass({ colors: [K.E, K.F, K.z], count: 8, h: [5, 9], baseY: 164 })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.stump, 2], [SPR.shroom, 2], [SPR.rock, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.z, K.F, K.E], body: K.j, deep: K.H, edge: 'ragged', edgeColor: K.E, specks: [[K.n, 30], [K.S, 10]], stones: [K.g, K.l, K.d], stoneCount: 8 }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.H, K.E, K.E], count: 4, h: [18, 30], baseY: 220, blades: [5, 8], width: 3 }) },
  weather: { kind: 'fireflies', density: 16, colors: [K.Y, K.L] },
  light: 0xd8c8f0,
  families: ['strays', 'bugs'],
  boss: 'bear',
  hazard: { name: 'ROCKSLIDE', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 4 },
};

// ---------------------------------------------------------------- AUTUMN FOREST
const autumnSky = '#f0c8a0';
const autumn: ThemeDef = {
  id: 'autumn',
  name: 'AUTUMN WOODS',
  tier: 2,
  sky: ['#3b5dc9', '#94b0c2', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 120, y: 60, r: 13, color: K.Y, glow: K.y }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [30, 70], size: [50, 100], colors: [K.Q, mix(K.T, K.l, 0.5), K.w], style: 'flat' }) },
    { speed: 0.1, paint: P.hills({ color: mix(K.R, autumnSky, 0.55), y: 104, amp: 12, trees: { color: mix(K.r, autumnSky, 0.5), light: mix(K.o, autumnSky, 0.5), r: [5, 9], gap: 7 } }) },
    { speed: 0.2, paint: P.trees({ leaves: [mix(K.R, autumnSky, 0.4), mix(K.o, autumnSky, 0.4), mix(K.y, autumnSky, 0.4)], trunk: [mix(K.N, autumnSky, 0.4), mix(K.N, autumnSky, 0.45)], count: 8, h: [56, 72], r: [14, 20] }) },
    { speed: 0.34, paint: P.stack(P.trees({ leaves: [K.R, K.r, K.o, K.y], trunk: [K.N, K.k], count: 3, h: [72, 92], r: [20, 26] }), P.trees({ leaves: [K.U, K.O, K.y, K.Y], trunk: [K.N, K.k], count: 2, h: [64, 84], r: [18, 22] })) },
    { speed: 0.5, paint: P.branchy({ color: K.N, light: K.n, count: 2, h: [80, 110], thick: 4, depth: 4, tips: [K.o, K.r] }) },
    { speed: 0.8, paint: P.stack(P.bushes({ colors: [K.R, K.r, K.o], count: 4, r: [5, 8], baseY: 164 }), P.scatter({ items: [[SPR.stump, 2], [SPR.pumpkin, 1], [SPR.shroom, 2], [SPR.rock, 1]], count: 5, baseY: 162 })) },
  ],
  ground: P.soil({ top: [K.o, K.r, K.r, K.R], body: K.N, deep: K.j, edge: 'ragged', edgeColor: K.R, blades: K.y, specks: [[K.n, 24], [K.o, 8], [K.y, 4]], stones: [K.g, K.l, K.d], stoneCount: 6 }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.R, K.U, K.N], count: 4, h: [14, 24], baseY: 220, blades: [5, 8], width: 3, flowers: [K.y] }) },
  weather: { kind: 'leaves', density: 26, colors: [K.o, K.r, K.y, K.O] },
  light: 0xfff0e0,
  families: ['strays', 'bugs'],
  boss: 'goose',
  hazard: { name: 'AUTUMN RAIN', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 3 },
};

// ---------------------------------------------------------------- MEADOW
const meadowSky = '#d8f4ff';
const meadow: ThemeDef = {
  id: 'meadow',
  name: 'FLOWER MEADOW',
  tier: 2,
  sky: ['#3b5dc9', '#41a6f6', '#d8f4ff'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 400, y: 36, r: 12, color: K.Y, glow: K.Q, glowR: 22 }) },
    { speed: 0.05, paint: P.clouds({ count: 6, y: [28, 90], size: [30, 90], colors: [K.w, mix(K.l, K.c, 0.25), K.w] }) },
    { speed: 0.1, paint: P.hills({ color: mix(K.D, meadowSky, 0.55), light: mix(K.t, meadowSky, 0.5), y: 112, amp: 16, cycles: [[1, 1], [3, 0.4]] }) },
    { speed: 0.18, paint: P.stack(P.hills({ color: mix(K.G, meadowSky, 0.35), light: mix(K.L, meadowSky, 0.3), y: 128, amp: 10, stripes: mix(K.z, meadowSky, 0.35), band: 4 }), P.farmstead({ barn: [mix(K.r, meadowSky, 0.35), mix(K.R, meadowSky, 0.35), mix(K.w, meadowSky, 0.3)], roof: mix(K.d, meadowSky, 0.35), windmill: mix(K.Q, meadowSky, 0.3), baseY: 136, scale: 0.6 })) },
    { speed: 0.32, paint: P.trees({ leaves: [K.F, K.G, K.L, K.Y], trunk: [K.n, K.N], count: 2, h: [52, 64], r: [18, 22] }) },
    { speed: 0.55, paint: P.grass({ colors: [K.F, K.G, K.L], count: 30, h: [6, 14], baseY: 164, flowers: [K.r, K.y, K.w, K.P, K.v, K.c] }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.flowers, 4], [SPR.rock, 1], [SPR.mailbox, 1]], count: 7, baseY: 162 }) },
  ],
  ground: grassGround([K.L, K.G, K.F], K.n, K.N, { blades: K.y }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.F, K.G, K.F], count: 6, h: [14, 26], baseY: 220, blades: [5, 9], width: 2, flowers: [K.r, K.y, K.w, K.P] }) },
  weather: { kind: 'petals', density: 18, colors: [K.P, K.w, K.y] },
  families: ['strays', 'bugs'],
  boss: 'goose',
  hazard: { name: 'POLLEN', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 3 },
};

// ---------------------------------------------------------------- RIVERBANK
const riverSky = '#c8e8e0';
const riverbank: ThemeDef = {
  id: 'riverbank',
  name: 'RIVERBANK',
  tier: 2,
  sky: ['#257179', '#5fd3c9', '#c7f2ff'],
  layers: [
    { speed: 0.04, paint: P.clouds({ count: 3, y: [30, 60], size: [60, 120], colors: [K.w, mix(K.l, K.t, 0.3), K.w], style: 'flat' }) },
    { speed: 0.1, paint: P.stack(P.hills({ color: mix(K.D, riverSky, 0.5), y: 104, amp: 10, trees: { color: mix(K.D, riverSky, 0.5), r: [5, 8], gap: 6 } }), P.waterfalls({ rock: [mix(K.l, riverSky, 0.4), mix(K.g, riverSky, 0.45), mix(K.d, riverSky, 0.45)], water: [K.w, mix(K.C, riverSky, 0.3), K.w], count: 1, h: [60, 70], w: [60, 80], baseY: 150 })) },
    { speed: 0.18, paint: P.stack(P.sea({ y: 132, colors: [mix(K.C, K.w, 0.4), mix(K.c, K.t, 0.5), K.A, K.C] }), P.trees({ leaves: [mix(K.E, riverSky, 0.4), mix(K.F, riverSky, 0.4), mix(K.G, riverSky, 0.4)], trunk: [mix(K.N, riverSky, 0.4), mix(K.N, riverSky, 0.4)], count: 5, h: [36, 50], r: [12, 16], baseY: 134 })) },
    { speed: 0.32, paint: P.trees({ leaves: [K.E, K.F, K.G, K.L], trunk: [K.J, K.N], count: 2, h: [70, 90], r: [22, 28] }) },
    { speed: 0.5, paint: P.stack(P.reeds({ colors: [K.F, K.z], head: K.N, count: 9, h: [18, 34], baseY: 164 }), P.rocks({ colors: [K.l, K.g, K.d], count: 3, size: [7, 11], baseY: 165, outline: K.k, moss: K.G })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.flowers, 1], [SPR.stump, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.waterEdge({ bank: { top: [K.L, K.G, K.G, K.F], body: K.n, edge: 'ragged', edgeColor: K.F, blades: K.L, specks: [[K.N, 16]] }, bankH: 20, water: [K.C, K.c, K.A], reeds: K.F }),
  front: { speed: 1.35, paint: P.reeds({ colors: [K.E, K.F], head: K.N, count: 5, h: [20, 34], baseY: 220 }) },
  weather: { kind: 'fireflies', density: 8, colors: [K.C, K.w] },
  families: ['strays', 'bugs'],
  boss: 'old_gator',
  hazard: { name: 'SPLASH', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 3 },
};

// ---------------------------------------------------------------- FARM
const farmSky = '#fff0c8';
const farm: ThemeDef = {
  id: 'farm',
  name: 'OLD FARM',
  tier: 2,
  sky: ['#41a6f6', '#94d8f6', '#fff3b0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 200, y: 44, r: 14, color: K.Y, glow: K.Q }) },
    { speed: 0.05, paint: P.clouds({ count: 5, y: [30, 80], size: [40, 90], colors: [K.w, mix(K.l, K.y, 0.3), K.w] }) },
    { speed: 0.1, paint: P.hills({ color: mix(K.z, farmSky, 0.5), light: mix(K.L, farmSky, 0.5), y: 112, amp: 12, stripes: mix(K.S, farmSky, 0.5), band: 3 }) },
    { speed: 0.2, paint: P.stack(P.hills({ color: mix(K.G, farmSky, 0.3), light: mix(K.L, farmSky, 0.3), y: 136, amp: 6, stripes: mix(K.z, farmSky, 0.25) }), P.trees({ leaves: [mix(K.F, farmSky, 0.3), mix(K.G, farmSky, 0.3), mix(K.L, farmSky, 0.3)], trunk: [K.N, K.N], count: 3, h: [26, 32], r: [9, 12], baseY: 142 })) },
    { speed: 0.32, paint: P.farmstead({ barn: [K.r, K.R, K.w], roof: K.d, silo: [K.l, K.g, K.d], windmill: K.d, baseY: 164, scale: 1 }) },
    { speed: 0.55, paint: P.fence({ style: 'rail', colors: [K.T, K.n, K.N], h: 18, baseY: 164, spacing: 32 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.hay, 3], [SPR.scarecrow, 1], [SPR.mailbox, 1], [SPR.crate, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.L, K.G, K.z], body: K.U, deep: K.j, edge: 'ragged', edgeColor: K.z, strata: K.n, specks: [[K.N, 20], [K.s, 6]], stones: [K.g, K.l, K.d], stoneCount: 5 }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.z, K.G, K.L], count: 5, h: [14, 22], baseY: 220, blades: [5, 8], width: 2 }) },
  weather: { kind: 'dust', density: 10, colors: [K.s, K.Y] },
  families: ['strays', 'bugs'],
  boss: 'van',
  hazard: { name: 'HAY BALES', every: 3, desc: 'HAY FALLS ON SOMEONE', kind: 'pot', power: 4 },
};

// ---------------------------------------------------------------- ORCHARD (blossom spring)
const orchSky = '#f8e0f0';
const orchard: ThemeDef = {
  id: 'orchard',
  name: 'ORCHARD',
  tier: 2,
  sky: ['#73a8f6', '#c7f2ff', '#fff6e0'],
  layers: [
    { speed: 0.03, paint: P.clouds({ count: 5, y: [26, 70], size: [40, 80], colors: [K.w, mix(K.P, K.l, 0.5), K.w] }) },
    { speed: 0.1, paint: P.hills({ color: mix(K.G, orchSky, 0.55), light: mix(K.L, orchSky, 0.5), y: 114, amp: 10, trees: { color: mix(K.P, orchSky, 0.4), light: mix(K.w, orchSky, 0.3), r: [4, 6], gap: 10 } }) },
    { speed: 0.2, paint: P.trees({ leaves: [mix(K.M, orchSky, 0.55), mix(K.P, orchSky, 0.3), mix(K.w, orchSky, 0.3)], trunk: [mix(K.N, orchSky, 0.4), mix(K.N, orchSky, 0.45)], count: 9, h: [36, 44], r: [12, 15], baseY: 160 }) },
    { speed: 0.34, paint: P.trees({ leaves: [K.F, K.G, K.L, K.Y], trunk: [K.n, K.N], count: 4, h: [50, 62], r: [18, 22], baseY: 166, fruit: [K.r, K.r, K.o], lobes: 7 }) },
    { speed: 0.55, paint: P.trees({ leaves: [K.M, K.P, K.Q, K.w], trunk: [K.n, K.N], count: 2, h: [62, 72], r: [20, 24], baseY: 166, outline: K.p }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.basket, 3], [SPR.crate, 2], [SPR.flowers, 2]], count: 6, baseY: 162 }) },
  ],
  ground: grassGround([K.L, K.G, K.F], K.n, K.N, { specks: [[K.N, 16], [K.P, 8], [K.r, 3]] }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.F, K.G, K.F], count: 5, h: [12, 22], baseY: 220, blades: [5, 8], flowers: [K.P, K.w] }) },
  weather: { kind: 'petals', density: 24, colors: [K.P, K.w, K.h] },
  families: ['strays', 'bugs'],
  boss: 'bear',
  hazard: { name: 'APPLES', every: 3, desc: 'AN APPLE FALLS ON SOMEONE', kind: 'pot', power: 4 },
};

// ---------------------------------------------------------------- CORNFIELD (golden hour)
const cornSky = '#f8c890';
const cornfield: ThemeDef = {
  id: 'cornfield',
  name: 'CORNFIELD',
  tier: 2,
  sky: ['#3b5dc9', '#ef7d57', '#ffcd75', '#fff3b0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 330, y: 100, r: 20, color: K.Y, glow: K.y, glowR: 40 }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [30, 80], size: [60, 130], colors: [mix(K.o, K.Y, 0.5), mix(K.r, K.o, 0.5), K.Y], style: 'streak' }) },
    { speed: 0.1, paint: P.stack(P.hills({ color: mix(K.S, cornSky, 0.45), light: mix(K.s, cornSky, 0.3), y: 124, amp: 6, stripes: mix(K.n, cornSky, 0.4) }), P.farmstead({ barn: [mix(K.R, cornSky, 0.4), mix(K.R, cornSky, 0.3), mix(K.Q, cornSky, 0.3)], roof: mix(K.N, cornSky, 0.4), silo: [mix(K.l, cornSky, 0.4), mix(K.g, cornSky, 0.4), mix(K.d, cornSky, 0.4)], baseY: 132, scale: 0.5, count: 1 })) },
    { speed: 0.2, paint: P.corn({ colors: [mix(K.z, cornSky, 0.4), mix(K.z, cornSky, 0.35), mix(K.s, cornSky, 0.3)], count: 60, h: [28, 36], baseY: 150, tassel: mix(K.s, cornSky, 0.2) }) },
    { speed: 0.34, paint: P.corn({ colors: [K.F, K.z, K.L], cob: [K.y, K.L], tassel: K.s, count: 40, h: [44, 56], baseY: 162 }) },
    { speed: 0.55, paint: P.stack(P.scatter({ items: [[SPR.scarecrow, 1]], count: 1, baseY: 164 }), P.corn({ colors: [K.E, K.F, K.z], cob: [K.O, K.z], tassel: K.S, count: 14, h: [60, 72], baseY: 168 })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.hay, 2], [SPR.crate, 1], [SPR.basket, 1]], count: 3, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.S, K.n, K.n], body: K.U, deep: K.j, edge: 'ragged', edgeColor: K.N, strata: K.N, specks: [[K.N, 20], [K.y, 3]] }),
  front: { speed: 1.35, paint: P.corn({ colors: [K.E, K.E, K.F], count: 3, h: [30, 40], baseY: 224 }) },
  weather: { kind: 'dust', density: 14, colors: [K.y, K.Y] },
  light: 0xffe0c0,
  families: ['strays', 'bugs'],
  boss: 'goose',
  hazard: { name: 'CROP DUSTER', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 4 },
};

// ---------------------------------------------------------------- LAKESIDE (pink dusk)
const lakeSky = '#d8a0c0';
const lakeside: ThemeDef = {
  id: 'lakeside',
  name: 'LAKESIDE',
  tier: 2,
  sky: ['#24305e', '#7a4a8f', '#f5a5b8', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 30, colors: [K.w, K.P], y: [0, 50] }), P.sun({ x: 250, y: 118, r: 14, color: K.y, core: K.Y, glow: K.o })) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [40, 90], size: [60, 120], colors: [mix(K.P, K.o, 0.3), mix(K.M, K.e, 0.4), K.Y], style: 'streak' }) },
    { speed: 0.08, paint: P.mountains({ color: mix(K.u, lakeSky, 0.45), light: mix(K.e, lakeSky, 0.4), peaks: 5, top: [76, 100], baseY: 130, snow: mix(K.P, K.w, 0.3), snowDepth: 6 }) },
    { speed: 0.12, paint: P.stack(P.pines({ colors: [mix(K.u, K.E, 0.4), mix(K.u, K.E, 0.3)], count: 30, h: [12, 22], baseY: 128 }), P.sea({ y: 126, colors: [mix(K.y, K.P, 0.4), mix(K.e, K.P, 0.35), mix(K.u, K.B, 0.3), K.P], sparkle: K.Y, sparkleX: 250 })) },
    { speed: 0.3, paint: P.stack(P.pines({ colors: [K.H, mix(K.u, K.E, 0.5), mix(K.e, K.F, 0.5)], trunk: K.k, count: 4, h: [60, 100], baseY: 168 }), P.reeds({ colors: [mix(K.u, K.F, 0.4), mix(K.e, K.F, 0.4)], head: K.N, count: 6, h: [16, 26], baseY: 166 })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.rope, 1], [SPR.crate, 1], [SPR.lantern, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.waterEdge({ bank: { top: [K.s, K.T, K.S], body: K.n, specks: [[K.N, 16], [K.s, 10]], stones: [K.l, K.w, K.g] }, bankH: 18, water: [K.P, K.e, K.u], reeds: K.u }),
  front: { speed: 1.35, paint: P.reeds({ colors: [K.u, K.e], head: K.k, count: 5, h: [22, 36], baseY: 220 }) },
  weather: { kind: 'fireflies', density: 18, colors: [K.Y, K.y] },
  light: 0xf0d0e0,
  families: ['strays', 'bugs'],
  boss: 'old_gator',
  hazard: { name: 'LAKE WIND', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 3 },
};

// ---------------------------------------------------------------- BAMBOO GROVE
const bambooSky = '#d8f0d0';
const bambooT: ThemeDef = {
  id: 'bamboo',
  name: 'BAMBOO GROVE',
  tier: 2,
  sky: ['#9be2b0', '#c7f2ff', '#fff6e0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 90, y: 50, r: 16, color: K.w, glow: K.Q }) },
    { speed: 0.06, paint: P.stack(P.mountains({ color: mix(K.D, bambooSky, 0.6), light: mix(K.t, bambooSky, 0.6), peaks: 6, top: [60, 90], slope: [0.9, 1.6], baseY: 160 }), P.temples({ style: 'pagoda', colors: [mix(K.r, bambooSky, 0.5), mix(K.R, bambooSky, 0.5), mix(K.R, bambooSky, 0.55), mix(K.D, bambooSky, 0.5)], count: 1, scale: [0.7, 0.7], baseY: 112 }), P.mist({ color: bambooSky, y: 100, h: 30, solid: 70 })) },
    { speed: 0.14, paint: P.bamboo({ colors: [mix(K.G, bambooSky, 0.6), mix(K.L, bambooSky, 0.6), mix(K.F, bambooSky, 0.6)], leaves: [mix(K.F, bambooSky, 0.55), mix(K.G, bambooSky, 0.55)], count: 28, width: [2, 3], baseY: 170 }) },
    { speed: 0.26, paint: P.bamboo({ colors: [mix(K.G, bambooSky, 0.35), mix(K.L, bambooSky, 0.35), mix(K.F, bambooSky, 0.35)], leaves: [mix(K.F, bambooSky, 0.3), mix(K.G, bambooSky, 0.3)], count: 18, width: [3, 4], baseY: 170 }) },
    { speed: 0.45, paint: P.bamboo({ colors: [K.G, K.L, K.F], leaves: [K.F, K.G], count: 7, width: [5, 7], baseY: 170 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.lantern, 1], [SPR.shroom, 1]], count: 4, baseY: 162 }) },
  ],
  ground: grassGround([K.L, K.G, K.F], K.j, K.H, { specks: [[K.n, 20], [K.z, 10]] }),
  front: { speed: 1.35, paint: P.bamboo({ colors: [K.F, K.G, K.E], leaves: [K.E, K.F], count: 1, width: [9, 9], baseY: 216, top: 184 }) },
  weather: { kind: 'leaves', density: 16, colors: [K.L, K.G] },
  families: ['strays', 'bugs'],
  boss: 'bear',
  hazard: { name: 'FALLING STALK', every: 4, desc: 'BAMBOO FALLS ON SOMEONE', kind: 'pot', power: 5 },
};

export const TIER_2: ThemeDef[] = [woods, pines, autumn, meadow, riverbank, farm, orchard, cornfield, lakeside, bambooT];
