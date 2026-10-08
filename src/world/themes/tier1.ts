// Tier 1: TOWN. Where every run starts.
import type { ThemeDef } from '../types';
import * as P from '../painters';
import { PAL as K, SPR, mix } from '../painters';

// ---------------------------------------------------------------- TRASH STREET (sunset)
const streetHaze = '#c46a78';
const street: ThemeDef = {
  id: 'street',
  name: 'TRASH STREET',
  tier: 1,
  sky: ['#29366f', '#7a4a8f', '#ef7d57', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 300, y: 92, r: 18, color: K.y, core: K.Y, glow: K.o, glowR: 34 }) },
    {
      speed: 0.05,
      paint: P.clouds({ count: 5, y: [26, 84], size: [50, 110], colors: [mix(K.o, K.P, 0.5), mix(K.M, K.e, 0.3), K.y], style: 'streak' }),
    },
    {
      speed: 0.1,
      paint: P.skyline({ color: mix(K.e, streetHaze, 0.45), edge: mix(K.e, K.o, 0.55), win: [mix(K.y, streetHaze, 0.4)], lit: 0.12, h: [44, 96], bw: [14, 30], baseY: 166, gap: [-3, 2], antennas: 0.25, tanks: 0.15, beacon: K.r }),
    },
    {
      speed: 0.18,
      paint: P.skyline({ color: mix(K.p, K.e, 0.4), edge: mix(K.p, K.o, 0.45), roof: mix(K.p, K.o, 0.3), win: [mix(K.y, K.o, 0.3), mix(K.p, K.k, 0.3)], lit: 0.28, h: [36, 70], bw: [22, 40], baseY: 166, winSize: [2, 2, 4, 5], gap: [-2, 6], antennas: 0.3, tanks: 0.25 }),
    },
    {
      speed: 0.32,
      paint: P.haze(
        streetHaze,
        0.12,
        P.shopfronts({
          walls: [K.U, K.n, mix(K.r, K.U, 0.4), K.g, mix(K.D, K.d, 0.3), K.e],
          trim: K.T,
          glass: [K.y, mix(K.d, K.B, 0.4)],
          awnings: [[K.r, K.w], [K.G, K.Q], [K.b, K.w], [K.O, K.N], [K.M, K.P]],
          signs: [K.D, K.r, K.B, K.p, K.F],
          h: [50, 76],
          bw: [58, 88],
          lit: 0.45,
        }),
      ),
    },
    {
      speed: 0.55,
      paint: P.stack(
        P.powerLines({ color: K.N, light: K.n, wire: K.k, count: 2, h: 112, sag: 14 }),
        P.lampPosts({ color: K.d, light: K.g, bulb: K.Y, glow: K.y, count: 3, h: 74, style: 'arc', offset: 60 }),
      ),
    },
    {
      speed: 0.8,
      paint: P.scatter({
        items: [[SPR.trashCan, 4], [SPR.bin, 3], [SPR.bag, 3], [SPR.box, 2], [SPR.hydrant, 1], [SPR.car, 2], [SPR.dumpster, 2], [SPR.paper, 1]],
        count: 9,
        baseY: 162,
      }),
    },
  ],
  ground: P.sidewalk({ slab: [K.l, mix(K.l, K.g, 0.35), K.g], curb: [K.l, K.g, K.d], road: [K.a, K.d, K.g], line: K.y, litter: true }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.bag, 2], [SPR.cone, 1], [SPR.paper, 2]], count: 3, baseY: 222 }) },
  weather: { kind: 'dust', density: 12, colors: [K.y, K.Y] },
  light: 0xffe4d0,
  families: ['street', 'strays'],
  boss: 'van',
};

// ---------------------------------------------------------------- BACK ALLEY (rainy night)
const alley: ThemeDef = {
  id: 'alley',
  name: 'BACK ALLEY',
  tier: 1,
  sky: ['#0e0f1a', '#24305e', '#5d275d'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 40, colors: [K.l, K.g], y: [0, 70] }), P.moon({ x: 120, y: 40, r: 11, color: K.Y, shade: K.s, phase: 6, glow: K.e })) },
    { speed: 0.06, paint: P.clouds({ count: 4, y: [30, 70], size: [60, 120], colors: [mix(K.I, K.e, 0.4), K.I, mix(K.e, K.l, 0.2)], style: 'flat' }) },
    { speed: 0.12, paint: P.skyline({ color: mix(K.I, K.u, 0.4), edge: mix(K.I, K.e, 0.6), win: [mix(K.y, K.e, 0.4)], lit: 0.18, h: [60, 120], bw: [16, 34], baseY: 166, beacon: K.r, antennas: 0.3 }) },
    {
      speed: 0.3,
      paint: P.skyline({ color: K.N, edge: K.U, roof: K.n, brick: mix(K.N, K.k, 0.35), win: [K.y, mix(K.k, K.N, 0.3)], lit: 0.3, h: [76, 120], bw: [44, 72], gap: [6, 22], baseY: 168, winSize: [5, 7, 10, 14], fireEscapes: K.k, setbacks: 0 }),
    },
    {
      speed: 0.45,
      paint: P.stack(
        P.stringLights({ y: 62, sag: 16, span: 128, colors: [K.w, K.r, K.c, K.y, K.P], wire: K.k, flags: true, every: 9 }),
        P.neonSigns({ count: 2, colors: [K.h, K.C, K.r], y: [92, 110], vertical: 0.7 }),
      ),
    },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.dumpster, 3], [SPR.bin, 2], [SPR.bag, 3], [SPR.crate, 2], [SPR.tire, 1], [SPR.trashCan, 2]], count: 8, baseY: 162 }) },
  ],
  ground: P.cobbles({ colors: [mix(K.g, K.e, 0.3), mix(K.a, K.e, 0.2), mix(K.k, K.a, 0.4)] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.bag, 2], [SPR.paper, 2], [SPR.tire, 1]], count: 3, baseY: 222 }) },
  weather: { kind: 'rain', density: 60, colors: [K.l, K.g] },
  light: 0xb8b8f0,
  families: ['street', 'strays'],
  boss: 'rat_king',
  hazard: { name: 'FLOWERPOTS', every: 3, desc: 'A POT FALLS ON SOMEONE', kind: 'pot', power: 5 },
};

// ---------------------------------------------------------------- CITY PARK (sunny)
const parkSky = '#c7f2ff';
const park: ThemeDef = {
  id: 'park',
  name: 'CITY PARK',
  tier: 1,
  sky: ['#3b5dc9', '#41a6f6', '#c7f2ff'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 80, y: 34, r: 10, color: K.Y, glow: K.Q, glowR: 18 }) },
    { speed: 0.05, paint: P.clouds({ count: 5, y: [30, 80], size: [40, 80], colors: [K.w, mix(K.l, K.c, 0.3), K.w] }) },
    { speed: 0.1, paint: P.skyline({ color: mix(K.l, parkSky, 0.5), edge: mix(K.w, parkSky, 0.5), win: [mix(K.c, parkSky, 0.3)], lit: 0.4, h: [40, 90], bw: [14, 30], baseY: 150, setbacks: 0.4, antennas: 0.2 }) },
    {
      speed: 0.18,
      paint: P.hills({ color: mix(K.G, parkSky, 0.4), light: mix(K.L, parkSky, 0.4), y: 136, amp: 8, trees: { color: mix(K.F, parkSky, 0.4), light: mix(K.G, parkSky, 0.4), r: [5, 9], gap: 7 } }),
    },
    { speed: 0.3, paint: P.trees({ leaves: [K.F, K.G, K.L, K.Y], trunk: [K.n, K.N], count: 4, h: [44, 60], r: [16, 22], baseY: 164 }) },
    {
      speed: 0.55,
      paint: P.stack(
        P.fence({ style: 'iron', colors: [K.g, K.d, K.k], h: 18, baseY: 163 }),
        P.lampPosts({ color: K.d, light: K.g, bulb: K.Y, count: 2, h: 52, style: 'globe' }),
        P.bushes({ colors: [K.F, K.G, K.L], count: 5, r: [5, 8], baseY: 164, dots: [K.P, K.w, K.y] }),
      ),
    },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.bench, 2], [SPR.bin, 1], [SPR.flowers, 3], [SPR.sign, 1], [SPR.trashCan, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.L, K.G, K.G, K.F], body: K.n, deep: K.N, edge: 'ragged', edgeColor: K.F, edgeDepth: 5, blades: K.L, stones: [K.T, K.s, K.N], specks: [[K.N, 20], [K.T, 6]] }),
  front: { speed: 1.35, paint: P.grass({ colors: [K.E, K.F, K.G], count: 4, h: [12, 22], baseY: 218, blades: [5, 9], flowers: [K.w, K.y] }) },
  weather: { kind: 'leaves', density: 10, colors: [K.G, K.L] },
  families: ['strays', 'street'],
  boss: 'goose',
  hazard: { name: 'SPRINKLERS', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 3 },
};

// ---------------------------------------------------------------- PARKING GARAGE
const garage: ThemeDef = {
  id: 'garage',
  name: 'PARKING GARAGE',
  tier: 1,
  sky: ['#0e0f1a', '#24305e', '#7a4a8f'],
  layers: [
    { speed: 0.04, paint: P.skyline({ color: mix(K.I, K.k, 0.3), win: [K.y], lit: 0.2, h: [60, 110], bw: [14, 30], baseY: 140, beacon: K.r, antennas: 0.3 }) },
    {
      speed: 0.14,
      paint: P.wall({ style: 'concrete', colors: [mix(K.g, K.d, 0.5), mix(K.g, K.l, 0.2), K.d], y: 24, bottom: 170, holes: { count: 4, w: [60, 80], h: [34, 40], y: [52, 56], frame: K.d } }),
    },
    { speed: 0.2, paint: P.ceilingLights({ y: 26, slab: [K.d, K.g], beams: 8, count: 4, color: K.i, glow: mix(K.i, K.g, 0.4), housing: K.k }) },
    { speed: 0.3, paint: P.scatter({ items: [[SPR.car, 1]], count: 5, baseY: 164 }) },
    { speed: 0.45, paint: P.columns({ colors: [K.l, K.g, K.d], count: 3, width: 16, stripes: [K.O, K.k], label: ['B2', 'B3', 'P'], labelColors: [K.B, K.w], outline: K.k }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.cone, 3], [SPR.barrel, 2], [SPR.tire, 2], [SPR.bag, 1], [SPR.bin, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.parkingFloor({ colors: [K.l, K.g, K.d], line: K.y }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.cone, 1], [SPR.tire, 1]], count: 2, baseY: 224 }) },
  weather: { kind: 'dust', density: 14, colors: [K.l, K.g] },
  light: 0xd8e0f0,
  families: ['street', 'strays'],
  boss: 'van',
  hazard: { name: 'EXHAUST', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 3 },
};

// ---------------------------------------------------------------- ROOFTOPS (dusk)
const roofHaze = '#a05a8a';
const rooftops: ThemeDef = {
  id: 'rooftops',
  name: 'ROOFTOPS',
  tier: 1,
  sky: ['#1a1c2c', '#3b1f5c', '#c0398e', '#ef7d57'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 60, colors: [K.w, K.l, K.P], y: [0, 70], big: 0.1 }), P.moon({ x: 380, y: 34, r: 9, color: K.Q, shade: K.T, craters: K.T })) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [60, 100], size: [70, 130], colors: [mix(K.M, K.o, 0.4), mix(K.M, K.u, 0.5), mix(K.o, K.y, 0.4)], style: 'streak' }) },
    { speed: 0.08, paint: P.skyline({ color: mix(K.u, roofHaze, 0.45), edge: mix(K.u, K.o, 0.4), win: [mix(K.y, roofHaze, 0.4)], lit: 0.25, h: [50, 120], bw: [12, 26], baseY: 170, setbacks: 0.5, antennas: 0.35, beacon: K.r }) },
    { speed: 0.18, paint: P.skyline({ color: K.u, edge: mix(K.u, K.M, 0.4), roof: mix(K.u, K.o, 0.3), win: [K.y, mix(K.u, K.k, 0.3)], lit: 0.35, h: [30, 70], bw: [24, 44], baseY: 170, winSize: [2, 3, 5, 6], antennas: 0.3, tanks: 0.3, beacon: K.r }) },
    { speed: 0.4, paint: P.scatter({ items: [[SPR.waterTower, 2], [SPR.chimney, 2], [SPR.dish, 1], [SPR.ac, 2]], count: 5, baseY: 164 }) },
    {
      speed: 0.6,
      paint: P.stack(
        P.stringLights({ y: 104, sag: 10, span: 170, colors: [K.y, K.Y, K.O], wire: K.k, glow: true }),
        P.fence({ style: 'rail', colors: [K.g, K.d, K.k], h: 14, baseY: 163, spacing: 64 }),
      ),
    },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.ac, 2], [SPR.crate, 1], [SPR.chimney, 1], [SPR.dish, 1], [SPR.bin, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.g, K.a, K.a], body: K.d, deep: K.k, specks: [[K.g, 80], [K.l, 20], [K.k, 30]], lip: K.l, strata: mix(K.d, K.k, 0.3) }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.chimney, 1], [SPR.ac, 1]], count: 2, baseY: 226 }) },
  light: 0xf0c8e0,
  families: ['street', 'strays'],
  boss: 'goose',
  hazard: { name: 'STORM', every: 4, desc: 'LIGHTNING HITS SOMEONE', kind: 'lightning', power: 6 },
};

// ---------------------------------------------------------------- SUBWAY
const subway: ThemeDef = {
  id: 'subway',
  name: 'SUBWAY',
  tier: 1,
  sky: ['#0e0f1a', '#1a1c2c', '#24305e'],
  layers: [
    {
      speed: 0.12,
      paint: P.stack(
        P.wall({ style: 'tile', colors: [mix(K.l, K.Q, 0.25), mix(K.Q, K.l, 0.3), mix(K.g, K.l, 0.3)], y: 30, bottom: 170, holes: { count: 2, w: [70, 70], h: [80, 80], y: [86, 86], shape: 'arch', frame: K.g }, posters: [K.r, K.b, K.O, K.G, K.v] }),
        (ctx, w) => {
          P.rect(ctx, 0, 52, w, 6, K.G);
          P.rect(ctx, 0, 52, w, 1, K.L);
          for (let x = 40; x < w; x += 256) {
            P.rect(ctx, x, 38, 52, 11, K.k);
            P.text(ctx, 'TRASH ST', x + 10, 41, K.w);
          }
        },
      ),
    },
    { speed: 0.2, paint: P.ceilingLights({ y: 22, slab: [K.d, K.g], beams: 0, count: 5, color: K.Y, glow: mix(K.Y, K.l, 0.5), housing: K.k }) },
    { speed: 0.4, paint: P.columns({ colors: [K.t, K.D, mix(K.D, K.k, 0.4)], count: 2, width: 12, ibeam: true, outline: K.k, label: ['14', '23', '42'], labelColors: [K.k, K.w], top: 0, baseY: 166 }) },
    { speed: 0.6, paint: P.scatter({ items: [[SPR.bench, 2], [SPR.terminal, 1], [SPR.trashCan, 2], [SPR.sign, 1]], count: 5, baseY: 162 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.bag, 2], [SPR.paper, 3], [SPR.bin, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.tileFloor({ colors: [mix(K.l, K.g, 0.3), K.g, K.l], edge: [K.y, K.O], tile: 8, pit: [K.H, K.l, K.N] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.paper, 2], [SPR.bag, 1]], count: 2, baseY: 220 }) },
  weather: { kind: 'dust', density: 14, colors: [K.l] },
  light: 0xe0f0d8,
  families: ['street', 'strays'],
  boss: 'rat_king',
  hazard: { name: 'TRAIN RUMBLE', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 4 },
};

// ---------------------------------------------------------------- SEWERS
const sewerSlime = '#7fbf3f';
const sewers: ThemeDef = {
  id: 'sewers',
  name: 'SEWERS',
  tier: 1,
  sky: ['#0e0f1a', '#16382c', '#2d6a3e'],
  layers: [
    {
      speed: 0.1,
      paint: P.wall({ style: 'brick', colors: [mix(K.F, K.d, 0.6), mix(K.z, K.d, 0.4), K.E], y: 0, bottom: 170, holes: { count: 3, w: [56, 64], h: [90, 90], y: [80, 80], shape: 'arch', frame: K.E } }),
    },
    { speed: 0.18, paint: P.ceiling({ colors: [K.E, K.F, K.k], y: 22, amp: 4, stalactites: 10, len: [4, 10], drip: sewerSlime }) },
    { speed: 0.32, paint: P.pipes({ colors: [K.z, K.F, K.E], rows: [[40, 8], [62, 5]], verticals: 4, flange: K.E, valve: K.r, drip: sewerSlime }) },
    { speed: 0.55, paint: P.pipes({ colors: [K.l, K.g, K.d], rows: [[108, 10]], verticals: 2, flange: K.d, valve: K.O }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.barrel, 3], [SPR.crate, 1], [SPR.bag, 2], [SPR.tire, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.waterEdge({
    bank: { top: [K.g, K.a, K.a], body: K.d, specks: [[K.k, 20]] },
    bankH: 16,
    water: [K.L, mix(K.z, K.F, 0.4), K.E],
  }),
  front: { speed: 1.35, paint: P.vines({ colors: [sewerSlime, K.z, K.L], count: 5, len: [4, 14] }) },
  weather: { kind: 'bubbles', density: 14, colors: [K.L, sewerSlime] },
  light: 0xb8e0b0,
  families: ['strays', 'street'],
  boss: 'rat_king',
  hazard: { name: 'SEWER GAS', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 4 },
};

// ---------------------------------------------------------------- DOCKS (morning)
const dockSky = '#bfe6f0';
const docks: ThemeDef = {
  id: 'docks',
  name: 'THE DOCKS',
  tier: 1,
  sky: ['#3b5dc9', '#41a6f6', '#c7f2ff', '#fff6e0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 400, y: 64, r: 12, color: K.Y, glow: K.Q }) },
    { speed: 0.05, paint: P.clouds({ count: 5, y: [30, 90], size: [40, 100], colors: [K.w, mix(K.l, dockSky, 0.4), K.w] }) },
    {
      speed: 0.1,
      paint: P.stack(
        P.ships({ hull: mix(K.d, dockSky, 0.45), deck: mix(K.l, dockSky, 0.5), boxes: [mix(K.r, dockSky, 0.5), mix(K.b, dockSky, 0.5), mix(K.O, dockSky, 0.5)], count: 2, y: 128 }),
        P.sea({ y: 127, colors: [mix(K.C, K.w, 0.4), K.c, K.A, K.w], sparkle: K.w, sparkleX: 400 }),
      ),
    },
    { speed: 0.22, paint: P.stack(P.cranes({ color: mix(K.r, dockSky, 0.2), count: 2, h: [70, 80], baseY: 150, cab: K.O, light: K.Y }), P.containers({ colors: [K.r, K.b, K.O, K.D, K.G], count: 4, stack: [1, 3], baseY: 152, haze: [dockSky, 0.25] })) },
    {
      speed: 0.4,
      paint: P.stack(
        P.containers({ colors: [K.r, K.b, K.O, K.D, K.G], count: 2, stack: [1, 3], baseY: 164 }),
        P.lampPosts({ color: K.d, light: K.g, bulb: K.Y, count: 2, h: 60, style: 'lantern', offset: 200 }),
      ),
    },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.crate, 3], [SPR.barrel, 2], [SPR.fishBox, 2], [SPR.rope, 2], [SPR.bollard, 2]], count: 8, baseY: 162 }) },
  ],
  ground: P.planks({ colors: [K.T, K.J, K.N, K.k], depth: 22, under: 'water', water: [K.C, K.A, K.B], posts: K.N }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.bollard, 2], [SPR.rope, 1]], count: 2, baseY: 224 }) },
  families: ['street', 'strays'],
  boss: 'goose',
  hazard: { name: 'SEA SPRAY', every: 3, desc: 'WASHES AWAY YOUR BLOCK', kind: 'sprinkler', power: 3 },
};

// ---------------------------------------------------------------- JUNKYARD (hot afternoon)
const junkHaze = '#f0b070';
const junkyard: ThemeDef = {
  id: 'junkyard',
  name: 'JUNKYARD',
  tier: 1,
  sky: ['#b13e53', '#ef7d57', '#ffcd75', '#fff3b0'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 150, y: 70, r: 22, color: K.Y, glow: K.y, glowR: 40 }) },
    { speed: 0.08, paint: P.junkPiles({ colors: [mix(K.n, junkHaze, 0.6), mix(K.g, junkHaze, 0.6), mix(K.r, junkHaze, 0.6)], base: mix(K.U, junkHaze, 0.55), shade: mix(K.N, junkHaze, 0.5), count: 4, h: [30, 55], w: [90, 150], baseY: 166 }) },
    { speed: 0.2, paint: P.cranes({ color: mix(K.N, junkHaze, 0.3), count: 1, h: [80, 90], baseY: 160, cab: mix(K.O, junkHaze, 0.2) }) },
    { speed: 0.3, paint: P.junkPiles({ colors: [K.n, K.g, K.r, K.b, K.D, K.l, K.O], base: K.U, shade: K.N, count: 3, h: [36, 56], w: [80, 120], baseY: 166 }) },
    { speed: 0.5, paint: P.fence({ style: 'chain', colors: [K.l, K.g, K.d], h: 40, baseY: 164 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.tire, 3], [SPR.barrel, 2], [SPR.car, 2], [SPR.trashCan, 1], [SPR.crate, 1]], count: 7, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.S, K.n, K.n], body: K.N, deep: K.j, edge: 'ragged', edgeColor: K.n, stones: [K.g, K.l, K.d], specks: [[K.U, 20], [K.l, 6], [K.r, 3]] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.tire, 2], [SPR.barrel, 1]], count: 2, baseY: 224 }) },
  weather: { kind: 'dust', density: 24, colors: [K.s, K.T] },
  light: 0xffe0c0,
  families: ['street', 'strays'],
  boss: 'van',
  hazard: { name: 'CAR CRUSHER', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 4 },
};

// ---------------------------------------------------------------- NIGHT MARKET
const night_market: ThemeDef = {
  id: 'night_market',
  name: 'NIGHT MARKET',
  tier: 1,
  sky: ['#0e0f1a', '#3b1f5c', '#7a4a8f'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 50, colors: [K.w, K.l], y: [0, 80] }), P.moon({ x: 60, y: 30, r: 10, color: K.Y, shade: K.s, craters: K.s, glow: K.e })) },
    { speed: 0.1, paint: P.skyline({ color: mix(K.u, K.e, 0.3), edge: mix(K.e, K.P, 0.2), win: [mix(K.y, K.e, 0.3)], lit: 0.3, h: [50, 100], bw: [14, 30], baseY: 166, beacon: K.r }) },
    { speed: 0.22, paint: P.stack(P.temples({ style: 'pagoda', colors: [mix(K.R, K.e, 0.2), K.R, mix(K.R, K.k, 0.4), K.I], count: 1, scale: [1, 1.1], baseY: 168, windows: K.y }), P.neonSigns({ count: 4, colors: [K.h, K.C, K.y, K.L], y: [60, 100], vertical: 0.6 })) },
    { speed: 0.38, paint: P.stringLights({ y: 56, sag: 18, span: 128, colors: [K.r, K.r, K.O], wire: K.k, lanterns: true, glow: true }) },
    { speed: 0.55, paint: P.stalls({ awnings: [[K.r, K.Q], [K.O, K.y], [K.D, K.Q], [K.M, K.P]], wood: [K.T, K.n, K.N], goods: [K.r, K.O, K.y, K.L, K.P, K.C], lantern: K.r, count: 3, glow: K.O }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.basket, 3], [SPR.crate, 2], [SPR.lantern, 2], [SPR.bag, 1]], count: 7, baseY: 162 }) },
  ],
  ground: P.cobbles({ colors: [mix(K.T, K.e, 0.45), mix(K.n, K.e, 0.5), mix(K.u, K.k, 0.4)] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.basket, 1], [SPR.crate, 1]], count: 2, baseY: 224 }) },
  weather: { kind: 'embers', density: 14, colors: [K.O, K.y] },
  light: 0xffd8c0,
  families: ['street', 'strays'],
  boss: 'rat_king',
  hazard: { name: 'GRILL SMOKE', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 3 },
};

export const TIER_1: ThemeDef[] = [street, alley, park, garage, rooftops, subway, sewers, docks, junkyard, night_market];
