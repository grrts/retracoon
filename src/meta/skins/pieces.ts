// Reusable outfit pieces. Templates use placeholder characters that are swapped for
// palette keys: '#' main, '+' second, '*' accent, '@' highlight, '%' shade.
// Positions are given in base-pose pixels (see gfx/coon.ts) and converted to anchor offsets.
import type { Gear } from '../../content/types';
import { at, cut, hood, suit, recolor, inHead, isFur, baseAt, type SuitOpts } from './util';

export type Cols = { '#'?: string; '+'?: string; '*'?: string; '@'?: string; '%'?: string };
const rc = (rows: string[], c: Cols) => recolor(rows, c as Record<string, string>);

// ================================================================ head

export const topHat = (main: string, band: string, hi = main): Gear =>
  at('head', 16, -4, rc([
    '...kkkkkkkk...',
    '...k@#####k...',
    '...k@#####k...',
    '...k@#####k...',
    '...k++++++k...',
    'kkkk@#####kkkk',
    'k@@@@#######%k',
    '.kkkkkkkkkkkk.',
  ], { '#': main, '+': band, '@': hi, '%': main }));

export const cap = (main: string, bill: string, hi = main, logo?: string): Gear =>
  at('head', 16, -1, rc([
    '....kkkkkk.........',
    '..kk@@####kk.......',
    '.k@@####*###k......',
    'k@##########k......',
    'k###########kkkkk..',
    'kkkkkkkkkkkk+++++k.',
    '............kkkkk..',
  ], { '#': main, '+': bill, '@': hi, '*': logo ?? main }));

// Cap worn backwards: the bill sticks out at the back of the head.
export const capBack = (main: string, bill: string, hi = main): Gear =>
  at('head', 12, -1, rc([
    '........kkkkkk.....',
    '......kk@@####kk...',
    '.....k@@#######k...',
    '....k@#########k...',
    'kkkkk##########k...',
    'k++++kkkkkkkkkkkk..',
    '.kkkk..............',
  ], { '#': main, '+': bill, '@': hi }));

export const beanie = (main: string, stripe: string, pom?: string): Gear =>
  at('head', 16, -3, rc([
    pom ? '.....kkk......' : '..............',
    pom ? '....k*@*k.....' : '..............',
    '....kk*kkk....',
    '..kk######kk..',
    '.k@#########k.',
    'k@###########k',
    'k++++++++++++k',
    'kkkkkkkkkkkkkk',
  ], { '#': main, '+': stripe, '@': main, '*': pom ?? main }));

export const crown = (gold: string, gem: string, hi = 'Y'): Gear =>
  at('head', 17, -3, rc([
    'k...k..k...k',
    'kk.k@kk@k.kk',
    'k@k@##k#k#%k',
    'k@###*##*##k',
    'k@#*##*###%k',
    'kkkkkkkkkkkk',
  ], { '#': gold, '*': gem, '@': hi, '%': 'S' }));

export const wizardHat = (main: string, trim: string, star: string): Gear =>
  at('head', 14, -9, rc([
    '..........kk......',
    '.........k#@kk....',
    '........k##@k%k...',
    '.......k###@k.k...',
    '.......k##*#k.....',
    '......k####@k.....',
    '......k#*###@k....',
    '.....k#######k....',
    '.....k###*###@k...',
    '....k#########k...',
    '..kkk+++++++++kkk.',
    'kk@@@@#########%%kk',
    'kkkkkkkkkkkkkkkkkkk',
  ], { '#': main, '+': trim, '*': star, '@': main, '%': main }));

export const cowboyHat = (main: string, band: string, shade: string): Gear =>
  at('head', 14, -3, rc([
    '......kkkkkkk......',
    '.....k@###k##k.....',
    '.....k@###k##k.....',
    '..k..k+++++++k..k..',
    '.k%kkk#######kkk%k.',
    '.k%%@@@@######%%%k.',
    '..kkkkkkkkkkkkkkk..',
  ], { '#': main, '+': band, '@': main, '%': shade }));

export const tricorn = (main: string, trim: string, emblem: string): Gear =>
  at('head', 15, -3, rc([
    '..k.........k...',
    '.k+k.kkkkk.k+k..',
    '.k#+k#####k+#k..',
    'k##+###*###+##k.',
    'k###+#***#+###k.',
    'k####+++++####k.',
    '.kkkkkkkkkkkkkk.',
  ], { '#': main, '+': trim, '*': emblem }));

export const toque = (main = 'w', shade = 'l'): Gear =>
  at('head', 17, -8, rc([
    '..kkk..kkk..',
    '.k@##kk###k.',
    'k@####%###%k',
    'k@#########k',
    'k@###%###%%k',
    '.k########k.',
    '.k@#######k.',
    '.k@#######k.',
    '.k+++++++%k.',
    '.kkkkkkkkkk.',
  ], { '#': main, '%': shade, '@': main, '+': shade }));

export const vikingHelmet = (metal: string, horn: string, rim: string): Gear =>
  at('head', 12, -5, rc([
    'k................k..',
    'k*k..............k*k',
    'k**k...kkkkkk...k**k',
    '.k**k.k@@####k.k**k.',
    '..k**k@#######k**k..',
    '...kkk@########kk...',
    '.....k@#########k...',
    '....k++++++++++++k..',
    '....kkkkkkkkkkkkkk..',
  ], { '#': metal, '*': horn, '+': rim, '@': 'w' }));

export const knightHelmet = (metal: string, plume: string, hi = 'w'): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y)) return undefined;
    if (y > 9) return undefined;
    if (c === 'k') return 'k';
    if (y <= 2) return x === 22 || x === 23 ? plume : metal; // ears hidden under the helmet
    if (y === 7 && x >= 17 && x <= 29) return 'k'; // visor slit
    if (y === 8 && x >= 22 && x <= 30 && x % 2 === 0) return 'k';
    if (y === 9) return x > 29 ? undefined : 'k';
    if (x <= 17 || y === 3) return hi;
    return metal;
  });

// Plume / crest strip on top of a helmet.
export const plume = (main: string, tip: string): Gear =>
  at('head', 17, -4, rc([
    '..kkkkkk...',
    '.k@#####k..',
    'k@###*##*k.',
    'k#*kk#*#k..',
    '.kk..kkk...',
  ], { '#': main, '*': tip, '@': tip }));

export const helmetCut = (main: string, opts: { bottom?: number; deco?: (x: number, y: number, c: string) => string | undefined; face?: string; ears?: boolean } = {}): Gear =>
  hood({ main, bottom: opts.bottom ?? 5, deco: opts.deco, face: opts.face, ears: opts.ears });

export const headband = (main: string, tail = true, knot = main): Gear =>
  at('head', tail ? 12 : 16, 3, rc(tail ? [
    '....kkkkkkkkkkkkkkk',
    'kkkk*#############k',
    'k**k*kkkkkkkkkkkkk.',
    '.kk.k*k............',
    '.....k.............',
  ] : [
    'kkkkkkkkkkkkkk',
    'k############k',
    'kkkkkkkkkkkkkk',
  ], { '#': main, '*': knot }));

export const beret = (main: string, hi = main): Gear =>
  at('head', 15, -1, rc([
    '.......k.......',
    '....kkk#kkkk...',
    '..kk@@@#####kk.',
    '.k@##########%k',
    'k@#####%%%%%%%k',
    '.kkkkkkkkkkkkk.',
  ], { '#': main, '@': hi, '%': main }));

export const hardHat = (main: string, hi = 'Y', lamp?: string): Gear =>
  at('head', 15, -2, rc([
    '.....kkkkkk.....',
    '...kk@@#k##kk...',
    '..k@@##k###*k...',
    '..k@###k####k...',
    '.k@####k#####k..',
    'kkkkkkkkkkkkkkkk',
    'k%%%%%%%%%%%%%%k',
    'kkkkkkkkkkkkkkkk',
  ], { '#': main, '@': hi, '%': main, '*': lamp ?? main }));

export const fireHelmet = (main: string, badge: string): Gear =>
  at('head', 14, -3, rc([
    '.......kkkk.......',
    '.....kk@###kk.....',
    '....k@#*****#k....',
    '....k@#**@**#k....',
    '...k@##*****##k...',
    '.kkk@##########kkk',
    'k%%%%%%%%%%%%%%%%k',
    '.kkkkkkkkkkkkkkkk.',
  ], { '#': main, '*': badge, '@': 'w', '%': main }));

export const pithHelmet = (main: string, band: string): Gear =>
  at('head', 15, -3, rc([
    '......kkkk......',
    '....kk@@##kk....',
    '...k@######%k...',
    '..k@########%k..',
    '..k++++++++++k..',
    'kkk##########kkk',
    'k@@@@@######%%%k',
    '.kkkkkkkkkkkkkk.',
  ], { '#': main, '+': band, '@': 'Q', '%': 'S' }));

export const deerstalker = (main: string, check: string): Gear =>
  at('head', 15, -2, rc([
    '......kkkk......',
    '....kk#+#+kk....',
    '...k#+#+#+#+k...',
    '..k+#+#+#+#+#k..',
    '.kk#+#+#+#+#+kk.',
    'k##kkkkkkkkkk##k',
    '.kk..........kk.',
  ], { '#': main, '+': check }));

export const strawHat = (main: string, band: string): Gear =>
  at('head', 13, -2, rc([
    '.......kkkkkk.......',
    '......k@#%#%#k......',
    '......k#%#%#%k......',
    '...kkk++++++++kkk...',
    '.kk@#%#%#%#%#%#%#kk.',
    'k@#%#%#%#%#%#%#%#%%k',
    '.kkkkkkkkkkkkkkkkkk.',
  ], { '#': main, '%': 'S', '+': band, '@': 'Y' }));

export const sombrero = (main: string, trim: string): Gear =>
  at('head', 12, -5, rc([
    '.........kkkk.........',
    '........k@###k........',
    '.......k@#####k.......',
    '.......k*+*+*+k.......',
    '..kkkkk########kkkkk..',
    '.k@@#+#+#+#+#+#+#+##k.',
    'k*@####################k',
    '.kkkkkkkkkkkkkkkkkkkkk.',
  ].map((r) => r.slice(0, 22)), { '#': main, '+': trim, '*': trim, '@': 'Y' }));

export const sailorHat = (main = 'w', band = 'B'): Gear =>
  at('head', 16, -1, rc([
    '...kkkkkkkk...',
    '..k@#######k..',
    '.k++++++++++k.',
    'kk@@@@######kk',
    'k############k',
    '.kkkkkkkkkkkk.',
  ], { '#': main, '+': band, '@': 'Q' }));

export const policeCap = (main: string, band: string, badge: string): Gear =>
  at('head', 15, -2, rc([
    '...kkkkkkkkk......',
    '.kk@@#######kk....',
    'k@#####*######k...',
    'k@####***######k..',
    'k++++++++++++++k..',
    '.kkkkkkkkkkkk%%%k.',
    '.............kkkk.',
  ], { '#': main, '+': band, '*': badge, '@': main, '%': 'k' }));

export const pilotCap = (leather: string, lens: string): Gear =>
  at('head', 15, -1, rc([
    '....kkkkkkkk....',
    '..kk@@######kk..',
    '.k@##########%k.',
    'k@#kkkk#kkkk##%k',
    'k#k****kk****k%k',
    'k#k*@**kk*@**k%k',
    '.kkkkkk..kkkkkk.',
  ], { '#': leather, '*': lens, '@': 'w', '%': leather }));

export const mohawk = (main: string, tip: string): Gear =>
  at('head', 16, -6, rc([
    '....k..k..k...',
    '...k*kk*kk*k..',
    '..k*#*k#*k#*k.',
    '..k##k##k##k..',
    '.k##k##k###k..',
    '.k##########k.',
    '.kkkkkkkkkkkk.',
  ], { '#': main, '*': tip }));

export const afro = (main: string, hi: string): Gear =>
  at('head', 14, -5, rc([
    '.....kkkkkkkk......',
    '...kk@@#@####kk....',
    '..k@#@##%##%###k...',
    '.k@#%###@##%##%#k..',
    '.k#@##%####@#%##k..',
    'k@###%##%#####%#%k.',
    'k#%#@#####%##%###k.',
    'k##%#kkkkkkkk##%%k.',
    '.kkkk.......kkkk...',
  ], { '#': main, '@': hi, '%': 'k' }));

export const headphones = (band: string, cup: string): Gear =>
  at('head', 16, -2, rc([
    '....kkkkkkkk....',
    '..kk++++++++kk..',
    '.k+kk......kk+k.',
    '.k+k........k+k.',
    '.k+k........k+k.',
    'k**k........k**k',
    'k**k........k**k',
    'k*@k........k*@k',
    'kkkk........kkkk',
  ], { '+': band, '*': cup, '@': 'w' }));

export const antenna = (main: string, light: string): Gear =>
  at('head', 21, -5, rc([
    '.kkk.',
    'k*@*k',
    '.k*k.',
    '..k..',
    '.k#k.',
    'k###k',
    'kkkkk',
  ], { '#': main, '*': light, '@': 'w' }));

export const halo = (gold: string): Gear =>
  at('head', 17, -6, rc([
    '..kkkkkkkk..',
    '.k@#######k.',
    'k#kkkkkkkk#k',
    '.k#######%k.',
    '..kkkkkkkk..',
  ], { '#': gold, '@': 'Y', '%': 'S' }));

export const horns = (main: string, tip: string): Gear =>
  at('head', 15, -3, rc([
    '*k..........k*',
    '%*k........k*%',
    'k#%k......k%#k',
    '.k##k....k##k.',
    '..k#k....k#k..',
    '...kk....kk...',
  ], { '#': main, '*': tip, '%': main }));

export const flowerCrown = (leaf: string, a: string, b: string): Gear =>
  at('head', 16, 0, rc([
    '.kkk..kkk..kkk.',
    'k*@*kk+@+kk*@*k',
    'k***##+++##***k',
    'kk*k##k+k##k*kk',
    '..kkkk.k.kkkk..',
  ], { '#': leaf, '*': a, '+': b, '@': 'y' }));

export const nightcap = (main: string, trim: string, pom: string): Gear =>
  at('head', 9, -4, rc([
    '.kkk................',
    'k*@*k......kkkkkk...',
    'k***kkk..kk######k..',
    '.kkk#++kk##++++####k',
    '....k#####++###++###k',
    '.....kkk###########k',
    '.......k+++++++++++k',
    '.......kkkkkkkkkkkkk',
  ].map((r) => r.padEnd(21, '.')), { '#': main, '+': trim, '*': pom, '@': 'w' }));

export const bucketHat = (main: string, band: string): Gear =>
  at('head', 15, -2, rc([
    '....kkkkkkkk....',
    '...k@#######k...',
    '..k@#########k..',
    '..k++++++++++k..',
    '.k@###########k.',
    'k%%%%%%%%%%%%%%k',
    '.kkkkkkkkkkkkkk.',
  ], { '#': main, '+': band, '@': main, '%': main }));

export const jesterHat = (a: string, b: string, bell: string): Gear =>
  at('head', 11, -6, rc([
    '.kk.................kk..',
    'k*@k...............k@*k.',
    'k**k.kk.........kk.k**k.',
    '.kk.k##kk.....kk++k.kk..',
    '...k###++kkkkk++++k.....',
    '...k##k###+++####+k.....',
    '....kk.k##+++###kk......',
    '.......k+++++++++k......',
    '.......kkkkkkkkkkk......',
  ].map((r) => r.slice(0, 22)), { '#': a, '+': b, '*': bell, '@': 'w' }));

export const kabuto = (main: string, crest: string, trim: string): Gear =>
  at('head', 13, -5, rc([
    '..k..............k...',
    '.k*k............k*k..',
    '.k*k...kkkkkk...k*k..',
    '..k*k.k@@####k.k*k...',
    '...k*k@######k*k.....',
    '....k*k######k*k.....',
    '..kk@*********k%kk...',
    '.k@##+########+##%k..',
    'k@##k++++++++++k##%k.',
    'kkkk.kkkkkkkkkk.kkkk.',
  ], { '#': main, '*': crest, '+': trim, '@': 'w', '%': main }));

export const nemes = (a: string, b: string, band: string): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) && !(x >= 13 && x <= 16 && y >= 5 && y <= 14)) return undefined;
    if (y > 6 && x >= 17) return undefined;
    if (c === 'k') return 'k';
    if (c === '.') return undefined;
    if (y === 5 && x >= 16) return band;
    if (y <= 2) return a; // ears covered
    return y % 2 ? a : b;
  });

// Bubble helmet around the whole head (rim + glare only, the face stays visible).
export const bubble = (rim: string, glare = 'w'): Gear =>
  at('head', 12, -4, rc([
    '.......kkkkkkkkkk.......',
    '.....kk@.........kk.....',
    '....k@@...........k.....',
    '...k@..............k....',
    '..k@................k...',
    '..k@................k...',
    '.k...................k..',
    '.k...................k..',
    '.k....................k.',
    '.k....................k.',
    '.k....................k.',
    '.k...................%k.',
    '.k...................%k.',
    '..k.................%k..',
    '..k+++++++++++++++++k...',
    '...kkkkkkkkkkkkkkkkk....',
  ].map((r) => r.slice(0, 24)), { '+': rim, '@': glare, '%': 'C' }));

export const divingHelmet = (brass: string, glass: string): Gear =>
  at('head', 13, -3, rc([
    '.......kkkkkkk.........',
    '.....kk@######kk.......',
    '....k@####*#####k......',
    '...k@###kkkkkk###k.....',
    '..k@###k%%%%%%k##k.....',
    '..k@##k%@%%%%%%k##k....',
    '.k@###k%%%%%%%%k##k....',
    '.k###*k%%%%%%%%k*#k....',
    '.k####k%%%%%%%%k##k....',
    '.k####kk%%%%%%kk##k....',
    '..k####kkkkkkkk###k....',
    '..k*#############*k....',
    '...kkkkkkkkkkkkkkkk....',
  ], { '#': brass, '*': 'y', '@': 'Y', '%': glass }));

export const sharkHood = (main: string, belly: string): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || c === '.') return undefined;
    if (c === 'k') return 'k';
    if (y <= 2) return main;
    if (y <= 4) return main;
    if (y === 5) return 'k';
    if (y >= 10 && x <= 22) return y === 10 ? 'k' : belly;
    return undefined;
  });

export const finTop = (main: string): Gear =>
  at('head', 19, -5, rc([
    '.....k',
    '....k#',
    '...k##',
    '..k##k',
    '.k@#k.',
    'k@##k.',
  ], { '#': main, '@': main }));

export const dinoSpikes = (spike: string): Gear =>
  at('head', 16, -3, rc([
    '.....k...k...k.',
    '....k*k.k*k.k*k',
    '...k**kk**kk**k',
    '..k***k***k***k',
  ], { '*': spike }));

// ================================================================ face

export const goggles = (frame: string, lens: string, strap = frame): Gear =>
  at('face', 14, 5, rc([
    '..kkkkk..kkkkk..',
    '.k#*@*#kk#*@*#k.',
    'kk#***#++#***#k.',
    '++k###kkkk###k..',
    'k..kkk....kkk...',
  ], { '#': frame, '*': lens, '+': strap, '@': 'w' }));

export const shades = (frame: string, lens: string): Gear =>
  at('face', 15, 6, rc([
    'k#############k',
    '.k@**k##k@**k..',
    '.k***k..k***k..',
    '..kkk....kkk...',
  ], { '#': frame, '*': lens, '@': 'w' }));

export const starShades = (lens: string): Gear =>
  at('face', 15, 4, rc([
    '...k.......k....',
    '..k*k.....k*k...',
    'kk***kkkkk***kkk',
    '.k*@*k...k*@*k..',
    '..k*k.....k*k...',
    '.k.k.k...k.k.k..',
  ], { '*': lens, '@': 'w' }));

export const roundGlasses = (frame: string): Gear =>
  at('face', 16, 5, rc([
    '.###...###..',
    '#...#.#...#.',
    '#...###...##',
    '#...#.#...#.',
    '.###...###..',
  ], { '#': frame }));

export const monocle = (gold: string): Gear =>
  at('face', 24, 5, rc([
    '.###.',
    '#...#',
    '#...#',
    '.###.',
    '..#..',
    '..#..',
    '..#..',
  ], { '#': gold }));

export const eyepatch = (main: string): Gear =>
  at('face', 16, 4, rc([
    'k.........k...',
    '.k......kkkkk.',
    '..kkkkkk####k.',
    '........k###k.',
    '.........kkk..',
  ], { '#': main }));

export const domino = (main: string): Gear =>
  at('face', 16, 6, rc([
    'kkkkkkkkkkkkkkk',
    'k##kk##########k',
    'k#k..k#####k..kk',
    '.kk..kkkkkkk..k.',
  ].map((r) => r.slice(0, 15)), { '#': main }));

export const visor = (frame: string, glow: string): Gear =>
  at('face', 16, 6, rc([
    'k##############k',
    'k*@************k',
    'k**************k',
    'k##############k',
  ], { '#': frame, '*': glow, '@': 'w' }));

export const mustache = (main: string): Gear =>
  at('face', 26, 10, rc([
    '..kkkkkk..',
    '.k######k.',
    'k##kk##k#k',
    'kk.....kk.',
  ], { '#': main }));

export const beard = (main: string, hi: string): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || y < 9 || x < 18) return undefined;
    if (c === 'k') return 'k';
    if (c === '.') return undefined;
    if (y === 9 && x >= 30) return undefined; // nose stays visible
    return (x + y) % 3 ? main : hi;
  });

export const facePaint = (main: string, lips?: string): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || y < 4) return undefined;
    if (c === 'k' || c === '.') return undefined;
    if (c === '2' && y === 7) return undefined; // keep the eye line dark
    if (lips && y === 10 && x >= 29 && x <= 31) return lips;
    if (c === '4') return undefined;
    return main;
  });

export const noseBall = (main: string): Gear =>
  at('face', 32, 8, rc(['.kk.', 'k@#k', 'k##k', '.kk.'], { '#': main, '@': 'w' }));

export const surgicalMask = (main: string): Gear =>
  cut('head', (x, y, c) => {
    if (!inHead(x, y) || y < 9 || x < 24) return undefined;
    if (c === '.') return undefined;
    if (c === 'k') return 'k';
    if (y === 9 && c !== 'k') return x >= 33 ? undefined : 'k';
    return main;
  });

export const snorkelMask = (frame: string, glass: string, tube: string): Gear =>
  at('face', 15, 0, rc([
    '..k............',
    '.k+k...........',
    '.k+k...........',
    '.k+k...........',
    '.k+k...........',
    '.k+kkkkkkkkkkkk',
    '.k+k*@*****@**k',
    'kk#k********#*k',
    'k##kkkkkkkkkkkk',
  ], { '#': frame, '*': glass, '+': tube, '@': 'w' }));

// ================================================================ body

export { suit };
export type { SuitOpts };

export const stripes = (a: string, period = 2, horiz = true) => (x: number, y: number) =>
  (horiz ? y : x) % period === 0 ? a : undefined;
export const belt = (main: string, buckle = 'y', row = 19) => (x: number, y: number) =>
  y === row ? (x === 22 || x === 23 ? buckle : main) : undefined;
export const buttons = (main: string, col = 25) => (x: number, y: number) => (x === col && y % 2 === 1 && y >= 14 ? main : undefined);
export const emblem = (rows: string[], bx: number, by: number, c: Cols) => {
  const r = rc(rows, c);
  return (x: number, y: number) => {
    const ch = r[y - by]?.[x - bx];
    return ch && ch !== '.' ? ch : undefined;
  };
};
export const anyOf =
  (...fs: ((x: number, y: number, c: string) => string | undefined)[]) =>
  (x: number, y: number, c: string) => {
    for (const f of fs) {
      const v = f(x, y, c);
      if (v) return v;
    }
    return undefined;
  };

// A neck scarf / bandana / collar in front of the chest.
export const scarf = (main: string, knot: string, tails = true): Gear =>
  at('body', 13, 12, rc([
    '.kkkkkkkkkkkk.',
    'k@###########k',
    'k#*#*#*#*#*##k',
    '.kkkkkkkkk##k.',
    ...(tails ? ['.........k#*k', '........k##k.', '.........kk..'] : ['..........kk.']),
  ], { '#': main, '*': knot, '@': main }));

export const necktie = (main: string, knot = main): Gear =>
  at('body', 25, 12, rc(['kkk', 'k*k', 'k#k', 'k#k', 'k#k', '.k.'], { '#': main, '*': knot }));

export const bowtie = (main: string): Gear =>
  at('body', 24, 12, rc(['kk.kk', 'k#k#k', 'k#k#k', 'kk.kk'], { '#': main }));

export const medal = (ribbon: string, gold: string): Gear =>
  at('body', 22, 13, rc(['k.k', '+k+', 'kkk', 'k*k', 'kkk'], { '+': ribbon, '*': gold }));

export const tutu = (main: string, hi: string): Gear =>
  at('body', 6, 17, rc([
    '..kkkkkkkkkkkkkkkkkkkkk..',
    '.k@#@#@#@#@#@#@#@#@#@#@k.',
    'k#@#@#@#@#@#@#@#@#@#@#@#k',
    '.kkkkkkkkkkkkkkkkkkkkkkk.',
  ], { '#': main, '@': hi }));

export const lifeRing = (a: string, b: string): Gear =>
  at('body', 8, 14, rc([
    '..kkkkkkkkkkkkkkkkkk...',
    '.k@@##++##++##++##++k..',
    'k#####++##++##++##++#k.',
    '.kkkkkkkkkkkkkkkkkkkk..',
  ], { '#': a, '+': b, '@': 'w' }));

// ================================================================ back (drawn behind)

const CAPE = [
  '.............kkkkk..',
  '............k%###k..',
  '...........k%####k..',
  '.........kk%#####k..',
  '.......kk%%######k..',
  '.....kk%%#######k...',
  '...kk%%########k....',
  '..k%%##########k....',
  '.k%############k....',
  '.k%############k....',
  'k%#############k....',
  'k%#############k....',
  'k%##############k...',
  'k%##k##k###k###k....',
  'kkkk.kk.kkk.kkk.....',
];
const CAPE_ALT = [
  '.............kkkkk..',
  '............k%###k..',
  '...........k%####k..',
  '.........kk%#####k..',
  '.......kk%%######k..',
  '.....kk%%#######k...',
  '....kk%########k....',
  '...k%##########k....',
  '..k%###########k....',
  '..k%###########k....',
  '.k%############k....',
  '.k%############k....',
  'k%###############k..',
  'k%#k##k###k###kk....',
  'kk.kkk.kkk.kkk......',
];
export const cape = (main: string, lining: string): Gear =>
  at('back', -3, 8, rc(CAPE, { '#': main, '%': lining }), { behind: true, alt: rc(CAPE_ALT, { '#': main, '%': lining }) });

// Cape clasp / collar in front at the neck.
export const clasp = (main: string, gem: string): Gear =>
  at('body', 14, 11, rc(['.kkk.', 'k#*#k', '.kkk.'], { '#': main, '*': gem }));

export const wings = (main: string, hi: string, shade: string): Gear =>
  at('back', 4, -3, rc([
    '..........kkk.',
    '........kk@@@k',
    '......kk@@###k',
    '....kk@@####%k',
    '...k@@####%%k.',
    '..k@####%%%%k.',
    '.k@###k#%%%k..',
    'k@##kk#%%%k...',
    'k@#k.k#%%k....',
    'kkk.k#%%k.....',
    '....k#%kk.....',
    '.....kkk......',
  ], { '#': main, '@': hi, '%': shade }), {
    behind: true,
    alt: rc([
      '..............',
      '..............',
      '........kkkkk.',
      '.....kkk@@@@%k',
      '...kk@@@###%%k',
      '.kk@@####%%%k.',
      'k@@###k#%%%k..',
      'k@##kk#%%%k...',
      'k@#k.k#%%k....',
      'kkk.k#%%k.....',
      '....k#%kk.....',
      '.....kkk......',
    ], { '#': main, '@': hi, '%': shade }),
  });

export const batWings = (main: string, bone: string): Gear =>
  at('back', 3, -2, rc([
    '..........k...',
    '.........k*k..',
    '.......kk*#k..',
    '.....kk#*##k..',
    '...kk##*###k..',
    '.kk###*####k..',
    'k*****####k...',
    'k#k#k#k###k...',
    '.k.k.k.k##k...',
    '.......k#k....',
    '........k.....',
  ], { '#': main, '*': bone }), {
    behind: true,
    alt: rc([
      '..............',
      '..............',
      '..............',
      '..........k...',
      '.......kkk*k..',
      '..kkkkk##*#k..',
      'k*****###*#k..',
      'k###########k.',
      '.k#k#k#k##kk..',
      '..k.k.k.k#k...',
      '.........k....',
    ], { '#': main, '*': bone }),
  });

export const fairyWings = (a: string, b: string): Gear =>
  at('back', 5, -2, rc([
    '...kkkk.......',
    '..k@***k......',
    '.k@****+k.....',
    '.k****++k.kk..',
    '..k**++kkk*k..',
    '...kk+k*@**k..',
    '.....k****k...',
    '.....k**+k....',
    '......kkk.....',
  ], { '*': a, '+': b, '@': 'w' }), {
    behind: true,
    alt: rc([
      '..............',
      '.kkkk.........',
      'k@***kk.......',
      'k*****+k......',
      '.k***++kkkk...',
      '..kk++k*@**k..',
      '....k*****k...',
      '.....k**+k....',
      '......kkk.....',
    ], { '*': a, '+': b, '@': 'w' }),
  });

export const dragonWings = (main: string, membrane: string): Gear =>
  at('back', 2, -4, rc([
    '............kk.',
    '..........kk#k.',
    '........kk#%%k.',
    '......kk#%%%%k.',
    '....kk#%%%#%%k.',
    '..kk#%%%%#%%%k.',
    '.k#%%%%%#%%%k..',
    'k#%%%%%%#%%%k..',
    'k#k%%%k%%#%%k..',
    '.k.k%k.k%#%k...',
    '....k...k#%k...',
    '.........kk....',
  ], { '#': main, '%': membrane }), {
    behind: true,
    alt: rc([
      '...............',
      '...............',
      '...........kk..',
      '.........kk#k..',
      '......kkk#%%k..',
      '...kkk%%#%%%k..',
      '.kk%%%%#%%%%k..',
      'k#%%%%%#%%%%k..',
      'k#%%%%%%#%%%k..',
      '.k%k%%k%%#%k...',
      '..k.kk.k%#%k...',
      '.........kk....',
    ], { '#': main, '%': membrane }),
  });

export const jetpack = (main: string, trim: string, light = 'o'): Gear =>
  at('back', 10, 4, rc([
    '.kkk.',
    'k@#%k',
    'k#*%k',
    'k###k',
    'k+++k',
    'k###k',
    'k#*%k',
    'k###k',
    '.k%k.',
  ], { '#': main, '+': trim, '*': light, '@': 'w', '%': main }));

export const backpack = (main: string, flap: string): Gear =>
  at('back', 9, 9, rc([
    '.kkkkkk.',
    'k@####%k',
    'k++++++k',
    'k#*##%%k',
    'k######k',
    'k%%%%%%k',
    '.kkkkkk.',
  ], { '#': main, '+': flap, '*': 'y', '@': main, '%': main }));

export const sack = (main: string, sign: string): Gear =>
  at('back', 8, 0, rc([
    '...kkk.....',
    '..k#@#k....',
    '...k#kkk...',
    '.kk#####kk.',
    'k@###**###k',
    'k@##*#####k',
    'k@###**###k',
    'k@#####*##k',
    'k%%##**###k',
    '.k%%%####k.',
    '..kkkkkkk..',
  ], { '#': main, '*': sign, '@': main, '%': main }), { behind: true });

export const tank = (main: string, valve: string): Gear =>
  at('back', 10, 3, rc([
    '..kk..',
    '.k**k.',
    'kkkkkk',
    'k@##%k',
    'k@##%k',
    'k@##%k',
    'k@##%k',
    'k@##%k',
    '.kkkk.',
  ], { '#': main, '*': valve, '@': 'w', '%': main }));

export const guitarBack = (body: string, neck: string): Gear =>
  at('back', 3, 2, rc([
    'kk..........',
    'k*k.........',
    '.k*k........',
    '..k+k.......',
    '...k+k......',
    '....k+k.....',
    '.....k+kk...',
    '....kk#+#k..',
    '...k@##+##k.',
    '...k#k###%k.',
    '....kk##%k..',
    '.....k#%%kk.',
    '....k##%%%%k',
    '....k#%%%%%k',
    '.....kkkkkk.',
  ], { '#': body, '+': neck, '*': 'k', '@': 'w', '%': body }), { behind: true });

export const quiver = (main: string, fletch: string): Gear =>
  at('back', 8, 3, rc([
    'k.k.k.',
    '*k*k*.',
    '*k*k*.',
    '.k.k.k',
    'kkkkkk',
    'k@###k',
    'k#++#k',
    'k####k',
    'k#++#k',
    'k####k',
    '.kkkk.',
  ], { '#': main, '+': 'y', '*': fletch, '@': main }), { behind: true });

export const shell = (main: string, rim: string): Gear =>
  at('back', 4, 9, rc([
    '....kkkkkkkk....',
    '..kk@#k##k##kk..',
    '.k@##k####k###k.',
    'k@#kk######kk#%k',
    'k##k########k#%k',
    'k++++++++++++++k',
    '.kkkkkkkkkkkkkk.',
  ], { '#': main, '+': rim, '@': 'w', '%': main }), { behind: true });

export const propeller = (cap: string, blade: string): Gear =>
  at('head', 18, -5, rc([
    'kkkkk..kkkk',
    'k***kkk***k',
    '.kkkk#kkkk.',
    '....k#k....',
  ], { '*': blade, '#': cap }), {
    alt: rc([
      '...kkkkk...',
      '...k***k...',
      '...kk#kk...',
      '....k#k....',
    ], { '*': blade, '#': cap }),
  });

// ================================================================ paw (held props)

export const sword = (blade: string, hilt: string, guard = 'y'): Gear =>
  at('paw', 28, 7, rc([
    '....kk',
    '...k@k',
    '..k@#k',
    '..k@#k',
    '..k@#k',
    '..k@#k',
    '..k@#k',
    'kkk@#kkk',
    'k*******k',
    'kkkk+kkkk',
    '...k+k',
    '...k+k',
    '...kOk',
    '....k.',
  ].map((r) => r.padEnd(9, '.')), { '#': blade, '@': 'w', '*': guard, '+': hilt }));

export const katana = (blade: string, wrap: string): Gear =>
  at('paw', 27, 6, rc([
    '........k',
    '.......k@',
    '......k@k',
    '.....k@k.',
    '....k@k..',
    '...k@k...',
    '..k@k....',
    '.kOOk....',
    'k*kk.....',
    'k*k......',
    'kk.......',
  ].map((r) => r.padEnd(9, '.')), { '@': blade, '*': wrap }));

export const staff = (wood: string, orb: string): Gear =>
  at('paw', 28, 4, rc([
    '.kkk.',
    'k@**k',
    'k***k',
    '.k*k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '..k..',
  ], { '#': wood, '*': orb, '@': 'w' }), {
    alt: rc([
      '.kkk.',
      'k***k',
      'k*@*k',
      '.k*k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '..k..',
    ], { '#': wood, '*': orb, '@': 'w' }),
  });

export const wand = (stick: string, star: string): Gear =>
  at('paw', 28, 11, rc([
    '...k...',
    '..k*k..',
    'kk*@*kk',
    '.k***k.',
    '.k*k*k.',
    '.kk#kk.',
    '...#k..',
    '..k#k..',
    '..k#k..',
    '...k...',
  ], { '#': stick, '*': star, '@': 'w' }));

export const spatula = (head: string, handle: string): Gear =>
  at('paw', 29, 9, rc([
    'kkkk',
    'k##k',
    'k##k',
    'k##k',
    'kkkk',
    '.k+k',
    '.k+k',
    '.k+k',
    '.k+k',
    '..k.',
  ], { '#': head, '+': handle }));

export const wrench = (metal: string): Gear =>
  at('paw', 28, 12, rc([
    'k.k.k',
    'k#k#k',
    'k###k',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '..k..',
  ], { '#': metal }));

export const magnifier = (rim: string, glass: string): Gear =>
  at('paw', 28, 9, rc([
    '.kkkk.',
    'k####k',
    '#*@**#',
    '#****#',
    'k####k',
    '.kk#k.',
    '..k+k.',
    '..k+k.',
    '..k+k.',
    '...k..',
  ], { '#': rim, '*': glass, '@': 'w', '+': 'N' }));

export const flask = (glass: string, liquid: string): Gear =>
  at('paw', 28, 11, rc([
    '.kkk.',
    '.k@k.',
    '.k@k.',
    'k@**k',
    'k***k',
    'kkkkk',
  ], { '@': glass, '*': liquid }), {
    alt: rc([
      '..*..',
      '.k@k.',
      '.k@k.',
      'k@**k',
      'k***k',
      'kkkkk',
    ], { '@': glass, '*': liquid }),
  });

export const paintbrush = (handle: string, tip: string): Gear =>
  at('paw', 28, 9, rc([
    '.kk.',
    'k**k',
    'k**k',
    'kOOk',
    '.k#k',
    '.k#k',
    '.k#k',
    '.k#k',
    '..k.',
  ], { '#': handle, '*': tip }));

export const microphone = (head: string, body: string): Gear =>
  at('paw', 28, 10, rc([
    '.kkk.',
    'k@**k',
    'k***k',
    '.kkk.',
    '.k#k.',
    '.k#k.',
    '..k..',
  ], { '#': body, '*': head, '@': 'w' }));

export const torch = (wood: string): Gear =>
  at('paw', 28, 7, rc([
    '..k..',
    '.kyk.',
    'kyOyk',
    'kOqOk',
    '.kqk.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '..k..',
  ], { '#': wood }), {
    alt: rc([
      '.k...',
      '.kyk.',
      'kyyOk',
      'kOOqk',
      '.kqk.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '.k#k.',
      '..k..',
    ], { '#': wood }),
  });

export const axe = (head: string, handle: string): Gear =>
  at('paw', 27, 7, rc([
    '..kkk...',
    '.k@##k..',
    'k@###kk.',
    'k@####+k',
    'k@###k+k',
    '.k@#k.+k',
    '..kk..+k',
    '......+k',
    '......+k',
    '......+k',
    '.......k',
  ], { '#': head, '@': 'w', '+': handle }));

export const trident = (metal: string, shaft: string): Gear =>
  at('paw', 28, 3, rc([
    'k.k.k',
    '#k#k#',
    '#k#k#',
    '#####',
    'k.#.k',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
  ], { '#': metal, '+': shaft }));

export const shield = (main: string, rim: string, mark: string): Gear =>
  at('paw', 26, 13, rc([
    'kkkkkkk',
    'k+++++k',
    'k+#*#+k',
    'k+***+k',
    'k+#*#+k',
    '.k+#+k.',
    '..k+k..',
    '...k...',
  ], { '#': main, '+': rim, '*': mark }));

export const hook = (metal: string): Gear =>
  at('paw', 28, 12, rc(['.kk.', 'k##k', 'k.k#', '..k#', '.k#k', 'kNNk', 'kNNk', '.kk.'], { '#': metal }));

export const broom = (stick: string, bristle: string): Gear =>
  at('paw', 28, 4, rc([
    '.k.',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'k#k',
    'kkkk.',
    'k***k',
    'k*%*k',
    'k*%*%k',
    'k*%*%*k',
    'kkkkkk',
  ].map((r) => r.padEnd(7, '.')), { '#': stick, '*': bristle, '%': 'S' }));

export const fork = (metal: string, shaft: string): Gear =>
  at('paw', 28, 5, rc([
    'k.k.k',
    '#k#k#',
    '#k#k#',
    '#####',
    '.k#k.',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
    '..+..',
  ], { '#': metal, '+': shaft }));

export const flower = (stem: string, petal: string): Gear =>
  at('paw', 28, 10, rc([
    '.k.k.',
    'k*k*k',
    '.kyk.',
    'k*k*k',
    '.k#k.',
    'k##k.',
    '.k#k.',
    '..#..',
  ], { '#': stem, '*': petal }));

export const scepter = (gold: string, gem: string): Gear =>
  at('paw', 28, 6, rc([
    '.k.k.',
    'k*k*k',
    'k***k',
    '.k@k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '.k#k.',
    '..k..',
  ], { '#': gold, '*': gem, '@': 'Y' }));

export const crook = (a: string, b: string): Gear =>
  at('paw', 27, 7, rc([
    '.kkk.',
    'k#+#k',
    'k+kk.',
    'k#k..',
    '.k+k.',
    '.k#k.',
    '.k+k.',
    '.k#k.',
    '.k+k.',
    '.k#k.',
    '..k..',
  ], { '#': a, '+': b }));

export const lantern = (frame: string, light: string): Gear =>
  at('paw', 28, 12, rc([
    '.##..',
    '#..#.',
    'k###k',
    'k*@*k',
    'k***k',
    'k###k',
  ], { '#': frame, '*': light, '@': 'w' }));

export const sign = (board: string, text: string): Gear =>
  at('paw', 27, 2, rc([
    'kkkkkkkk',
    'k######k',
    'k#****#k',
    'k######k',
    'kkk++kkk',
    '...++...',
    '...++...',
    '...++...',
    '...++...',
    '...++...',
    '...++...',
    '...kk...',
  ], { '#': board, '*': text, '+': 'n' }));

export const parcel = (box: string, tape: string): Gear =>
  at('paw', 26, 14, rc(['kkkkkkk', 'k##+##k', 'k##+##k', 'k+++++k', 'k##+##k', 'kkkkkkk'], { '#': box, '+': tape }));

export const pizzaBox = (box: string, logo: string): Gear =>
  at('paw', 25, 15, rc(['kkkkkkkkk', 'k@#####%k', 'k##*#*##k', 'k@#####%k', 'kkkkkkkkk'], { '#': box, '*': logo, '@': 'w', '%': box }));

export const trashLid = (metal: string): Gear =>
  at('paw', 25, 11, rc([
    '...kkk...',
    '..k###k..',
    '.kk@##kk.',
    'k@@####%k',
    'k@#####%k',
    'k@#k#k#%k',
    'k@#####%k',
    'k@##k##%k',
    '.k@###%k.',
    '..kkkkk..',
  ], { '#': metal, '@': 'w', '%': 'g' }));

export const bone = (): Gear =>
  at('paw', 27, 14, rc(['kk..kk', 'kwkkwk', '.kwwk.', 'kwkkwk', 'kk..kk'], {}));

export const fish = (main: string, belly: string): Gear =>
  at('paw', 27, 14, rc(['k...kkk.', 'kk.k##@k', 'k#k#*##k', 'kk.k++#k', 'k...kkk.'], { '#': main, '+': belly, '*': 'k', '@': 'w' }));

export const balloon = (main: string): Gear =>
  at('paw', 28, 0, rc([
    '.kkk.',
    'k@##k',
    'k###k',
    'k###k',
    '.k#k.',
    '..k..',
    '..l..',
    '..l..',
    '...l.',
    '...l.',
    '..l..',
    '..l..',
    '..l..',
    '..l..',
    '...l.',
    '...l.',
  ], { '#': main, '@': 'w' }), {
    alt: rc([
      '..kkk',
      '.k@##k',
      '.k###k',
      '.k###k',
      '..k#k.',
      '...k..',
      '..l...',
      '..l...',
      '...l..',
      '...l..',
      '..l...',
      '..l...',
      '..l...',
      '..l...',
      '...l..',
      '...l..',
    ].map((r) => r.slice(0, 5)), { '#': main, '@': 'w' }),
  });

export const guitarHeld = (body: string): Gear =>
  at('paw', 18, 12, rc([
    '..............kk',
    '.............k*k',
    '............k+k.',
    '...........k+k..',
    '..kkk.....k+k...',
    '.k#@#kk..k+k....',
    'k#####%kk+k.....',
    'k##kk##+#k......',
    'k##kk#+##k......',
    '.k####%%k.......',
    '..kkkkkk........',
  ], { '#': body, '+': 'T', '*': 'w', '@': 'w', '%': body }));

export const boxingGlove = (main: string): Gear =>
  at('paw', 27, 14, rc(['.kkkk.', 'k@###k', 'k####k', 'k####k', '.kwwk.', '.kkkk.'], { '#': main, '@': 'w' }));

export const fishingRod = (rod: string): Gear =>
  at('paw', 28, 1, rc([
    '......kk',
    '.....k#.',
    '.....#.l',
    '....k#.l',
    '....#..l',
    '...k#..l',
    '...#...l',
    '..k#..krk',
    '..#...kwk',
    '.k#....k.',
    '.#......',
    'k#......',
    '#k......',
    'kk......',
  ], { '#': rod }));

export const hose = (main: string, nozzle: string): Gear =>
  at('paw', 25, 15, rc(['......kk', '.....k*k', 'kkkkk*k.', 'k####kk.', 'kkkkkk..'], { '#': main, '*': nozzle }));

export const skateboard = (deck: string, wheel: string): Gear =>
  at('paw', 25, 16, rc([
    'kk.........kk',
    'k#kkkkkkkkk#k',
    '.k#########k.',
    '..kkkkkkkkk..',
    '..k*k...k*k..',
    '...k.....k...',
  ], { '#': deck, '*': wheel }));

// Tail accessories ------------------------------------------------

export const tailBow = (main: string, knot = main): Gear =>
  at('tail', 2, 2, rc(['kk...kk', 'k#k.k#k', 'k##*##k', 'k#k.k#k', 'kk...kk'], { '#': main, '*': knot }));

export const tailRing = (main: string): Gear =>
  at('tail', 2, 10, rc(['kkkkkkk', 'k@####k', 'kkkkkkk'], { '#': main, '@': 'w' }));

export const tailFlame = (a = 'q', b = 'y'): Gear =>
  at('tail', 3, 0, rc(['..k...', '.k*k..', 'k*+*k.', 'k++*k.', '.kkk..'], { '*': a, '+': b }), {
    alt: rc(['...k..', '..k*k.', '.k*+*k', '.k*++k', '..kkk.'], { '*': a, '+': b }),
  });

export const tailBell = (gold: string): Gear =>
  at('tail', 0, 8, rc(['.kkk.', 'k@##k', 'k###k', 'kkkkk', '..k..'], { '#': gold, '@': 'Y' }));

export const pompom = (main: string): Gear =>
  at('tail', 2, 2, rc(['.kkk.', 'k@##k', 'k###k', '.kkk.'], { '#': main, '@': 'w' }));

// Fur-shaped helpers re-exported for outfit files.
export { cut, hood, at, isFur, baseAt, inHead };
