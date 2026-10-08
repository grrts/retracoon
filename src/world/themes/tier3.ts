// Tier 3: FAR AWAY. Jungles, deserts, coasts and the frozen north.
import type { ThemeDef } from '../types';
import * as P from '../painters';
import { PAL as K, SPR, mix } from '../painters';

const sand = (light: string, mid: string, dark: string, extra: Partial<P.SoilOpts> = {}) =>
  P.soil({ top: [light, light, mid], body: mid, deep: dark, specks: [[dark, 30], [light, 20]], stones: [dark, mid], stoneCount: 6, ...extra });
const snow = (extra: Partial<P.SoilOpts> = {}) =>
  P.soil({ top: [K.w, K.w, K.i, K.i], body: K.i, deep: mix(K.C, K.l, 0.5), edge: 'lumpy', edgeColor: K.i, edgeDepth: 6, specks: [[K.w, 30], [mix(K.l, K.C, 0.4), 16]], stones: [K.l, K.w, K.g], stoneCount: 4, ...extra });

// ---------------------------------------------------------------- JUNGLE
const jungleHaze = '#7fc8a8';
const jungle: ThemeDef = {
  id: 'jungle',
  name: 'DEEP JUNGLE',
  tier: 3,
  sky: ['#16382c', '#257179', '#9be2b0'],
  layers: [
    { speed: 0.04, paint: P.stack(P.waterfalls({ rock: [mix(K.D, jungleHaze, 0.55), mix(K.D, jungleHaze, 0.6), mix(K.E, jungleHaze, 0.6)], water: [mix(K.w, jungleHaze, 0.2), mix(K.C, jungleHaze, 0.4), mix(K.w, jungleHaze, 0.2)], count: 2, h: [80, 110], w: [70, 100], baseY: 150 }), P.mist({ color: jungleHaze, y: 100, h: 30, solid: 70, d: 0.7 })) },
    { speed: 0.1, paint: P.stack(P.palms({ trunk: [mix(K.J, jungleHaze, 0.5), mix(K.N, jungleHaze, 0.5)], leaves: [mix(K.F, jungleHaze, 0.5), mix(K.G, jungleHaze, 0.5)], count: 6, h: [70, 90], baseY: 160 }), P.trees({ leaves: [mix(K.E, jungleHaze, 0.5), mix(K.F, jungleHaze, 0.5), mix(K.G, jungleHaze, 0.5)], trunk: [mix(K.N, jungleHaze, 0.5), mix(K.N, jungleHaze, 0.5)], count: 6, h: [60, 80], r: [16, 22], baseY: 166 })) },
    { speed: 0.18, paint: P.lightRays({ color: K.Y, count: 4, top: 0, len: 150, width: [5, 12], slant: 0.25, density: 0.18 }) },
    { speed: 0.3, paint: P.stack(P.palms({ trunk: [K.J, K.N], leaves: [K.F, K.G, K.L], count: 3, h: [90, 120], coconut: K.N }), P.trees({ leaves: [K.E, K.F, K.G, K.L], trunk: [K.N, K.k], count: 2, h: [80, 100], r: [24, 30] })) },
    { speed: 0.5, paint: P.stack(P.vines({ colors: [K.F, K.G, K.L], count: 10, len: [30, 80], flowers: K.h, canopy: [K.E, K.F] }), P.bushes({ colors: [K.E, K.F, K.G], count: 6, r: [8, 13], baseY: 166, dots: [K.h, K.y] })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.shroom, 2], [SPR.flowers, 2]], count: 5, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.G, K.F, K.F, K.E], body: K.j, deep: K.H, edge: 'ragged', edgeColor: K.E, blades: K.L, specks: [[K.N, 24], [K.z, 10]], stones: [K.g, K.l, K.d], stoneCount: 8 }),
  front: { speed: 1.35, paint: P.stack(P.vines({ colors: [K.E, K.F, K.G], count: 4, len: [10, 26], canopy: [K.H, K.E] }), P.grass({ colors: [K.H, K.E, K.F], count: 4, h: [18, 30], baseY: 220, blades: [6, 10], width: 3 })) },
  weather: { kind: 'leaves', density: 12, colors: [K.G, K.L] },
  light: 0xd8f0d0,
  families: ['bugs', 'swamp'],
  boss: 'old_gator',
  hazard: { name: 'COCONUTS', every: 3, desc: 'A COCONUT HITS SOMEONE', kind: 'pot', power: 5 },
};

// ---------------------------------------------------------------- SWAMP (foggy night)
const swampFog = '#5a7a60';
const swamp: ThemeDef = {
  id: 'swamp',
  name: 'GLOOMY SWAMP',
  tier: 3,
  sky: ['#0e0f1a', '#16382c', '#6a8f3a'],
  layers: [
    { speed: 0.02, paint: P.moon({ x: 380, y: 50, r: 16, color: mix(K.Y, K.m, 0.3), shade: mix(K.s, K.z, 0.4), craters: mix(K.s, K.z, 0.4), glow: mix(K.z, K.F, 0.4) }) },
    { speed: 0.07, paint: P.stack(P.branchy({ color: mix(K.E, swampFog, 0.5), count: 7, h: [70, 100], baseY: 166, thick: 3, depth: 4 }), P.mist({ color: swampFog, y: 120, h: 24, solid: 30 })) },
    { speed: 0.16, paint: P.stack(P.branchy({ color: mix(K.H, swampFog, 0.3), count: 5, h: [90, 120], baseY: 166, thick: 4, depth: 4, tips: [mix(K.z, swampFog, 0.3)] }), P.mist({ color: mix(swampFog, K.m, 0.2), y: 132, h: 18, solid: 30, d: 0.6 })) },
    { speed: 0.3, paint: P.stack(P.sea({ y: 148, colors: [mix(K.z, K.m, 0.3), mix(K.E, K.z, 0.4), K.E, mix(K.z, K.L, 0.3)] }), P.reeds({ colors: [K.E, K.F], head: K.N, count: 10, h: [14, 26], baseY: 156 })) },
    { speed: 0.5, paint: P.branchy({ color: K.H, light: K.E, count: 2, h: [120, 150], baseY: 168, thick: 6, depth: 5, tips: [K.z, K.F] }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.stump, 2], [SPR.shroom, 2], [SPR.skull, 1], [SPR.rock, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.waterEdge({ bank: { top: [K.z, K.F, K.j], body: K.j, specks: [[K.N, 20], [K.z, 8]] }, bankH: 14, water: [K.z, mix(K.E, K.z, 0.3), K.H], reeds: K.F }),
  front: { speed: 1.35, paint: P.stack(P.reeds({ colors: [K.H, K.E], head: K.k, count: 5, h: [20, 34], baseY: 220 }), P.vines({ colors: [K.E, K.z], count: 5, len: [8, 22] })) },
  weather: { kind: 'fireflies', density: 22, colors: [K.L, K.Y] },
  light: 0xb8d0b0,
  families: ['swamp', 'bugs'],
  boss: 'swamp_witch',
  hazard: { name: 'SWAMP GAS', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 5 },
};

// ---------------------------------------------------------------- MANGROVES (tropical evening)
const mangHaze = '#a8c8a0';
const mangrove: ThemeDef = {
  id: 'mangrove',
  name: 'MANGROVES',
  tier: 3,
  sky: ['#257179', '#5fd3c9', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 160, y: 108, r: 14, color: K.Y, glow: K.y }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [30, 80], size: [60, 120], colors: [mix(K.Y, K.w, 0.5), mix(K.t, K.D, 0.4), K.w], style: 'flat' }) },
    { speed: 0.1, paint: P.stack(P.hills({ color: mix(K.D, mangHaze, 0.5), y: 116, amp: 6, trees: { color: mix(K.D, mangHaze, 0.5), r: [6, 9], gap: 7 } }), P.sea({ y: 124, colors: [mix(K.Y, K.t, 0.5), mix(K.t, K.D, 0.4), K.D, K.Y], sparkle: K.Y, sparkleX: 160 })) },
    { speed: 0.22, paint: P.mangroves({ leaves: [mix(K.E, mangHaze, 0.4), mix(K.F, mangHaze, 0.4), mix(K.G, mangHaze, 0.4)], trunk: [mix(K.J, mangHaze, 0.3), mix(K.N, mangHaze, 0.3)], count: 5, h: [40, 50], r: [14, 18], baseY: 150 }) },
    { speed: 0.4, paint: P.mangroves({ leaves: [K.E, K.F, K.G], trunk: [K.J, K.N], count: 3, h: [60, 70], r: [20, 26], baseY: 166 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.shell, 2], [SPR.stump, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.waterEdge({ bank: { top: [K.J, K.j, K.j], body: K.j, specks: [[K.N, 20], [K.J, 10]], stones: [K.g, K.l] }, bankH: 16, water: [K.t, K.D, K.E], reeds: K.F }),
  front: { speed: 1.35, paint: P.reeds({ colors: [K.E, K.F], head: K.N, count: 4, h: [18, 30], baseY: 220 }) },
  weather: { kind: 'fireflies', density: 10, colors: [K.Y] },
  light: 0xfff0d8,
  families: ['swamp', 'bugs'],
  boss: 'old_gator',
  hazard: { name: 'HIGH TIDE', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 4 },
};

// ---------------------------------------------------------------- DESERT
const desertHaze = '#f8d8a0';
const desert: ThemeDef = {
  id: 'desert',
  name: 'SCORCHED DESERT',
  tier: 3,
  sky: ['#41a6f6', '#94d8f6', '#fff3b0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 360, y: 40, r: 16, color: K.Q, core: K.w, glow: K.Y, glowR: 30 }) },
    { speed: 0.06, paint: P.stack(P.pyramids({ colors: [mix(K.s, desertHaze, 0.5), mix(K.S, desertHaze, 0.5), mix(K.n, desertHaze, 0.5)], count: 2, size: [40, 60], baseY: 136 }), P.dunes({ colors: [mix(K.s, desertHaze, 0.45), mix(K.Y, desertHaze, 0.3), mix(K.S, desertHaze, 0.45)], y: 128, amp: 8 })) },
    { speed: 0.14, paint: P.dunes({ colors: [mix(K.s, desertHaze, 0.2), mix(K.Y, desertHaze, 0.2), mix(K.S, desertHaze, 0.2)], ripple: mix(K.S, desertHaze, 0.25), y: 138, amp: 10 }) },
    { speed: 0.28, paint: P.dunes({ colors: [K.s, K.Y, K.S], ripple: mix(K.s, K.S, 0.5), y: 150, amp: 8, cycles: [[1, 1], [3, 0.5]] }) },
    { speed: 0.5, paint: P.cacti({ colors: [K.L, K.G, K.F], count: 3, h: [26, 44], baseY: 164, outline: K.E, flowers: K.h }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.skull, 2], [SPR.rock, 2], [SPR.bone, 2]], count: 4, baseY: 162 }) },
  ],
  ground: sand(K.Y, K.s, K.S, { edge: 'lumpy', edgeColor: K.s, strata: K.S }),
  front: { speed: 1.35, paint: P.stack(P.cacti({ colors: [K.F, K.E, K.H], count: 1, h: [30, 40], baseY: 226 }), P.scatter({ items: [[SPR.bone, 1], [SPR.skull, 1]], count: 2, baseY: 222 })) },
  weather: { kind: 'dust', density: 30, colors: [K.s, K.Y, K.T] },
  light: 0xfff4e0,
  families: ['wastes', 'bugs'],
  boss: 'ufo',
  hazard: { name: 'SANDSTORM', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 5 },
};

// ---------------------------------------------------------------- CANYON
const canyHaze = '#f0b090';
const canyon: ThemeDef = {
  id: 'canyon',
  name: 'RED CANYON',
  tier: 3,
  sky: ['#3b5dc9', '#ef7d57', '#ffcd75'],
  layers: [
    { speed: 0.03, paint: P.clouds({ count: 4, y: [24, 70], size: [70, 120], colors: [mix(K.y, K.w, 0.4), mix(K.o, K.r, 0.4), K.Y], style: 'streak' }) },
    { speed: 0.07, paint: P.mesas({ colors: [mix(K.U, canyHaze, 0.5), mix(K.o, canyHaze, 0.5), mix(K.R, canyHaze, 0.5)], stripe: mix(K.R, canyHaze, 0.45), count: 3, top: [76, 96], w: [60, 100], baseY: 170 }) },
    { speed: 0.16, paint: P.mesas({ colors: [mix(K.U, canyHaze, 0.25), mix(K.o, canyHaze, 0.2), mix(K.R, canyHaze, 0.25)], stripe: mix(K.R, canyHaze, 0.2), count: 3, top: [96, 116], w: [40, 70], baseY: 170, cliff: [20, 34] }) },
    { speed: 0.32, paint: P.mesas({ colors: [K.U, K.o, K.R], stripe: mix(K.R, K.U, 0.5), count: 2, top: [70, 90], w: [16, 26], baseY: 172, cliff: [50, 70] }) },
    { speed: 0.5, paint: P.stack(P.rocks({ colors: [K.o, K.U, K.R], count: 4, size: [8, 14], baseY: 166, outline: K.k }), P.cacti({ colors: [K.z, K.F, K.E], count: 2, h: [20, 30], baseY: 166, outline: K.k })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 3], [SPR.skull, 1], [SPR.sign, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.o, K.U, K.U], body: K.R, deep: K.k, edge: 'ragged', edgeColor: K.U, strata: mix(K.R, K.U, 0.5), specks: [[K.U, 30], [K.o, 10]], stones: [K.U, K.o, K.R] }),
  front: { speed: 1.35, paint: P.rocks({ colors: [K.U, K.R, mix(K.R, K.k, 0.5)], count: 2, size: [12, 18], baseY: 230, outline: K.k }) },
  weather: { kind: 'dust', density: 18, colors: [K.o, K.s] },
  light: 0xffe0d0,
  families: ['wastes'],
  boss: 'van',
  hazard: { name: 'ROCKFALL', every: 3, desc: 'A ROCK FALLS ON SOMEONE', kind: 'pot', power: 5 },
};

// ---------------------------------------------------------------- BEACH
const beachSky = '#c7f2ff';
const beach: ThemeDef = {
  id: 'beach',
  name: 'SUNNY BEACH',
  tier: 3,
  sky: ['#3b5dc9', '#41a6f6', '#73eff7', '#c7f2ff'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 120, y: 34, r: 14, color: K.Y, core: K.w, glow: K.Q }) },
    { speed: 0.05, paint: P.clouds({ count: 5, y: [30, 90], size: [40, 90], colors: [K.w, mix(K.l, K.C, 0.4), K.w] }) },
    { speed: 0.1, paint: P.stack(P.ships({ hull: mix(K.w, beachSky, 0.2), deck: mix(K.r, beachSky, 0.3), count: 1, y: 122, scale: 0.6 }), P.sea({ y: 120, colors: [mix(K.C, K.w, 0.4), K.t, K.A, K.w], sparkle: K.w, sparkleX: 120 })) },
    { speed: 0.2, paint: P.stack(P.icebergs({ colors: [mix(K.n, beachSky, 0.3), mix(K.N, beachSky, 0.3), mix(K.N, beachSky, 0.45)], count: 1, y: 140, w: [40, 60], h: [16, 26] }), P.palms({ trunk: [mix(K.J, beachSky, 0.2), mix(K.N, beachSky, 0.2)], leaves: [mix(K.F, beachSky, 0.2), mix(K.G, beachSky, 0.2)], count: 2, h: [40, 50], baseY: 142 })) },
    { speed: 0.36, paint: P.palms({ trunk: [K.T, K.n], leaves: [K.F, K.G, K.L], count: 2, h: [90, 120], coconut: K.N }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.umbrella, 2], [SPR.ball, 2], [SPR.shell, 3], [SPR.crate, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.waterEdge({ bank: { top: [K.Y, K.s, K.s], body: K.s, specks: [[K.S, 20], [K.Y, 16], [K.P, 3]], stones: [K.T, K.Q] }, bankH: 22, water: [K.w, K.t, K.A] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.shell, 2], [SPR.ball, 1]], count: 3, baseY: 222 }) },
  families: ['bugs', 'swamp'],
  boss: 'sky_kraken',
  hazard: { name: 'BIG WAVES', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 4 },
};

// ---------------------------------------------------------------- CORAL REEF (underwater)
const reefHaze = '#2a7ab8';
const reef: ThemeDef = {
  id: 'reef',
  name: 'CORAL REEF',
  tier: 3,
  sky: ['#73eff7', '#1e6fbf', '#29366f'],
  layers: [
    { speed: 0.03, paint: P.lightRays({ color: K.i, count: 5, top: 0, len: 160, width: [8, 18], slant: 0.2, density: 0.3 }) },
    { speed: 0.07, paint: P.stack(P.hills({ color: mix(K.B, reefHaze, 0.45), y: 110, amp: 18, cycles: [[2, 1], [5, 0.5], [9, 0.3]] }), P.kelp({ colors: [mix(K.D, reefHaze, 0.5), mix(K.t, reefHaze, 0.55), mix(K.m, reefHaze, 0.5)], count: 12, h: [40, 70], baseY: 166 })) },
    { speed: 0.16, paint: P.stack(P.pillars({ colors: [mix(K.l, reefHaze, 0.5), mix(K.g, reefHaze, 0.5), mix(K.d, reefHaze, 0.5)], count: 2, h: [50, 70], broken: 1, moss: mix(K.G, reefHaze, 0.5) }), P.coral({ colors: [[mix(K.M, reefHaze, 0.45), mix(K.h, reefHaze, 0.4)], [mix(K.o, reefHaze, 0.45), mix(K.y, reefHaze, 0.4)], [mix(K.v, reefHaze, 0.45), mix(K.P, reefHaze, 0.4)]], count: 9, h: [14, 26], baseY: 166 })) },
    { speed: 0.32, paint: P.coral({ colors: [[K.M, K.h], [K.o, K.y], [K.v, K.P], [K.r, K.P], [K.t, K.C]], count: 7, h: [18, 34], baseY: 166 }) },
    { speed: 0.5, paint: P.kelp({ colors: [K.F, K.G, K.L], count: 5, h: [70, 120], baseY: 166 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.shell, 3], [SPR.rock, 2]], count: 6, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.Y, K.s, K.s], body: K.S, deep: mix(K.B, K.S, 0.4), edge: 'lumpy', edgeColor: K.s, specks: [[K.Y, 20], [K.n, 12], [K.P, 4]], stones: [K.T, K.Q] }),
  front: { speed: 1.35, paint: P.kelp({ colors: [K.E, K.F, K.G], count: 3, h: [26, 40], baseY: 220 }) },
  weather: { kind: 'bubbles', density: 24, colors: [K.i, K.C] },
  light: 0xb8d8ff,
  families: ['swamp', 'bugs'],
  boss: 'sky_kraken',
  hazard: { name: 'JELLYFISH', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 5 },
};

// ---------------------------------------------------------------- SAVANNA (sunset)
const savanna: ThemeDef = {
  id: 'savanna',
  name: 'SAVANNA',
  tier: 3,
  sky: ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 260, y: 112, r: 34, color: K.y, core: K.Y, glow: K.o, glowR: 50 }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [30, 70], size: [80, 140], colors: [mix(K.o, K.r, 0.4), mix(K.p, K.R, 0.5), mix(K.y, K.o, 0.4)], style: 'streak' }) },
    { speed: 0.09, paint: P.mesas({ colors: [mix(K.R, K.p, 0.5), mix(K.r, K.o, 0.3), mix(K.R, K.p, 0.6)], count: 2, top: [118, 128], w: [60, 90], baseY: 170, cliff: [8, 12] }) },
    { speed: 0.16, paint: P.stack(P.hills({ color: mix(K.R, K.U, 0.5), y: 140, amp: 4 }), P.acacias({ leaves: [mix(K.R, K.k, 0.5), mix(K.R, K.k, 0.4), mix(K.r, K.k, 0.4)], trunk: mix(K.R, K.k, 0.5), count: 4, h: [22, 30], baseY: 146 })) },
    { speed: 0.34, paint: P.acacias({ leaves: [K.k, mix(K.k, K.R, 0.3), mix(K.R, K.k, 0.4)], trunk: K.k, count: 2, h: [70, 84], baseY: 166 }) },
    { speed: 0.55, paint: P.grass({ colors: [mix(K.S, K.R, 0.4), K.S, K.s], count: 26, h: [10, 20], baseY: 165, blades: [6, 10], lean: 3 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.bone, 1], [SPR.skull, 1]], count: 3, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.s, K.S, K.S], body: K.U, deep: K.R, edge: 'ragged', edgeColor: K.S, blades: K.Y, specks: [[K.N, 20], [K.s, 10]], stones: [K.n, K.T] }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.R, K.U, mix(K.U, K.S, 0.5)], count: 5, h: [20, 32], baseY: 220, blades: [6, 10], width: 2, lean: 4 }) },
  weather: { kind: 'dust', density: 14, colors: [K.y, K.o] },
  light: 0xffd8b8,
  families: ['wastes', 'bugs'],
  boss: 'old_gator',
  hazard: { name: 'STAMPEDE', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 5 },
};

// ---------------------------------------------------------------- TUNDRA (aurora night)
const tundraHaze = '#3a6080';
const tundra: ThemeDef = {
  id: 'tundra',
  name: 'FROZEN TUNDRA',
  tier: 3,
  sky: ['#0e0f1a', '#24305e', '#257179'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 90, colors: [K.w, K.i, K.l], y: [0, 110], big: 0.08 }), P.aurora({ colors: [K.L, K.G, K.t], y: 26, h: 50, amp: 16 })) },
    { speed: 0.06, paint: P.mountains({ color: mix(K.I, tundraHaze, 0.5), light: mix(K.b, tundraHaze, 0.4), snow: mix(K.i, tundraHaze, 0.25), snowShade: mix(K.l, tundraHaze, 0.4), snowDepth: 18, peaks: 5, top: [70, 100], baseY: 170 }) },
    { speed: 0.14, paint: P.stack(P.hills({ color: mix(K.l, tundraHaze, 0.4), light: mix(K.i, tundraHaze, 0.3), y: 136, amp: 6 }), P.pines({ colors: [mix(K.E, tundraHaze, 0.4), mix(K.F, tundraHaze, 0.4)], snow: mix(K.i, tundraHaze, 0.3), count: 18, h: [18, 30], baseY: 142 })) },
    { speed: 0.3, paint: P.pines({ colors: [K.E, mix(K.F, K.D, 0.5), mix(K.F, K.D, 0.3)], trunk: K.N, snow: K.w, count: 5, h: [60, 90], baseY: 168, outline: K.k }) },
    { speed: 0.55, paint: P.rocks({ colors: [K.w, K.l, K.g], count: 4, size: [7, 12], baseY: 165, outline: K.d }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.stump, 1], [SPR.sign, 1]], count: 3, baseY: 162 }) },
  ],
  ground: snow(),
  front: { speed: 1.35, paint: P.rocks({ colors: [K.w, K.i, K.l], count: 2, size: [12, 16], baseY: 228, outline: K.g }) },
  weather: { kind: 'snow', density: 40, colors: [K.w, K.i] },
  light: 0xc0d8ff,
  families: ['wastes', 'strays'],
  boss: 'bear',
  hazard: { name: 'THUNDERSNOW', every: 4, desc: 'LIGHTNING HITS SOMEONE', kind: 'lightning', power: 6 },
};

// ---------------------------------------------------------------- GLACIER (bright day)
const glacierSky = '#d8f8ff';
const glacier: ThemeDef = {
  id: 'glacier',
  name: 'GLACIER',
  tier: 3,
  sky: ['#3b5dc9', '#73eff7', '#e8fcff'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 70, y: 40, r: 10, color: K.w, glow: K.i }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [26, 60], size: [40, 80], colors: [K.w, mix(K.i, K.C, 0.5), K.w], style: 'flat' }) },
    { speed: 0.08, paint: P.mountains({ color: mix(K.C, glacierSky, 0.4), light: mix(K.w, glacierSky, 0.4), snow: K.w, snowShade: mix(K.i, glacierSky, 0.2), snowDepth: 30, peaks: 4, top: [50, 80], slope: [0.8, 1.4], baseY: 170 }) },
    { speed: 0.14, paint: P.stack(P.sea({ y: 138, colors: [K.i, mix(K.c, K.C, 0.5), K.b, K.w] }), P.icebergs({ colors: [K.w, mix(K.i, K.C, 0.4), mix(K.C, K.t, 0.5), K.t], count: 3, y: 142, w: [30, 60], h: [14, 30] })) },
    { speed: 0.3, paint: P.crystals({ sets: [[K.w, K.i, K.C], [K.i, K.C, K.t]], count: 4, h: [30, 50], baseY: 168, outline: mix(K.t, K.b, 0.4) }) },
    { speed: 0.55, paint: P.rocks({ colors: [K.w, K.i, K.C], count: 3, size: [8, 12], baseY: 165, outline: K.t }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.gem, 2], [SPR.rock, 1]], count: 4, baseY: 162 }) },
  ],
  ground: snow({ top: [K.w, K.i, K.C, K.C], body: mix(K.C, K.i, 0.4), deep: K.t, strata: mix(K.C, K.t, 0.4) }),
  front: { speed: 1.35, paint: P.crystals({ sets: [[K.i, K.C, K.t]], count: 2, h: [16, 24], baseY: 222, outline: K.b }) },
  weather: { kind: 'snow', density: 18, colors: [K.w] },
  families: ['wastes'],
  boss: 'crystal_golem',
  hazard: { name: 'ICICLES', every: 3, desc: 'AN ICICLE FALLS ON SOMEONE', kind: 'pot', power: 6 },
};

export const TIER_3: ThemeDef[] = [jungle, swamp, mangrove, desert, canyon, beach, reef, savanna, tundra, glacier];
