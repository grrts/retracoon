// Tier 5: BEYOND. Space, cyberspace, dreams and the place all trash goes.
import type { ThemeDef } from '../types';
import * as P from '../painters';
import { PAL as K, SPR, mix } from '../painters';

// ---------------------------------------------------------------- MOON BASE
const moonHaze = '#3a4060';
const moon: ThemeDef = {
  id: 'moon',
  name: 'MOON BASE',
  tier: 5,
  sky: ['#0e0f1a', '#1a1c2c', '#24305e'],
  layers: [
    { speed: 0.01, paint: P.stack(P.stars({ count: 140, colors: [K.w, K.l, K.i, K.y], y: [0, 150], big: 0.06 }), P.planets([{ x: 360, y: 52, r: 22, colors: [K.c, K.B, K.w], spots: K.G }])) },
    { speed: 0.05, paint: P.mountains({ color: mix(K.d, moonHaze, 0.4), light: mix(K.g, moonHaze, 0.4), peaks: 4, top: [66, 100], slope: [0.6, 1.2], baseY: 170, rim: mix(K.l, moonHaze, 0.3) }) },
    { speed: 0.12, paint: P.stack(P.hills({ color: mix(K.g, moonHaze, 0.3), light: mix(K.l, moonHaze, 0.3), y: 138, amp: 6, specks: mix(K.d, moonHaze, 0.3) }), P.domes({ colors: [mix(K.w, moonHaze, 0.2), mix(K.l, moonHaze, 0.2), mix(K.g, moonHaze, 0.2)], window: K.y, count: 3, r: [10, 18], baseY: 146, beacon: K.r })) },
    { speed: 0.28, paint: P.stack(P.domes({ colors: [K.w, K.l, K.g], window: K.Y, count: 2, r: [28, 36], baseY: 164, beacon: K.r }), P.scatter({ items: [[SPR.dish, 1]], count: 2, baseY: 150 })) },
    { speed: 0.5, paint: P.rocks({ colors: [K.l, K.g, K.d], count: 4, size: [7, 12], baseY: 165, outline: K.k }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rover, 1], [SPR.dish, 1], [SPR.terminal, 1], [SPR.rock, 2], [SPR.barrel, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.l, K.l, K.g], body: K.g, deep: K.d, specks: [[K.d, 30], [K.l, 20]], craters: [K.d, K.l], stones: [K.l, K.w, K.d], stoneCount: 6 }),
  front: { speed: 1.35, paint: P.rocks({ colors: [K.g, K.d, K.a], count: 2, size: [12, 18], baseY: 230, outline: K.k }) },
  weather: { kind: 'dust', density: 10, colors: [K.l] },
  light: 0xd8e0ff,
  families: ['machines', 'void'],
  boss: 'ufo',
  hazard: { name: 'METEORITES', every: 3, desc: 'A ROCK FALLS ON SOMEONE', kind: 'pot', power: 6 },
};

// ---------------------------------------------------------------- NEON CITY (rainy night)
const neonHaze = '#5a2a70';
const neon_city: ThemeDef = {
  id: 'neon_city',
  name: 'NEON CITY',
  tier: 5,
  sky: ['#0e0f1a', '#3b1f5c', '#c0398e'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 30, colors: [K.P, K.w], y: [0, 50] }), P.moon({ x: 90, y: 40, r: 14, color: K.h, shade: K.M, glow: K.p })) },
    { speed: 0.06, paint: P.skyline({ color: mix(K.u, neonHaze, 0.5), edge: mix(K.M, neonHaze, 0.5), win: [mix(K.h, neonHaze, 0.4)], lit: 0.35, h: [70, 140], bw: [12, 26], baseY: 170, setbacks: 0.6, antennas: 0.4, beacon: K.h }) },
    { speed: 0.14, paint: P.skyline({ color: K.u, edge: mix(K.u, K.C, 0.4), roof: K.C, win: [K.C, mix(K.u, K.k, 0.3)], lit: 0.4, h: [50, 110], bw: [20, 36], baseY: 170, winSize: [2, 1, 3, 3], antennas: 0.4, beacon: K.r }) },
    { speed: 0.26, paint: P.stack(P.skyline({ color: K.H, edge: K.u, win: [K.y, mix(K.H, K.u, 0.5)], lit: 0.25, h: [60, 90], bw: [40, 60], gap: [6, 20], baseY: 170, winSize: [3, 4, 7, 9], setbacks: 0 }), P.neonSigns({ count: 5, colors: [K.h, K.C, K.L, K.y, K.v], y: [70, 120], vertical: 0.6 })) },
    { speed: 0.5, paint: P.stack(P.lampPosts({ color: K.H, light: K.u, bulb: K.h, glow: K.M, count: 2, h: 80, style: 'arc' }), P.stringLights({ y: 50, sag: 20, span: 256, colors: [K.C, K.h], wire: K.H, glow: true })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.bin, 2], [SPR.terminal, 2], [SPR.bag, 2], [SPR.car, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.sidewalk({ slab: [K.u, mix(K.u, K.H, 0.4), K.M], curb: [K.e, K.u, K.H], road: [K.H, K.u, K.M], line: K.C }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.bag, 1], [SPR.paper, 1]], count: 2, baseY: 222 }) },
  weather: { kind: 'rain', density: 70, colors: [K.h, K.C, K.v] },
  light: 0xe8c8ff,
  families: ['machines', 'void'],
  boss: 'van',
  hazard: { name: 'SHORT CIRCUIT', every: 3, desc: 'LIGHTNING HITS SOMEONE', kind: 'lightning', power: 6 },
};

// ---------------------------------------------------------------- SPACE STATION
const space_station: ThemeDef = {
  id: 'space_station',
  name: 'SPACE STATION',
  tier: 5,
  sky: ['#0e0f1a', '#1a1c2c', '#24305e'],
  layers: [
    { speed: 0.01, paint: P.stack(P.nebula({ colors: [K.u, K.p, K.M], count: 2, y: [50, 90], r: [30, 50] }), P.stars({ count: 120, colors: [K.w, K.l, K.C], y: [0, 160], big: 0.06 }), P.planets([{ x: 150, y: 90, r: 34, colors: [K.o, K.U, K.y], ring: K.T, bands: K.r }])) },
    { speed: 0.06, paint: P.girders({ color: mix(K.g, K.B, 0.4), light: mix(K.l, K.B, 0.4), rows: [[40, 8], [120, 8]], towers: 3, baseY: 170, lights: K.r }) },
    {
      speed: 0.2,
      paint: P.wall({ style: 'panel', colors: [K.g, K.l, K.d], y: 0, bottom: 170, holes: { count: 2, w: [110, 130], h: [70, 70], y: [36, 36], frame: K.d, shape: 'rect' } }),
    },
    { speed: 0.24, paint: P.ceilingLights({ y: 18, count: 4, color: K.C, glow: mix(K.C, K.g, 0.5), housing: K.d }) },
    { speed: 0.42, paint: P.columns({ colors: [K.l, K.g, K.d], count: 2, width: 12, ibeam: true, outline: K.k, stripes: [K.y, K.k], label: ['A1', 'B2', 'C3'], labelColors: [K.H, K.C] }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.terminal, 3], [SPR.barrel, 1], [SPR.crate, 1], [SPR.robot, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.metalFloor({ colors: [K.l, K.g, K.d], glow: K.C, plate: 32 }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.barrel, 1], [SPR.terminal, 1]], count: 2, baseY: 228 }) },
  weather: { kind: 'sparks', density: 8, colors: [K.C, K.w] },
  light: 0xd8e8ff,
  families: ['machines', 'void'],
  boss: 'clockwork_mech',
  hazard: { name: 'COOLANT LEAK', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 5 },
};

// ---------------------------------------------------------------- ALIEN PLANET
const alienHaze = '#4a6a80';
const alien: ThemeDef = {
  id: 'alien',
  name: 'ALIEN PLANET',
  tier: 5,
  sky: ['#3b1f5c', '#257179', '#a7f070'],
  layers: [
    {
      speed: 0.01,
      paint: P.stack(P.stars({ count: 60, colors: [K.w, K.L], y: [0, 70] }), P.planets([
        { x: 120, y: 50, r: 30, colors: [K.h, K.M, K.P], ring: K.Y, bands: K.v },
        { x: 400, y: 30, r: 9, colors: [K.C, K.t, K.w] },
      ])),
    },
    { speed: 0.05, paint: P.mountains({ color: mix(K.D, alienHaze, 0.45), light: mix(K.t, alienHaze, 0.45), peaks: 7, top: [70, 110], slope: [1.4, 2.4], baseY: 170, jag: 3 }) },
    { speed: 0.12, paint: P.stack(P.kelp({ colors: [mix(K.u, alienHaze, 0.4), mix(K.v, alienHaze, 0.4), mix(K.h, alienHaze, 0.4)], count: 10, h: [30, 60], baseY: 168 }), P.mushrooms({ stem: [mix(K.m, alienHaze, 0.4), mix(K.t, alienHaze, 0.4)], caps: [[mix(K.C, alienHaze, 0.35), mix(K.w, alienHaze, 0.3), mix(K.t, alienHaze, 0.4)]], count: 6, h: [24, 40], r: [8, 12], baseY: 168 })) },
    { speed: 0.26, paint: P.mushrooms({ stem: [K.m, K.t], caps: [[K.h, K.P, K.M], [K.C, K.w, K.t], [K.L, K.Y, K.G]], spots: K.Y, count: 4, h: [44, 70], r: [14, 20], baseY: 168, glow: K.L }) },
    { speed: 0.46, paint: P.stack(P.kelp({ colors: [K.p, K.v, K.h], count: 4, h: [40, 70], baseY: 166 }), P.crystals({ sets: [[K.L, K.G, K.F], [K.C, K.t, K.D]], count: 3, h: [16, 30], baseY: 166, outline: K.k, glow: true })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.gem, 2], [SPR.shroom, 2], [SPR.rock, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.L, K.G, K.D], body: K.u, deep: K.H, edge: 'lumpy', edgeColor: K.D, edgeDepth: 5, specks: [[K.v, 20], [K.L, 6], [K.C, 4]], stones: [K.e, K.v, K.H], cracks: [K.L, K.G] }),
  front: { speed: 1.35, paint: P.kelp({ colors: [K.H, K.u, K.p], count: 3, h: [26, 40], baseY: 220 }) },
  weather: { kind: 'spores', density: 26, colors: [K.L, K.C, K.h] },
  light: 0xe0ffe8,
  families: ['void', 'machines'],
  boss: 'ufo',
  hazard: { name: 'ALIEN SPORES', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 6 },
};

// ---------------------------------------------------------------- VOID RIFT
const void_rift: ThemeDef = {
  id: 'void_rift',
  name: 'VOID RIFT',
  tier: 5,
  sky: ['#0e0f1a', '#3b1f5c', '#1a1c2c'],
  layers: [
    { speed: 0.01, paint: P.stack(P.nebula({ colors: [K.u, K.p, K.M, K.h], count: 3, y: [40, 120], r: [30, 60] }), P.stars({ count: 100, colors: [K.w, K.h, K.C], y: [0, 160], big: 0.1 })) },
    { speed: 0.05, paint: P.floatingIslands({ count: 5, y: [40, 110], w: [16, 36], grass: [mix(K.h, K.u, 0.4), mix(K.M, K.u, 0.5), K.u], rock: [mix(K.e, K.u, 0.5), K.u, K.H] }) },
    { speed: 0.14, paint: P.floatingIslands({ count: 3, y: [60, 100], w: [40, 64], grass: [K.h, K.M, K.p], rock: [K.e, K.u, K.H], waterfall: K.h }) },
    { speed: 0.3, paint: P.crystals({ sets: [[K.h, K.M, K.p], [K.v, K.e, K.u], [K.C, K.t, K.D]], count: 4, h: [40, 70], baseY: 168, outline: K.H }) },
    { speed: 0.5, paint: P.stack(P.rocks({ colors: [K.e, K.u, K.H], count: 3, size: [8, 14], baseY: 166, outline: K.k }), P.bigLetters({ chars: 'X+*', colors: [K.h, K.p], count: 3, scale: [2, 3], y: [40, 90] })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.gem, 3], [SPR.skull, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.M, K.p, K.u], body: K.H, deep: K.k, specks: [[K.u, 20], [K.h, 4]], cracks: [K.h, K.M], stones: [K.u, K.e, K.H] }),
  front: { speed: 1.35, paint: P.crystals({ sets: [[K.p, K.u, K.H]], count: 2, h: [16, 24], baseY: 222, outline: K.k }) },
  weather: { kind: 'sparks', density: 26, colors: [K.h, K.C, K.w] },
  light: 0xe0c8ff,
  families: ['void'],
  boss: 'trash_god',
  hazard: { name: 'RIFT PULSE', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 6 },
};

// ---------------------------------------------------------------- DREAM WORLD
const dreamSky = '#f0d0f0';
const dream: ThemeDef = {
  id: 'dream',
  name: 'DREAM WORLD',
  tier: 5,
  sky: ['#7a4a8f', '#b05ccf', '#f5a5b8', '#fff6e0'],
  layers: [
    { speed: 0.01, paint: P.stack(P.stars({ count: 50, colors: [K.Y, K.w], y: [0, 90], big: 0.3, dim: K.P }), P.moon({ x: 380, y: 44, r: 20, color: K.Y, shade: K.y, phase: -9, glow: K.P })) },
    { speed: 0.04, paint: P.stack(P.rainbow({ x: 140, y: 140, r: 70, band: 3, colors: [mix(K.r, dreamSky, 0.5), mix(K.o, dreamSky, 0.5), mix(K.y, dreamSky, 0.5), mix(K.L, dreamSky, 0.5), mix(K.c, dreamSky, 0.5), mix(K.v, dreamSky, 0.5)] }), P.bigLetters({ chars: 'Z', colors: [K.Q, mix(K.v, K.P, 0.5)], count: 4, scale: [2, 4], y: [20, 80] })) },
    { speed: 0.08, paint: P.floatingIslands({ count: 4, y: [50, 100], w: [30, 50], grass: [mix(K.m, dreamSky, 0.3), mix(K.t, dreamSky, 0.4), mix(K.D, dreamSky, 0.4)], rock: [mix(K.P, dreamSky, 0.3), mix(K.v, dreamSky, 0.4), mix(K.e, dreamSky, 0.4)], trees: [mix(K.h, dreamSky, 0.3), mix(K.e, dreamSky, 0.4), mix(K.P, dreamSky, 0.3)], waterfall: mix(K.C, dreamSky, 0.3) }) },
    { speed: 0.14, paint: P.clouds({ count: 6, y: [134, 156], size: [70, 130], colors: [K.Q, mix(K.P, K.v, 0.3), K.w] }) },
    { speed: 0.28, paint: P.mushrooms({ stem: [K.Q, K.P], caps: [[K.h, K.P, K.M], [K.C, K.i, K.t], [K.v, K.P, K.e]], spots: K.Y, count: 4, h: [40, 60], r: [14, 20], baseY: 166, glow: K.P }) },
    { speed: 0.55, paint: P.clouds({ count: 4, y: [160, 166], size: [30, 60], colors: [K.Q, K.P, K.w] }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.ball, 1], [SPR.duck, 1], [SPR.shroom, 2], [SPR.candle, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.cloudFloor({ colors: [K.Q, K.P, mix(K.v, K.P, 0.4), K.Y] }),
  front: { speed: 1.35, paint: P.clouds({ count: 3, y: [214, 216], size: [40, 70], colors: [K.Q, K.P, K.w] }) },
  weather: { kind: 'stars', density: 22, colors: [K.Y, K.w, K.P] },
  light: 0xffe8f8,
  families: ['void', 'fungi'],
  boss: 'sky_kraken',
  hazard: { name: 'DROWSY', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 6 },
};

// ---------------------------------------------------------------- CYBER GRID (synthwave)
const cyber: ThemeDef = {
  id: 'cyber',
  name: 'CYBER GRID',
  tier: 5,
  sky: ['#0e0f1a', '#24305e', '#5d275d'],
  layers: [
    { speed: 0.01, paint: P.stack(P.stars({ count: 60, colors: [K.C, K.w, K.h], y: [0, 100] }), P.sun({ x: 240, y: 112, r: 36, color: K.h, core: K.y, glow: K.M, glowR: 50, stripes: true })) },
    { speed: 0.05, paint: P.mountains({ color: K.H, light: mix(K.H, K.u, 0.5), rim: K.C, peaks: 6, top: [96, 124], slope: [0.8, 1.4], baseY: 170, jag: 0.5 }) },
    { speed: 0.12, paint: P.stack(P.skyline({ color: K.k, edge: K.h, roof: K.h, win: [K.C, mix(K.k, K.u, 0.3)], lit: 0.4, h: [30, 70], bw: [14, 28], baseY: 170, winSize: [1, 1, 3, 3], antennas: 0.4, beacon: K.C }), P.mist({ color: mix(K.M, K.H, 0.4), y: 150, h: 10, solid: 20, d: 0.6 })) },
    { speed: 0.3, paint: P.stack(P.lampPosts({ color: K.H, light: K.u, bulb: K.C, glow: K.t, count: 3, h: 60, style: 'globe' }), P.bigLetters({ chars: '10', colors: [mix(K.L, K.H, 0.4), K.H], count: 6, scale: [2, 2], y: [40, 100] })) },
    { speed: 0.55, paint: P.columns({ colors: [K.C, K.u, K.H], count: 2, width: 6, top: 96, baseY: 166, outline: K.h }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.terminal, 3], [SPR.barrel, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.gridFloor({ base: K.H, line: K.h, glow: K.M, spacing: 32 }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.terminal, 1]], count: 1, baseY: 228 }) },
  weather: { kind: 'sparks', density: 20, colors: [K.C, K.h] },
  light: 0xe8d0ff,
  families: ['machines'],
  boss: 'clockwork_mech',
  hazard: { name: 'POWER SURGE', every: 3, desc: 'LIGHTNING HITS SOMEONE', kind: 'lightning', power: 6 },
};

// ---------------------------------------------------------------- STORM PEAKS
const stormHaze = '#4a5470';
const storm_peaks: ThemeDef = {
  id: 'storm_peaks',
  name: 'STORM PEAKS',
  tier: 5,
  sky: ['#1a1c2c', '#333c57', '#566c86'],
  layers: [
    { speed: 0.02, paint: P.stack(P.clouds({ count: 5, y: [20, 60], size: [90, 150], colors: [mix(K.d, K.g, 0.4), K.d, mix(K.g, K.l, 0.3)], style: 'flat' }), P.bolts({ color: K.Y, glow: K.y, count: 2, y: [50, 130] })) },
    { speed: 0.06, paint: P.mountains({ color: mix(K.d, stormHaze, 0.45), light: mix(K.g, stormHaze, 0.4), snow: mix(K.l, stormHaze, 0.3), snowDepth: 12, peaks: 5, top: [50, 90], slope: [1.0, 1.8], baseY: 170, jag: 2.5 }) },
    { speed: 0.12, paint: P.clouds({ count: 5, y: [70, 110], size: [80, 140], colors: [mix(K.d, K.a, 0.5), mix(K.k, K.d, 0.4), mix(K.g, K.d, 0.4)], style: 'flat' }) },
    { speed: 0.22, paint: P.mountains({ color: K.d, light: K.a, snow: K.l, snowShade: K.g, snowDepth: 8, peaks: 4, top: [86, 120], slope: [1.2, 2], baseY: 170, jag: 2, rim: K.l }) },
    { speed: 0.4, paint: P.pines({ colors: [K.k, mix(K.E, K.d, 0.5), mix(K.F, K.g, 0.5)], trunk: K.k, count: 5, h: [50, 80], baseY: 168, outline: K.H }) },
    { speed: 0.6, paint: P.rocks({ colors: [K.g, K.a, K.d], count: 4, size: [8, 14], baseY: 166, outline: K.k }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.skull, 1], [SPR.sign, 1]], count: 3, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.g, K.a, K.d], body: K.d, deep: K.k, edge: 'ragged', edgeColor: K.a, specks: [[K.a, 30], [K.g, 10]], stones: [K.g, K.l, K.k], stoneCount: 10, strata: K.a }),
  front: { speed: 1.35, paint: P.rocks({ colors: [K.a, K.d, K.k], count: 2, size: [12, 18], baseY: 230, outline: K.k }) },
  weather: { kind: 'rain', density: 80, colors: [K.l, K.g] },
  light: 0xc8d0e8,
  families: ['void', 'machines'],
  boss: 'sky_kraken',
  hazard: { name: 'LIGHTNING', every: 3, desc: 'A BOLT HITS SOMEONE', kind: 'lightning', power: 7 },
};

// ---------------------------------------------------------------- SKY TEMPLE (golden hour above the clouds)
const templeHaze = '#ffd8a8';
const sky_temple: ThemeDef = {
  id: 'sky_temple',
  name: 'SKY TEMPLE',
  tier: 5,
  sky: ['#b13e53', '#ef7d57', '#ffcd75', '#fff6e0'],
  layers: [
    { speed: 0.01, paint: P.sun({ x: 300, y: 90, r: 30, color: K.Y, core: K.w, glow: K.y, glowR: 50 }) },
    { speed: 0.04, paint: P.stack(P.temples({ style: 'pagoda', colors: [mix(K.r, templeHaze, 0.45), mix(K.R, templeHaze, 0.45), mix(K.R, templeHaze, 0.5), mix(K.O, templeHaze, 0.4)], count: 2, scale: [0.7, 0.9], baseY: 130, windows: mix(K.y, templeHaze, 0.3) }), P.clouds({ count: 6, y: [124, 140], size: [80, 140], colors: [mix(K.Q, templeHaze, 0.3), mix(K.o, templeHaze, 0.4), K.w] })) },
    { speed: 0.1, paint: P.floatingIslands({ count: 3, y: [60, 96], w: [34, 54], grass: [mix(K.L, templeHaze, 0.3), mix(K.G, templeHaze, 0.35), mix(K.F, templeHaze, 0.4)], rock: [mix(K.T, templeHaze, 0.3), mix(K.n, templeHaze, 0.35), mix(K.N, templeHaze, 0.4)], trees: [mix(K.P, templeHaze, 0.2), mix(K.N, templeHaze, 0.3), K.Q], waterfall: mix(K.C, templeHaze, 0.3) }) },
    { speed: 0.18, paint: P.clouds({ count: 6, y: [146, 160], size: [80, 140], colors: [K.Q, mix(K.o, K.P, 0.4), K.w] }) },
    { speed: 0.34, paint: P.stack(P.temples({ style: 'pagoda', colors: [K.r, K.R, mix(K.R, K.k, 0.3), K.O], count: 1, scale: [1.2, 1.2], baseY: 168, windows: K.y }), P.stringLights({ y: 60, sag: 24, span: 256, colors: [K.r, K.y, K.w, K.G, K.b], wire: K.N, flags: true })) },
    { speed: 0.6, paint: P.pillars({ colors: [K.y, K.O, K.n], count: 2, h: [70, 90], width: 10, broken: 0, outline: K.N }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.lantern, 2], [SPR.candle, 2], [SPR.basket, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.tileFloor({ colors: [K.Q, K.s, K.w], edge: [K.O, K.y], tile: 16 }),
  front: { speed: 1.35, paint: P.clouds({ count: 3, y: [214, 216], size: [40, 70], colors: [K.Q, mix(K.o, K.P, 0.4), K.w] }) },
  weather: { kind: 'petals', density: 18, colors: [K.P, K.Y, K.w] },
  light: 0xfff0d8,
  families: ['void', 'machines'],
  boss: 'crystal_golem',
  hazard: { name: 'TEMPLE BELL', every: 3, desc: 'A BELL FALLS ON SOMEONE', kind: 'pot', power: 6 },
};

// ---------------------------------------------------------------- TRASH DIMENSION
const trashHaze = '#5a7040';
const trash_dimension: ThemeDef = {
  id: 'trash_dimension',
  name: 'TRASH DIMENSION',
  tier: 5,
  sky: ['#16382c', '#5d275d', '#6a8f3a', '#a7f070'],
  layers: [
    { speed: 0.01, paint: P.stack(P.stars({ count: 60, colors: [K.L, K.w, K.h], y: [0, 100] }), P.planets([{ x: 360, y: 60, r: 26, colors: [K.z, K.F, K.L], ring: K.n, bands: K.U }, { x: 80, y: 30, r: 10, colors: [K.a, K.d, K.l] }])) },
    { speed: 0.04, paint: P.bigProps({ items: [[SPR.trashCan, 3], [SPR.bag, 2], [SPR.tire, 1]], count: 4, scale: 2, baseY: 130, tint: [mix(trashHaze, K.L, 0.3), 0.3], float: [10, 60] }) },
    { speed: 0.1, paint: P.junkPiles({ colors: [mix(K.n, trashHaze, 0.4), mix(K.g, trashHaze, 0.4), mix(K.r, trashHaze, 0.4), mix(K.v, trashHaze, 0.4)], base: mix(K.p, trashHaze, 0.4), shade: mix(K.u, trashHaze, 0.4), count: 4, h: [30, 60], w: [80, 140], baseY: 168 }) },
    { speed: 0.22, paint: P.bigProps({ items: [[SPR.trashCan, 2], [SPR.bin, 1]], count: 2, scale: 3, baseY: 170 }) },
    { speed: 0.4, paint: P.junkPiles({ colors: [K.n, K.g, K.r, K.b, K.L, K.h, K.y], base: K.p, shade: K.u, count: 3, h: [30, 50], w: [70, 110], baseY: 168 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.bag, 3], [SPR.trashCan, 2], [SPR.tire, 2], [SPR.barrel, 1], [SPR.paper, 2]], count: 8, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.L, K.z, K.F], body: K.p, deep: K.u, edge: 'drip', edgeColor: K.z, edgeDepth: 5, specks: [[K.n, 16], [K.l, 10], [K.r, 6], [K.y, 4], [K.c, 4]], stones: [K.g, K.l, K.d], stoneCount: 12 }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.bag, 2], [SPR.tire, 1], [SPR.paper, 1]], count: 3, baseY: 222 }) },
  weather: { kind: 'spores', density: 28, colors: [K.L, K.z, K.h] },
  light: 0xe8f0c8,
  families: ['void', 'street'],
  boss: 'trash_god',
  hazard: { name: 'STENCH', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 7 },
};

export const TIER_5: ThemeDef[] = [moon, neon_city, space_station, alien, void_rift, dream, cyber, storm_peaks, sky_temple, trash_dimension];
