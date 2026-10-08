// Road events for the far-out themes: moon, neon_city, space_station, alien, void_rift,
// dream, cyber, storm_peaks, sky_temple, trash_dimension.
import type { BlessingId, EventDef } from '../types';
import { ART } from './art';
import { bless, canHurt, canPay, heal, hurt, leave, pick, roll } from './util';

export const EVENTS_BEYOND: EventDef[] = [
  {
    id: 'bright_light',
    title: 'BRIGHT LIGHT',
    text: ['A SAUCER HUMS OVERHEAD.', 'A BEAM OF LIGHT SWEEPS THE GROUND.'],
    artRows: ART.ufo,
    themes: ['alien', 'moon', 'space_station'],
    options: [
      {
        label: 'STEP IN',
        detail: '-20% HP, LEARN A SKILL',
        can: canHurt(0.2),
        run: (r) => {
          hurt(r, 0.2);
          const s = r.learnRandomSkill();
          return s ? `PROBED! YOU WAKE UP KNOWING ${s}.` : (r.addXp(40), 'PROBED! YOUR HEAD BUZZES. +40 XP.');
        },
      },
      leave('YOU HIDE UNDER A ROCK.', 'HIDE'),
    ],
  },
  {
    id: 'moon_cheese',
    title: 'MOON CHEESE',
    text: ['THE GROUND HERE IS MADE OF CHEESE.'],
    themes: ['moon', 'space_station', 'dream'],
    options: [
      { label: 'EAT', detail: 'HEAL 35%', run: (r) => `TANGY! +${heal(r, 0.35)} HP.` },
      { label: 'DIG A CHUNK', detail: '+25 SHINIES', run: (r) => (r.addShinies(25), 'IMPORTED CHEESE SELLS HIGH. +25 SHINIES.') },
    ],
  },
  {
    id: 'neon_arcade',
    title: 'NEON ARCADE',
    text: ['AN OLD ARCADE CABINET BLINKS.', 'A HIGH SCORE WINS A PRIZE.'],
    artRows: ART.arcade,
    themes: ['neon_city', 'cyber', 'trash_dimension'],
    options: [
      {
        label: 'PLAY (10)',
        detail: 'PAY 10: 50% UNCOMMON+ ITEM',
        can: canPay(10),
        run: (r) => (r.addShinies(-10), roll(0.5) ? `NEW HIGH SCORE! PRIZE: ${r.giveRandomItem(1, 3)}.` : 'GAME OVER. INSERT COIN.'),
      },
      { label: 'PRACTICE', detail: '+20 XP', run: (r) => (r.addXp(20), 'YOU WATCH THE DEMO LOOP. +20 XP.') },
    ],
  },
  {
    id: 'void_whisper',
    title: 'VOID WHISPER',
    text: ['THE VOID WHISPERS YOUR NAME.', 'IT OFFERS TO SHARPEN YOUR MIND.'],
    themes: ['void_rift', 'dream', 'trash_dimension'],
    minDanger: 4,
    options: [
      {
        label: 'LISTEN',
        detail: '-1 VIT, UPGRADE A SKILL',
        run: (r) => {
          r.addStat('vit', -1);
          const s = r.upgradeRandomSkill();
          return s ? `A COLD THOUGHT. ${s} GOT STRONGER.` : (r.addXp(30), 'THE VOID HAS NOTHING TO ADD. +30 XP.');
        },
      },
      leave('YOU HUM LOUDLY UNTIL IT STOPS.', 'PLUG EARS'),
    ],
  },
  {
    id: 'dream_door',
    title: 'DREAM DOOR',
    text: ['A DOOR STANDS ALONE IN THE MIST.'],
    artRows: ART.door,
    themes: ['dream', 'void_rift', 'sky_temple'],
    options: [
      {
        label: 'OPEN IT',
        detail: '70%: BLESSING. 30%: CURSE',
        run: (r) => {
          if (roll(0.7)) return `A GOOD DREAM. ${bless(r, pick<BlessingId>(['shield', 'sharp', 'lucky', 'swift']), 3)}!`;
          return `A NIGHTMARE. ${bless(r, pick<BlessingId>(['fragile', 'slow']), 2)}.`;
        },
      },
      leave('SOME DOORS STAY SHUT.', 'WALK AWAY'),
    ],
  },
  {
    id: 'lightning_rod',
    title: 'LIGHTNING ROD',
    text: ['A METAL ROD CRACKLES ON THE PEAK.'],
    themes: ['storm_peaks', 'sky_temple', 'cyber'],
    options: [
      { label: 'GRAB IT', detail: '-25% HP, +2 STR', can: canHurt(0.25), run: (r) => (hurt(r, 0.25), r.addStat('str', 2), 'KZZZT! YOUR FUR STANDS UP. +2 STR!') },
      { label: 'WATCH STORM', detail: '+15 XP', run: (r) => (r.addXp(15), 'NATURE IS LOUD. +15 XP.') },
    ],
  },
  {
    id: 'trash_throne',
    title: 'TRASH THRONE',
    text: ['A THRONE OF GARBAGE, FIT FOR A KING.', 'THE KING IS OUT.'],
    artRows: ART.throne,
    themes: ['trash_dimension', 'alien', 'void_rift'],
    minDanger: 4,
    options: [
      { label: 'SIT ON IT', detail: '+5 BOTTLE CAPS, HEXED 3 FIGHTS', run: (r) => (r.addCaps(5), `LONG LIVE THE KING! +5 CAPS. ${bless(r, 'hexed', 3)}.`) },
      { label: 'LOOT IT', detail: '-20% HP, RARE+ ITEM', can: canHurt(0.2), run: (r) => (hurt(r, 0.2), `THE THRONE BITES BACK. GOT ${r.giveRandomItem(2, 4)}!`) },
      leave('YOU BOW TO THE EMPTY THRONE.'),
    ],
  },
];
