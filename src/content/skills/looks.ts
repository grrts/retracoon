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
  ice_cube: 'cube slushie freeze frozen prison kelvin absolute',
  icicle: 'icicle glacial cryo glacier hail',
  hydrant: 'hydrant wet willy',
  nail: 'nail rusty',
  scissors: 'cut cuts paper precise',
  shards: 'shards shatter tin',
  caltrops: 'caltrops trap',
  bottle: 'bottle',
  bread: 'bread moldy ferment leftovers',
  spit: 'spit raspberry hiss',
  sneeze: 'sneeze',
  spray_can: 'spray pepper graffiti bug',
  germ: 'germs plague epidemic pandemic contaminate necrosis blight nightshade',
  soda_can: 'fizzy root beer drink',
  fireball: 'fireball dragon',
  toxic_cloud: 'toxic miasma rot',
  phoenix: 'phoenix rebirth',
  thorn_vine: 'thorn thornmail',
  vial: 'bloodletting rite pact sanguine hemorrhage hemokinesis exsanguinate sweat',
  meteor: 'meteor starfall',
  volcano: 'inferno cataclysm burn apocalypse',
  snowman: 'snow cold winter',
  lava_drop: 'hot soup grease frostfire',
  hammer: 'hammer judgement reckoning',
  axe: 'axe',
  cleaver: 'cleaver butcher cleave chop eviscerate flay',
  boot: 'kick',
  uppercut: 'haymaker punch sucker one cheap jab poke combo',
  cracked_skull: 'splitter crunch thick',
  wrecking_ball: 'wrecking ball',
  anvil: 'anvil',
  brick: 'brick rubble',
  pipe: 'pipe',
  crater: 'crater pound',
  quake: 'earthquake quake tectonic aftershock shockwave avalanche ragnarok earth',
  mountain: 'mountain planet cracker titan colossus colossal giant',
  guillotine: 'guillotine executioner decimate finisher',
  dumbbell: 'grit hardy',
  bulldozer: 'bulldoze compactor juggernaut unstoppable rampage',
  ram_head: 'ram battering charge',
  helmet: 'tackle check',
  belly: 'belly sumo flop',
  bear_hug: 'hug headlock grip kraken suplex piledriver',
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
  sneaker: 'dash rush scamper hustle zip run steps',
  zigzag: 'lightning reflex quicksilver momentum',
  hourglass: 'time',
  stopwatch: 'stop second quickdraw overclock frame',
  afterimage: 'afterimage image phantom shadow blur',
  blink: 'blink flash flicker',
  rocket: 'rocket jet warp speed sonic',
  cyclone: 'cyclone whirling',
  wind_blade: 'razor scythe wind',
  banana_peel: 'banana pratfall',
  smoke_puff: 'smoke',
  wings: 'angel walker',
  card: 'card shark flush',
  dice_pair: 'snake dice',
  slot_machine: 'slot jackpot win gambler chaos',
  horseshoe: 'horseshoe',
  clover: 'clover leaf lucky lady karma',
  rabbit_foot: 'rabbit',
  wishbone: 'wishbone',
  roulette: 'roulette wheel fortune fate',
  bullseye: 'bullseye',
  crosshair: 'deadeye weak spot assassinate',
  moneybag: 'bank bankroll loan pay bribe treasure midas golden pickpocket magpie',
  coin_stack: 'penny goose coin',
  cash_cannon: 'cannon cannonball',
  chess_king: 'checkmate',
  star_shower: 'shower rain destiny serendipity',
  heart_plus: 'regrowth life heartbeat pulse growth adrenaline',
  blood_bag: 'transfusion',
  leech: 'leech',
  bite: 'bite gnaw nibble kiss bloodsucker gorge feast',
  tree: 'tree',
  bloom: 'bloom',
  angel: 'holy saint divine miracle ward immortal undying',
  black_hole: 'hole oblivion horizon extinction mass bang',
  sun_face: 'sun solar supernova smite light spotlight',
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
