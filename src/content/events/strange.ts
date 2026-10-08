// Road events for the strange themes: mushroom, crystal_caves, candy, haunted,
// clockwork, toybox, clouds, ruins, lava, boneyard.
import type { EventDef, StatKey } from '../types';
import { ART } from './art';
import { bless, canHurt, canPay, heal, hurt, leave, pick, roll, STAT_NAME } from './util';

export const EVENTS_STRANGE: EventDef[] = [
  {
    id: 'glowing_mushroom',
    title: 'GLOWING MUSHROOM',
    text: ['A MUSHROOM PULSES WITH PINK LIGHT.'],
    artRows: ART.mushroom,
    themes: ['mushroom', 'haunted', 'crystal_caves'],
    options: [
      {
        label: 'EAT IT',
        detail: '50%: +1 RANDOM STAT. 50%: -15% HP',
        can: canHurt(0.15),
        run: (r) => {
          if (roll(0.5)) {
            const k = pick<StatKey>(['str', 'def', 'agi', 'lck', 'vit']);
            r.addStat(k, 1);
            return `EVERYTHING SPARKLES. +1 ${STAT_NAME[k]}!`;
          }
          return `THE WORLD SPINS. -${hurt(r, 0.15)} HP.`;
        },
      },
      { label: 'SELL IT', detail: '+12 SHINIES', run: (r) => (r.addShinies(12), 'A GNOME PAYS 12 SHINIES FOR IT.') },
    ],
  },
  {
    id: 'singing_crystal',
    title: 'SINGING CRYSTAL',
    text: ['A CRYSTAL HUMS A STRANGE TUNE.'],
    artRows: ART.crystal,
    themes: ['crystal_caves', 'ruins'],
    options: [
      { label: 'TOUCH IT', detail: '-10% HP, +1 LCK', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), r.addStat('lck', 1), 'IT SHOCKS YOU, THEN SINGS. +1 LCK.') },
      {
        label: 'MINE IT',
        detail: '+20 SHINIES, 30%: -15% HP',
        run: (r) => {
          r.addShinies(20);
          return roll(0.3) ? `IT SHATTERS! -${hurt(r, 0.15)} HP, +20 SHINIES.` : 'CLEAN CUT. +20 SHINIES.';
        },
      },
      leave('THE SONG FOLLOWS YOU FOR A WHILE.'),
    ],
  },
  {
    id: 'candy_house',
    title: 'CANDY HOUSE',
    text: ['A HOUSE MADE OF CAKE AND CANDY.', 'NOBODY SEEMS TO BE HOME.'],
    artRows: ART.candy,
    themes: ['candy', 'toybox'],
    options: [
      { label: 'NIBBLE', detail: 'HEAL 30%', run: (r) => `A BITE OF THE DOOR. +${heal(r, 0.3)} HP.` },
      { label: 'EAT IT ALL', detail: 'FULL HEAL, SLOW FOR 2 FIGHTS', run: (r) => (r.heal(r.maxHp), `STUFFED! FULL HP. ${bless(r, 'slow', 2)}.`) },
    ],
  },
  {
    id: 'friendly_ghost',
    title: 'FRIENDLY GHOST',
    text: ['A LITTLE GHOST WANTS TO TAG ALONG.', 'IT IS VERY COLD TO TOUCH.'],
    artRows: ART.ghost,
    themes: ['haunted', 'boneyard', 'ruins'],
    options: [
      { label: 'BEFRIEND', detail: '-10% HP, CRITTER FRIEND 4 FIGHTS', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), `BRR! A SPOOKY PAL. ${bless(r, 'friend', 4)}!`) },
      { label: 'SPOOK IT', detail: '+15 XP', run: (r) => (r.addXp(15), 'BOO! IT FLEES. +15 XP.') },
    ],
  },
  {
    id: 'giant_clock',
    title: 'GIANT CLOCK',
    text: ['A HUGE CLOCK TICKS BACKWARDS.'],
    themes: ['clockwork', 'toybox', 'ruins'],
    options: [
      { label: 'WIND IT (10)', detail: 'PAY 10: SWIFT (+1 AP) 3 FIGHTS', can: canPay(10), run: (r) => (r.addShinies(-10), `TIME SPEEDS UP. ${bless(r, 'swift', 3)}!`) },
      { label: 'SMASH IT', detail: '+15 SHINIES, SLOW 2 FIGHTS', run: (r) => (r.addShinies(15), `GEARS EVERYWHERE. +15 SHINIES. ${bless(r, 'slow', 2)}.`) },
      leave('TICK. TOCK. YOU MOVE ON.'),
    ],
  },
  {
    id: 'lava_forge',
    title: 'LAVA FORGE',
    text: ['AN ANVIL GLOWS BESIDE A LAVA POOL.'],
    artRows: ART.forge,
    themes: ['lava', 'ruins', 'boneyard'],
    minDanger: 3,
    options: [
      { label: 'FORGE (30)', detail: 'PAY 30: RARE OR EPIC ITEM', can: canPay(30), run: (r) => (r.addShinies(-30), `CLANG CLANG! YOU FORGED ${r.giveRandomItem(2, 3)}.`) },
      { label: 'TEMPER', detail: '-15% HP, +1 STR', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('str', 1), 'HOT HOT HOT! +1 STR.') },
      leave('TOO HOT FOR YOU.'),
    ],
  },
  {
    id: 'bouncy_cloud',
    title: 'BOUNCY CLOUD',
    text: ['A FLUFFY CLOUD SITS ON THE GROUND.'],
    themes: ['clouds', 'candy', 'toybox'],
    options: [
      {
        label: 'BOUNCE',
        detail: '+100M, 30%: -10% HP',
        run: (r) => {
          r.addDistance(100);
          return roll(0.3) ? `BOING... THUD. -${hurt(r, 0.1)} HP, +100M.` : 'BOING! YOU FLY 100M AHEAD.';
        },
      },
      { label: 'NAP ON IT', detail: 'HEAL 25%', run: (r) => `SOFTEST NAP EVER. +${heal(r, 0.25)} HP.` },
    ],
  },
];
