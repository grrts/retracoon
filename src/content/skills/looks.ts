// Every skill in the big book wears its own icon. Words in its name pick the glyph
// ('ICE CUBE' is an ice cube, 'GUILLOTINE' a guillotine); the ink named in its sk() look
// paints it, with an accent ink that sets it off. A skill no word places keeps the icon
// its look names. No two skills are drawn the same, compared as drawn.
import { I } from './base';
import { ICONS, INKS, ink } from './icons';
import { GLYPHS } from './glyphs';
import { paint } from '../items/sprites/shape';

// glyph or icon: 'word word ...'
const RULES: Record<string, string> = {
  // new glyphs
  lighter: 'lighter flick ignite',
  coals: 'coals stoke combustion pyroclasm heat',
  ice_cube: 'cube slushie freeze frozen',
  icicle: 'icicle glacial cryo',
  hydrant: 'hydrant wet willy',
  nail: 'nail rusty',
  scissors: 'cut cuts paper precise',
  shards: 'shards shatter tin',
  caltrops: 'caltrops',
  bottle: 'bottle',
  bread: 'bread moldy ferment leftovers',
  spit: 'spit raspberry',
  sneeze: 'sneeze',
  spray_can: 'spray pepper graffiti bug',
  germ: 'germs plague epidemic pandemic contaminate necrosis blight',
  soda_can: 'fizzy root beer drink',
  fireball: 'fireball',
  toxic_cloud: 'toxic miasma rot',
  phoenix: 'phoenix rebirth',
  thorn_vine: 'thorn thornmail',
  vial: 'bloodletting rite pact sanguine',
  meteor: 'meteor starfall',
  volcano: 'inferno cataclysm burn apocalypse',
  snowman: 'snow cold winter',
  lava_drop: 'hot soup grease frostfire',
  hammer: 'hammer judgement reckoning',
  axe: 'axe',
  cleaver: 'cleaver butcher cleave chop',
  boot: 'kick',
  uppercut: 'haymaker punch sucker one',
  cracked_skull: 'splitter crunch thick',
  wrecking_ball: 'wrecking ball',
  anvil: 'anvil',
  brick: 'brick rubble',
  pipe: 'pipe',
  crater: 'crater pound',
  quake: 'earthquake quake tectonic aftershock shockwave',
  mountain: 'mountain planet cracker',
  guillotine: 'guillotine executioner decimate finisher',
  dumbbell: 'grit hardy',
  bulldozer: 'bulldoze compactor juggernaut unstoppable',
  ram_head: 'ram battering charge',
  helmet: 'tackle check',
  belly: 'belly sumo flop',
  bear_hug: 'hug headlock grip kraken',
  chain: 'chain',
  spear: 'spear lance lunge',
  ninja_star: 'ninja',
  crossed_swords: 'duel brawl blades alley',
  flexed_arm: 'brawler stretch flex vigor',
  round_shield: 'shield',
  tower_shield: 'bulwark bastion',
  castle: 'fortress citadel fort',
  brick_wall: 'wall stonewall immovable',
  turtle_shell: 'shell turtle',
  quills: 'porcupine spiked',
  breastplate: 'armor iron hide skin',
  knight_helm: 'guardian stalwart unyielding',
  mirror: 'mirror',
  spike_shield: 'spike',
  sandbags: 'bunker entrench hunker brace',
  gust: 'tailwind gale slipstream',
  tornado: 'tornado hurricane tempest',
  sneaker: 'dash rush scamper hustle zip run',
  zigzag: 'lightning reflex',
  hourglass: 'time',
  stopwatch: 'stop second quickdraw',
  afterimage: 'afterimage image phantom',
  blink: 'blink flash flicker',
  rocket: 'rocket jet warp speed',
  cyclone: 'cyclone whirling',
  wind_blade: 'razor scythe wind',
  banana_peel: 'banana pratfall',
  smoke_puff: 'smoke',
  wings: 'angel walker',
  card: 'card shark',
  dice_pair: 'snake',
  slot_machine: 'slot jackpot win',
  horseshoe: 'horseshoe',
  clover: 'clover leaf lucky',
  rabbit_foot: 'rabbit',
  wishbone: 'wishbone',
  roulette: 'roulette wheel',
  bullseye: 'bullseye',
  crosshair: 'deadeye weak spot assassinate',
  moneybag: 'bank bankroll loan pay bribe',
  coin_stack: 'penny',
  cash_cannon: 'cannon cannonball',
  chess_king: 'checkmate',
  star_shower: 'shower',
  heart_plus: 'regrowth life',
  blood_bag: 'transfusion',
  leech: 'leech',
  bite: 'bite gnaw nibble kiss',
  tree: 'tree',
  bloom: 'bloom',
  angel: 'holy saint divine miracle',
  black_hole: 'hole oblivion horizon',
  sun_face: 'sun solar',
  skull_crown: 'king crimson',
  // the existing icons, for names that fit them better
  flame: 'fire ember flare',
  flake: 'frost chill ice blizzard',
  drop: 'blood bloodbath',
  eye: 'eye glare',
  dice: 'dice',
  bolt: 'thunder storm zap',
  feather: 'feather',
  fist: 'fist fists',
  fang: 'fang venom',
  moon: 'moon',
  bomb: 'bomb burst',
  wave: 'tide',
  crown: 'god',
  ghost: 'ghost spirit',
};

const FOIL: Record<string, string> = {
  fire: 'gold', ice: 'holy', poison: 'void', blood: 'shadow', gold: 'blood', shadow: 'neon', holy: 'gold', earth: 'rust',
  storm: 'gold', nature: 'earth', neon: 'void', void: 'neon', steel: 'blood', rose: 'holy', sea: 'steel', rust: 'steel',
};
const INK_NAMES = Object.keys(INKS);

const key = (rows: string[]) => rows.join('|');
const drawn = new Set<string>([...Object.values(I), ...Object.values(ICONS)].map(key));
const worn = new Map<string, number>();
export const SKILL_LOOKS = new Map<string, string>(); // skill id -> 'glyph/main/accent' or 'icon/ink'

const words = (name: string) => new Set(name.toLowerCase().split(/[^a-z]+/).filter(Boolean));

// The icon a book skill is drawn with. look is its sk() look: 'icon' or 'icon/ink'.
export function skillIcon(id: string, name: string, look: string): string[] {
  const [shape, theme] = look.split('/');
  const main = theme ?? 'steel';
  const w = words(name);
  const has = (k: string) => w.has(k) || w.has(k + 's');
  const n = (s: string) => worn.get(s) ?? 0;
  const named = Object.entries(RULES).filter(([s, ks]) => (GLYPHS[s] || ICONS[s]) && ks.split(' ').some(has)).map(([s]) => s).sort((a, b) => n(a) - n(b));
  const order = [...named, shape, ...Object.keys(GLYPHS).sort((a, b) => n(a) - n(b)), ...Object.keys(ICONS)];
  const mains = [main, ...INK_NAMES.filter((i) => i !== main)];
  for (const s of order)
    for (const m of mains) {
      const accents = GLYPHS[s] ? [FOIL[m], ...INK_NAMES.filter((i) => i !== FOIL[m] && i !== m)] : [''];
      for (const a of accents) {
        const rows = GLYPHS[s] ? paint(GLYPHS[s], INKS[m], INKS[a]) : ink(ICONS[s], s === shape && !theme && m === main ? undefined : m);
        if (drawn.has(key(rows))) continue;
        drawn.add(key(rows));
        worn.set(s, n(s) + 1);
        SKILL_LOOKS.set(id, a ? `${s}/${m}/${a}` : `${s}/${m}`);
        return rows;
      }
    }
  throw new Error(`skill ${id}: no icon left`);
}
