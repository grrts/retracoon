// Road events for the far-away themes: jungle, swamp, mangrove, desert, canyon, beach,
// reef, savanna, tundra, glacier.
import type { EventDef } from '../types';
import { ART } from './art';
import { bless, canHurt, canPay, heal, hurt, leave, roll } from './util';

export const EVENTS_FAR: EventDef[] = [
  {
    id: 'oasis',
    title: 'OASIS',
    text: ['COOL WATER UNDER A PALM TREE.'],
    artRows: ART.oasis,
    themes: ['desert', 'canyon', 'savanna', 'beach'],
    options: [
      { label: 'DRINK', detail: 'HEAL 40%', run: (r) => `AAAH. +${heal(r, 0.4)} HP.` },
      { label: 'FILL BOTTLE', detail: 'SHIELD FOR 3 FIGHTS', run: (r) => `YOU PACK WATER FOR LATER. ${bless(r, 'shield', 3)}.` },
    ],
  },
  {
    id: 'quicksand',
    title: 'QUICKSAND',
    text: ['THE GROUND SUCKS AT YOUR PAWS!'],
    themes: ['desert', 'swamp', 'mangrove'],
    options: [
      {
        label: 'STRUGGLE',
        detail: '50%: FREE. 50%: -20% HP',
        run: (r) => (roll(0.5) ? 'YOU WRIGGLE FREE!' : `IT TAKES ALL YOUR STRENGTH. -${hurt(r, 0.2)} HP.`),
      },
      { label: 'GO LIMP', detail: 'NO DAMAGE, BUT -80M', run: (r) => (r.addDistance(-80), 'YOU SINK, THEN SLOWLY CRAWL OUT. -80M.') },
    ],
  },
  {
    id: 'sunken_chest',
    title: 'SUNKEN CHEST',
    text: ['A CHEST SITS IN DEEP WATER.', 'BUBBLES RISE FROM THE LID.'],
    artRows: ART.chest,
    themes: ['beach', 'reef', 'mangrove'],
    options: [
      { label: 'DIVE', detail: '-20% HP, UNCOMMON+ ITEM', can: canHurt(0.2), run: (r) => (hurt(r, 0.2), `GASP! GOT ${r.giveRandomItem(1, 3)}!`) },
      leave('YOU STAY DRY.'),
    ],
  },
  {
    id: 'frozen_critter',
    title: 'FROZEN FOX',
    text: ['A FOX KIT IS STUCK IN THE ICE.'],
    themes: ['tundra', 'glacier'],
    options: [
      { label: 'THAW IT', detail: '-10% HP, CRITTER FRIEND 4 FIGHTS', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), `COLD PAWS, WARM HEART. ${bless(r, 'friend', 4)}!`) },
      leave('YOU HURRY ON THROUGH THE SNOW.', 'WALK ON'),
    ],
  },
  {
    id: 'snake_charmer',
    title: 'SNAKE CHARMER',
    text: ['A MONGOOSE TEACHES SNAKE MOVES.', 'LESSONS ARE NOT CHEAP.'],
    themes: ['jungle', 'desert', 'savanna', 'canyon'],
    options: [
      {
        label: 'NEW MOVE (20)',
        detail: 'PAY 20: LEARN A NEW SKILL',
        can: canPay(20),
        run: (r) => {
          const s = r.learnRandomSkill();
          if (!s) return 'YOU ALREADY KNOW IT ALL. THE MONGOOSE BOWS.';
          r.addShinies(-20);
          return `YOU LEARNED ${s}!`;
        },
      },
      {
        label: 'DRILL (15)',
        detail: 'PAY 15: UPGRADE A SKILL',
        can: canPay(15),
        run: (r) => {
          const s = r.upgradeRandomSkill();
          if (!s) return 'NOTHING TO DRILL. THE MONGOOSE BOWS.';
          r.addShinies(-15);
          return `${s} GOT STRONGER!`;
        },
      },
      leave('THE MONGOOSE WAVES GOODBYE.'),
    ],
  },
  {
    id: 'coconut_tree',
    title: 'COCONUT TREE',
    text: ['COCONUTS HANG HIGH UP.'],
    themes: ['beach', 'jungle', 'reef'],
    options: [
      {
        label: 'SHAKE IT',
        detail: '60%: HEAL 25%. 40%: -10% HP',
        run: (r) => (roll(0.6) ? `FRESH COCONUT! +${heal(r, 0.25)} HP.` : `BONK! -${hurt(r, 0.1)} HP.`),
      },
      { label: 'CLIMB IT', detail: '+20 XP', run: (r) => (r.addXp(20), 'NICE VIEW FROM UP HERE. +20 XP.') },
    ],
  },
  {
    id: 'igloo',
    title: 'EMPTY IGLOO',
    text: ['A SNUG IGLOO. NOBODY IS HOME.'],
    artRows: ART.igloo,
    themes: ['tundra', 'glacier'],
    options: [
      { label: 'REST', detail: 'HEAL 35%', run: (r) => `TOASTY. +${heal(r, 0.35)} HP.` },
      { label: 'SEARCH', detail: '50%: COMMON OR UNCOMMON ITEM', run: (r) => (roll(0.5) ? `UNDER A FUR: ${r.giveRandomItem(0, 1)}!` : 'JUST ICE AND FISH BONES.') },
    ],
  },
];
