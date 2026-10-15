// Sets: themed pieces, one per slot, whose bonuses switch on at 2 worn pieces and grow
// at 3 or 4 and again with the full set. Each set is one build: its pieces are fine on
// their own, the steps are what make the build. Risky sets pay well and bite back.
//
// Wearing a piece makes the rest of its set turn up more often (see SET_PULL in run.ts).
import type { ItemDef, SetDef } from '../types';
import { makeSet } from './forge';

const RED = 0xb13e53;
const ORANGE = 0xef7d57;
const YELLOW = 0xffcd75;
const LIME = 0xa7f070;
const GREEN = 0x38b764;
const TEAL = 0x257179;
const BLUE = 0x3b5dc9;
const SKY = 0x41a6f6;
const CYAN = 0x73eff7;
const WHITE = 0xf4f4f4;
const GREY = 0x94b0c2;
const PURPLE = 0xb05ccf;

const ALL = [
  // ---------------------------------------------------------------- build sets

  // Bleed a single foe and finish it with crits.
  makeSet('ronin', 'RONIN', RED, 'blood', [
    ['head', 'ronin_kabuto', 'RONIN KABUTO', 2, 'crit', { str: 2, bleedHit: 1 }],
    ['face', 'ronin_mask', 'RONIN MASK', 1, 'crit', { duel: 15 }],
    ['body', 'ronin_robe', 'RONIN ROBE', 1, 'speed', { agi: 2, dodge: 0.03 }],
    ['paw', 'ronin_blade', 'RONIN BLADE', 2, 'crit', { critMult: 0.3, bleedHit: 1 }],
    ['tail', 'ronin_tassel', 'RONIN TASSEL', 1, 'crit', { lck: 2, soloDmg: 5 }],
  ], [
    { n: 2, good: { bleedHit: 1 } },
    { n: 3, good: { focusStart: 1 } },
    { n: 5, good: { duel: 30, execute: 15 } },
  ]),

  // Firefighters who never quite put anything out.
  makeSet('fire_crew', 'FIRE CREW', ORANGE, 'fire', [
    ['head', 'fire_helmet', 'FIRE HELMET', 1, 'tank', { def: 2, burnHit: 1 }],
    ['body', 'fire_coat', 'FIRE COAT', 1, 'tank', { armor: 0.05, hp: 6 }],
    ['back', 'fire_tank', 'AIR TANK', 1, 'tank', { regen: 1, vit: 1 }],
    ['paw', 'fire_axe', 'FIRE AXE', 2, 'trash', { str: 2, burnHit: 1 }],
    ['tail', 'fire_hose', 'LEAKY HOSE', 1, 'trash', { firstStrike: 2, chillHit: 1 }],
  ], [
    { n: 2, good: { burnHit: 1 } },
    { n: 3, good: { statusAmp: 30 } },
    { n: 5, good: { aoeDmg: 25, burnHit: 2 } },
  ]),

  // Pile on chill until they freeze solid.
  makeSet('snow_day', 'SNOW DAY', SKY, 'ice', [
    ['head', 'snow_beanie', 'POMPOM HAT', 1, 'tank', { vit: 2, chillHit: 1 }],
    ['face', 'snow_scarf', 'FROSTY SCARF', 1, 'tank', { armor: 0.04 }],
    ['body', 'snow_parka', 'BIG PARKA', 2, 'tank', { hp: 12, blockKeep: 20 }],
    ['paw', 'snow_ball', 'SNOWBALL', 1, 'trash', { chillHit: 1, splash: 15 }],
    ['back', 'snow_sled', 'SLED', 2, 'speed', { agi: 2, trip: 5 }],
  ], [
    { n: 2, good: { chillHit: 1 } },
    { n: 4, good: { stunDmg: 40 } },
    { n: 5, good: { chillHit: 2, blockKeep: 30 } },
  ]),

  // Poison, then let it jump when they drop.
  makeSet('plague', 'PLAGUE DOC', GREEN, 'poison', [
    ['face', 'plague_beak', 'BEAK MASK', 2, 'tank', { poisonHit: 1, armor: 0.04 }],
    ['head', 'plague_hat', 'DOC HAT', 1, 'trash', { lck: 1, stink: 2 }],
    ['body', 'plague_coat', 'WAXED COAT', 1, 'tank', { def: 2, armor: 0.03 }],
    ['paw', 'plague_cane', 'DOC CANE', 2, 'trash', { poisonHit: 2 }],
    ['aura', 'plague_miasma', 'MIASMA', 2, 'trash', { stink: 3, debuffDmg: 4 }],
  ], [
    { n: 2, good: { poisonHit: 1 } },
    { n: 4, good: { poisonSpread: 50 } },
    { n: 5, good: { statusAmp: 50, debuffDmg: 6 } },
  ]),

  // Drink deep, fight best when hurt.
  makeSet('blood_moon', 'BLOOD MOON', RED, 'shadow', [
    ['head', 'moon_crown', 'MOON CROWN', 2, 'crit', { lifesteal: 8, str: 1 }],
    ['face', 'moon_fangs', 'FAKE FANGS', 1, 'crit', { lifesteal: 6 }],
    ['back', 'moon_cape', 'NIGHT CAPE', 2, 'speed', { dodge: 0.05, rage: 15 }],
    ['tail', 'moon_tail', 'BAT TAIL', 1, 'speed', { agi: 1, critHeal: 2 }],
  ], [
    { n: 2, good: { lifesteal: 8 } },
    { n: 4, good: { rage: 40, critHeal: 3 } },
  ]),

  // Hits pay, and the money hits back.
  makeSet('heist', 'BANK JOB', YELLOW, 'gold', [
    ['face', 'heist_mask', 'SKI MASK', 1, 'scav', { goldHit: 1 }],
    ['head', 'heist_cap', 'GETAWAY CAP', 1, 'speed', { agi: 2, shinyMult: 0.1 }],
    ['body', 'heist_vest', 'STRIPED VEST', 1, 'scav', { def: 1, moneyArmor: 1 }],
    ['back', 'heist_bag', 'LOOT BAG', 2, 'scav', { shinyMult: 0.25, interest: 3 }],
    ['paw', 'heist_crowbar', 'CROWBAR', 2, 'trash', { str: 2, goldHit: 1 }],
    ['aura', 'heist_alarm', 'ALARM BELLS', 2, 'speed', { ambush: 40, agi: 1 }],
  ], [
    { n: 2, good: { goldHit: 1 } },
    { n: 4, good: { richDmg: 3 } },
    { n: 6, good: { interest: 8, richDmg: 2, ambush: 40 } },
  ]),

  // Luck spins the wheel: free skills and second goes.
  makeSet('casino', 'CASINO', PURPLE, 'neon', [
    ['head', 'casino_visor', 'DEALER VISOR', 1, 'crit', { lck: 2, crit: 0.02 }],
    ['face', 'casino_shades', 'POKER SHADES', 2, 'crit', { critMult: 0.35 }],
    ['body', 'casino_suit', 'LUCKY SUIT', 2, 'scav', { lck: 2, refund: 5 }],
    ['paw', 'casino_dice', 'LOADED DICE', 2, 'crit', { lck: 3 }],
    ['tail', 'casino_chips', 'CHIP STACK', 1, 'scav', { shinyMult: 0.15, lck: 1 }],
  ], [
    { n: 2, good: { refund: 8 } },
    { n: 3, good: { echo: 8 } },
    { n: 5, good: { refund: 10, echo: 10, critMult: 0.4 } },
  ]),

  // Hold block over the turn and hit with it.
  makeSet('bin_knight', 'BIN KNIGHT', GREY, 'steel', [
    ['head', 'knight_bucket', 'BUCKET HELM', 1, 'tank', { def: 2, startBlock: 1 }],
    ['body', 'knight_plate', 'HUBCAP PLATE', 2, 'tank', { def: 3, blockKeep: 15 }],
    ['back', 'knight_lid', 'BIN LID', 1, 'tank', { hurtBlock: 2, def: 1 }],
    ['paw', 'knight_lance', 'MOP LANCE', 2, 'tank', { blockDmg: 15 }],
    ['tail', 'knight_chain', 'BIKE CHAIN', 1, 'tank trash', { def: 1, str: 1, blockDmg: 5 }],
  ], [
    { n: 2, good: { blockKeep: 20 } },
    { n: 3, good: { blockDmg: 15 } },
    { n: 5, good: { blockKeep: 30, blockDmg: 20, startBlock: 3 } },
  ]),

  // Every hit you take hurts them more.
  makeSet('hedgehog', 'HEDGEHOG', ORANGE, 'rust', [
    ['head', 'hog_spikes', 'SPIKE DO', 1, 'tank', { thorns: 2 }],
    ['body', 'hog_coat', 'PRICKLY COAT', 2, 'tank', { thorns: 2, hurtBlock: 2 }],
    ['back', 'hog_quills', 'QUILL PACK', 2, 'tank', { spikeBlock: 20 }],
    ['tail', 'hog_tail', 'BRISTLE TAIL', 1, 'tank', { def: 1, thorns: 1 }],
    ['aura', 'hog_grump', 'GRUMBLES', 1, 'tank', { vit: 1, hurtBlock: 1 }],
  ], [
    { n: 2, good: { thorns: 3 } },
    { n: 3, good: { spikeBlock: 25 } },
    { n: 5, good: { thorns: 4, spikeBlock: 35, armor: 0.05 } },
  ]),

  // Turn one belongs to you.
  makeSet('speed_demon', 'SPEED DEMON', CYAN, 'sea', [
    ['head', 'speed_helmet', 'RACE HELMET', 2, 'speed', { agi: 3 }],
    ['body', 'speed_suit', 'RACE SUIT', 2, 'speed', { agi: 2, dodge: 0.04 }],
    ['paw', 'speed_flag', 'CHECKER FLAG', 1, 'speed', { ambush: 30, agi: 1 }],
    ['tail', 'speed_streamer', 'STREAMERS', 1, 'speed', { agi: 2, quickCd: 5 }],
  ], [
    { n: 2, good: { quickCd: 15 } },
    { n: 4, good: { startAp: 1, quickCd: 15 } },
  ]),

  // Spells that cast twice and cool off fast.
  makeSet('archmage', 'ARCHMAGE', BLUE, 'storm', [
    ['head', 'mage_hat', 'STAR HAT', 2, 'crit', { echo: 5, lck: 1 }],
    ['face', 'mage_beard', 'FAKE BEARD', 1, 'crit', { xp: 0.1, lck: 1 }],
    ['body', 'mage_robe', 'STAR ROBE', 2, 'tank', { quickCd: 12, vit: 1 }],
    ['paw', 'mage_wand', 'CHOPSTICK', 2, 'crit', { echo: 6 }],
    ['back', 'mage_tome', 'COMIC TOME', 1, 'scav', { xp: 0.15 }],
    ['aura', 'mage_glow', 'ARCANE GLOW', 2, 'crit', { quickCd: 10, crit: 0.02 }],
  ], [
    { n: 2, good: { quickCd: 10 } },
    { n: 4, good: { echo: 10 } },
    { n: 6, good: { echo: 12, quickCd: 15, statusAmp: 30 } },
  ]),

  // Honk. Foes trip over their own feet.
  makeSet('clown_car', 'CLOWN CAR', RED, 'rose', [
    ['face', 'clown_paint', 'GREASEPAINT', 1, 'trash', { lck: 1, trip: 3 }],
    ['head', 'clown_wig', 'RAINBOW WIG', 1, 'trash', { trip: 5, lck: 1 }],
    ['body', 'clown_suit', 'BAGGY SUIT', 1, 'trash', { dodge: 0.04, vit: 1 }],
    ['paw', 'clown_horn', 'BIKE HORN', 2, 'trash', { stunChance: 6 }],
    ['tail', 'clown_balloon', 'BALLOON DOG', 1, 'trash', { trip: 4, dodge: 0.03 }],
  ], [
    { n: 2, good: { trip: 6 } },
    { n: 3, good: { stunDmg: 30 } },
    { n: 5, good: { trip: 8, stunChance: 8, stunDmg: 30 } },
  ]),

  // Float above it all: the first hits miss.
  makeSet('astronaut', 'SPACE CADET', WHITE, 'holy', [
    ['head', 'astro_helmet', 'FISHBOWL', 2, 'tank', { armor: 0.05, vit: 1 }],
    ['body', 'astro_suit', 'FOIL SUIT', 2, 'tank', { hp: 10, evadeStart: 1 }],
    ['back', 'astro_pack', 'SODA ROCKET', 2, 'speed', { agi: 2, startAp: 1 }],
    ['tail', 'astro_tether', 'TETHER', 1, 'tank', { def: 1, dodgeHeal: 2 }],
  ], [
    { n: 2, good: { evadeStart: 1 } },
    { n: 4, good: { evadeStart: 1, dodge: 0.08, dodgeHeal: 3 } },
  ]),

  // Bees do the work.
  makeSet('beekeeper', 'BEEKEEPER', YELLOW, 'fire', [
    ['head', 'bee_veil', 'BEE VEIL', 1, 'tank', { def: 1, armor: 0.04 }],
    ['body', 'bee_suit', 'BEE SUIT', 1, 'tank', { thorns: 2, vit: 1 }],
    ['paw', 'bee_smoker', 'SMOKER', 2, 'trash', { stink: 3 }],
    ['back', 'bee_box', 'BEE BOX', 2, 'trash', { flies: 4 }],
    ['aura', 'bee_buzz', 'BUZZING', 1, 'trash', { flies: 2, poisonHit: 1 }],
  ], [
    { n: 2, good: { flies: 3 } },
    { n: 3, good: { poisonHit: 1 } },
    { n: 5, good: { flies: 6, statusAmp: 40 } },
  ]),

  // Big swings into big crowds.
  makeSet('lumberjack', 'LUMBERJACK', GREEN, 'earth', [
    ['head', 'lumber_cap', 'EARFLAP CAP', 1, 'tank', { vit: 1, aoeDmg: 8 }],
    ['face', 'lumber_beard', 'GREAT BEARD', 1, 'tank', { str: 1, def: 1 }],
    ['body', 'lumber_flannel', 'FLANNEL', 1, 'trash', { str: 2, hp: 4 }],
    ['paw', 'lumber_axe', 'BIG AXE', 2, 'trash', { str: 3, splash: 10 }],
    ['tail', 'lumber_log', 'LOG', 2, 'trash', { crowd: 6 }],
  ], [
    { n: 2, good: { aoeDmg: 15 } },
    { n: 3, good: { crowd: 8 } },
    { n: 5, good: { aoeDmg: 25, splash: 20, killBurst: 5 } },
  ]),

  // Stay calm: dodge, breathe, heal.
  makeSet('monk', 'MONK', ORANGE, 'holy', [
    ['head', 'monk_beads', 'PRAYER BEADS', 1, 'tank', { regen: 1, lck: 1 }],
    ['body', 'monk_robe', 'SAFFRON ROBE', 2, 'speed', { agi: 2, dodgeHeal: 2 }],
    ['paw', 'monk_staff', 'BO STAFF', 2, 'speed', { dodgeStrike: 4, agi: 1 }],
    ['tail', 'monk_bell', 'TEMPLE BELL', 1, 'tank', { regen: 1, healMul: 0.1 }],
  ], [
    { n: 2, good: { dodgeHeal: 3 } },
    { n: 4, good: { dodge: 0.1, regen: 2, fightHeal: 10 } },
  ]),

  // Strike first, loot everything.
  makeSet('pirate', 'PIRATE', TEAL, 'sea', [
    ['head', 'pirate_hat', 'TRICORN', 2, 'scav', { shinyMult: 0.15, str: 1 }],
    ['face', 'pirate_patch', 'BLACK PATCH', 1, 'crit', { firstCrit: 1 }],
    ['body', 'pirate_coat', 'LONG COAT', 1, 'tank', { def: 1, vit: 1, lck: 1 }],
    ['paw', 'pirate_hook', 'HOOK', 2, 'crit', { bleedHit: 1, goldHit: 1 }],
    ['back', 'pirate_flag', 'JOLLY ROGER', 2, 'trash', { firstStrike: 3, goldHit: 1 }],
    ['tail', 'pirate_parrot', 'PARROT', 1, 'scav', { flies: 2, goldHit: 1 }],
  ], [
    { n: 2, good: { ambush: 30 } },
    { n: 4, good: { goldHit: 2, firstStrike: 4 } },
    { n: 6, good: { ambush: 50, bleedHit: 2, interest: 5 } },
  ]),

  // Boo. Slip past their hits and strike back.
  makeSet('ghost', 'POLTERGEIST', WHITE, 'void', [
    ['head', 'ghost_sheet', 'BEDSHEET', 1, 'speed', { dodge: 0.05 }],
    ['face', 'ghost_eyes', 'HOLLOW EYES', 2, 'crit', { markStart: 1, lck: 1 }],
    ['tail', 'ghost_chain', 'RATTLE CHAIN', 1, 'speed', { dodgeStrike: 3 }],
    ['aura', 'ghost_chill', 'COLD SPOT', 2, 'speed', { dodge: 0.04, chillHit: 1 }],
  ], [
    { n: 2, good: { dodgeStrike: 4 } },
    { n: 4, good: { dodge: 0.1, dodgeStrike: 6, markStart: 1 } },
  ]),

  // Lasers, arcs and stuns.
  makeSet('cyber', 'CYBERPUNK', CYAN, 'neon', [
    ['face', 'cyber_eye', 'CHROME EYE', 2, 'crit', { laser: 3 }],
    ['head', 'cyber_mohawk', 'NEON MOHAWK', 1, 'crit', { crit: 0.03 }],
    ['body', 'cyber_jacket', 'LED JACKET', 2, 'speed', { agi: 2, chain: 8 }],
    ['paw', 'cyber_taser', 'TASER', 2, 'crit', { stunChance: 6, str: 1 }],
    ['back', 'cyber_battery', 'BIG BATTERY', 1, 'speed', { quickCd: 10 }],
  ], [
    { n: 2, good: { chain: 12 } },
    { n: 3, good: { laser: 3 } },
    { n: 5, good: { chain: 20, stunChance: 8, stunDmg: 40 } },
  ]),

  // Grows: heals, thorns, more HP.
  makeSet('gardener', 'GARDENER', LIME, 'nature', [
    ['head', 'garden_hat', 'STRAW HAT', 1, 'tank', { vit: 1, healMul: 0.1 }],
    ['body', 'garden_apron', 'APRON', 1, 'tank', { regen: 1, hp: 4 }],
    ['paw', 'garden_shears', 'SHEARS', 2, 'trash', { bleedHit: 1, thorns: 1 }],
    ['back', 'garden_can', 'WATERING CAN', 2, 'tank', { healMul: 0.2, regen: 1 }],
    ['tail', 'garden_vine', 'ROSE VINE', 1, 'tank', { thorns: 2 }],
  ], [
    { n: 2, good: { hpMul: 0.1 } },
    { n: 3, good: { regen: 2 } },
    { n: 5, good: { hpMul: 0.15, healMul: 0.3, thorns: 3 } },
  ]),

  // Every hit becomes two.
  makeSet('disco', 'DISCO', PURPLE, 'neon', [
    ['head', 'disco_afro', 'AFRO', 1, 'speed', { agi: 1, crowd: 4 }],
    ['face', 'disco_shades', 'STAR SHADES', 1, 'crit', { lck: 1, chain: 5 }],
    ['body', 'disco_suit', 'GLITTER SUIT', 2, 'speed', { dodge: 0.04, crowd: 5 }],
    ['aura', 'disco_ball', 'DISCO BALL', 2, 'crit', { chain: 10 }],
  ], [
    { n: 2, good: { crowd: 8 } },
    { n: 4, good: { multiHit: 1, crowd: 6 } },
  ]),

  // Mark them, then the shots don't miss.
  makeSet('sheriff', 'SHERIFF', YELLOW, 'gold', [
    ['head', 'sheriff_hat', 'TEN GALLON', 1, 'crit', { lck: 1, firstCrit: 1 }],
    ['face', 'sheriff_tash', 'BIG TASH', 1, 'tank', { def: 1, thorns: 1 }],
    ['body', 'sheriff_vest', 'STAR VEST', 2, 'tank', { def: 2, critBlock: 2 }],
    ['paw', 'sheriff_cork', 'CORK GUN', 2, 'crit', { markStart: 1, str: 1 }],
    ['tail', 'sheriff_lasso', 'LASSO', 1, 'speed', { trip: 5, duel: 10 }],
  ], [
    { n: 2, good: { markStart: 1 } },
    { n: 3, good: { killFocus: 1 } },
    { n: 5, good: { markStart: 2, critMult: 0.5 } },
  ]),

  // Good food heals more, and overflows into block.
  makeSet('chef', 'CHEF', WHITE, 'fire', [
    ['head', 'chef_toque', 'CHEF HAT', 1, 'tank', { healMul: 0.15 }],
    ['body', 'chef_apron', 'GREASY APRON', 1, 'tank', { hp: 8, regen: 1 }],
    ['paw', 'chef_ladle', 'LADLE', 2, 'trash', { burnHit: 1, critHeal: 2 }],
    ['tail', 'chef_pot', 'STOCK POT', 1, 'tank', { fightHeal: 5 }],
    ['aura', 'chef_smell', 'GOOD SMELLS', 2, 'tank', { regen: 2 }],
  ], [
    { n: 2, good: { healMul: 0.2 } },
    { n: 3, good: { overBlock: 50 } },
    { n: 5, good: { healMul: 0.3, overBlock: 60, fightHeal: 10 } },
  ]),

  // Every grave pays: block, heal and coin from kills.
  makeSet('gravedigger', 'GRAVEDIGGER', GREY, 'void', [
    ['head', 'grave_hat', 'TOP HAT', 1, 'scav', { lck: 1, interest: 2 }],
    ['body', 'grave_coat', 'MUDDY COAT', 1, 'tank', { killBlock: 3 }],
    ['paw', 'grave_shovel', 'SHOVEL', 2, 'trash', { str: 2, killHeal: 2 }],
    ['back', 'grave_lantern', 'LANTERN', 2, 'scav', { interest: 3, killBlock: 2 }],
    ['tail', 'grave_bones', 'BONE CHARM', 1, 'trash', { killHeal: 3, str: 1 }],
  ], [
    { n: 2, good: { killBlock: 4 } },
    { n: 3, good: { killHeal: 3 } },
    { n: 5, good: { killBlock: 6, killBurst: 6, killAp: 1 } },
  ]),

  // Lightning jumps and stuns, then hits harder on the stunned.
  makeSet('storm_chaser', 'STORM CHASER', BLUE, 'storm', [
    ['head', 'storm_rod', 'ROD HAT', 2, 'crit', { chain: 10 }],
    ['face', 'storm_goggles', 'STORM SPECS', 1, 'speed', { agi: 1, stunDmg: 15 }],
    ['body', 'storm_poncho', 'PONCHO', 1, 'tank', { armor: 0.04, def: 1 }],
    ['back', 'storm_kite', 'KITE', 2, 'crit', { stunChance: 5, chain: 5 }],
  ], [
    { n: 2, good: { stunDmg: 30 } },
    { n: 4, good: { chain: 15, stunChance: 8 } },
  ]),

  // Swole: max HP becomes damage.
  makeSet('gym_bro', 'GYM BRO', ORANGE, 'nature', [
    ['head', 'gym_band', 'SWEATBAND', 1, 'tank', { vit: 1, hpDmg: 1 }],
    ['body', 'gym_tank', 'TANK TOP', 1, 'trash', { hp: 6, str: 1 }],
    ['paw', 'gym_dumbbell', 'DUMBBELL', 2, 'trash', { hpDmg: 3, str: 1 }],
    ['back', 'gym_shake', 'PROTEIN TUB', 2, 'tank', { hpMul: 0.08, healMul: 0.1 }],
    ['tail', 'gym_towel', 'GYM TOWEL', 1, 'tank', { vit: 1, regen: 1 }],
  ], [
    { n: 2, good: { hpDmg: 3 } },
    { n: 3, good: { hpMul: 0.1 } },
    { n: 5, good: { hpDmg: 5, hpMul: 0.15 } },
  ]),

  // Studies hard: levels faster, cooldowns faster.
  makeSet('honor_roll', 'HONOR ROLL', SKY, 'sea', [
    ['head', 'nerd_cap', 'GRAD CAP', 2, 'crit', { xp: 0.2 }],
    ['face', 'nerd_tape', 'TAPED SPECS', 1, 'crit', { critMult: 0.25, xp: 0.05 }],
    ['body', 'nerd_vest', 'SWEATER VEST', 1, 'tank', { def: 1, xp: 0.1 }],
    ['back', 'nerd_bag', 'HEAVY BAG', 1, 'tank', { hp: 6, xp: 0.1 }],
    ['paw', 'nerd_ruler', 'RULER', 1, 'crit', { lck: 1, quickCd: 8 }],
  ], [
    { n: 2, good: { xp: 0.15 } },
    { n: 3, good: { quickCd: 12 } },
    { n: 5, good: { xp: 0.25, refund: 10 } },
  ]),

  // Roll in hot: AP and a hit before they move.
  makeSet('biker', 'BIKER GANG', GREY, 'rust', [
    ['head', 'biker_helmet', 'SKULL LID', 1, 'tank', { def: 1, str: 1 }],
    ['face', 'biker_goggles', 'DUST GOGGLES', 1, 'speed', { agi: 1, ambush: 15 }],
    ['body', 'biker_jacket', 'STUD JACKET', 2, 'tank', { thorns: 2, def: 1 }],
    ['paw', 'biker_chain', 'CHAIN WHIP', 2, 'trash', { firstStrike: 4, str: 1 }],
    ['tail', 'biker_exhaust', 'EXHAUST', 1, 'trash', { stink: 2 }],
  ], [
    { n: 2, good: { firstStrike: 4 } },
    { n: 3, good: { ambush: 30 } },
    { n: 5, good: { startAp: 1, firstStrike: 6 } },
  ]),

  // Takes it slow: stronger every turn the fight lasts.
  makeSet('pajamas', 'PAJAMA PARTY', SKY, 'rose', [
    ['head', 'pj_cap', 'NIGHTCAP', 1, 'tank', { regen: 1 }],
    ['face', 'pj_mask', 'SLEEP MASK', 1, 'tank', { regen: 1, def: 1 }],
    ['body', 'pj_onesie', 'ONESIE', 2, 'tank', { hp: 8, blockKeep: 15 }],
    ['back', 'pj_pillow', 'PILLOW', 1, 'tank', { hurtBlock: 2 }],
    ['tail', 'pj_teddy', 'TEDDY', 2, 'tank', { slowBurn: 4 }],
  ], [
    { n: 2, good: { slowBurn: 4 } },
    { n: 3, good: { regen: 2 } },
    { n: 5, good: { slowBurn: 6, blockKeep: 30 } },
  ]),

  // Kills keep the party going.
  makeSet('party', 'PARTY ANIMAL', LIME, 'neon', [
    ['head', 'party_hat', 'CONE HAT', 1, 'trash', { lck: 1, str: 1 }],
    ['face', 'party_horn', 'PARTY HORN', 1, 'trash', { trip: 4, lck: 1 }],
    ['body', 'party_shirt', 'CONFETTI TEE', 1, 'speed', { agi: 1, killHeal: 2 }],
    ['paw', 'party_popper', 'POPPER', 2, 'trash', { firstStrike: 3, killBurst: 3 }],
    ['aura', 'party_mood', 'BANGERS', 2, 'speed', { killHeal: 2, killBlock: 2 }],
  ], [
    { n: 2, good: { killBurst: 4 } },
    { n: 3, good: { killAp: 1 } },
    { n: 5, good: { killBurst: 6, echo: 10 } },
  ]),

  // King of the bins: trash tags, trash damage, trash everywhere.
  makeSet('bin_king', 'BIN KING', LIME, 'poison', [
    ['head', 'king_lid', 'TIN CROWN', 2, 'trash', { str: 2, shinyMult: 0.1 }],
    ['face', 'king_peel', 'PEEL MONOCLE', 1, 'trash', { lck: 1, critMult: 0.15 }],
    ['body', 'king_robe', 'BAG ROBE', 2, 'trash tank', { def: 2, vit: 1 }],
    ['back', 'king_cape', 'TARP CAPE', 1, 'trash', { thorns: 2 }],
    ['paw', 'king_scepter', 'MOP SCEPTER', 2, 'trash', { boomerang: 3 }],
    ['tail', 'king_cans', 'CAN TRAIN', 1, 'trash', { flies: 2 }],
  ], [
    { n: 2, good: { boomerang: 3 } },
    { n: 4, good: { stink: 4, flies: 4 } },
    { n: 6, good: { boomerang: 5, killBurst: 6, dmg: 0.15 } },
  ]),

  // Huge, cold and hard to move.
  makeSet('yeti', 'YETI', CYAN, 'ice', [
    ['head', 'yeti_horns', 'FROST HORNS', 2, 'tank', { str: 1, chillHit: 1 }],
    ['body', 'yeti_fur', 'SHAG FUR', 2, 'tank', { hp: 14 }],
    ['paw', 'yeti_icicle', 'ICICLE', 2, 'trash', { chillHit: 1, hpDmg: 2 }],
    ['tail', 'yeti_tail', 'SNOW TAIL', 1, 'tank', { vit: 2 }],
  ], [
    { n: 2, good: { hpMul: 0.12 } },
    { n: 4, good: { hpDmg: 4, chillHit: 2, armor: 0.06 } },
  ]),

  // A chest of toys that go off on their own.
  makeSet('toy_box', 'TOY BOX', YELLOW, 'rose', [
    ['head', 'toy_beanie', 'SPIN BEANIE', 1, 'speed', { agi: 1, lck: 1 }],
    ['paw', 'toy_yoyo', 'YO-YO', 2, 'speed', { boomerang: 2, trip: 3 }],
    ['back', 'toy_kite', 'TOY ROCKET', 2, 'trash', { firstStrike: 3, agi: 1 }],
    ['tail', 'toy_spring', 'SLINKY', 1, 'speed', { trip: 5 }],
    ['aura', 'toy_soldiers', 'TOY ARMY', 2, 'trash', { flies: 3 }],
  ], [
    { n: 2, good: { boomerang: 3 } },
    { n: 3, good: { firstStrike: 5 } },
    { n: 5, good: { boomerang: 4, flies: 4, trip: 6 } },
  ]),

  // Prepared for everything: some block, some healing, cheaper shops.
  makeSet('scout', 'SCOUT', GREEN, 'nature', [
    ['head', 'scout_hat', 'SCOUT HAT', 1, 'tank', { def: 1, fightHeal: 3 }],
    ['body', 'scout_sash', 'BADGE SASH', 1, 'scav', { discount: 0.08, xp: 0.05 }],
    ['back', 'scout_pack', 'CAMP PACK', 1, 'scav', { fightHeal: 5 }],
    ['paw', 'scout_knife', 'POCKET KNIFE', 1, 'crit', { str: 1, bleedHit: 1 }],
  ], [
    { n: 2, good: { startBlock: 2, discount: 0.1 } },
    { n: 4, good: { fightHeal: 10, discount: 0.15 } },
  ]),

  // Every debuff on a foe is a clue: more damage per one.
  makeSet('detective', 'DETECTIVE', GREY, 'shadow', [
    ['head', 'det_cap', 'DEERSTALKER', 1, 'crit', { lck: 1, debuffDmg: 2 }],
    ['face', 'det_glass', 'MAGNIFIER', 2, 'crit', { debuffDmg: 5 }],
    ['body', 'det_coat', 'TRENCH COAT', 1, 'tank', { def: 1, dodge: 0.03 }],
    ['paw', 'det_pipe', 'BUBBLE PIPE', 2, 'crit', { markStart: 1, stink: 2 }],
  ], [
    { n: 2, good: { debuffDmg: 5 } },
    { n: 4, good: { debuffDmg: 7, markStart: 2 } },
  ]),

  // Heals spill into block; block makes hits hurt less.
  makeSet('paladin', 'PALADIN', YELLOW, 'holy', [
    ['head', 'pal_halo', 'TINSEL HALO', 2, 'tank', { healMul: 0.15, regen: 1 }],
    ['body', 'pal_tabard', 'TABARD', 2, 'tank', { def: 2, armor: 0.04 }],
    ['paw', 'pal_mace', 'TOY MACE', 2, 'tank', { str: 1, critHeal: 2 }],
    ['back', 'pal_shield', 'TRAY SHIELD', 1, 'tank', { startBlock: 2 }],
    ['tail', 'pal_candle', 'CANDLE', 1, 'tank', { regen: 1 }],
  ], [
    { n: 2, good: { overBlock: 40 } },
    { n: 3, good: { healMul: 0.2 } },
    { n: 5, good: { overBlock: 60, regen: 2, armor: 0.06 } },
  ]),

  // A one-raccoon army against bosses.
  makeSet('dragon_slayer', 'SLAYER', RED, 'fire', [
    ['head', 'slay_helm', 'HORNED HELM', 2, 'tank', { def: 2, bossDmg: 10 }],
    ['body', 'slay_mail', 'SCALE MAIL', 2, 'tank', { armor: 0.06 }],
    ['paw', 'slay_sword', 'FOAM SWORD', 2, 'crit', { str: 2, bossDmg: 10 }],
    ['back', 'slay_shield', 'WYRM SHIELD', 2, 'tank', { burnHit: 1, hurtBlock: 2 }],
  ], [
    { n: 2, good: { bossDmg: 20 } },
    { n: 4, good: { bossDmg: 25, burnHit: 2, armor: 0.05 } },
  ]),

  // Strings of small hits that each add up.
  makeSet('ninja', 'SHADOW CLAN', PURPLE, 'shadow', [
    ['head', 'ninja_hood', 'NINJA HOOD', 2, 'speed', { agi: 2, dodge: 0.03 }],
    ['face', 'ninja_wrap', 'FACE WRAP', 1, 'speed', { evadeStart: 1 }],
    ['paw', 'ninja_stars', 'PAPER STARS', 2, 'crit', { multiHit: 1 }],
    ['tail', 'ninja_rope', 'GRAPPLE', 1, 'speed', { agi: 1, ambush: 15 }],
  ], [
    { n: 2, good: { ambush: 30 } },
    { n: 4, good: { multiHit: 1, bleedHit: 1 } },
  ]),

  // A fortune teller: crits and luck foretold.
  makeSet('fortune', 'FORTUNE', PURPLE, 'void', [
    ['head', 'fort_turban', 'TURBAN', 1, 'crit', { lck: 2, xp: 0.05 }],
    ['face', 'fort_eye', 'THIRD EYE', 2, 'crit', { focusStart: 1 }],
    ['paw', 'fort_orb', 'SNOW GLOBE', 2, 'crit', { crit: 0.04 }],
    ['aura', 'fort_cards', 'TAROT', 1, 'crit', { critMult: 0.2, lck: 1 }],
  ], [
    { n: 2, good: { crit: 0.05 } },
    { n: 4, good: { focusStart: 1, critMult: 0.5 } },
  ]),

  // ---------------------------------------------------------------- risky sets

  // Glass: all of the damage, none of the toughness.
  makeSet('glass', 'GLASS', WHITE, 'ice', [
    ['head', 'glass_crown', 'GLASS CROWN', 2, 'crit', { dmg: 0.3 }, { hpMul: -0.08 }],
    ['body', 'glass_plate', 'GLASS PLATE', 2, 'crit', { critMult: 0.6, crit: 0.05 }, { taken: 0.08 }],
    ['paw', 'glass_shard', 'GLASS SHARD', 3, 'crit', { str: 3, bleedHit: 2 }, { hpMul: -0.08 }],
    ['tail', 'glass_bell', 'GLASS BELL', 2, 'crit', { crit: 0.1, critMult: 0.3 }, { taken: 0.06 }],
  ], [
    { n: 2, good: { dmg: 0.2 }, bad: { taken: 0.1 } },
    { n: 4, good: { dmg: 0.3, critMult: 0.8 }, bad: { hpMul: -0.15 } },
  ]),

  // Gold beyond counting; the curse takes a little of you each fight.
  makeSet('pharaoh', 'PHARAOH', YELLOW, 'gold', [
    ['head', 'pharaoh_mask', 'DEATH MASK', 3, 'scav', { shinyMult: 0.3, goldHit: 1 }],
    ['body', 'pharaoh_wraps', 'MUMMY WRAPS', 2, 'tank', { hp: 10, armor: 0.04 }],
    ['paw', 'pharaoh_crook', 'CROOK', 2, 'scav', { richDmg: 3 }],
    ['back', 'pharaoh_sarc', 'SARCOPHAGUS', 3, 'tank', { cheatDeath: 1, hp: 12 }, { fightHurt: 6 }],
    ['aura', 'pharaoh_curse', 'TOMB CURSE', 2, 'scav', { interest: 8, goldHit: 2 }, { fightHurt: 4 }],
  ], [
    { n: 2, good: { shinyMult: 0.3 }, bad: { fightHurt: 4 } },
    { n: 3, good: { richDmg: 3, goldHit: 1 } },
    { n: 5, good: { cheatDeath: 1, interest: 8 }, bad: { fightHurt: 6 } },
  ]),

  // An extra action every turn. The bill comes due every turn too.
  makeSet('devil', 'DEVIL DEAL', RED, 'blood', [
    ['head', 'devil_horns', 'DEVIL HORNS', 2, 'crit', { str: 2, rage: 20 }],
    ['tail', 'devil_tail', 'POINTY TAIL', 2, 'crit', { lifesteal: 8 }],
    ['paw', 'devil_fork', 'PITCHFORK', 3, 'trash', { burnHit: 3, str: 3 }, { turnHurt: 1 }],
    ['aura', 'devil_contract', 'CONTRACT', 3, 'crit', { echo: 20, lifesteal: 10 }, { turnHurt: 1 }],
  ], [
    { n: 2, good: { ap: 1 }, bad: { turnHurt: 2 } },
    { n: 4, good: { lifesteal: 15, echo: 10 }, bad: { healMul: -0.3 } },
  ]),

  // Rage on, no stopping to heal.
  makeSet('berserker', 'BERSERKER', RED, 'rust', [
    ['head', 'berserk_helm', 'WOLF HELM', 2, 'trash', { rage: 30 }],
    ['face', 'berserk_paint', 'WAR STRIPES', 2, 'crit', { str: 4, rage: 20 }, { def: -2 }],
    ['body', 'berserk_chains', 'CHAINS', 2, 'tank', { hp: 12, thorns: 2 }],
    ['paw', 'berserk_axe', 'TWIN AXES', 3, 'trash', { multiHit: 1, bleedHit: 1 }],
    ['tail', 'berserk_fur', 'WOLF PELT', 1, 'trash', { str: 2 }],
  ], [
    { n: 2, good: { rage: 30, dmg: 0.1 }, bad: { healMul: -0.3 } },
    { n: 3, good: { lifesteal: 12 } },
    { n: 5, good: { rage: 60, slowBurn: 5 }, bad: { armor: -0.1 } },
  ]),

  // Everything turns to gold, including the prices and your food.
  makeSet('midas', 'MIDAS', YELLOW, 'gold', [
    ['head', 'midas_laurel', 'GOLD LAUREL', 2, 'scav', { shinyMult: 0.3 }],
    ['face', 'midas_teeth', 'GOLD TEETH', 2, 'scav', { goldHit: 1, lck: 1 }],
    ['paw', 'midas_touch', 'GOLD GLOVE', 3, 'scav', { goldHit: 4, lck: 1 }, { healMul: -0.2 }],
    ['body', 'midas_robe', 'GOLD ROBE', 2, 'scav tank', { moneyArmor: 2, def: 1 }, { agi: -2 }],
  ], [
    { n: 2, good: { shinyMult: 0.4, moneyArmor: 1 }, bad: { discount: -0.25 } },
    { n: 4, good: { richDmg: 4, interest: 10 }, bad: { healMul: -0.3 } },
  ]),

  // The longer it ticks, the harder it hits, and it ticks on you.
  makeSet('time_bomb', 'TIME BOMB', ORANGE, 'fire', [
    ['head', 'bomb_clock', 'ALARM CLOCK', 2, 'crit', { slowBurn: 4 }],
    ['body', 'bomb_vest', 'FUSE VEST', 3, 'trash', { killBurst: 10, firstStrike: 6 }, { turnHurt: 1 }],
    ['back', 'bomb_barrel', 'POWDER KEG', 2, 'trash', { aoeDmg: 20 }],
    ['tail', 'bomb_fuse', 'LIT FUSE', 2, 'trash', { burnHit: 2, slowBurn: 5 }, { turnHurt: 1 }],
  ], [
    { n: 2, good: { slowBurn: 6 }, bad: { turnHurt: 1 } },
    { n: 4, good: { slowBurn: 8, killBurst: 8 }, bad: { selfPoison: 4 } },
  ]),

  // The swarm loves you a little too much.
  makeSet('swarm', 'THE SWARM', LIME, 'poison', [
    ['head', 'swarm_nest', 'WASP NEST', 2, 'trash', { flies: 4 }],
    ['body', 'swarm_jar', 'BUG JAR', 2, 'trash', { flies: 3, poisonHit: 1 }],
    ['back', 'swarm_hive', 'HORNET HIVE', 3, 'trash', { flies: 10 }, { selfPoison: 3 }],
    ['aura', 'swarm_cloud', 'GNAT CLOUD', 2, 'trash', { stink: 6, poisonHit: 2 }, { selfPoison: 2 }],
  ], [
    { n: 2, good: { flies: 5, statusAmp: 25 }, bad: { selfPoison: 3 } },
    { n: 4, good: { flies: 8, poisonSpread: 60 }, bad: { selfPoison: 4 } },
  ]),

  // It moves on its own. Things happen. Nobody knows what.
  makeSet('haunted_doll', 'CURSED DOLL', PURPLE, 'void', [
    ['head', 'doll_bonnet', 'BONNET', 1, 'trash', { lck: 2, trip: 3 }],
    ['face', 'doll_buttons', 'BUTTON EYES', 2, 'crit', { echo: 6 }],
    ['body', 'doll_dress', 'LACE DRESS', 2, 'tank', { evadeStart: 1, vit: 1 }],
    ['aura', 'doll_whisper', 'WHISPERS', 3, 'trash', { chaos: 1, lck: 4 }, { foeHp: 10 }],
  ], [
    { n: 2, good: { chaos: 1, lck: 3 } },
    { n: 4, good: { echo: 15, trip: 8 }, bad: { foeHp: 15 } },
  ]),

  // Unstoppable, unhurried.
  makeSet('juggernaut', 'JUGGERNAUT', GREY, 'steel', [
    ['head', 'jug_helm', 'MANHOLE HELM', 2, 'tank', { def: 3, armor: 0.04 }],
    ['body', 'jug_plate', 'FRIDGE DOOR', 3, 'tank', { def: 4, startBlock: 3 }, { agi: -3 }],
    ['paw', 'jug_hammer', 'SLEDGEHAMMER', 2, 'tank', { blockDmg: 20 }],
    ['back', 'jug_anvil', 'ANVIL', 2, 'tank', { hp: 12, hurtBlock: 3 }, { dodge: -0.05 }],
    ['tail', 'jug_ball', 'BALL N CHAIN', 2, 'tank', { stunChance: 6, def: 1 }],
  ], [
    { n: 2, good: { armor: 0.08, startBlock: 3 }, bad: { dodge: -0.1 } },
    { n: 3, good: { blockDmg: 25 } },
    { n: 5, good: { armor: 0.12, blockKeep: 40 }, bad: { cdPlus: 1 } },
  ]),

  // Fast and wired, then the crash after every fight.
  makeSet('adrenaline', 'ADRENALINE', RED, 'storm', [
    ['head', 'adr_band', 'NEON BAND', 2, 'speed', { quickCd: 12 }],
    ['face', 'adr_gum', 'NICOTINE GUM', 2, 'speed', { startAp: 1, agi: 3 }, { fightHurt: 4 }],
    ['body', 'adr_shirt', 'SWEAT SHIRT', 1, 'speed', { agi: 2, vit: 1 }],
    ['tail', 'adr_can', 'ENERGY CAN', 2, 'speed', { killAp: 1 }, { fightHurt: 4 }],
  ], [
    { n: 2, good: { quickCd: 15, agi: 2 } },
    { n: 4, good: { refund: 15, killAp: 1 }, bad: { fightHurt: 8 } },
  ]),

  // Eat everything: huge HP, slow body.
  makeSet('glutton', 'GLUTTON', ORANGE, 'nature', [
    ['face', 'glut_bib', 'LOBSTER BIB', 1, 'tank', { healMul: 0.15 }],
    ['body', 'glut_belly', 'FOOD BABY', 2, 'tank', { hp: 24 }, { agi: -2 }],
    ['paw', 'glut_fork', 'GIANT FORK', 2, 'trash', { lifesteal: 8, hpDmg: 2 }],
    ['tail', 'glut_doggy', 'DOGGY BAG', 1, 'tank', { fightHeal: 6 }],
  ], [
    { n: 2, good: { hpMul: 0.2 }, bad: { dodge: -0.08 } },
    { n: 4, good: { hpMul: 0.2, hpDmg: 5, fightHeal: 10 }, bad: { cdPlus: 1 } },
  ]),
];

export const SETS: SetDef[] = ALL.map((s) => s.set);
export const SET_ITEMS: ItemDef[] = ALL.flatMap((s) => s.items);
