// The daily run's weekly rule: one twist on the run, the same for everyone, that changes
// every Monday (UTC). It comes from the week of the daily run's day, so every daily run
// of a day (and so every row on that day's board) plays under the same rule.
//
// A rule is data: stat bonuses and item effects (the same ones gear and passives use),
// plus a few road rules gear can't express. Most rules pair a perk with a catch.
import type { Bonus, Fx } from '../content/types';
import type { RunState } from './run';

export interface MutatorRules {
  twinBoss: boolean; // every boss brings its twin (each a little over half a boss)
  bossRush: boolean; // each area's boss comes at the earliest fight of its window
  noNaps: boolean; // camps can't heal
  noDrops: boolean; // critters never drop items
  riskyLoot: boolean; // every item rolled is a risky one, rare or better
  foeBlock: boolean; // foes start fights with block
  pal: boolean; // a critter pal bites a foe every turn
  extraFoe: boolean; // one more foe in every normal fight (up to four)
  eliteMul: number; // elites this many times as common, from the third fight
  dropMul: number; // critter drops this many times as common
}

export interface MutatorDef {
  id: string;
  name: string; // fits the DAILY RUN button
  desc: string; // one line on the run's opening banner
  bonus?: Partial<Bonus>;
  fx?: Fx;
  rules?: Partial<MutatorRules>;
}

export type MutatorId = string;

const NO_RULES: MutatorRules = { twinBoss: false, bossRush: false, noNaps: false, noDrops: false, riskyLoot: false, foeBlock: false, pal: false, extraFoe: false, eliteMul: 1, dropMul: 1 };

const m = (id: string, name: string, desc: string, x: Omit<MutatorDef, 'id' | 'name' | 'desc'> = {}): MutatorDef => ({ id, name, desc, ...x });

// In rotation order: two years of weeks before the first rule comes back. Neighbours
// differ in kind, so two weeks in a row never feel alike.
export const MUTATOR_LIST: MutatorDef[] = [
  m('twin', 'TWIN BOSSES', 'EVERY BOSS BRINGS ITS TWIN', { rules: { twinBoss: true } }),
  m('goldrush', 'GOLD RUSH', 'DOUBLE SHINIES, 25% LESS HP', { bonus: { shinyMult: 1, hpMul: -0.25 } }),
  m('armored', 'ARMORED FOES', 'FOES START FIGHTS WITH BLOCK', { rules: { foeBlock: true } }),
  m('risky', 'RISKY LOOT', 'EVERY ITEM IS RARE AND HAS A CATCH', { rules: { riskyLoot: true } }),
  m('nonaps', 'NO NAPS', 'CAMPS CANNOT HEAL', { rules: { noNaps: true } }),
  m('glass', 'GLASS CANNON', 'DEAL AND TAKE 50% MORE DAMAGE', { bonus: { dmg: 0.5, taken: 0.5 } }),
  m('elites', 'ELITE WEEK', 'ELITES ARE THREE TIMES AS COMMON', { rules: { eliteMul: 3 } }),
  m('bossrush', 'BOSS RUSH', 'BOSSES SHOW UP AS EARLY AS THEY CAN', { rules: { bossRush: true } }),
  m('pal', 'CRITTER PAL', 'A PAL BITES EACH TURN, FOES +25% HP', { rules: { pal: true }, fx: { foeHp: 25 } }),
  m('toxic', 'STINKY WEEK', 'EVERYONE STARTS FIGHTS POISONED', { fx: { stink: 6, selfPoison: 3 } }),
  m('swift', 'QUICK PAWS', '+1 AP EVERY TURN, FOES HIT 25% HARDER', { bonus: { ap: 1 }, fx: { foeDmg: 25 } }),
  m('flea', 'FLEA MARKET', 'HALF-PRICE SHOPS, CRITTERS DROP NOTHING', { bonus: { discount: 0.5 }, rules: { noDrops: true } }),
  m('brawl', 'BRAWLERS', 'FOES HIT 40% HARDER, 30% LESS HP', { fx: { foeDmg: 40, foeHp: -30 } }),
  m('lucky', 'LUCKY WEEK', '+20% CRIT CHANCE, 20% LESS HP', { bonus: { crit: 0.2, hpMul: -0.2 } }),
  m('thorny', 'THORNY HIDE', 'ATTACKERS TAKE 3 DAMAGE, 10% LESS HP', { fx: { thorns: 3 }, bonus: { hpMul: -0.1 } }),
  m('gauntlet', 'GAUNTLET', 'ONE MORE FOE EVERY FIGHT, +50% XP', { rules: { extraFoe: true }, bonus: { xp: 0.5 } }),
  m('vampire', 'VAMPIRE WEEK', 'HITS HEAL 8%, CAMPS CANNOT HEAL', { fx: { lifesteal: 8 }, rules: { noNaps: true } }),
  m('heavypaws', 'HEAVY PAWS', '-1 AP EVERY TURN, +60% DAMAGE', { bonus: { ap: -1, dmg: 0.6 } }),
  m('treasure', 'LOOT RAIN', 'TRIPLE CRITTER DROPS, FOES +20% HP', { rules: { dropMul: 3 }, fx: { foeHp: 20 } }),
  m('firepaws', 'FIRE PAWS', 'HITS BURN, YOU TAKE 20% MORE DAMAGE', { fx: { burnHit: 2 }, bonus: { taken: 0.2 } }),
  m('siege', 'SIEGE WEEK', 'FOES START WITH BLOCK, +25% DAMAGE', { rules: { foeBlock: true }, bonus: { dmg: 0.25 } }),
  m('sugarrush', 'SUGAR RUSH', '+2 AP EVERY TURN, 40% LESS HP', { bonus: { ap: 2, hpMul: -0.4 } }),
  m('scavenger', 'SCAVENGER', 'KILLS HEAL 6, CAMPS CANNOT HEAL', { fx: { killHeal: 6 }, rules: { noNaps: true } }),
  m('bounty', 'BOUNTY HUNT', 'DOUBLE ELITES, +50% SHINIES', { rules: { eliteMul: 2 }, bonus: { shinyMult: 0.5 } }),
  m('frostbite', 'FROSTBITE', 'HITS CHILL, 15% LESS DAMAGE', { fx: { chillHit: 1 }, bonus: { dmg: -0.15 } }),
  m('ninelives', 'NINE LIVES', 'SURVIVE ONE LETHAL HIT A FIGHT, NO NAPS', { fx: { cheatDeath: 1 }, rules: { noNaps: true } }),
  m('horde', 'HORDE', 'ONE MORE FOE EVERY FIGHT, FOES 25% WEAKER', { rules: { extraFoe: true }, fx: { foeHp: -25, foeDmg: -15 } }),
  m('hotsoup', 'HOT SOUP', 'HEAL 15% AFTER FIGHTS, PRICIER SHOPS', { fx: { fightHeal: 15 }, bonus: { discount: -0.3 } }),
  m('venom', 'VENOM FANGS', 'HITS POISON, FOES HIT 15% HARDER', { fx: { poisonHit: 2, foeDmg: 15 } }),
  m('bigmuscles', 'BIG MUSCLES', '+3 STR, -3 DEF', { bonus: { str: 3, def: -3 } }),
  m('doubletrouble', 'TWIN TROUBLE', 'TWIN BOSSES, +40% DAMAGE TO BOSSES', { rules: { twinBoss: true }, fx: { bossDmg: 40 } }),
  m('taxman', 'TAXMAN', 'DOUBLE SHINIES, 25% TAX AFTER FIGHTS', { bonus: { shinyMult: 1 }, fx: { fightTax: 25 } }),
  m('firststrike', 'FIRST STRIKE', 'FIGHTS OPEN WITH A BLAST, FOES +20% HP', { fx: { firstStrike: 8, foeHp: 20 } }),
  m('turtle', 'TURTLE WEEK', 'KEEP HALF YOUR BLOCK, 15% LESS DAMAGE', { fx: { blockKeep: 50 }, bonus: { dmg: -0.15 } }),
  m('chaos', 'CHAOS WEEK', 'SOMETHING RANDOM HAPPENS EVERY TURN', { fx: { chaos: 1 } }),
  m('tiny', 'TINY RACCOON', '30% LESS HP, +20% DODGE', { bonus: { hpMul: -0.3, dodge: 0.2 } }),
  m('lasereyes', 'LASER EYES', 'ZAP THE TOUGHEST FOE, FOES HIT 20% HARDER', { fx: { laser: 4, foeDmg: 20 } }),
  m('fastlearner', 'FAST LEARNER', '+50% XP, FOES +20% HP', { bonus: { xp: 0.5 }, fx: { foeHp: 20 } }),
  m('spooky', 'SPOOKY WEEK', 'FOES START WITH BLOCK, HEAL 10% AFTER FIGHTS', { rules: { foeBlock: true }, fx: { fightHeal: 10 } }),
  m('crits', 'CRIT FEST', 'CRITS HIT TWICE AS HARD, YOU TAKE 20% MORE', { bonus: { critMult: 1, taken: 0.2 } }),
  m('barepaws', 'BARE PAWS', 'CRITTERS DROP NOTHING, +40% XP', { rules: { noDrops: true }, bonus: { xp: 0.4 } }),
  m('flies', 'FLY SWARM', 'FLIES BITE A FOE EVERY TURN, FOES +15% HP', { fx: { flies: 4, foeHp: 15 } }),
  m('berserk', 'BERSERK', '+50% DAMAGE UNDER 35% HP, 15% LESS HP', { fx: { rage: 50 }, bonus: { hpMul: -0.15 } }),
  m('bargain', 'BARGAIN BIN', 'SHOPS 30% OFF, CAMPS CANNOT HEAL', { bonus: { discount: 0.3 }, rules: { noNaps: true } }),
  m('chain', 'CHAIN HITS', 'HITS JUMP TO ANOTHER FOE, 10% LESS DAMAGE', { fx: { chain: 40 }, bonus: { dmg: -0.1 } }),
  m('bigboned', 'BIG BONED', '+40% HP, 15% LESS DAMAGE', { bonus: { hpMul: 0.4, dmg: -0.15 } }),
  m('elitehunt', 'SHOWDOWN', 'TRIPLE ELITES, +40% DAMAGE TO THEM', { rules: { eliteMul: 3 }, fx: { bossDmg: 40 } }),
  m('piggybank', 'PIGGY BANK', 'SHINIES BLOCK HITS, 10% TAX AFTER FIGHTS', { fx: { moneyArmor: 1, fightTax: 10 } }),
  m('combo', 'COMBO WEEK', 'KILLS GIVE 1 AP, FOES HIT 15% HARDER', { fx: { killAp: 1, foeDmg: 15 } }),
  m('ironhide', 'IRON HIDE', 'TAKE 15% LESS DAMAGE, HALF HEALING', { bonus: { armor: 0.15, healMul: -0.5 } }),
  m('splash', 'SPLASH WEEK', 'HITS SPLASH EVERY FOE, FOES +15% HP', { fx: { splash: 25, foeHp: 15 } }),
  m('speedrun', 'SPEEDRUN', 'BOSSES COME EARLY, +3 AGI', { rules: { bossRush: true }, bonus: { agi: 3 } }),
  m('trollblood', 'TROLL BLOOD', 'HEAL 3 EVERY TURN, CAMPS CANNOT HEAL', { fx: { regen: 3 }, rules: { noNaps: true } }),
  m('steady', 'STEADY PAWS', 'NO CRITS, +35% DAMAGE', { bonus: { crit: -1, dmg: 0.35 } }),
  m('marked', 'MARKED FOES', 'FOES START MARKED, FOES +20% HP', { fx: { markStart: 2, foeHp: 20 } }),
  m('compound', 'COMPOUND', '10% INTEREST AFTER FIGHTS, PRICIER SHOPS', { fx: { interest: 10 }, bonus: { discount: -0.3 } }),
  m('bleeder', 'SHARP CLAWS', 'HITS BLEED, FOES +15% HP', { fx: { bleedHit: 2, foeHp: 15 } }),
  m('tankweek', 'TANK WEEK', '+4 DEF, -2 STR', { bonus: { def: 4, str: -2 } }),
  m('ambush', 'AMBUSH', '+60% DAMAGE ON TURN ONE, TAKE 15% MORE', { fx: { ambush: 60 }, bonus: { taken: 0.15 } }),
  m('stampede', 'STAMPEDE', 'ONE MORE FOE EVERY FIGHT, +40% AREA DAMAGE', { rules: { extraFoe: true }, fx: { aoeDmg: 40 } }),
  m('bananas', 'BANANA PEELS', 'FOES TRIP 10% OF TURNS, HIT 20% HARDER', { fx: { trip: 10, foeDmg: 20 } }),
  m('poisonivy', 'POISON IVY', 'YOU START POISONED, +25% DAMAGE', { fx: { selfPoison: 4 }, bonus: { dmg: 0.25 } }),
  m('echo', 'ECHO WEEK', 'SKILLS MAY FIRE TWICE, LONGER COOLDOWNS', { fx: { echo: 20, cdPlus: 1 } }),
  m('nimble', 'NIMBLE', '+10% DODGE, DODGES HEAL 3, 20% LESS HP', { bonus: { dodge: 0.1, hpMul: -0.2 }, fx: { dodgeHeal: 3 } }),
  m('kaboom', 'KABOOM', 'KILLS BLAST THE OTHERS, FOES HIT 10% HARDER', { fx: { killBurst: 6, foeDmg: 10 } }),
  m('duelist', 'DUELIST', '+30% SINGLE-TARGET DAMAGE, FOES +15% HP', { fx: { soloDmg: 30, foeHp: 15 } }),
  m('roughroad', 'ROUGH ROAD', '+50% XP, LOSE 8% HP AFTER FIGHTS', { bonus: { xp: 0.5 }, fx: { fightHurt: 8 } }),
  m('headstart', 'HEAD START', '+2 AP ON TURN ONE, FOES HIT 15% HARDER', { fx: { startAp: 2, foeDmg: 15 } }),
  m('clover', 'CLOVER', '+5 LCK, -2 DEF', { bonus: { lck: 5, def: -2 } }),
  m('bonk', 'BONK WEEK', 'HITS MAY STUN, FOES +25% HP', { fx: { stunChance: 15, stunDmg: 30, foeHp: 25 } }),
  m('heavyskills', 'SLOW SKILLS', 'LONGER COOLDOWNS, +30% DAMAGE', { fx: { cdPlus: 1 }, bonus: { dmg: 0.3 } }),
  m('focused', 'FOCUSED', 'FIRST 2 HITS CRIT, 10% LESS HP', { fx: { focusStart: 2 }, bonus: { hpMul: -0.1 } }),
  m('plague', 'PLAGUE', 'FOES START POISONED AND SPREAD IT, +20% HP', { fx: { stink: 4, poisonSpread: 50, foeHp: 20 } }),
  m('bossfever', 'GIANT SLAYER', 'BOSSES COME EARLY, +50% DAMAGE TO THEM', { rules: { bossRush: true }, fx: { bossDmg: 50 } }),
  m('chonky', 'CHONKY', '+4 VIT, -3 AGI', { bonus: { vit: 4, agi: -3 } }),
  m('slippery', 'SLIPPERY', 'DODGE 2 HITS EACH FIGHT, FOES HIT 20% HARDER', { fx: { evadeStart: 2, foeDmg: 20 } }),
  m('cursedgold', 'CURSED GOLD', 'TRIPLE SHINIES, FOES HIT 25% HARDER', { bonus: { shinyMult: 2 }, fx: { foeDmg: 25 } }),
  m('boomerang', 'BOOMERANGS', 'HIT EVERY FOE AT TURN END, FOES +15% HP', { fx: { boomerang: 3, foeHp: 15 } }),
  m('starving', 'STARVING', 'CAMPS CANNOT HEAL, +1 AP EVERY TURN', { rules: { noNaps: true }, bonus: { ap: 1 } }),
  m('shieldbash', 'SHIELD BASH', 'HITS ADD 30% OF BLOCK, 15% LESS DAMAGE', { fx: { blockDmg: 30 }, bonus: { dmg: -0.15 } }),
  m('hotstreak', 'HOT STREAK', 'KILLS GIVE A SURE CRIT, FOES +15% HP', { fx: { killFocus: 1, foeHp: 15 } }),
  m('speedy', 'SPEEDY', '+4 AGI, -2 VIT', { bonus: { agi: 4, vit: -2 } }),
  m('bloodmoon', 'BLOOD MOON', '+60% DAMAGE UNDER 35% HP, LOSE 5% AFTER FIGHTS', { fx: { rage: 60, fightHurt: 5 } }),
  m('lootfest', 'LOOT FEST', 'RISKY LOOT, DOUBLE CRITTER DROPS', { rules: { riskyLoot: true, dropMul: 2 } }),
  m('boneswall', 'BONE WALL', 'KILLS GIVE BLOCK, FOES HIT 15% HARDER', { fx: { killBlock: 6, foeDmg: 15 } }),
  m('shinyclaws', 'SHINY CLAWS', 'HITS GRAB SHINIES, FIGHTS PAY HALF', { fx: { goldHit: 1 }, bonus: { shinyMult: -0.5 } }),
  m('refunds', 'REFUNDS', 'SKILLS MAY GIVE AP BACK, FOES HIT 20% HARDER', { fx: { refund: 25, foeDmg: 20 } }),
  m('healthy', 'HEALTHY', 'DOUBLE HEALING, FOES HIT 20% HARDER', { bonus: { healMul: 1 }, fx: { foeDmg: 20 } }),
  m('hefty', 'HEFTY HITS', 'HITS ADD 5% OF YOUR HP, TAKE 15% MORE', { fx: { hpDmg: 5 }, bonus: { taken: 0.15 } }),
  m('laststand', 'LAST STAND', '+50% DAMAGE TO THE LAST FOE, FOES +20% HP', { fx: { duel: 50, foeHp: 20 } }),
  m('moshpit', 'MOSH PIT', 'ONE MORE FOE EVERY FIGHT, +15% DAMAGE PER FOE', { rules: { extraFoe: true }, fx: { crowd: 15 } }),
  m('cooldown', 'COOL HEAD', 'COOLDOWNS MAY TICK TWICE, FOES +15% HP', { fx: { quickCd: 40, foeHp: 15 } }),
  m('burningground', 'HOT GROUND', 'LOSE 1 HP EVERY TURN, +30% DAMAGE', { fx: { turnHurt: 1 }, bonus: { dmg: 0.3 } }),
  m('doubletap', 'DOUBLE TAP', 'MULTI-HIT SKILLS HIT ONCE MORE, 20% LESS DAMAGE', { fx: { multiHit: 1 }, bonus: { dmg: -0.2 } }),
  m('bigspender', 'BIG SPENDER', 'SHINIES HELD BOOST DAMAGE, 15% TAX', { fx: { richDmg: 10, fightTax: 15 } }),
  m('sneak', 'SNEAK ATTACK', 'FIRST HIT EACH FIGHT CRITS, FOES +10% HP', { fx: { firstCrit: 1, foeHp: 10 } }),
  m('toxiclab', 'TOXIC LAB', 'HITS POISON, POISON +50%, 10% LESS DAMAGE', { fx: { poisonHit: 1, statusAmp: 50 }, bonus: { dmg: -0.1 } }),
  m('spikedshield', 'SPIKY BLOCK', 'BLOCKED HITS HURT FOES, FOES HIT 15% HARDER', { fx: { spikeBlock: 50, foeDmg: 15 } }),
  m('slowburn', 'SLOW BURN', '+10% DAMAGE EACH TURN, FOES HIT 10% HARDER', { fx: { slowBurn: 10, foeDmg: 10 } }),
  m('glassjaw', 'GLASS JAW', '+15% CRIT CHANCE, TAKE 30% MORE DAMAGE', { bonus: { crit: 0.15, taken: 0.3 } }),
  m('critguard', 'CRIT GUARD', 'CRITS GIVE BLOCK, FOES HIT 15% HARDER', { fx: { critBlock: 5, foeDmg: 15 } }),
  m('shinyshield', 'SHINY SHIELD', 'SHINIES BLOCK HITS, FIGHTS PAY 30% LESS', { fx: { moneyArmor: 2 }, bonus: { shinyMult: -0.3 } }),
  m('luckyheal', 'LUCKY HEAL', 'CRITS HEAL 5, FOES +15% HP', { fx: { critHeal: 5, foeHp: 15 } }),
  m('featherweight', 'LIGHTWEIGHT', '+15% DODGE, TAKE 25% MORE DAMAGE', { bonus: { dodge: 0.15, taken: 0.25 } }),
];

export const MUTATORS: Record<MutatorId, MutatorDef> = Object.fromEntries(MUTATOR_LIST.map((d) => [d.id, d]));

const DAY_MS = 86400000;
const FIRST_MONDAY = Date.UTC(1970, 0, 5);

// Weeks since the first Monday of 1970, for a UTC day (YYYY-MM-DD).
export function weekNo(day: string) {
  return Math.floor((Date.parse(`${day}T00:00:00Z`) - FIRST_MONDAY) / (7 * DAY_MS));
}

export function weeklyMutator(day: string): MutatorId {
  const n = MUTATOR_LIST.length;
  return MUTATOR_LIST[((weekNo(day) % n) + n) % n].id;
}

export function mutatorOf(r: RunState): MutatorDef | null {
  return (r.mutator && MUTATORS[r.mutator]) || null;
}

// The run's road rules; a run with no weekly rule gets the plain ones.
export function rules(r: RunState): MutatorRules {
  const d = mutatorOf(r);
  return d?.rules ? { ...NO_RULES, ...d.rules } : NO_RULES;
}
