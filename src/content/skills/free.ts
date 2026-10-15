// Open skills: no lock, any raccoon can be offered them. Each one starts a thread that
// the locked skills pull on later: fire, ice, bleed, poison, marks, block, shinies, combos.
import type { SkillDef } from '../types';
import { sk } from './book';

export const FREE_SKILLS: SkillDef[] = [
  // ---- fire: burn hits hard at the start of a foe's turn, then halves
  sk('ember_swipe', 'EMBER SWIPE', 'claw/fire', 1, 0, 'one', { dmg: [0.6, 0.1], apply: { burn: [3, 1] } }),
  sk('lighter_flick', 'LIGHTER FLICK', 'flame', 0, 2, 'one', { apply: { burn: [4, 2] } }),
  sk('hot_coals', 'HOT COALS', 'flame/fire', 2, 2, 'all', { dmg: 0.3, apply: { burn: [3, 1] } }),
  sk('grease_fire', 'GREASE FIRE', 'bomb/fire', 2, 3, 'all', { apply: { burn: [6, 2] } }),
  sk('stoke', 'STOKE', 'flame', 1, 1, 'one', { dmg: 0.5, per: { key: 'burn', mult: [0.08, 0.02] } }),
  sk('pepper_spray', 'PEPPER SPRAY', 'wave/fire', 1, 2, 'one', { apply: { burn: [3, 1], weak: 1 } }),
  sk('popcorn', 'POPCORN', 'bomb/gold', 2, 2, 'one', { dmg: 0.3, detonate: { key: 'burn', mult: [1.5, 0.5] } }),
  sk('pass_it_on', 'PASS IT ON', 'cantoss/fire', 1, 2, 'one', { dmg: 0.3, spread: 'burn' }),
  sk('hot_soup', 'HOT SOUP', 'snack/fire', 1, 3, 'self', { heal: [0.12, 0.03], self: { rage: 1 } }),

  // ---- ice: five chill freeze a foe solid for a turn
  sk('ice_cube', 'ICE CUBE', 'flake', 1, 0, 'one', { dmg: [0.55, 0.1], apply: { chill: 2 } }),
  sk('brain_freeze', 'BRAIN FREEZE', 'flake/ice', 1, 2, 'one', { apply: { chill: [3, 1] } }),
  sk('frost_breath', 'FROST BREATH', 'wave/ice', 2, 2, 'all', { dmg: 0.3, apply: { chill: [1, 1] } }),
  sk('slushie', 'SLUSHIE', 'snack/ice', 1, 3, 'self', { heal: [0.08, 0.03], self: { evade: 1 } }),
  sk('cold_shoulder', 'COLD SHOULDER', 'bash/ice', 1, 1, 'one', { dmg: 0.5, block: [3, 2], apply: { chill: 1 } }),
  sk('wet_willy', 'WET WILLY', 'wave/sea', 1, 2, 'one', { apply: { chill: 2, weak: 1 } }),
  sk('hydrant', 'HYDRANT', 'wave/sea', 2, 3, 'all', { dmg: 0.3, shatter: true, apply: { chill: 1 } }),

  // ---- bleed: every hit that lands on a bleeding foe hurts it more
  sk('rusty_nail', 'RUSTY NAIL', 'claw/rust', 1, 0, 'one', { dmg: [0.55, 0.1], apply: { bleed: [2, 1] } }),
  sk('paper_cut', 'PAPER CUT', 'feather', 0, 1, 'one', { dmg: 0.25, apply: { bleed: [2, 1] } }),
  sk('claw_rake', 'CLAW RAKE', 'claw/blood', 2, 1, 'one', { dmg: 0.35, hits: [3, 1], apply: { bleed: 1 } }),
  sk('tin_shards', 'TIN SHARDS', 'shrapnel/steel', 2, 2, 'all', { dmg: 0.25, apply: { bleed: [2, 1] } }),
  sk('caltrops', 'CALTROPS', 'spikes/steel', 1, 3, 'all', { apply: { bleed: [2, 1] } }),
  sk('bottle_smash', 'BOTTLE SMASH', 'bomb/sea', 1, 1, 'one', { dmg: [0.9, 0.15], apply: { bleed: 1 }, hpCost: 1 }),

  // ---- poison
  sk('moldy_bread', 'MOLDY BREAD', 'sludge/poison', 1, 1, 'one', { apply: { poison: [3, 1], weak: 1 } }),
  sk('spit', 'SPIT', 'wave/poison', 0, 1, 'one', { apply: { poison: [2, 1] } }),
  sk('ferment', 'FERMENT', 'sludge', 1, 2, 'one', { dmg: [0.6, 0.1], per: { key: 'poison', mult: 0.1 } }),
  sk('sneeze', 'SNEEZE', 'burp/poison', 1, 2, 'all', { dmg: 0.2, apply: { poison: 1, weak: 1 } }),
  sk('bug_spray', 'BUG SPRAY', 'wave/poison', 2, 3, 'all', { detonate: { key: 'poison', mult: [1, 0.5] } }),
  sk('germs', 'GERMS', 'sludge/nature', 1, 2, 'one', { dmg: 0.3, apply: { poison: 2 }, spread: 'poison' }),
  sk('fizzy_drink', 'FIZZY DRINK', 'bomb/poison', 0, 3, 'self', { ap: 1, self: { poison: 2 } }, undefined, 1),

  // ---- marks and sure crits
  sk('eye_contact', 'EYE CONTACT', 'eye', 0, 2, 'one', { apply: { mark: [1, 1] } }),
  sk('spotlight', 'SPOTLIGHT', 'sun', 1, 3, 'all', { apply: { mark: 1, vuln: 1 } }),
  sk('focus_up', 'FOCUS UP', 'eye/gold', 1, 2, 'self', { self: { focus: [1, 1] } }),
  sk('glare', 'GLARE', 'eye/fire', 0, 2, 'one', { apply: { mark: 1, weak: 1 } }),
  sk('graffiti', 'GRAFFITI', 'star/neon', 1, 2, 'all', { apply: { mark: 1 } }),
  sk('rally', 'RALLY', 'howl/gold', 1, 3, 'self', { self: { rage: 1, focus: 1 } }),

  // ---- block
  sk('pizza_box', 'PIZZA BOX', 'guard/earth', 1, 0, 'self', { block: [5, 2], self: { thorns: 1 } }),
  sk('shield_bash', 'SHIELD BASH', 'bash/steel', 1, 1, 'one', { dmg: 0.3, blockDmg: [0.4, 0.15] }),
  sk('hunker', 'HUNKER', 'curlup/earth', 2, 2, 'self', { block: [10, 4], self: { regen: 2 } }),
  sk('brace', 'BRACE', 'guard/steel', 0, 3, 'self', { block: [4, 2] }),
  sk('box_fort', 'BOX FORT', 'spikes/earth', 2, 2, 'self', { block: [9, 3], self: { thorns: [2, 1] } }),
  sk('rat_trap', 'RAT TRAP', 'spikes/rust', 1, 2, 'self', { block: 2, self: { thorns: [4, 2] } }),
  sk('backflip', 'BACKFLIP', 'feather/storm', 1, 2, 'self', { block: [3, 2], self: { evade: 1 } }),
  sk('quick_fix', 'QUICK FIX', 'cross/steel', 0, 4, 'self', { block: [6, 3], heal: 0.05 }),
  sk('pratfall', 'PRATFALL', 'trick/neon', 1, 3, 'all', { block: [6, 2], apply: { weak: 1 } }),

  // ---- healing
  sk('leftovers', 'LEFTOVERS', 'snack/earth', 1, 3, 'self', { heal: [0.1, 0.04], self: { regen: [2, 1] } }),
  sk('power_nap', 'POWER NAP', 'moon', 2, 4, 'self', { heal: [0.2, 0.05], self: { vuln: 1 } }),
  sk('bandage', 'BANDAGE', 'cross', 1, 2, 'self', { heal: [0.08, 0.03], cleanse: true }),
  sk('catnap', 'CATNAP', 'moon/ice', 1, 4, 'self', { heal: [0.15, 0.05], self: { weak: 1 } }),
  sk('moonlight', 'MOONLIGHT', 'moon/holy', 1, 3, 'self', { self: { regen: [4, 2] } }),
  sk('stretch', 'STRETCH', 'feather/nature', 1, 3, 'self', { self: { regen: [3, 2] }, cleanse: true }),
  sk('root_beer', 'ROOT BEER', 'snack/earth', 1, 3, 'self', { heal: 0.08, ap: 1 }),
  sk('swipe_snack', 'SWIPE SNACK', 'claw/rose', 1, 1, 'one', { dmg: [0.6, 0.1], lifesteal: [0.3, 0.1] }),
  sk('nibble', 'NIBBLE', 'fang', 0, 1, 'one', { dmg: 0.2, lifesteal: 0.5 }),
  sk('roadkill', 'ROADKILL', 'skull/earth', 1, 2, 'one', { dmg: [0.6, 0.1], killHeal: [0.08, 0.03] }),

  // ---- speed, AP and combos
  sk('scamper', 'SCAMPER', 'feather/sea', 0, 2, 'self', { self: { evade: [1, 1] } }),
  sk('hustle', 'HUSTLE', 'bolt/storm', 0, 3, 'self', { ap: 1, hpCost: 2 }, undefined, 1),
  sk('jab_jab', 'JAB JAB', 'doubletap/storm', 1, 0, 'one', { dmg: [0.3, 0.05], hits: 3, scale: 'agi' }),
  sk('tail_whip', 'TAIL WHIP', 'sweep/earth', 1, 1, 'all', { dmg: [0.3, 0.08], scale: 'agi' }),
  sk('one_two', 'ONE TWO', 'doubletap/fire', 1, 0, 'one', { dmg: [0.45, 0.05], combo: [0.25, 0.05] }),
  sk('poke', 'POKE', 'quickjab/steel', 0, 1, 'one', { dmg: 0.25, combo: 0.1 }),
  sk('flail', 'FLAIL', 'flurry/rust', 1, 2, 'one', { dmg: [0.7, 0.1], allAp: true }),
  sk('whistle', 'WHISTLE', 'howl/sea', 0, 4, 'self', { refresh: true }, undefined, 1),
  sk('flying_kick', 'FLYING KICK', 'pounce/sea', 2, 2, 'one', { dmg: [1.2, 0.2], scale: 'agi', self: { evade: 1 } }),
  sk('raccoon_roll', 'RACCOON ROLL', 'curlup/storm', 2, 1, 'one', { dmg: [0.8, 0.15], block: [4, 2], scale: 'agi' }),
  sk('hiccup', 'HICCUP', 'burp', 0, 2, 'random', { dmg: 0.3, hits: [1, 1] }),
  sk('fling_trash', 'FLING TRASH', 'cantoss/earth', 1, 0, 'random', { dmg: 0.45, hits: 2 }),
  sk('chuck', 'CHUCK', 'cantoss/rust', 1, 1, 'one', { dmg: [0.7, 0.1], killAp: 1 }),
  sk('gnaw', 'GNAW', 'fang/earth', 1, 0, 'one', { dmg: [0.5, 0.1], stack: [0.1, 0.05] }),

  // ---- luck and shinies
  sk('coin_flip', 'COIN FLIP', 'coin/gold', 1, 0, 'one', { dmg: [0.8, 0.1], gamble: 0.5 }),
  sk('loaded_dice', 'LOADED DICE', 'dice', 2, 1, 'random', { dmg: 0.5, hits: [2, 1], gamble: 0.4 }),
  sk('lucky_penny', 'LUCKY PENNY', 'coin', 0, 3, 'self', { self: { focus: 1 }, shinyCost: 5 }),
  sk('magpie', 'MAGPIE', 'coin/shadow', 1, 2, 'one', { dmg: 0.4, shiny: [0.15, 0.05] }),
  sk('bribe', 'BRIBE', 'coin/gold', 0, 3, 'one', { apply: { stun: 1 }, shinyCost: [8, -2] }),
  sk('pebble', 'PEBBLE', 'cantoss/steel', 0, 1, 'one', { dmg: [0.35, 0.1], scale: 'lck' }),
  sk('squeaky_toy', 'SQUEAKY TOY', 'trick/rose', 1, 3, 'random', { dmg: 0.1, hits: 3, apply: { vuln: 1 } }),

  // ---- dirty fighting
  sk('trash_talk', 'TRASH TALK', 'jeer/neon', 1, 2, 'one', { apply: { weak: 2, vuln: 1 } }),
  sk('stink_eye', 'STINK EYE', 'eye/poison', 1, 2, 'all', { apply: { vuln: 1, poison: 1 } }),
  sk('raspberry', 'RASPBERRY', 'jeer/rose', 0, 3, 'all', { apply: { weak: 1 } }),
  sk('hiss', 'HISS', 'howl/shadow', 1, 2, 'all', { apply: { weak: 1 }, self: { evade: 1 } }),
  sk('smoke_bomb', 'SMOKE BOMB', 'bomb/steel', 1, 3, 'all', { apply: { weak: 1 }, self: { evade: [2, 1] } }),
  sk('banana_peel', 'BANANA PEEL', 'trick/gold', 2, 4, 'one', { apply: { stun: 1, vuln: 1 } }),
  sk('headlock', 'HEADLOCK', 'fist/earth', 2, 3, 'one', { dmg: 0.4, apply: { weak: 2, vuln: 2 } }),
  sk('cheap_shot', 'CHEAP SHOT', 'fist', 1, 1, 'one', { dmg: [0.7, 0.1], per: { key: 'stun', mult: 1 } }),
  sk('pile_on', 'PILE ON', 'fist/neon', 1, 1, 'one', { dmg: 0.5, per: { key: 'weak', mult: 0.25 } }),
  sk('snatch', 'SNATCH', 'claw/shadow', 1, 2, 'one', { dmg: 0.5, steal: true }),
  sk('sucker_punch', 'SUCKER PUNCH', 'fist/blood', 1, 2, 'one', { dmg: [0.9, 0.15], shatter: true }),
  sk('war_cry', 'WAR CRY', 'howl/fire', 2, 3, 'all', { apply: { vuln: 2 }, self: { thorns: [3, 2] } }),

  // ---- heavy hitters
  sk('lunge', 'LUNGE', 'pounce/storm', 1, 1, 'one', { dmg: [0.9, 0.15], pierce: true }),
  sk('scrap_spear', 'SCRAP SPEAR', 'snipe/steel', 2, 1, 'one', { dmg: [1.5, 0.25], pierce: true }),
  sk('rubble', 'RUBBLE', 'thunder/earth', 2, 2, 'all', { dmg: [0.45, 0.1], shatter: true }),
  sk('alley_brawl', 'ALLEY BRAWL', 'fist/rust', 2, 1, 'all', { dmg: 0.35, crowd: [0.1, 0.05] }),
  sk('one_on_one', 'ONE ON ONE', 'fist/steel', 1, 1, 'one', { dmg: [1.3, 0.15], crowd: -0.2 }),
  sk('finisher', 'FINISHER', 'claw/blood', 1, 2, 'one', { dmg: [0.7, 0.1], execute: [0.15, 0.05] }),
  sk('overhead', 'OVERHEAD', 'bash/storm', 2, 2, 'one', { dmg: [1.6, 0.3], apply: { vuln: 1 } }),
  sk('tackle', 'TACKLE', 'bodyslam/rust', 2, 1, 'one', { dmg: [1.6, 0.3], hpCost: 3, apply: { weak: 1 } }),
  sk('belly_flop', 'BELLY FLOP', 'bodyslam/earth', 2, 2, 'all', { dmg: 0.4, maxHpDmg: [0.06, 0.02] }),
  sk('compactor', 'COMPACTOR', 'bodyslam/steel', 3, 3, 'one', { dmg: [2.2, 0.3], shatter: true, pierce: true }),
  sk('lid_spin', 'LID SPIN', 'whirlwind/steel', 2, 1, 'all', { dmg: 0.4, block: [3, 1] }),
  sk('cannonball', 'CANNONBALL', 'comet/sea', 3, 2, 'all', { dmg: [0.8, 0.15], apply: { chill: 1 } }),
  sk('dumpster_dive', 'DUMPSTER DIVE', 'dumpster/earth', 2, 3, 'self', { block: [6, 2], heal: 0.06, self: { thorns: [2, 1] } }),
];
