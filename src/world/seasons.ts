// Holiday overlays. During its dates a season dresses up whichever theme you are in:
// a props layer just behind the actors, sometimes a front layer, weather and a sky tint.
// The list is ordered so shorter, more specific holidays come first: when two overlap
// (lunar/valentine, easter/kingsday) the first match should win.
import type { SeasonDef, Painter } from './types';
import * as P from './painters';
import { PAL as K, SPR } from './painters';
import type { Sprite } from './painters';

// ---------------------------------------------------------------- sprites

const SNOWMAN = [
  '......kkkk......',
  '.....kNNNNk.....',
  '....kkkkkkkk....',
  '.....kwwwwk.....',
  '....kwkwwkwk....',
  '....kwwwowwk....',
  '....kwwwwwlk....',
  '...rrrrrrrrrk...',
  '...kkwwwwwrrk...',
  'N.kwwwwkwwwwlk.N',
  '.NkwwwwwwwwwlkN.',
  '..kwwwwkwwwwlk..',
  '.kwwwwwwwwwwwlk.',
  'kwwwwwwkwwwwwllk',
  'kwwwwwwwwwwwwllk',
  'kiwwwwwwwwwwwllk',
  '.kiiwwwwwwwwllk.',
  '..kkkkkkkkkkkk..',
];
const PUMPKIN = [
  '.......kk.......',
  '......kFk.......',
  '...kkkkFkkkkk...',
  '..kooOoooOooRk..',
  '.kooOoooooOooRk.',
  'kooykyoooykyooRk',
  'kooyyyooooyyyoRk',
  'koOoooykyooooORk',
  'kooykoooooookyRk',
  'koOyyykykyyyyoRk',
  '.kooyyyyyyyyoRk.',
  '..kRoooOoooRRk..',
  '...kkkkkkkkkk...',
];
const BAT = [
  'k.............k',
  'kk....k.k....kk',
  'kkk...kkk...kkk',
  'kkkkk.krk.kkkkk',
  'kkkkkkkkkkkkkkk',
  '.kkkkkkkkkkkkk.',
  '..k.kk.k.kk.k..',
  '.......k.......',
];
const HEART = ['.kk.kk.', 'khhkhhk', 'khwhhhk', 'khhhhhk', '.khhhk.', '..khk..', '...k...'];
const CLOVER = ['.kk.kk.', 'kGGkGGk', 'kGLGGGk', '.kGGGk.', 'kGGkGGk', 'kGGkGGk', '.kk.kk.', '...k...', '..k....'];

function present(ctx: CanvasRenderingContext2D, x: number, base: number, r: () => number) {
  const [c, rib] = P.pick(r, [[K.r, K.y], [K.G, K.r], [K.b, K.w], [K.v, K.Y], [K.O, K.G]] as Array<[string, string]>);
  const w = P.ri(r, 10, 15);
  const h = P.ri(r, 8, 13);
  P.bevel(ctx, x, base - h, w, h, c, K.k);
  P.rect(ctx, x + Math.floor(w / 2) - 1, base - h, 2, h, rib);
  P.rect(ctx, x, base - h + Math.floor(h / 2) - 1, w, 2, rib);
  P.rect(ctx, x + Math.floor(w / 2) - 4, base - h - 3, 3, 3, rib);
  P.rect(ctx, x + Math.floor(w / 2) + 1, base - h - 3, 3, 3, rib);
}
function egg(ctx: CanvasRenderingContext2D, x: number, base: number, r: () => number) {
  const [c, s] = P.pick(r, [[K.P, K.w], [K.C, K.y], [K.L, K.v], [K.y, K.h], [K.v, K.Y]] as Array<[string, string]>);
  P.ellipse(ctx, x + 4, base - 6, 5, 7, K.k, base);
  P.ellipse(ctx, x + 4, base - 6, 4, 6, c, base - 1);
  P.rect(ctx, x + 1, base - 7, 7, 1, s);
  for (let i = 1; i < 8; i += 2) P.px(ctx, x + i, base - 4, s);
  P.px(ctx, x + 2, base - 10, K.w);
}
function balloon(ctx: CanvasRenderingContext2D, x: number, base: number, r: () => number) {
  const c = P.pick(r, [K.O, K.o, K.O, K.w, K.b]);
  const y = base - P.ri(r, 40, 70);
  P.line(ctx, x + 4, y + 8, x + 4 + P.ri(r, -3, 3), base, K.d);
  P.ellipse(ctx, x + 4, y, 5, 6, K.k);
  P.ellipse(ctx, x + 4, y, 4, 5, c);
  P.px(ctx, x + 2, y - 3, K.w);
  P.px(ctx, x + 4, y + 6, c);
}
function coins(ctx: CanvasRenderingContext2D, x: number, base: number, r: () => number) {
  const pot = r() < 0.4;
  if (pot) {
    P.ellipse(ctx, x + 8, base - 6, 8, 6, K.k, base);
    P.ellipse(ctx, x + 8, base - 6, 7, 5, K.d, base - 1);
    P.rect(ctx, x + 1, base - 13, 14, 3, K.k);
    for (let i = 0; i < 6; i++) P.disc(ctx, x + 3 + i * 2, base - 14 - (i % 2), 2, i % 2 ? K.O : K.y);
  } else {
    const n = P.ri(r, 2, 5);
    for (let i = 0; i < n; i++) {
      P.rect(ctx, x, base - 2 - i * 2, 7, 2, K.k);
      P.rect(ctx, x + 1, base - 2 - i * 2, 5, 1, K.y);
      P.rect(ctx, x + 1, base - 1 - i * 2, 5, 1, K.O);
    }
  }
}
const mapSprite = (m: string[]): Sprite => (ctx, x, by) => P.drawMap(ctx, m, x, by - m.length);

// Things that hang in the air, placed at random heights (bats, hearts, clovers).
function flyers(map: string[], count: number, y: [number, number]): Painter {
  return (ctx, w, _h, rnd) => {
    for (const x of P.spread(rnd, w, count, 1)) {
      const yy = P.ri(rnd, y[0], y[1]);
      const flip = rnd() < 0.5;
      P.wrap(w, x, (xx) => P.drawMap(ctx, map, xx, yy, { flip }));
    }
  };
}

// ---------------------------------------------------------------- seasons

const christmas: SeasonDef = {
  id: 'christmas',
  name: 'TRASHMAS',
  from: [12, 1],
  to: [1, 6],
  props: {
    speed: 0.8,
    paint: P.stack(
      P.stringLights({ y: 34, sag: 22, span: 128, colors: [K.r, K.y, K.G, K.c, K.h], wire: K.F, glow: true }),
      P.scatter({ items: [[present as Sprite, 4], [mapSprite(SNOWMAN), 2], [SPR.lantern, 1]], count: 6, baseY: 162 }),
    ),
  },
  front: {
    speed: 1.35,
    paint: (ctx, w, _h, rnd) => {
      // snow drifts along the bottom edge
      for (const x of P.spread(rnd, w, 3, 1)) {
        const rx = P.ri(rnd, 14, 26);
        P.wrap(w, x, (xx) => {
          P.ellipse(ctx, xx, 217, rx + 1, 7, K.l);
          P.ellipse(ctx, xx, 217, rx, 6, K.w);
          P.ellipse(ctx, xx - 3, 214, Math.round(rx * 0.5), 2, K.w);
          P.ditherRect(ctx, xx - rx + 4, 214, rx, 2, K.i, 0.5);
        });
      }
    },
  },
  weather: { kind: 'snow', density: 50, colors: [K.w, K.i] },
  skyTint: K.i,
  banner: 'MERRY TRASHMAS!',
};

const halloween: SeasonDef = {
  id: 'halloween',
  name: 'HALLOWEEN',
  from: [10, 15],
  to: [11, 2],
  props: {
    speed: 0.8,
    paint: P.stack(
      flyers(BAT, 5, [16, 70]),
      P.stringLights({ y: 40, sag: 16, span: 170, colors: [K.O, K.v, K.O, K.L], wire: K.k, flags: true }),
      P.scatter({ items: [[mapSprite(PUMPKIN), 4], [SPR.candle, 2], [SPR.grave, 1]], count: 6, baseY: 162 }),
    ),
  },
  weather: { kind: 'leaves', density: 20, colors: [K.O, K.o, K.v] },
  skyTint: '#7a4a8f',
  banner: 'HAPPY HALLOWEEN!',
};

const valentine: SeasonDef = {
  id: 'valentine',
  name: "VALENTINE'S",
  from: [2, 7],
  to: [2, 15],
  props: {
    speed: 0.8,
    paint: P.stack(flyers(HEART, 7, [20, 100]), P.stringLights({ y: 36, sag: 14, span: 128, colors: [K.h, K.r, K.P, K.w], wire: K.M, flags: true })),
  },
  weather: { kind: 'petals', density: 30, colors: [K.P, K.h, K.w] },
  skyTint: K.h,
  banner: 'BE MY VALENTRASH!',
};

const stpatrick: SeasonDef = {
  id: 'stpatrick',
  name: "ST PATRICK'S",
  from: [3, 10],
  to: [3, 18],
  props: {
    speed: 0.8,
    paint: P.stack(
      flyers(CLOVER, 6, [20, 90]),
      P.stringLights({ y: 38, sag: 14, span: 128, colors: [K.G, K.w, K.O], wire: K.F, flags: true }),
      P.scatter({ items: [[coins as Sprite, 3], [mapSprite(CLOVER), 2]], count: 6, baseY: 162 }),
    ),
  },
  weather: { kind: 'petals', density: 16, colors: [K.G, K.L, K.y] },
  skyTint: K.G,
  banner: 'LUCKY TRASH DAY!',
};

const kingsday: SeasonDef = {
  id: 'kingsday',
  name: "KING'S DAY",
  from: [4, 20],
  to: [4, 28],
  props: {
    speed: 0.8,
    paint: P.stack(
      P.stringLights({ y: 30, sag: 18, span: 128, colors: [K.O, K.O, K.r, K.w, K.b], wire: K.k, flags: true }),
      P.stringLights({ y: 60, sag: 12, span: 170, colors: [K.O], wire: K.k, flags: true, every: 7 }),
      P.scatter({ items: [[balloon as Sprite, 3], [SPR.crate, 1], [SPR.basket, 1]], count: 6, baseY: 162 }),
    ),
  },
  weather: { kind: 'petals', density: 20, colors: [K.O, K.o, K.w] },
  skyTint: K.O,
  banner: 'HAPPY KINGS DAY!',
};

const easter: SeasonDef = {
  id: 'easter',
  name: 'EASTER',
  from: [3, 22],
  to: [4, 25],
  props: {
    speed: 0.8,
    paint: P.stack(
      P.stringLights({ y: 36, sag: 14, span: 128, colors: [K.P, K.C, K.Y, K.L, K.v], wire: K.F, flags: true }),
      P.scatter({ items: [[egg as Sprite, 4], [SPR.flowers, 3]], count: 8, baseY: 162 }),
    ),
  },
  front: { speed: 1.35, paint: P.grass({ colors: [K.F, K.G, K.L], count: 5, h: [8, 14], baseY: 218, flowers: [K.P, K.Y, K.w, K.v] }) },
  weather: { kind: 'petals', density: 18, colors: [K.P, K.Y, K.w] },
  skyTint: K.m,
  banner: 'HOPPY EASTER!',
};

const lunar: SeasonDef = {
  id: 'lunar',
  name: 'LUNAR NEW YEAR',
  from: [1, 20],
  to: [2, 20],
  props: {
    speed: 0.8,
    paint: P.stack(
      P.stringLights({ y: 26, sag: 20, span: 128, colors: [K.r, K.r, K.O], wire: K.k, lanterns: true, glow: true }),
      P.scatter({ items: [[SPR.lantern, 2], [SPR.basket, 1]], count: 3, baseY: 162 }),
    ),
  },
  weather: { kind: 'sparks', density: 20, colors: [K.y, K.O, K.r] },
  skyTint: K.r,
  banner: 'HAPPY LUNAR NEW YEAR!',
};

const summer: SeasonDef = {
  id: 'summer',
  name: 'SUMMER',
  from: [7, 1],
  to: [8, 31],
  props: {
    speed: 0.8,
    paint: P.stack(
      P.stringLights({ y: 34, sag: 16, span: 170, colors: [K.c, K.y, K.h, K.L, K.w], wire: K.k, flags: true }),
      P.scatter({ items: [[SPR.ball, 3], [SPR.umbrella, 2], [SPR.shell, 1]], count: 5, baseY: 162 }),
    ),
  },
  skyTint: K.Y,
  banner: 'SUMMER VIBES!',
};

export const SEASONS: SeasonDef[] = [christmas, halloween, valentine, stpatrick, kingsday, easter, lunar, summer];
