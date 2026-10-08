// Road events for the wild themes: woods, pines, autumn, meadow, riverbank, farm,
// orchard, cornfield, lakeside, bamboo.
import type { EventDef } from '../types';
import { ART } from './art';
import { canHurt, heal, hurt, leave, roll } from './util';

export const EVENTS_WILD: EventDef[] = [
  {
    id: 'berry_bush',
    title: 'BERRY BUSH',
    text: ['RED AND PURPLE BERRIES, RIPE AND JUICY.'],
    artRows: ART.bush,
    themes: ['woods', 'meadow', 'orchard', 'farm', 'autumn'],
    options: [
      { label: 'EAT RED', detail: 'HEAL 20%', run: (r) => `SWEET! +${heal(r, 0.2)} HP.` },
      {
        label: 'EAT PURPLE',
        detail: '50%: +1 VIT. 50%: -10% HP',
        can: canHurt(0.1),
        run: (r) => (roll(0.5) ? (r.addStat('vit', 1), 'YOU FEEL HEARTY. +1 VIT!') : `TUMMY ACHE. -${hurt(r, 0.1)} HP.`),
      },
    ],
  },
  {
    id: 'wild_beehive',
    title: 'WILD BEEHIVE',
    text: ['HONEY DRIPS FROM A BUZZING HIVE.'],
    artRows: ART.hive,
    themes: ['woods', 'meadow', 'orchard', 'pines'],
    options: [
      { label: 'GRAB HONEY', detail: '-15% HP, +1 VIT', can: canHurt(0.15), run: (r) => (hurt(r, 0.15), r.addStat('vit', 1), 'STUNG ALL OVER, BUT WORTH IT. +1 VIT.') },
      { label: 'LICK A DRIP', detail: 'HEAL 10%', run: (r) => `JUST A TASTE. +${heal(r, 0.1)} HP.` },
    ],
  },
  {
    id: 'fishing_spot',
    title: 'FISHING SPOT',
    text: ['FISH JUMP IN THE CLEAR WATER.'],
    themes: ['riverbank', 'lakeside', 'bamboo'],
    options: [
      { label: 'FISH', detail: 'HEAL 25%', run: (r) => `FRESH FISH FOR LUNCH. +${heal(r, 0.25)} HP.` },
      {
        label: 'DIVE FOR LOOT',
        detail: '-10% HP, 50%: ITEM',
        can: canHurt(0.1),
        run: (r) => (hurt(r, 0.1), roll(0.5) ? `SOMETHING ON THE BOTTOM: ${r.giveRandomItem(0, 2)}!` : 'JUST ROCKS AND COLD WATER.'),
      },
    ],
  },
  {
    id: 'scarecrow',
    title: 'SCARECROW',
    text: ['A SCARECROW WEARS A NICE HAT.', 'CROWS WATCH YOU FROM THE CORN.'],
    artRows: ART.scarecrow,
    themes: ['farm', 'cornfield', 'orchard'],
    options: [
      { label: 'TAKE THE HAT', detail: 'GET BUCKET HAT, NEXT FIGHT ELITE', run: (r) => (r.eliteNext(), `GOT ${r.giveItem('bucket_hat')}! THE CROWS ARE FURIOUS.`) },
      { label: 'CHECK POCKETS', detail: '+8 SHINIES', run: (r) => (r.addShinies(8), 'STRAW AND 8 SHINIES.') },
      leave('YOU NOD TO THE SCARECROW.'),
    ],
  },
  {
    id: 'hollow_log',
    title: 'HOLLOW LOG',
    text: ['A HOLLOW LOG RUNS DOWNHILL.', 'IT LOOKS LIKE A SHORTCUT.'],
    themes: ['woods', 'pines', 'autumn', 'bamboo'],
    options: [
      {
        label: 'CRAWL IN',
        detail: '+100M, 30%: -10% HP',
        run: (r) => {
          r.addDistance(100);
          return roll(0.3) ? `SPLINTERS! -${hurt(r, 0.1)} HP, BUT +100M.` : 'YOU POP OUT 100M AHEAD.';
        },
      },
      leave('YOU TAKE THE TRAIL.', 'GO AROUND'),
    ],
  },
  {
    id: 'wise_owl',
    title: 'WISE OWL',
    text: ['AN OWL ASKS YOU A RIDDLE.', 'GET IT RIGHT AND IT TEACHES YOU.'],
    themes: ['woods', 'pines', 'autumn', 'meadow'],
    options: [
      {
        label: 'GUESS',
        detail: '50%: LEARN A SKILL',
        run: (r) => {
          if (!roll(0.5)) return 'WRONG! THE OWL HOOTS WITH LAUGHTER.';
          const s = r.learnRandomSkill();
          return s ? `CORRECT! YOU LEARNED ${s}.` : (r.addXp(30), 'CORRECT! NOTHING LEFT TO TEACH. +30 XP.');
        },
      },
      { label: 'JUST LISTEN', detail: '+20 XP', run: (r) => (r.addXp(20), 'THE OWL RAMBLES ON. +20 XP.') },
    ],
  },
  {
    id: 'chicken_coop',
    title: 'CHICKEN COOP',
    text: ['A COOP FULL OF FRESH EGGS.', 'THE ROOSTER LOOKS VERY ANGRY.'],
    themes: ['farm', 'cornfield'],
    options: [
      { label: 'RAID IT', detail: 'HEAL 40%, NEXT FIGHT ELITE', run: (r) => (r.eliteNext(), `EGG FEAST! +${heal(r, 0.4)} HP. THE ROOSTER FOLLOWS...`) },
      { label: 'TAKE ONE EGG', detail: 'HEAL 10%', run: (r) => `NOBODY NOTICED. +${heal(r, 0.1)} HP.` },
    ],
  },
];
