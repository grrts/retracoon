// Outfit skins: costumes drawn as gear pieces on the raccoon, plus matching fur.
import { DEFAULT_FUR } from '../../gfx/coon';
import type { Gear } from '../../content/types';
import type { SkinDef, SkinRarity } from '../types';
import { fur, tone, rnd, type Fur } from './util';
import * as P from './pieces';

type Extra = Partial<Pick<SkinDef, 'effect' | 'glow' | 'pattern'>>;
const o = (id: string, name: string, rarity: SkinRarity, f: Fur, outfit: Gear[], extra: Extra = {}): SkinDef => ({
  id, name, rarity, group: 'outfit', fur: f, outfit, ...extra,
});
const { suit, anyOf, stripes, belt, buttons, emblem } = P;
const classic = () => ({ ...DEFAULT_FUR });
const BROWN = fur('#8f6a4e', '#3f2a1f', '#d2b48c', '#f4ead8');
const GINGER = fur('#c8743a', '#5c2e1a', '#f0c090', '#fff0dc');
const SNOW = fur('#e2eaf2', '#566c86', '#ffffff');
const DARK = fur('#4a4d63', '#1a1c2c', '#8b93a8', '#c9d1dd');

// Small extra props used by a few outfits.
const hammer = (head: string): Gear =>
  P.at('paw', 26, 9, [
    'kkkkkkk',
    'k@###%k',
    'k#####k',
    'k%%%%%k',
    'kkk+kkk',
    '..k+k..',
    '..k+k..',
    '..k+k..',
    '..kOk..',
    '...k...',
  ].map((r) => r.replace(/#/g, head).replace(/@/g, 'w').replace(/%/g, 'g').replace(/\+/g, 'n')));
const cutlass = (): Gear =>
  P.at('paw', 27, 9, ['.....kk', '....klk', '...klk.', '..klk..', '.klkk..', 'klk....', 'kOOk...', '.kyk...', '..k....']);
const rapier = (): Gear =>
  P.at('paw', 27, 5, ['......k', '.....kw', '....kwk', '...kwk.', '..kwk..', '.kwk...', 'kykk...', 'yOy....', '.n.....', '.k.....']);
const briefcase = (): Gear => P.at('paw', 26, 15, ['..kkk..', 'kkk.kkk', 'kNNNNNk', 'kNNONNk', 'kNNNNNk', 'kkkkkkk']);
const ballChain = (): Gear => P.at('tail', 0, 12, ['.......kk', '..kkk.k.k', '.klak..k.', 'kaaaak...', 'kaaaak...', '.kkkk....']);
const pocketWatch = (): Gear => P.at('body', 23, 15, ['.y.', 'kyk', 'yQy', 'kyk']);
const camera = (): Gear => P.at('body', 21, 14, ['.kk..', 'kkkkk', 'kdldk', 'kdCdk', 'kkkkk']);
const bowString = (): Gear => P.at('paw', 28, 8, ['kk...', 'knk..', '.knk.', '.knlk', '..knl', '..knl', '..knl', '.knlk', '.knk.', 'knk..', 'kk...']);
const whistle = (): Gear => P.at('body', 22, 13, ['k...k', '.k.k.', '..k..', '.klk.', 'kllk.', '.kk..']);
const number = (n: string, bx: number, by: number, col: string) => emblem(n === '1' ? ['.#', '##', '.#', '.#', '###'] : ['##', '.#', '##', '#.', '##'], bx, by, { '#': col });
const pocket = (col: string, x0 = 22, y0 = 15) => (x: number, y: number) =>
  (y === y0 && x >= x0 && x <= x0 + 2) || ((x === x0 || x === x0 + 2) && y > y0 && y <= y0 + 2) || (y === y0 + 2 && x > x0 && x < x0 + 2) ? col : undefined;
const straps = (col: string) => (x: number, y: number) => (y <= 15 && (x === 16 || x === 24) ? col : y === 16 ? col : undefined);
const splotches = (x: number, y: number) => {
  const r = rnd(Math.floor(x / 2), Math.floor(y / 2), 99);
  return r < 0.08 ? 'r' : r < 0.16 ? 'c' : r < 0.22 ? 'y' : r < 0.28 ? 'G' : undefined;
};

export const OUTFIT_SKINS: SkinDef[] = [
  // ---------------------------------------------------------------- rare
  o('bandit', 'BANDIT', 1, classic(), [
    P.sack('s', 'O'),
    P.beanie('k', 'd'),
    suit({ main: 'd', belly: 'a', deco: stripes('k', 2) }),
  ]),
  o('chef', 'CHEF', 1, BROWN, [
    P.toque(),
    suit({ main: 'w', belly: 'w', deco: anyOf(buttons('l', 24), buttons('l', 21)) }),
    P.scarf('r', 'r', false),
    P.mustache('N'),
    P.spatula('l', 'n'),
  ]),
  o('cowboy', 'COWBOY', 1, GINGER, [
    P.cowboyHat('n', 'N', 'N'),
    suit({ main: 'N', belly: '', deco: anyOf(belt('k', 'O'), (x, y) => (y === 15 && x % 3 === 0 ? 'O' : undefined)) }),
    P.scarf('r', 'w'),
  ]),
  o('punk', 'PUNK', 1, fur('#566c86', '#1a1c2c', '#94b0c2'), [
    P.mohawk('h', 'M'),
    suit({ main: 'k', belly: '', deco: anyOf((x, y) => (y === 14 && x % 2 === 0 && x < 22 ? 'l' : undefined), belt('l', 'l', 20)) }),
    P.at('body', 23, 15, ['l.', '.l', 'l.']),
  ]),
  o('firefighter', 'FIREFIGHTER', 1, classic(), [
    P.fireHelmet('r', 'O'),
    suit({ main: 'S', belly: 'S', deco: anyOf((_x, y) => (y === 16 || y === 19 ? 'y' : undefined), buttons('k', 25)) }),
    P.hose('r', 'l'),
  ]),
  o('detective', 'DETECTIVE', 1, BROWN, [
    P.deerstalker('S', 'n'),
    suit({ main: 'T', belly: 'T', deco: anyOf(belt('N', 'O', 18), buttons('N', 25), (x, y) => (y === 13 && x >= 18 ? 'S' : undefined)) }),
    P.magnifier('O', 'C'),
  ]),
  o('mechanic', 'MECHANIC', 1, classic(), [
    P.capBack('b', 'B'),
    suit({ main: 'b', belly: 'b', deco: anyOf((x, y) => (rnd(x, y, 7) < 0.08 ? 'k' : undefined), pocket('B')) }),
    P.wrench('l'),
  ]),
  o('painter', 'PAINTER', 1, fur('#c9d1dd', '#566c86', '#f4f4f4'), [
    P.beret('r'),
    suit({ main: 'Q', belly: 'Q', deco: splotches }),
    P.mustache('k'),
    P.paintbrush('n', 'c'),
  ]),
  o('scientist', 'SCIENTIST', 1, SNOW, [
    P.goggles('l', 'C'),
    suit({ main: 'w', belly: 'w', deco: anyOf(pocket('l'), buttons('l', 25), (x, y) => (y === 13 && x >= 22 && x <= 24 ? 'c' : undefined)) }),
    P.flask('i', 'L'),
  ]),
  o('lifeguard', 'LIFEGUARD', 1, GINGER, [
    P.shades('k', 'B'),
    suit({ main: 'r', belly: 'r', top: 14, deco: emblem(['.w.', 'www', '.w.'], 19, 15, {}) }),
    whistle(),
  ]),
  o('skater', 'SKATER', 1, tone('#94b0c2'), [
    P.capBack('G', 'F'),
    suit({ main: 'v', belly: 'v', deco: anyOf(pocket('e', 20, 17), (x, y) => (y === 13 && x >= 15 && x <= 18 ? 'e' : undefined)) }),
    P.skateboard('h', 'y'),
  ]),
  o('gardener', 'GARDENER', 1, BROWN, [
    P.bucketHat('z', 'F'),
    suit({ main: 'G', belly: 'L', deco: anyOf(pocket('F', 20, 16)) }),
    P.flower('G', 'h'),
  ]),
  o('mime', 'MIME', 1, fur('#c9d1dd', '#1a1c2c', '#f4f4f4'), [
    P.beret('k', 'd'),
    P.facePaint('w', 'r'),
    suit({ main: 'w', belly: 'w', deco: stripes('k', 2) }),
    P.scarf('r', 'R', true),
  ]),
  o('explorer', 'EXPLORER', 1, GINGER, [
    P.backpack('n', 'N'),
    P.pithHelmet('T', 'N'),
    suit({ main: 'S', belly: 'S', deco: anyOf(pocket('J', 18, 14), pocket('J', 22, 14), belt('N', 'O')) }),
  ]),
  o('sailor', 'SAILOR', 1, classic(), [
    P.sailorHat(),
    suit({ main: 'w', belly: 'w', deco: (x, y) => (y <= 14 ? 'B' : y === 15 && x < 20 ? 'B' : undefined) }),
    P.at('body', 23, 13, ['kkk', 'krk', '.k.']),
  ]),
  o('courier', 'PIZZA COURIER', 1, BROWN, [
    P.cap('r', 'w', 'r', 'w'),
    suit({ main: 'r', belly: 'r', deco: emblem(['.yy', 'yry', 'yy.'], 18, 15, {}) }),
    P.pizzaBox('T', 'r'),
  ]),
  o('construction', 'CONSTRUCTION', 1, classic(), [
    P.hardHat('y'),
    suit({ main: 'o', belly: 'o', deco: (x, y) => (y === 16 || y === 19 || x === 15 ? 'Y' : undefined) }),
    hammer('l'),
  ]),
  o('fisherman', 'FISHERMAN', 1, DARK, [
    P.bucketHat('y', 'O'),
    suit({ main: 'y', belly: 'y', deco: buttons('O', 25) }),
    P.fishingRod('N'),
  ]),
  o('nerd', 'NERD', 1, tone('#d6a77a'), [
    P.roundGlasses('k'),
    suit({ main: 'G', belly: 'G', deco: (x, y) => ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0 ? 'F' : undefined) }),
    P.bowtie('r'),
  ]),
  o('pajamas', 'SLEEPYHEAD', 1, tone('#b8a2ea', 0.5), [
    P.nightcap('b', 'Y', 'w'),
    suit({ main: 'b', belly: 'c', deco: (x, y) => ((x * 3 + y * 5) % 7 === 0 ? 'Y' : undefined) }),
    P.lantern('k', 'y'),
  ]),
  o('tourist', 'TOURIST', 1, fur('#f8b48c', '#7a3a20', '#fff0dc'), [
    P.bucketHat('s', 'r'),
    P.shades('k', 'k'),
    suit({ main: 'c', belly: 'c', deco: (x, y) => (rnd(Math.floor(x / 2), Math.floor(y / 2), 31) < 0.3 ? ((x + y) % 2 ? 'h' : 'y') : undefined) }),
    camera(),
  ]),
  o('cop', 'COP COON', 1, classic(), [
    P.policeCap('B', 'k', 'O'),
    suit({ main: 'B', belly: 'b', deco: anyOf(emblem(['.O.', 'OOO', '.O.'], 19, 14, {}), buttons('O', 25)) }),
    P.necktie('k'),
  ]),
  o('ceo', 'CEO', 1, SNOW, [
    suit({ main: 'd', belly: 'd', deco: (x, y) => (x >= 22 && y <= 17 ? 'w' : undefined) }),
    P.necktie('r', 'R'),
    briefcase(),
  ]),
  o('jailbird', 'JAILBIRD', 1, classic(), [
    suit({ main: 'o', belly: 'o', deco: anyOf(emblem(['kkkk', 'kwwk', 'kkkk'], 18, 15, {}), (_x, y) => (y === 13 ? 'O' : undefined)) }),
    ballChain(),
  ]),
  o('farmer', 'FARMER', 1, GINGER, [
    P.strawHat('s', 'r'),
    suit({ main: 'A', belly: 'A', deco: anyOf(straps('O'), (x, y) => (y <= 15 && (x < 16 || x > 24) ? 'r' : undefined)) }),
    P.fork('l', 'n'),
  ]),

  // ---------------------------------------------------------------- epic
  o('ninja', 'NINJA', 2, DARK, [
    P.hood({ main: 'k', face: 'k', bottom: 5 }),
    P.headband('r'),
    suit({ main: 'd', belly: 'd', deco: belt('r', 'r') }),
    P.katana('l', 'r'),
  ]),
  o('knight', 'KNIGHT', 2, classic(), [
    P.knightHelmet('l', 'r'),
    P.plume('r', 'R'),
    suit({ main: 'l', belly: 'l', deco: anyOf(emblem(['.r.', 'rrr', '.r.', '.r.'], 19, 14, {}), (x, y) => (y === 17 || x === 15 ? 'g' : undefined)) }),
    P.sword('l', 'n'),
  ]),
  o('samurai', 'SAMURAI', 2, BROWN, [
    P.kabuto('R', 'O', 'k'),
    suit({ main: 'R', belly: 'r', deco: (x, y) => (y % 2 === 0 ? 'k' : x % 4 === 0 ? 'O' : undefined) }),
    P.katana('l', 'B'),
  ]),
  o('viking', 'VIKING', 2, GINGER, [
    P.vikingHelmet('l', 'Q', 'N'),
    P.beard('o', 'O'),
    suit({ main: 'n', belly: 'N', deco: anyOf((x, y) => (y === 13 || (y === 14 && x % 2) ? 'J' : undefined), belt('k', 'l')) }),
    P.axe('l', 'n'),
  ]),
  o('wizard', 'WIZARD', 2, fur('#94b0c2', '#333c57', '#f4f4f4'), [
    P.wizardHat('b', 'y', 'Y'),
    P.beard('w', 'l'),
    suit({ main: 'b', belly: 'B', deco: (x, y) => ((x * 5 + y * 3) % 11 === 0 ? 'Y' : undefined) }),
    P.staff('n', 'C'),
  ], { effect: 'sparkle' }),
  o('astronaut', 'ASTRONAUT', 2, classic(), [
    P.jetpack('l', 'r'),
    P.bubble('l'),
    suit({ main: 'w', belly: 'w', deco: anyOf(emblem(['rcb', 'yyy'], 22, 15, {}), (x, y) => (y === 13 ? 'l' : x === 15 ? 'l' : undefined)) }),
  ]),
  o('diver', 'DEEP DIVER', 2, BROWN, [
    P.divingHelmet('O', 'D'),
    suit({ main: 'J', belly: 'J', deco: anyOf(belt('k', 'l', 18), (_x, y) => (y === 13 ? 'O' : undefined)) }),
  ], { effect: 'bubbles' }),
  o('rockstar', 'ROCK STAR', 2, fur('#8b93a8', '#1a1c2c', '#c9d1dd'), [
    P.mohawk('O', 'y'),
    P.starShades('h'),
    suit({ main: 'k', belly: '', deco: (x, y) => (y === 13 && x % 2 ? 'l' : undefined) }),
    P.guitarHeld('r'),
  ], { effect: 'notes' }),
  o('superhero', 'SUPER COON', 2, classic(), [
    P.cape('r', 'R'),
    P.domino('r'),
    suit({ main: 'b', belly: 'b', deco: anyOf(emblem(['kkkkk', 'kyyyk', 'kyrrk', 'kyyyk', '.kkk.'], 18, 14, {}), belt('y', 'y', 20)) }),
    P.clasp('y', 'r'),
  ]),
  o('robot', 'ROBOT', 2, fur('#94b0c2', '#333c57', '#c9d1dd', '#f4f4f4', '#73eff7'), [
    P.antenna('l', 'r'),
    P.visor('k', 'C'),
    suit({ main: 'l', belly: 'g', deco: (x, y) => (y === 15 && x >= 19 && x <= 23 ? ['r', 'y', 'L', 'c', 'r'][x - 19] : (x + y) % 6 === 0 && y % 3 === 0 ? 'w' : x % 5 === 0 ? 'g' : undefined) }),
  ], { effect: 'glow', glow: '#73eff7' }),
  o('pirate', 'PIRATE', 2, GINGER, [
    P.tricorn('k', 'O', 'w'),
    P.eyepatch('k'),
    suit({ main: 'R', belly: 'w', deco: anyOf(buttons('O', 22), belt('k', 'O')) }),
    cutlass(),
  ]),
  o('sushichef', 'SUSHI CHEF', 2, SNOW, [
    P.headband('w', true, 'r'),
    suit({ main: 'w', belly: 'w', deco: (x, y) => (y === 13 || x === y + 6 || x === y + 7 ? 'B' : undefined) }),
    P.fish('o', 'w'),
  ]),
  o('dj', 'DJ', 2, fur('#566c86', '#1a1c2c', '#94b0c2', '#f4f4f4', '#ff77c8'), [
    P.headphones('k', 'M'),
    P.shades('k', 'C'),
    suit({ main: 'M', belly: 'M', deco: (_x, y) => (y === 17 ? 'C' : y === 15 ? 'h' : undefined) }),
    P.microphone('l', 'k'),
  ], { effect: 'notes' }),
  o('magician', 'MAGICIAN', 2, SNOW, [
    P.cape('k', 'r'),
    P.topHat('k', 'r', 'd'),
    suit({ main: 'k', belly: 'k', deco: (x, y) => (x >= 22 && y <= 17 ? 'w' : undefined) }),
    P.bowtie('r'),
    P.wand('k', 'w'),
  ], { effect: 'sparkle' }),
  o('pilot', 'AIR ACE', 2, BROWN, [
    P.pilotCap('n', 'C'),
    suit({ main: 'N', belly: 'N', deco: (x, y) => (y <= 14 ? 'Q' : x === 20 ? 'k' : undefined) }),
    P.scarf('w', 'w', true),
  ]),
  o('racer', 'RACER', 2, classic(), [
    P.helmetCut('r', { bottom: 7, deco: (x, y) => (y === 7 && x >= 17 ? 'k' : y === 6 && x >= 18 ? 'c' : x === 22 || x === 23 ? 'w' : undefined) }),
    suit({ main: 'r', belly: 'w', deco: anyOf(number('1', 16, 14, 'k'), (x) => (x === 21 ? 'w' : undefined)) }),
  ], { effect: 'trail' }),
  o('gladiator', 'GLADIATOR', 2, GINGER, [
    P.helmetCut('O', { bottom: 6, deco: (_x, y) => (y === 6 ? 'S' : undefined) }),
    P.plume('r', 'R'),
    suit({ main: 'n', belly: '', deco: (x, y) => (x === y + 3 || x === y + 4 ? 'N' : y === 20 ? 'O' : undefined) }),
    P.trident('l', 'n'),
  ]),
  o('musketeer', 'MUSKETEER', 2, BROWN, [
    P.cowboyHat('b', 'y', 'B'),
    P.at('head', 13, -4, ['....kk', '..kkwk', '.kwwk.', 'kwwk..', 'kkk...']),
    suit({ main: 'b', belly: 'b', deco: anyOf(emblem(['.y.', 'yyy', '.y.', '.y.'], 19, 14, {}), (_x, y) => (y === 13 ? 'w' : undefined)) }),
    rapier(),
  ]),
  o('jester', 'JESTER', 2, fur('#c9d1dd', '#3b1f5c', '#f4f4f4'), [
    P.jesterHat('r', 'y', 'O'),
    suit({ main: 'r', belly: 'r', deco: (x, y) => ((Math.floor((x + y) / 3) + Math.floor((x - y + 30) / 3)) % 2 ? 'y' : undefined) }),
    P.tailBell('O'),
  ]),
  o('ranger', 'RANGER', 2, BROWN, [
    P.quiver('n', 'r'),
    P.hood({ main: 'F', bottom: 5 }),
    suit({ main: 'G', belly: 'F', deco: anyOf(belt('N', 'O'), (_x, y) => (y === 13 ? 'F' : undefined)) }),
    bowString(),
  ]),
  o('steampunk', 'STEAMPUNK', 2, GINGER, [
    P.jetpack('O', 'N', 'l'),
    P.topHat('N', 'O', 'n'),
    P.goggles('O', 'y', 'N'),
    suit({ main: 'N', belly: 'n', deco: anyOf(buttons('O', 22), (_x, y) => (y === 13 ? 'O' : undefined)) }),
    pocketWatch(),
  ]),
  o('hacker', 'HACKER', 2, DARK, [
    P.hood({ main: 'd', bottom: 4 }),
    P.shades('k', 'L'),
    suit({ main: 'd', belly: 'a', deco: (x, y) => (rnd(x, y, 77) < 0.12 && y > 14 ? 'G' : undefined) }),
  ], { effect: 'glow', glow: '#38b764' }),
  o('skier', 'SKI BUM', 2, classic(), [
    P.beanie('r', 'w', 'w'),
    P.goggles('k', 'O'),
    suit({ main: 'c', belly: 'c', deco: (x, y) => (y === 15 ? 'w' : y === 16 ? 'r' : x === 25 ? 'A' : undefined) }),
  ], { effect: 'snow' }),
  o('scuba', 'SCUBA', 2, classic(), [
    P.tank('y', 'l'),
    P.snorkelMask('k', 'C', 'y'),
    suit({ main: 'k', belly: 'd', deco: (x, y) => (y === 16 || x === 26 ? 'y' : undefined) }),
  ], { effect: 'bubbles' }),
  o('shark', 'SHARK SUIT', 2, classic(), [
    P.sharkHood('A', 'w'),
    P.finTop('A'),
    P.at('head', 18, 10, ['kwkwkwkwk']),
    suit({ main: 'A', belly: 'w' }),
  ]),
  o('dino', 'DINO SUIT', 2, classic(), [
    P.dinoSpikes('O'),
    P.hood({ main: 'G', bottom: 5, ears: false }),
    suit({ main: 'G', belly: 'L', deco: (x, y) => (y === 13 && x % 3 === 0 ? 'O' : undefined) }),
  ]),
  o('buzzcoon', 'BUZZ COON', 2, fur('#ffcd75', '#1a1c2c', '#fff3b0'), [
    P.fairyWings('i', 'C'),
    P.at('head', 18, -4, ['k....k', '.k..k.', '..kk..']),
    suit({ main: 'y', belly: 'y', deco: (x) => (x % 4 < 2 ? 'k' : undefined) }),
  ]),
  o('clown', 'CLOWN', 2, SNOW, [
    P.afro('h', 'c'),
    P.facePaint('w', 'r'),
    P.noseBall('r'),
    suit({ main: 'y', belly: 'y', deco: (x, y) => (x % 3 === 0 && y % 3 === 0 ? 'r' : (x + 1) % 3 === 0 && (y + 1) % 3 === 0 ? 'c' : undefined) }),
    P.balloon('r'),
  ]),
  o('mountie', 'MOUNTIE', 2, BROWN, [
    P.cowboyHat('n', 'O', 'N'),
    suit({ main: 'r', belly: 'r', deco: anyOf(belt('N', 'O', 18), buttons('O', 24)) }),
  ]),
  o('boxer', 'BOXER', 2, GINGER, [
    P.headband('r', false),
    suit({ main: 'r', belly: 'r', top: 18, deco: (_x, y) => (y === 18 ? 'w' : undefined) }),
    P.boxingGlove('r'),
  ]),

  // ---------------------------------------------------------------- legendary
  o('king', 'RACCOON KING', 3, classic(), [
    P.cape('r', 'w'),
    P.crown('O', 'r'),
    suit({ main: 'R', belly: 'R', deco: (x, y) => (y <= 14 ? (x % 2 ? 'w' : 'k') : undefined) }),
    P.scepter('O', 'c'),
  ], { effect: 'sparkle' }),
  o('trashking', 'TRASH KING', 3, fur('#6a8f3a', '#16382c', '#a7f070'), [
    P.cape('a', 'z'),
    P.crown('l', 'L', 'w'),
    suit({ main: 'd', belly: 'a', deco: (x, y) => (rnd(x, y, 5) < 0.1 ? 'z' : undefined) }),
    P.trashLid('l'),
  ], { effect: 'glow', glow: '#a7f070' }),
  o('angel', 'ANGEL', 3, fur('#f4f4f4', '#94b0c2', '#ffffff', '#ffffff'), [
    P.wings('w', 'w', 'l'),
    P.halo('O'),
    suit({ main: 'w', belly: 'w', deco: belt('O', 'y', 18) }),
  ], { effect: 'glow', glow: '#fff3b0' }),
  o('demon', 'DEMON', 3, fur('#b13e53', '#1a1c2c', '#ff4b1f', '#ffcd75', '#ffa300'), [
    P.batWings('R', 'k'),
    P.horns('Q', 'T'),
    suit({ main: 'k', belly: 'R', deco: belt('R', 'q', 19) }),
    P.fork('d', 'k'),
  ], { effect: 'flames' }),
  o('dragonknight', 'DRAGON KNIGHT', 3, DARK, [
    P.dragonWings('R', 'r'),
    P.knightHelmet('R', 'O', 'r'),
    suit({ main: 'R', belly: 'O', deco: (x, y) => (y % 2 === 0 && x % 2 === 0 ? 'q' : undefined) }),
    P.sword('C', 'k', 'O'),
  ], { effect: 'flames' }),
  o('archmage', 'ARCHMAGE', 3, fur('#c9d1dd', '#3b1f5c', '#f4f4f4'), [
    P.cape('u', 'O'),
    P.wizardHat('u', 'O', 'C'),
    P.beard('w', 'i'),
    suit({ main: 'u', belly: 'e', deco: (x, y) => ((x * 5 + y * 3) % 9 === 0 ? 'C' : undefined) }),
    P.staff('O', 'h'),
  ], { effect: 'sparkle' }),
  o('mecha', 'MECHA', 3, fur('#333c57', '#1a1c2c', '#566c86', '#94b0c2', '#ff4b1f'), [
    P.jetpack('a', 'q', 'q'),
    P.antenna('a', 'q'),
    P.visor('k', 'q'),
    suit({ main: 'a', belly: 'd', deco: (x, y) => ((x === 16 || x === 24) && y % 2 ? 'q' : y === 17 ? 'g' : undefined) }),
  ], { effect: 'trail' }),
  o('fairy', 'FAIRY QUEEN', 3, tone('#ffd0e8', 0.4), [
    P.fairyWings('C', 'h'),
    P.flowerCrown('G', 'h', 'y'),
    P.tutu('h', 'P'),
    P.wand('O', 'Y'),
  ], { effect: 'sparkle' }),
  o('goldknight', 'GOLDEN KNIGHT', 3, classic(), [
    P.cape('w', 'l'),
    P.knightHelmet('O', 'w', 'Y'),
    P.plume('w', 'l'),
    suit({ main: 'O', belly: 'y', deco: emblem(['.w.', 'www', '.w.'], 19, 14, {}) }),
    P.shield('O', 'Y', 'w'),
  ], { effect: 'glow', glow: '#ffcd75' }),
  o('pharaoh', 'PHARAOH', 3, fur('#d6a77a', '#1a1c2c', '#fff6e0'), [
    P.nemes('O', 'b', 'O'),
    suit({ main: 'w', belly: 'w', deco: (_x, y) => (y <= 15 ? (y % 2 ? 'b' : 'O') : y === 18 ? 'O' : undefined) }),
    P.crook('O', 'b'),
  ], { effect: 'sparkle' }),
  o('stormbringer', 'STORMBRINGER', 3, fur('#c9d1dd', '#333c57', '#f4f4f4'), [
    P.cape('r', 'R'),
    P.vikingHelmet('l', 'w', 'O'),
    P.beard('y', 'O'),
    suit({ main: 'a', belly: 'd', deco: (x, y) => (y === 15 && x % 3 === 0 ? 'l' : undefined) }),
    hammer('l'),
  ], { effect: 'glow', glow: '#73eff7' }),
  o('seaking', 'SEA KING', 3, tone('#5fd3c9'), [
    P.crown('C', 'h', 'w'),
    suit({ main: 'D', belly: 't', top: 17, deco: (x, y) => (y === 17 ? (x % 3 === 0 ? 'P' : 'h') : (x + (y % 2) * 2) % 4 === 0 ? 'A' : undefined) }),
    P.trident('O', 'O'),
  ], { effect: 'bubbles' }),
  o('shadowninja', 'SHADOW NINJA', 3, fur('#1a1c2c', '#0e0f1a', '#333c57', '#b05ccf', '#7a4a8f'), [
    P.hood({ main: 'k', face: 'k', bottom: 5 }),
    P.headband('v', true, 'e'),
    suit({ main: 'H', belly: 'H', deco: belt('v', 'v') }),
    P.katana('v', 'k'),
  ], { effect: 'trail' }),
  o('cyberronin', 'CYBER RONIN', 3, fur('#24305e', '#0e0f1a', '#3b5dc9', '#73eff7', '#ff77c8'), [
    P.kabuto('k', 'h', 'C'),
    P.visor('k', 'h'),
    suit({ main: 'I', belly: 'H', deco: (x, y) => (y % 2 === 0 ? (x % 2 ? 'C' : undefined) : undefined) }),
    P.katana('h', 'C'),
  ], { effect: 'glow', glow: '#ff77c8' }),
  o('spaceace', 'SPACE ACE', 3, classic(), [
    P.jetpack('O', 'w', 'C'),
    P.bubble('O', 'Y'),
    suit({ main: 'w', belly: 'O', deco: anyOf(emblem(['.y.', 'yOy', '.y.'], 19, 14, {}), (x, y) => (y === 13 || x === 25 ? 'O' : undefined)) }),
  ], { effect: 'trail' }),
];

