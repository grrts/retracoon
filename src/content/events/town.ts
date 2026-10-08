// Road events for the town themes: street, alley, park, garage, rooftops, subway,
// sewers, docks, junkyard, night_market.
import type { EventDef } from '../types';
import { ART } from './art';
import { bless, canHurt, canPay, heal, hurt, leave, roll } from './util';

export const EVENTS_TOWN: EventDef[] = [
  {
    id: 'squirrel_bank',
    title: 'SQUIRREL BANK',
    text: ['A SQUIRREL IN A TINY SUIT OFFERS A DEAL.'],
    themes: ['park', 'street', 'night_market'],
    options: [
      {
        label: 'INVEST 10',
        detail: '70%: GET 25 BACK. 30%: GONE',
        can: canPay(10),
        run: (r) => {
          r.addShinies(-10);
          if (roll(0.7)) return r.addShinies(25), 'THE SQUIRREL PAYS OUT 25!';
          return 'THE SQUIRREL VANISHES UP A TREE.';
        },
      },
      leave('SMART. KEEP YOUR SHINIES.', 'NO THANKS'),
    ],
  },
  {
    id: 'vending_machine',
    title: 'VENDING MACHINE',
    text: ['A HUMMING VENDING MACHINE.', 'ONE SNACK IS STUCK HALFWAY OUT.'],
    artRows: ART.vending,
    themes: ['street', 'subway', 'night_market', 'garage'],
    options: [
      { label: 'BUY SNACK', detail: 'PAY 8: HEAL 35%', can: canPay(8), run: (r) => (r.addShinies(-8), `CRUNCHY. +${heal(r, 0.35)} HP.`) },
      {
        label: 'SHAKE IT',
        detail: '60%: HEAL 35%. 40%: -10% HP',
        run: (r) => (roll(0.6) ? `THE SNACK DROPS! +${heal(r, 0.35)} HP.` : `THE MACHINE TIPS ON YOU. -${hurt(r, 0.1)} HP.`),
      },
      leave('NOT HUNGRY ANYWAY.'),
    ],
  },
  {
    id: 'street_band',
    title: 'STREET BAND',
    text: ['THREE RATS PLAY A CATCHY TUNE.', 'THE BEAT GETS YOUR PAWS MOVING.'],
    themes: ['street', 'park', 'subway', 'night_market', 'docks'],
    options: [
      { label: 'TIP 5', detail: 'PAY 5: SWIFT (+1 AP) 2 FIGHTS', can: canPay(5), run: (r) => (r.addShinies(-5), `THEY PLAY YOUR SONG. ${bless(r, 'swift', 2)}!`) },
      { label: 'DANCE', detail: '+15 XP', run: (r) => (r.addXp(15), 'YOU BUST A MOVE. +15 XP.') },
    ],
  },
  {
    id: 'lost_wallet',
    title: 'LOST WALLET',
    text: ['A FAT WALLET ON THE SIDEWALK.', 'THE CARD INSIDE SAYS IT IS A BADGER\'S.'],
    artRows: ART.wallet,
    themes: ['street', 'alley', 'park', 'subway'],
    options: [
      { label: 'KEEP IT', detail: '+30 SHINIES, HEXED 3 FIGHTS', run: (r) => (r.addShinies(30), `+30 SHINIES. BAD KARMA: ${bless(r, 'hexed', 3)}.`) },
      { label: 'RETURN IT', detail: '+3 BOTTLE CAPS', run: (r) => (r.addCaps(3), 'THE BADGER TIPS YOU 3 BOTTLE CAPS.') },
    ],
  },
  {
    id: 'sewer_grate',
    title: 'SEWER GRATE',
    text: ['SOMETHING GLINTS BELOW A GRATE.', 'YOU HEAR SQUEAKING DOWN THERE.'],
    themes: ['street', 'alley', 'sewers'],
    options: [
      {
        label: 'REACH IN',
        detail: '60%: ITEM. 40%: -15% HP',
        can: canHurt(0.15),
        run: (r) => (roll(0.6) ? `GOT IT! ${r.giveRandomItem(r.danger >= 6 ? 1 : 0, 2)}.` : `A RAT BITES YOUR PAW. -${hurt(r, 0.15)} HP.`),
      },
      leave('YOU KEEP YOUR PAWS TO YOURSELF.'),
    ],
  },
  {
    id: 'pigeon_council',
    title: 'PIGEON COUNCIL',
    text: ['A HUNDRED PIGEONS STARE AT YOU.', 'THEY EXPECT A TRIBUTE.'],
    themes: ['park', 'rooftops', 'street'],
    options: [
      { label: 'FEED THEM', detail: 'PAY 10: LUCKY 3 FIGHTS', can: canPay(10), run: (r) => (r.addShinies(-10), `THE COUNCIL APPROVES. ${bless(r, 'lucky', 3)}!`) },
      { label: 'SHOO THEM', detail: '-10% HP, +1 STR', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), r.addStat('str', 1), 'PECKED ALL OVER, BUT TOUGHER. +1 STR.') },
      leave('YOU BACK AWAY FROM THE COUNCIL.', 'WALK AWAY'),
    ],
  },
  {
    id: 'junk_robot',
    title: 'BROKEN ROBOT',
    text: ['A LITTLE ROBOT SPARKS IN THE SCRAP.', 'IT BEEPS SADLY AT YOU.'],
    artRows: ART.robot,
    themes: ['junkyard', 'garage', 'docks'],
    options: [
      { label: 'FIX IT', detail: '-10% HP, SHIELD 3 FIGHTS', can: canHurt(0.1), run: (r) => (hurt(r, 0.1), `ZAP! IT GUARDS YOU NOW. ${bless(r, 'shield', 3)}.`) },
      { label: 'SCRAP IT', detail: '+15 SHINIES', run: (r) => (r.addShinies(15), 'COPPER WIRE SELLS WELL. +15 SHINIES.') },
    ],
  },
  {
    id: 'night_stall',
    title: 'MYSTERY STALL',
    text: ['A MOTH SELLS GLOWING TRINKETS.', 'PRICES ARE STEEP, STOCK IS RARE.'],
    artRows: ART.cart,
    themes: ['night_market', 'docks', 'alley'],
    minDanger: 2,
    options: [
      { label: 'BUY (35)', detail: 'PAY 35: RARE+ ITEM', can: canPay(35), run: (r) => (r.addShinies(-35), `THE MOTH WRAPS UP ${r.giveRandomItem(2, 4)}.`) },
      {
        label: 'HAGGLE',
        detail: '50%: RARE+ FOR 20. 50%: KICKED',
        can: canPay(20),
        run: (r) => (roll(0.5) ? (r.addShinies(-20), `DEAL! ${r.giveRandomItem(2, 4)} FOR 20.`) : 'THE MOTH FLUTTERS OFF, OFFENDED.'),
      },
      leave('YOU JUST BROWSE.'),
    ],
  },
];
