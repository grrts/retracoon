// Road events that can happen anywhere (no themes).
import type { BlessingId, EventDef } from '../types';
import { ART } from './art';
import { bless, canHurt, canPay, hasItem, heal, hurt, leave, pick, roll } from './util';

export const EVENTS_GENERAL: EventDef[] = [
  // ---- trash piles
  {
    id: 'trash_pile',
    title: 'TRASH PILE',
    text: ['A FRESH HEAP OF GARBAGE.', 'SOMETHING MOVES DEEP INSIDE.'],
    artRows: ART.trash,
    weight: 1.5,
    options: [
      { label: 'DIG', detail: '+8 SHINIES, NO RISK', run: (r) => (r.addShinies(8), 'YOU DIG UP 8 SHINIES.') },
      {
        label: 'DIG DEEP',
        detail: 'ITEM, 40%: NEXT FIGHT IS ELITE',
        run: (r) => {
          const got = r.giveRandomItem(r.danger >= 8 ? 2 : 1, 3);
          if (roll(0.4)) return r.eliteNext(), `GOT ${got}! SOMETHING BIG WOKE UP...`;
          return `GOT ${got}! NOTHING STIRS.`;
        },
      },
      leave('YOU HOLD YOUR NOSE AND MOVE ON.'),
    ],
  },
  {
    id: 'trash_bags',
    title: 'BAGS OF TRASH',
    text: ['A ROW OF FAT TRASH BAGS.', 'YOU HEAR SQUEAKING INSIDE.'],
    artRows: ART.trash,
    options: [
      {
        label: 'RUMMAGE',
        detail: '+12 SHINIES, 30%: -10% HP',
        run: (r) => {
          r.addShinies(12);
          return roll(0.3) ? `+12 SHINIES, BUT A RAT BIT YOU. -${hurt(r, 0.1)} HP.` : '+12 SHINIES. CLEAN GET.';
        },
      },
      {
        label: 'DIG AGAIN',
        detail: 'UNCOMMON+ ITEM, 60%: -20% HP',
        can: canHurt(0.2),
        run: (r) => {
          const got = r.giveRandomItem(1, 4);
          return roll(0.6) ? `GOT ${got}! RATS SWARM YOU. -${hurt(r, 0.2)} HP.` : `GOT ${got}! THE RATS SLEPT.`;
        },
      },
      leave('YOU LET THE RATS BE.'),
    ],
  },
  {
    id: 'dumpster',
    title: 'BIG DUMPSTER',
    text: ['SOMETHING SHINY IS BURIED DEEP INSIDE.', 'IT SMELLS DANGEROUS.'],
    art: 'can',
    options: [
      { label: 'DIG IN', detail: '-30% HP, RARE+ ITEM', can: canHurt(0.3), run: (r) => (hurt(r, 0.3), `FOUND ${r.giveRandomItem(2)}!`) },
      leave('YOU KEEP YOUR NOSE CLEAN.', 'WALK PAST'),
    ],
  },

  // ---- shrines
  {
    id: 'blood_shrine',
    title: 'BLOOD SHRINE',
    text: ['AN OLD STONE SHRINE HUMS.', 'IT WANTS A LITTLE OF YOUR HEALTH.'],
    artRows: ART.shrine,
    options: [
      { label: 'PRAY: POWER', detail: '-15% HP, +1 STR', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('str', 1), 'THE SHRINE GLOWS RED. +1 STR!') },
      { label: 'PRAY: IRON', detail: '-15% HP, +1 DEF', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('def', 1), 'YOUR FUR TURNS TOUGH. +1 DEF!') },
      leave('THE HUMMING FADES BEHIND YOU.'),
    ],
  },
  {
    id: 'moon_shrine',
    title: 'MOON SHRINE',
    text: ['A SILVER SHRINE UNDER A CRESCENT.', 'IT ASKS FOR A DROP OF BLOOD.'],
    artRows: ART.shrine,
    minDanger: 2,
    options: [
      { label: 'PRAY: WIND', detail: '-15% HP, +1 AGI', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('agi', 1), 'YOUR PAWS FEEL LIGHT. +1 AGI!') },
      { label: 'PRAY: STARS', detail: '-15% HP, +1 LCK', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('lck', 1), 'A STAR WINKS AT YOU. +1 LCK!') },
      leave('THE MOON WATCHES YOU GO.'),
    ],
  },
  {
    id: 'wishing_well',
    title: 'WISHING WELL',
    text: ['COINS GLINT AT THE BOTTOM OF A WELL.', 'MAKE A WISH?'],
    artRows: ART.well,
    options: [
      {
        label: 'WISH (15)',
        detail: 'PAY 15: SHIELD, SHARP OR LUCKY',
        can: canPay(15),
        run: (r) => {
          r.addShinies(-15);
          return `WISH GRANTED: ${bless(r, pick<BlessingId>(['shield', 'sharp', 'lucky']), 3)}!`;
        },
      },
      { label: 'FISH COINS', detail: '+15 SHINIES, HEXED 2 FIGHTS', run: (r) => (r.addShinies(15), `+15 SHINIES. THE WELL IS ANGRY: ${bless(r, 'hexed', 2)}.`) },
      leave('YOU KEEP YOUR WISHES TO YOURSELF.'),
    ],
  },

  // ---- traders
  {
    id: 'wandering_trader',
    title: 'WANDERING TRADER',
    text: ['A FERRET PUSHES A CART OF ODDITIES.', 'SHE ONLY TRADES UP.'],
    artRows: ART.cart,
    options: [
      {
        label: 'TRADE',
        detail: 'LOSE A RANDOM ITEM, GET RARE+',
        can: hasItem,
        run: (r) => {
          const lost = r.removeRandomItem() ?? 'NOTHING';
          return `GAVE ${lost}, GOT ${r.giveRandomItem(2, 4)}!`;
        },
      },
      { label: 'BUY (25)', detail: 'PAY 25: UNCOMMON+ ITEM', can: canPay(25), run: (r) => (r.addShinies(-25), `BOUGHT ${r.giveRandomItem(1, 3)}.`) },
      leave('THE FERRET SHRUGS AND ROLLS ON.'),
    ],
  },
  {
    id: 'possum_trader',
    title: 'SHADY POSSUM',
    text: ['PSST. GIVE ME ONE OF YOUR THINGS.', 'I GIVE YOU SOMETHING BETTER.'],
    art: 'possum',
    options: [
      {
        label: 'TRADE',
        detail: 'SWAP A RANDOM ITEM FOR RARE+',
        can: hasItem,
        run: (r) => {
          const lost = r.removeRandomItem() ?? 'NOTHING';
          return `GAVE ${lost}, GOT ${r.giveRandomItem(2, 4)}!`;
        },
      },
      leave('THE POSSUM PLAYS DEAD.', 'NO THANKS'),
    ],
  },
  {
    id: 'cap_collector',
    title: 'CAP COLLECTOR',
    text: ['A MAGPIE COLLECTS RARE BOTTLE CAPS.', 'CAPS STAY WITH YOU AFTER THE RUN.'],
    options: [
      { label: 'SELL SHINIES', detail: 'PAY 20 SHINIES: +3 CAPS', can: canPay(20), run: (r) => (r.addShinies(-20), r.addCaps(3), 'THE MAGPIE COUNTS THEM TWICE. +3 CAPS.') },
      {
        label: 'SELL AN ITEM',
        detail: 'LOSE A RANDOM ITEM: +6 CAPS',
        can: hasItem,
        run: (r) => {
          const lost = r.removeRandomItem() ?? 'NOTHING';
          r.addCaps(6);
          return `SOLD ${lost}. +6 CAPS.`;
        },
      },
      leave('THE MAGPIE PREENS AND IGNORES YOU.'),
    ],
  },

  // ---- boxes and finds
  {
    id: 'locked_crate',
    title: 'LOCKED CRATE',
    text: ['A HEAVY CRATE WITH A RUSTY PADLOCK.', 'SOMETHING RATTLES INSIDE.'],
    artRows: ART.crate,
    options: [
      { label: 'SMASH IT', detail: '-15% HP, UNCOMMON+ ITEM', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), `SPLINTERS EVERYWHERE. GOT ${r.giveRandomItem(1, 3)}!`) },
      {
        label: 'PICK LOCK',
        detail: '50%: RARE+ ITEM. 50%: NOTHING',
        run: (r) => (roll(0.5) ? `CLICK! GOT ${r.giveRandomItem(2, 4)}!` : 'THE PICK SNAPS. THE CRATE STAYS SHUT.'),
      },
      leave('YOU LEAVE THE CRATE TO SOMEONE ELSE.'),
    ],
  },
  {
    id: 'mystery_box',
    title: 'MYSTERY BOX',
    text: ['A PURPLE BOX WITH A COIN SLOT.', 'IT RATTLES WHEN YOU SHAKE IT.'],
    artRows: ART.box,
    options: [
      { label: 'PAY 15', detail: 'PAY 15: ITEM OF ANY RARITY', can: canPay(15), run: (r) => (r.addShinies(-15), `CLUNK! OUT POPS ${r.giveRandomItem(0, 4)}.`) },
      { label: 'KICK IT', detail: '+5 SHINIES, -5% HP', can: canHurt(0.05), run: (r) => (r.addShinies(5), `OW! ${hurt(r, 0.05)} DAMAGE. 5 SHINIES FALL OUT.`) },
      leave('SOME MYSTERIES STAY MYSTERIES.'),
    ],
  },
  {
    id: 'golden_idol',
    title: 'GOLDEN IDOL',
    text: ['A GOLD RACCOON STATUE WITH RUBY EYES.', 'IT FEELS CURSED.'],
    artRows: ART.idol,
    minDanger: 2,
    options: [
      { label: 'TAKE IT', detail: '+40 SHINIES, HEXED 3 FIGHTS', run: (r) => (r.addShinies(40), `+40 SHINIES! YOU FEEL WATCHED: ${bless(r, 'hexed', 3)}.`) },
      { label: 'BOW TO IT', detail: 'PAY 10: +1 LCK', can: canPay(10), run: (r) => (r.addShinies(-10), r.addStat('lck', 1), 'THE RUBY EYES TWINKLE. +1 LCK!') },
      leave('YOU BACK AWAY SLOWLY.'),
    ],
  },

  // ---- critters
  {
    id: 'lost_critter',
    title: 'LOST CHICK',
    text: ['A TINY CHICK IS LOST AND CHEEPING.', 'A CAT IS PROWLING NEARBY.'],
    artRows: ART.chick,
    options: [
      { label: 'HELP IT', detail: '-10% HP, CRITTER FRIEND 3 FIGHTS', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), `YOU CHASE OFF THE CAT. ${bless(r, 'friend', 3)}!`) },
      { label: 'SHARE SNACK', detail: 'PAY 5: CRITTER FRIEND 2 FIGHTS', can: canPay(5), run: (r) => (r.addShinies(-5), `THE CHICK FOLLOWS YOU. ${bless(r, 'friend', 2)}!`) },
      leave('YOU HOPE IT FINDS ITS MOM.', 'WALK ON'),
    ],
  },
  {
    id: 'old_raccoon',
    title: 'OLD RACCOON',
    text: ['A GREY-WHISKERED RACCOON OFFERS TIPS.'],
    options: [
      { label: 'LISTEN', detail: '+15 XP', run: (r) => (r.addXp(15), 'YOU LEARNED SOMETHING. +15 XP.') },
      { label: 'PAY 10', detail: 'PAY 10: +40 XP', can: canPay(10), run: (r) => (r.addShinies(-10), r.addXp(40), 'A MASTERCLASS IN MISCHIEF. +40 XP.') },
    ],
  },
  {
    id: 'shaman',
    title: 'RAT SHAMAN',
    text: ['GIVE ME SOME OF YOUR LIFE, BANDIT.', 'I WILL GIVE YOU POWER.'],
    art: 'rat',
    minDanger: 5,
    options: [
      { label: 'ACCEPT', detail: '-2 VIT, EPIC+ ITEM', run: (r) => (r.addStat('vit', -2), `YOU FEEL EMPTY. GOT ${r.giveRandomItem(3)}!`) },
      leave('THE SHAMAN SNEERS.', 'REFUSE'),
    ],
  },

  // ---- traps
  {
    id: 'banana_peel',
    title: 'BANANA PEEL',
    text: ['A BANANA PEEL LIES RIGHT IN YOUR PATH.'],
    artRows: ART.banana,
    options: [
      {
        label: 'SLIDE ON IT',
        detail: '50%: +80M. 50%: -10% HP',
        run: (r) => (roll(0.5) ? (r.addDistance(80), 'WHEEE! YOU SLIDE 80M AHEAD.') : `SPLAT. YOU LAND ON YOUR FACE. -${hurt(r, 0.1)} HP.`),
      },
      leave('YOU STEP AROUND IT LIKE A PRO.', 'STEP AROUND'),
    ],
  },
  {
    id: 'bear_trap',
    title: 'BEAR TRAP',
    text: ['A SHINY BOTTLE CAP SITS IN AN OPEN BEAR TRAP.'],
    artRows: ART.beartrap,
    options: [
      {
        label: 'GRAB IT',
        detail: '+20 SHINIES, 40%: -25% HP',
        can: canHurt(0.25),
        run: (r) => {
          r.addShinies(20);
          return roll(0.4) ? `SNAP! -${hurt(r, 0.25)} HP, BUT +20 SHINIES.` : 'QUICK PAWS! +20 SHINIES.';
        },
      },
      {
        label: 'USE A STICK',
        detail: '+10 SHINIES, 15%: -10% HP',
        run: (r) => {
          r.addShinies(10);
          return roll(0.15) ? `THE STICK SLIPS. -${hurt(r, 0.1)} HP, +10 SHINIES.` : 'CAREFUL WORK. +10 SHINIES.';
        },
      },
      leave('NOT TODAY, TRAP.'),
    ],
  },

  // ---- elites
  {
    id: 'elite_ambush',
    title: 'AMBUSH!',
    text: ['GLOWING EYES IN THE BUSHES.', 'SOMETHING BIG IS WAITING FOR YOU.'],
    artRows: ART.eyes,
    minDanger: 2,
    options: [
      { label: 'FIGHT IT', detail: 'NEXT FIGHT ELITE, BETTER LOOT', run: (r) => (r.eliteNext(), 'YOU STEP UP. IT STEPS OUT...') },
      { label: 'SNEAK AROUND', detail: 'NO FIGHT, BUT -60M', run: (r) => (r.addDistance(-60), 'YOU TAKE THE LONG WAY. -60M.') },
    ],
  },
  {
    id: 'elite_roost',
    title: 'ELITE ROOST',
    text: ['TOUGH CRITTERS GUARD A STASH OF TREASURE.'],
    art: 'cat',
    minDanger: 3,
    options: [
      { label: 'CHALLENGE', detail: 'NEXT FIGHT ELITE, EPIC LOOT', run: (r) => (r.eliteNext(), 'THEY NOTICED YOU...') },
      leave('NOBODY SAW A THING.', 'SNEAK PAST'),
    ],
  },

  // ---- gambles and rests
  {
    id: 'dice',
    title: 'BACK-ALLEY DICE',
    text: ['RATS ARE ROLLING DICE FOR SHINIES.', 'DOUBLE OR NOTHING?'],
    art: 'rat',
    options: [
      {
        label: 'BET HALF',
        detail: '50%: DOUBLE IT. 50%: LOSE IT',
        can: canPay(4),
        run: (r) => {
          const bet = Math.floor(r.shinies / 2);
          if (roll(0.5)) return r.addShinies(bet), `YOU WIN ${bet} SHINIES!`;
          r.addShinies(-bet);
          return `THE RATS TAKE ${bet} SHINIES.`;
        },
      },
      leave('SMART RACCOON.'),
    ],
  },
  {
    id: 'shortcut',
    title: 'DARK SHORTCUT',
    text: ['A GAP IN THE FENCE LEADS STRAIGHT AHEAD.', 'SOMETHING NASTY LIVES IN THERE.'],
    options: [
      { label: 'TAKE IT', detail: '+150M, DANGER +1 FOR THE RUN', run: (r) => (r.addDistance(150), r.addHeat(1), 'YOU SQUEEZE THROUGH. +150M!') },
      leave('THE LONG WAY IT IS.', 'STAY ON PATH'),
    ],
  },
  {
    id: 'pizza',
    title: 'ABANDONED PIZZA',
    text: ['A WHOLE PIZZA, STILL WARM.', 'NOBODY IS AROUND.'],
    art: 'pizza',
    options: [
      { label: 'EAT IT', detail: 'HEAL TO FULL', can: (r) => r.hp < r.maxHp, run: (r) => (r.heal(r.maxHp), 'DELICIOUS. FULLY HEALED!') },
      { label: 'SELL IT', detail: '+15 SHINIES', run: (r) => (r.addShinies(15), 'SOLD TO A HUNGRY PIGEON. +15 SHINIES.') },
    ],
  },
  {
    id: 'gym',
    title: 'ABANDONED GYM',
    text: ['RUSTY WEIGHTS AND A HAMSTER WHEEL.', 'NO PAIN, NO GAIN?'],
    options: [
      { label: 'LIFT', detail: '-20% HP, +1 STR', can: canHurt(0.2), run: (r) => (hurt(r, 0.2), r.addStat('str', 1), 'SWOLE. +1 STR!') },
      { label: 'RUN THE WHEEL', detail: '-20% HP, +1 AGI', can: canHurt(0.2), run: (r) => (hurt(r, 0.2), r.addStat('agi', 1), 'ZOOM. +1 AGI!') },
      { label: 'NAP ON MAT', detail: 'HEAL 30%', run: (r) => `A GOOD NAP. +${heal(r, 0.3)} HP.` },
    ],
  },
  {
    id: 'campfire',
    title: 'COZY CAMPFIRE',
    text: ['SOMEONE LEFT A FIRE BURNING.', 'IT IS WARM AND QUIET HERE.'],
    artRows: ART.campfire,
    options: [
      { label: 'REST', detail: 'HEAL 30%', run: (r) => `YOU DOZE BY THE FIRE. +${heal(r, 0.3)} HP.` },
      { label: 'TRAIN', detail: '+25 XP', run: (r) => (r.addXp(25), 'SHADOW-BOXING BY FIRELIGHT. +25 XP.') },
    ],
  },
];
