// Tier 4: STRANGE. Places that should not exist.
import type { ThemeDef, Painter } from '../types';
import * as P from '../painters';
import { PAL as K, SPR, mix } from '../painters';

// ---------------------------------------------------------------- MUSHROOM KINGDOM
const shroomSky = '#c8f0e0';
const mushroom: ThemeDef = {
  id: 'mushroom',
  name: 'MUSHROOM KINGDOM',
  tier: 4,
  sky: ['#3b5dc9', '#41a6f6', '#9be2b0'],
  layers: [
    { speed: 0.03, paint: P.clouds({ count: 5, y: [24, 70], size: [36, 70], colors: [K.w, mix(K.C, K.l, 0.4), K.w] }) },
    { speed: 0.08, paint: P.stack(P.hills({ color: mix(K.G, shroomSky, 0.45), light: mix(K.L, shroomSky, 0.4), y: 112, amp: 16, cycles: [[2, 1], [3, 0.6], [7, 0.2]], band: 4 }), P.mushrooms({ stem: [mix(K.Q, shroomSky, 0.4), mix(K.T, shroomSky, 0.4)], caps: [[mix(K.r, shroomSky, 0.45), mix(K.P, shroomSky, 0.4), mix(K.R, shroomSky, 0.45)], [mix(K.v, shroomSky, 0.45), mix(K.P, shroomSky, 0.4), mix(K.e, shroomSky, 0.45)]], spots: mix(K.w, shroomSky, 0.3), count: 7, h: [18, 34], r: [8, 14], baseY: 134 })) },
    { speed: 0.18, paint: P.mushrooms({ stem: [mix(K.Q, shroomSky, 0.2), mix(K.T, shroomSky, 0.25)], caps: [[mix(K.O, shroomSky, 0.25), mix(K.y, shroomSky, 0.2), mix(K.o, shroomSky, 0.3)], [mix(K.c, shroomSky, 0.25), mix(K.C, shroomSky, 0.2), mix(K.b, shroomSky, 0.3)], [mix(K.h, shroomSky, 0.25), mix(K.P, shroomSky, 0.2), mix(K.M, shroomSky, 0.3)]], spots: K.w, count: 6, h: [40, 70], r: [14, 22], baseY: 166 }) },
    { speed: 0.36, paint: P.mushrooms({ stem: [K.Q, K.T], caps: [[K.r, K.P, K.R]], spots: K.w, gills: K.T, count: 2, h: [70, 100], r: [26, 34], baseY: 168, outline: K.k }) },
    { speed: 0.55, paint: P.stack(P.bushes({ colors: [K.F, K.G, K.L], count: 5, r: [6, 10], baseY: 165, outline: K.k, dots: [K.y, K.w] }), P.mushrooms({ stem: [K.Q, K.T], caps: [[K.v, K.P, K.e], [K.O, K.y, K.o]], spots: K.Q, count: 4, h: [10, 18], r: [6, 9], baseY: 165, outline: K.k })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.shroom, 4], [SPR.flowers, 2], [SPR.rock, 1]], count: 7, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.L, K.G, K.G, K.F], body: K.n, deep: K.N, edge: 'lumpy', edgeColor: K.F, edgeDepth: 5, blades: K.L, specks: [[K.N, 20], [K.T, 8], [K.r, 3], [K.w, 3]], stones: [K.T, K.Q, K.N] }),
  front: { speed: 1.35, paint: P.mushrooms({ stem: [K.T, K.n], caps: [[K.R, K.r, K.p]], spots: K.P, count: 2, h: [12, 20], r: [9, 13], baseY: 224, outline: K.k }) },
  weather: { kind: 'spores', density: 24, colors: [K.Y, K.P, K.w] },
  families: ['fungi', 'bugs'],
  boss: 'mushroom_queen',
  hazard: { name: 'SPORE CLOUD', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 5 },
};

// ---------------------------------------------------------------- CRYSTAL CAVES
const caveDark = '#1d1838';
const crystal_caves: ThemeDef = {
  id: 'crystal_caves',
  name: 'CRYSTAL CAVES',
  tier: 4,
  sky: ['#0e0f1a', '#3b1f5c', '#24305e'],
  layers: [
    { speed: 0.04, paint: P.stack(P.hills({ color: mix(caveDark, K.e, 0.45), light: mix(K.e, K.v, 0.3), y: 96, amp: 26, cycles: [[2, 1], [5, 0.6], [11, 0.3]] }), P.crystals({ sets: [[mix(K.v, caveDark, 0.25), mix(K.e, caveDark, 0.25), mix(K.u, caveDark, 0.2)], [mix(K.t, caveDark, 0.3), mix(K.D, caveDark, 0.25), mix(K.B, caveDark, 0.2)]], count: 9, h: [30, 56], baseY: 168 }), P.mist({ color: mix(K.e, caveDark, 0.4), y: 130, h: 30, solid: 10, d: 0.6 })) },
    { speed: 0.12, paint: P.stack(P.ceiling({ colors: [mix(caveDark, K.k, 0.3), mix(K.e, caveDark, 0.3), K.H], y: 38, amp: 14, stalactites: 16, len: [10, 30] }), P.crystals({ sets: [[mix(K.C, caveDark, 0.15), mix(K.t, caveDark, 0.15), mix(K.D, caveDark, 0.15)], [mix(K.h, caveDark, 0.15), mix(K.M, caveDark, 0.15), mix(K.p, caveDark, 0.15)]], count: 7, h: [20, 40], hang: true, hangY: 30, glow: true })) },
    { speed: 0.24, paint: P.crystals({ sets: [[K.C, K.t, K.D], [K.P, K.h, K.M], [K.v, K.e, K.u]], count: 5, h: [50, 80], baseY: 168, glow: true }) },
    { speed: 0.42, paint: P.stack(P.rocks({ colors: [mix(K.e, K.d, 0.5), K.d, K.H], count: 4, size: [10, 16], baseY: 166, outline: K.k }), P.crystals({ sets: [[K.i, K.C, K.t], [K.h, K.M, K.p]], count: 3, h: [20, 34], baseY: 166, glow: true, outline: K.k })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.gem, 4], [SPR.rock, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.e, K.u, K.u], body: K.H, deep: K.k, edge: 'ragged', edgeColor: K.u, specks: [[K.u, 20], [K.C, 4], [K.h, 4]], stones: [K.e, K.v, K.u], stoneCount: 10 }),
  front: { speed: 1.35, paint: P.stack(P.crystals({ sets: [[K.C, K.t, K.D]], count: 2, h: [18, 26], baseY: 222, outline: K.k }), P.crystals({ sets: [[K.u, K.H, K.k]], count: 3, h: [10, 18], hang: true, hangY: 0 })) },
  weather: { kind: 'sparks', density: 18, colors: [K.C, K.h, K.w] },
  light: 0xd0c8ff,
  families: ['fungi', 'machines'],
  boss: 'crystal_golem',
  hazard: { name: 'CAVE-IN', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 5 },
};

// ---------------------------------------------------------------- CANDY LAND
const candySky = '#ffd8e8';
const candy: ThemeDef = {
  id: 'candy',
  name: 'CANDY LAND',
  tier: 4,
  sky: ['#c0398e', '#ff77c8', '#f5a5b8', '#fff6e0'],
  layers: [
    { speed: 0.02, paint: P.rainbow({ x: 300, y: 150, r: 110, band: 4, colors: [mix(K.r, candySky, 0.3), mix(K.o, candySky, 0.3), mix(K.y, candySky, 0.3), mix(K.L, candySky, 0.3), mix(K.c, candySky, 0.3), mix(K.v, candySky, 0.3)] }) },
    { speed: 0.05, paint: P.clouds({ count: 5, y: [24, 80], size: [40, 80], colors: [K.Q, K.P, K.w] }) },
    { speed: 0.1, paint: P.hills({ color: mix(K.m, candySky, 0.3), light: K.w, y: 118, amp: 14, cycles: [[3, 1], [5, 0.4]], band: 3, specks: mix(K.h, candySky, 0.2) }) },
    { speed: 0.2, paint: P.stack(P.hills({ color: mix(K.P, candySky, 0.2), light: K.Q, y: 136, amp: 8, cycles: [[4, 1], [9, 0.3]], specks: K.C }), P.lollipops({ colors: [[mix(K.r, candySky, 0.3), mix(K.w, candySky, 0.2)], [mix(K.v, candySky, 0.3), mix(K.Y, candySky, 0.2)], [mix(K.G, candySky, 0.3), mix(K.Y, candySky, 0.2)]], count: 5, h: [20, 34], r: [7, 10], baseY: 144 })) },
    { speed: 0.36, paint: P.candyCanes({ colors: [K.r, K.w], count: 3, h: [60, 90], thick: 5, outline: K.R }) },
    { speed: 0.55, paint: P.lollipops({ colors: [[K.h, K.w], [K.c, K.Y], [K.O, K.Y]], count: 3, h: [30, 44], r: [9, 13], baseY: 166, outline: K.k }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.gumdrop, 4], [SPR.cupcake, 2]], count: 7, baseY: 162 }) },
  ],
  ground: P.candyFloor({ frosting: [K.w, K.P], cake: [K.T, K.n, K.N], sprinkles: [K.r, K.y, K.C, K.L, K.v, K.h] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.gumdrop, 2], [SPR.cupcake, 1]], count: 3, baseY: 222 }) },
  weather: { kind: 'petals', density: 20, colors: [K.h, K.C, K.Y, K.L] },
  light: 0xfff0f8,
  families: ['fungi', 'spooks'],
  boss: 'swamp_witch',
  hazard: { name: 'SUGAR CRASH', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 5 },
};

// ---------------------------------------------------------------- HAUNTED FOREST
const ghostFog = '#6a5a90';
const haunted: ThemeDef = {
  id: 'haunted',
  name: 'HAUNTED FOREST',
  tier: 4,
  sky: ['#0e0f1a', '#3b1f5c', '#5d4a8a'],
  layers: [
    { speed: 0.02, paint: P.stack(P.stars({ count: 40, colors: [K.l, K.v], y: [0, 80] }), P.moon({ x: 300, y: 56, r: 26, color: K.Y, shade: K.s, craters: mix(K.s, K.T, 0.5), glow: K.e })) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [40, 80], size: [80, 140], colors: [mix(K.u, K.e, 0.4), K.u, mix(K.e, K.l, 0.3)], style: 'streak' }) },
    { speed: 0.1, paint: P.stack(P.hills({ color: mix(K.u, ghostFog, 0.4), y: 130, amp: 10 }), P.mansions({ colors: [mix(K.u, K.H, 0.4), mix(K.H, K.u, 0.3), K.H], window: [K.y, mix(K.u, K.H, 0.5)], count: 1, scale: 0.9, baseY: 136 })) },
    { speed: 0.18, paint: P.stack(P.branchy({ color: mix(K.u, ghostFog, 0.3), count: 8, h: [80, 110], thick: 3, depth: 4, spread: 0.7 }), P.mist({ color: ghostFog, y: 136, h: 20, solid: 20, d: 0.6 })) },
    { speed: 0.34, paint: P.branchy({ color: K.H, light: K.u, count: 3, h: [120, 150], thick: 6, depth: 5, spread: 0.7 }) },
    { speed: 0.55, paint: P.stack(P.fence({ style: 'iron', colors: [K.e, K.u, K.H], h: 22, baseY: 164 }), P.scatter({ items: [[SPR.grave, 1]], count: 6, baseY: 165 })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.grave, 3], [SPR.pumpkin, 1], [SPR.candle, 2], [SPR.skull, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.soil({ top: [mix(K.F, K.u, 0.4), mix(K.E, K.u, 0.4), K.H], body: mix(K.j, K.u, 0.4), deep: K.H, edge: 'ragged', edgeColor: K.H, specks: [[K.u, 20], [K.e, 6]], stones: [K.g, K.l, K.d], stoneCount: 6 }),
  front: { speed: 1.35, paint: P.stack(P.grass({ colors: [K.H, K.k, K.H], count: 4, h: [16, 28], baseY: 220, blades: [5, 8], width: 2 }), P.vines({ colors: [K.H, K.u], count: 3, len: [8, 18] })) },
  weather: { kind: 'spores', density: 16, colors: [K.m, K.v] },
  light: 0xb8b0e8,
  families: ['spooks'],
  boss: 'swamp_witch',
  hazard: { name: 'GHOST CHILL', every: 3, desc: 'WEAKENS EVERYONE', kind: 'spores', power: 5 },
};

// ---------------------------------------------------------------- CLOCKWORK FACTORY
const brassHaze = '#7a4a33';
const clockwork: ThemeDef = {
  id: 'clockwork',
  name: 'CLOCKWORK WORKS',
  tier: 4,
  sky: ['#1a1c2c', '#5c3a2e', '#b88a4a'],
  layers: [
    { speed: 0.04, paint: P.gears({ colors: [mix(K.S, brassHaze, 0.5), mix(K.n, brassHaze, 0.5), mix(K.N, brassHaze, 0.5)], count: 5, r: [24, 40], y: [40, 120] }) },
    { speed: 0.1, paint: P.stack(P.pipes({ colors: [mix(K.s, brassHaze, 0.4), mix(K.S, brassHaze, 0.4), mix(K.n, brassHaze, 0.4)], rows: [[26, 6], [90, 4]], verticals: 4, flange: mix(K.N, brassHaze, 0.3) }), P.mist({ color: mix(K.T, brassHaze, 0.5), y: 120, h: 30, solid: 20, d: 0.5 })) },
    { speed: 0.2, paint: P.gears({ colors: [K.y, K.O, K.n], count: 4, r: [14, 24], y: [60, 120], outline: K.N }) },
    { speed: 0.34, paint: P.columns({ colors: [K.s, K.S, K.n], count: 2, width: 12, ibeam: true, outline: K.N, top: 0 }) },
    { speed: 0.5, paint: P.stack(P.pipes({ colors: [K.y, K.O, K.n], rows: [[138, 6]], verticals: 2, flange: K.N, valve: K.r }), P.gears({ colors: [K.l, K.g, K.d], count: 3, r: [8, 12], y: [128, 140], outline: K.k })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.barrel, 2], [SPR.crate, 2], [SPR.terminal, 1]], count: 5, baseY: 162 }) },
  ],
  ground: P.metalFloor({ colors: [K.s, K.S, K.N], hazard: [K.O, K.k], grate: true }),
  front: { speed: 1.35, paint: P.gears({ colors: [K.S, K.n, K.N], count: 1, r: [18, 22], y: [222, 226], outline: K.k }) },
  weather: { kind: 'sparks', density: 16, colors: [K.y, K.O, K.Y] },
  light: 0xffe0b8,
  families: ['machines'],
  boss: 'clockwork_mech',
  hazard: { name: 'LOOSE GEARS', every: 3, desc: 'A GEAR FALLS ON SOMEONE', kind: 'pot', power: 5 },
};

// ---------------------------------------------------------------- TOY BOX (a kid's bedroom)
const wallpaper: Painter = (ctx, w, h) => {
  P.wall({ style: 'plank', colors: [mix(K.m, K.t, 0.3), mix(K.m, K.w, 0.4), mix(K.t, K.D, 0.3)], y: 0, bottom: h, holes: { count: 2, w: [70, 70], h: [56, 56], y: [22, 22], frame: K.w } })(ctx, w, h, () => 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let y = 8; y < 150; y += 16)
    for (let x = ((y / 16) % 2) * 8; x < w; x += 16) {
      const c = (x + y) % 32 === 0 ? K.w : K.y;
      P.rect(ctx, x + 1, y, 1, 3, c);
      P.rect(ctx, x, y + 1, 3, 1, c);
    }
  ctx.restore();
  P.rect(ctx, 0, 118, w, 6, K.w);
  P.rect(ctx, 0, 124, w, 1, mix(K.s, K.Q, 0.3));
};
const toybox: ThemeDef = {
  id: 'toybox',
  name: 'TOY BOX',
  tier: 4,
  sky: ['#3b5dc9', '#41a6f6', '#c7f2ff'],
  layers: [
    { speed: 0.02, paint: P.clouds({ count: 4, y: [40, 70], size: [30, 50], colors: [K.w, mix(K.l, K.C, 0.4), K.w] }) },
    { speed: 0.12, paint: P.haze('#e0d0c0', 0.25, P.stack(wallpaper, (ctx, w) => {
      // a shelf with toys on it
      P.rect(ctx, 0, 92, w, 4, K.n);
      P.rect(ctx, 0, 92, w, 1, K.T);
      P.rect(ctx, 0, 96, w, 1, K.N);
      for (let x = 30; x < w; x += 128) P.rect(ctx, x, 96, 3, 8, K.N);
    }, P.toyBlocks({ colors: [K.r, K.b, K.y, K.G], count: 3, size: [10, 12], baseY: 92 }), P.scatter({ items: [[SPR.robot, 1], [SPR.duck, 1], [SPR.ball, 1]], count: 4, baseY: 92 }))) },
    { speed: 0.24, paint: P.stack(P.toyBlocks({ colors: [mix(K.r, K.Q, 0.3), mix(K.b, K.Q, 0.3), mix(K.y, K.Q, 0.3), mix(K.G, K.Q, 0.3), mix(K.v, K.Q, 0.3)], count: 5, size: [14, 18], baseY: 166 }), P.candyCanes({ colors: [mix(K.b, K.Q, 0.3), mix(K.w, K.Q, 0.2)], count: 2, h: [50, 70], thick: 4 })) },
    { speed: 0.42, paint: P.toyBlocks({ colors: [K.r, K.b, K.y, K.G, K.O, K.v], count: 4, size: [20, 26], baseY: 166 }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.ball, 3], [SPR.duck, 2], [SPR.robot, 2]], count: 6, baseY: 162 }) },
  ],
  ground: P.planks({ colors: [K.T, K.s, K.S, K.n] }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.ball, 1], [SPR.duck, 1]], count: 2, baseY: 224 }) },
  families: ['machines', 'spooks'],
  boss: 'clockwork_mech',
  hazard: { name: 'TOY AVALANCHE', every: 3, desc: 'A BLOCK FALLS ON SOMEONE', kind: 'pot', power: 5 },
};

// ---------------------------------------------------------------- CLOUD KINGDOM
const cloudSky = '#e0f8ff';
const clouds: ThemeDef = {
  id: 'clouds',
  name: 'CLOUD KINGDOM',
  tier: 4,
  sky: ['#3b5dc9', '#41a6f6', '#c7f2ff', '#fff6e0'],
  layers: [
    { speed: 0.02, paint: P.stack(P.sun({ x: 400, y: 44, r: 14, color: K.Y, core: K.w, glow: K.Q, glowR: 28 }), P.rainbow({ x: 120, y: 160, r: 90, band: 3 })) },
    { speed: 0.05, paint: P.floatingIslands({ count: 3, y: [50, 80], w: [40, 60], grass: [mix(K.L, cloudSky, 0.4), mix(K.G, cloudSky, 0.4), mix(K.F, cloudSky, 0.4)], rock: [mix(K.T, cloudSky, 0.4), mix(K.n, cloudSky, 0.4), mix(K.N, cloudSky, 0.4)], trees: [mix(K.G, cloudSky, 0.4), mix(K.N, cloudSky, 0.4)], waterfall: mix(K.C, cloudSky, 0.3) }) },
    { speed: 0.1, paint: P.clouds({ count: 6, y: [130, 150], size: [80, 140], colors: [K.w, mix(K.C, K.l, 0.35), K.w] }) },
    { speed: 0.2, paint: P.stack(P.temples({ style: 'greek', colors: [K.w, mix(K.i, K.l, 0.3), mix(K.l, K.g, 0.4), K.y], count: 1, scale: [1, 1], baseY: 150 }), P.clouds({ count: 5, y: [150, 160], size: [70, 120], colors: [K.w, mix(K.i, K.l, 0.3), K.w] })) },
    { speed: 0.4, paint: P.pillars({ colors: [K.w, mix(K.i, K.l, 0.3), K.l], count: 2, h: [70, 90], broken: 0.3, arches: true }) },
    { speed: 0.8, paint: P.clouds({ count: 4, y: [160, 166], size: [30, 50], colors: [K.w, mix(K.C, K.l, 0.3), K.w] }) },
  ],
  ground: P.cloudFloor({ colors: [K.w, mix(K.i, K.w, 0.3), mix(K.C, K.l, 0.4), K.y] }),
  front: { speed: 1.35, paint: P.clouds({ count: 3, y: [214, 216], size: [40, 70], colors: [K.w, mix(K.i, K.l, 0.3), K.w] }) },
  weather: { kind: 'sparks', density: 14, colors: [K.Y, K.w] },
  families: ['spooks', 'machines'],
  boss: 'sky_kraken',
  hazard: { name: 'THUNDERCLOUD', every: 4, desc: 'LIGHTNING HITS SOMEONE', kind: 'lightning', power: 6 },
};

// ---------------------------------------------------------------- ANCIENT RUINS (violet dusk)
const ruinHaze = '#c088b8';
const ruins: ThemeDef = {
  id: 'ruins',
  name: 'ANCIENT RUINS',
  tier: 4,
  sky: ['#29366f', '#b05ccf', '#ffcd75'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 220, y: 116, r: 20, color: K.y, core: K.Y, glow: K.o }) },
    { speed: 0.05, paint: P.clouds({ count: 4, y: [30, 80], size: [70, 130], colors: [mix(K.P, K.o, 0.4), mix(K.e, K.p, 0.4), K.Y], style: 'streak' }) },
    { speed: 0.09, paint: P.stack(P.mountains({ color: mix(K.p, ruinHaze, 0.5), light: mix(K.e, ruinHaze, 0.4), peaks: 4, top: [86, 110], baseY: 170 }), P.temples({ style: 'ziggurat', colors: [mix(K.T, ruinHaze, 0.5), mix(K.S, ruinHaze, 0.5), mix(K.n, ruinHaze, 0.5)], count: 1, scale: [1.1, 1.1], baseY: 150 })) },
    { speed: 0.2, paint: P.pillars({ colors: [mix(K.T, ruinHaze, 0.3), mix(K.S, ruinHaze, 0.3), mix(K.n, ruinHaze, 0.3)], count: 5, h: [50, 80], broken: 0.5, arches: true, moss: mix(K.G, ruinHaze, 0.3) }) },
    { speed: 0.38, paint: P.stack(P.pillars({ colors: [K.Q, K.T, K.S], count: 2, h: [90, 120], width: 14, broken: 0.6, moss: K.G, outline: K.N }), P.vines({ colors: [K.F, K.G, K.L], count: 4, len: [20, 60], flowers: K.P })) },
    { speed: 0.6, paint: P.stack(P.bushes({ colors: [K.F, K.G, K.L], count: 4, r: [6, 9], baseY: 165 }), P.rocks({ colors: [K.T, K.S, K.n], count: 3, size: [6, 10], baseY: 165, outline: K.N, moss: K.G })) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.rock, 2], [SPR.skull, 1], [SPR.flowers, 1]], count: 4, baseY: 162 }) },
  ],
  ground: P.cobbles({ colors: [K.T, mix(K.S, K.T, 0.4), mix(K.S, K.n, 0.6)], size: [12, 20] }),
  front: { speed: 1.35, paint: P.stack(P.grass({ colors: [K.E, K.F, K.G], count: 4, h: [12, 22], baseY: 220 }), P.vines({ colors: [K.E, K.F, K.G], count: 3, len: [10, 24] })) },
  weather: { kind: 'dust', density: 14, colors: [K.y, K.Y] },
  light: 0xffe0e8,
  families: ['spooks', 'machines'],
  boss: 'crystal_golem',
  hazard: { name: 'CRUMBLING', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 5 },
};

// ---------------------------------------------------------------- LAVA FIELDS
const lavaHaze = '#5a2030';
const lava: ThemeDef = {
  id: 'lava',
  name: 'LAVA FIELDS',
  tier: 4,
  sky: ['#0e0f1a', '#6e1f2e', '#b13e53', '#ff4b1f'],
  layers: [
    { speed: 0.03, paint: P.clouds({ count: 5, y: [20, 70], size: [70, 140], colors: [mix(K.d, K.R, 0.4), mix(K.k, K.R, 0.3), mix(K.o, K.R, 0.5)], style: 'flat' }) },
    { speed: 0.07, paint: P.stack(P.mountains({ color: mix(K.k, lavaHaze, 0.5), light: mix(K.R, lavaHaze, 0.5), snow: K.q, snowShade: K.o, snowDepth: 4, peaks: 3, top: [60, 90], slope: [0.8, 1.2], baseY: 170 }), P.mist({ color: mix(K.r, K.o, 0.3), y: 130, h: 30, solid: 10, d: 0.5 })) },
    { speed: 0.16, paint: P.lavaFalls({ rock: [mix(K.R, K.k, 0.2), mix(K.k, K.R, 0.4), K.k], lava: [K.Y, K.q, K.R], count: 4, h: [50, 80], baseY: 168 }) },
    { speed: 0.32, paint: P.lavaFalls({ rock: [K.R, mix(K.d, K.R, 0.3), K.k], lava: [K.Y, K.O, K.q], count: 2, h: [80, 110], baseY: 168 }) },
    { speed: 0.55, paint: P.rocks({ colors: [K.R, mix(K.d, K.R, 0.4), K.k], count: 4, size: [8, 14], baseY: 166, outline: K.H }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.skull, 1], [SPR.rock, 2], [SPR.bone, 1]], count: 3, baseY: 162 }) },
  ],
  ground: P.lavaFloor({ rock: [mix(K.R, K.d, 0.4), K.d, K.H], lava: [K.Y, K.q] }),
  front: { speed: 1.35, paint: P.rocks({ colors: [K.d, K.H, K.k], count: 2, size: [12, 16], baseY: 230, outline: K.k }) },
  weather: { kind: 'embers', density: 30, colors: [K.q, K.O, K.y] },
  light: 0xffc0a8,
  families: ['spooks', 'machines'],
  boss: 'crystal_golem',
  hazard: { name: 'ERUPTION', every: 4, desc: 'EVERYONE TAKES DAMAGE', kind: 'quake', power: 6 },
};

// ---------------------------------------------------------------- BONEYARD
const boneHaze = '#a08090';
const boneyard: ThemeDef = {
  id: 'boneyard',
  name: 'BONEYARD',
  tier: 4,
  sky: ['#3b1f5c', '#7a4a8f', '#d6a77a'],
  layers: [
    { speed: 0.02, paint: P.sun({ x: 130, y: 96, r: 18, color: mix(K.y, K.P, 0.3), glow: mix(K.o, K.e, 0.4) }) },
    { speed: 0.06, paint: P.mesas({ colors: [mix(K.p, boneHaze, 0.5), mix(K.e, boneHaze, 0.4), mix(K.u, boneHaze, 0.5)], count: 3, top: [100, 120], w: [60, 110], baseY: 170, cliff: [10, 18] }) },
    { speed: 0.14, paint: P.stack(P.bones({ colors: [mix(K.Q, boneHaze, 0.45), mix(K.T, boneHaze, 0.45), mix(K.S, boneHaze, 0.45)], count: 3, scale: [1, 1.4], baseY: 166 }), P.mist({ color: mix(K.e, K.T, 0.4), y: 140, h: 16, solid: 10, d: 0.5 })) },
    { speed: 0.28, paint: P.stack(P.branchy({ color: mix(K.k, K.u, 0.4), count: 2, h: [70, 90], thick: 3, depth: 4 }), P.bones({ colors: [K.Q, K.T, K.S], count: 2, scale: [1.3, 1.6], baseY: 168, outline: K.N })) },
    { speed: 0.55, paint: P.bones({ colors: [K.Q, K.T, K.S], count: 2, scale: [0.6, 0.8], baseY: 166, outline: K.N }) },
    { speed: 0.8, paint: P.scatter({ items: [[SPR.skull, 2], [SPR.bone, 3], [SPR.rock, 1], [SPR.candle, 1]], count: 6, baseY: 162 }) },
  ],
  ground: P.soil({ top: [K.T, K.S, K.S], body: K.j, deep: K.H, edge: 'ragged', edgeColor: K.N, specks: [[K.Q, 12], [K.N, 20]], stones: [K.T, K.Q, K.S], stoneCount: 6 }),
  front: { speed: 1.35, paint: P.scatter({ items: [[SPR.skull, 1], [SPR.bone, 2]], count: 3, baseY: 222 }) },
  weather: { kind: 'ash', density: 20, colors: [K.l, K.T] },
  light: 0xe8d0d8,
  families: ['spooks'],
  boss: 'old_gator',
  hazard: { name: 'MIASMA', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 5 },
};

export const TIER_4: ThemeDef[] = [mushroom, crystal_caves, candy, haunted, clockwork, toybox, clouds, ruins, lava, boneyard];
