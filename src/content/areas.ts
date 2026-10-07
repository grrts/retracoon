// Area packs. Each one is a self-contained bundle: scenery, local critters, a boss,
// a hazard, and a few items, skills and events. Add a new area by writing another
// PackDef like these and registering it in content/index.ts.
import type { PackDef } from './types';
import * as S from '../gfx/sprites';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// ---------------------------------------------------------------- back alley

export const alleyPack: PackDef = {
  id: 'alley',
  name: 'BACK ALLEY',
  biome: {
    id: 'alley',
    name: 'BACK ALLEY',
    sky: ['#1a1c2c', '#5d275d'],
    paintFar: (c, w, h, r, p) => {
      let x = 0;
      while (x < w) {
        const bw = 22 + Math.floor(r() * 26);
        const bh = 40 + Math.floor(r() * 50);
        const top = h - 60 - bh;
        rect(c, p.k, x, top, bw, h);
        rect(c, p.B, x + 1, top + 1, bw - 2, h);
        for (let wy = top + 5; wy < h - 64; wy += 8) {
          for (let wx = x + 4; wx < x + bw - 5; wx += 6) {
            if (r() < 0.35) rect(c, r() < 0.7 ? p.y : p.o, wx, wy, 2, 3);
            else rect(c, p.k, wx, wy, 2, 3);
          }
        }
        x += bw + Math.floor(r() * 4);
      }
    },
    paintNear: (c, w, h, r, p) => {
      // brick wall with a fire escape and the odd dumpster
      const wallTop = h - 92;
      rect(c, p.N, 0, wallTop, w, h);
      for (let y = wallTop; y < h; y += 5) {
        const off = (y / 5) % 2 ? 0 : 5;
        for (let x = -10 + off; x < w; x += 10) rect(c, (x + y) % 3 === 0 ? p.n : '#7a4a33', x + 1, y + 1, 8, 3);
      }
      rect(c, p.k, 0, wallTop - 2, w, 2);
      for (let i = 0; i < 2; i++) {
        const fx = 30 + i * 128 + Math.floor(r() * 30);
        rect(c, p.k, fx, wallTop + 8, 40, 2);
        rect(c, p.k, fx, wallTop + 30, 40, 2);
        for (let k = 0; k < 40; k += 4) rect(c, p.d, fx + k, wallTop + 4, 1, 4);
        for (let k = 0; k < 40; k += 4) rect(c, p.d, fx + k, wallTop + 26, 1, 4);
        rect(c, p.d, fx + 36, wallTop + 10, 2, 20);
      }
      const dx = 100 + Math.floor(r() * 40);
      rect(c, p.k, dx, h - 34, 34, 24);
      rect(c, p.D, dx + 1, h - 33, 32, 22);
      rect(c, p.G, dx + 1, h - 33, 32, 3);
      rect(c, p.k, dx + 3, h - 10, 4, 2);
      rect(c, p.k, dx + 27, h - 10, 4, 2);
    },
    paintGround: (c, w, h, r, p) => {
      rect(c, p.l, 0, 0, w, 2);
      rect(c, p.g, 0, 2, w, 4);
      rect(c, p.a, 0, 6, w, h);
      for (let i = 0; i < 160; i++) rect(c, r() < 0.6 ? p.d : p.g, r() * w, 7 + r() * (h - 7), 1, 1);
      for (let x = 0; x < w; x += 32) rect(c, p.d, x, 2, 1, 4);
    },
    encounters: [
      { id: 'possum_crow', minDanger: 3, weight: 2, foes: ['possum', 'crow'] },
      { id: 'possum_rats', minDanger: 2, weight: 1.5, foes: ['rat', 'possum', 'rat'] },
    ],
    elites: ['cat', 'dog', 'crow'],
    boss: 'van',
    hazard: { name: 'FLOWERPOTS', every: 3, desc: 'A POT FALLS ON SOMEONE', kind: 'pot', power: 6 },
  },
  enemies: [
    {
      id: 'van',
      name: 'ANIMAL CONTROL',
      frames: [S.VAN_0, S.VAN_1],
      fps: 4,
      hp: 110,
      boss: true,
      opener: 'net',
      moves: [
        { id: 'net', name: 'NET LAUNCHER', intent: 'debuff', dmg: 4, apDrain: 1, weight: 2 },
        { id: 'ram', name: 'RAM', intent: 'attack', dmg: 11, weight: 2 },
        { id: 'backup', name: 'CALL BACKUP', intent: 'summon', summon: 'rat', weight: 1 },
        { id: 'rev', name: 'REV ENGINE', intent: 'charge', weight: 1, after: 'fullram' },
        { id: 'fullram', name: 'FULL SPEED RAM', intent: 'attack', dmg: 24, weight: 0 },
      ],
      xp: 40,
      shinies: 30,
      colors: [0xf4f4f4, 0xb13e53, 0x3b5dc9, 0xffcd75],
    },
  ],
  items: [
    {
      id: 'traffic_cone',
      name: 'TRAFFIC CONE',
      rarity: 1,
      slot: 'head',
      tags: ['tank', 'trash'],
      desc: '+3 DEFENSE',
      gear: [{ x: 10, y: -6, rows: ['..k..', '.kok.', '.kwk.', 'koook', 'kwwwk', 'kkkkkk'] }],
      bonus: (b, l) => (b.def += 3 * l),
    },
  ],
  skills: [
    {
      id: 'dumpster',
      name: 'DUMPSTER DIVE',
      desc: (l) => `HEAL ${10 + 5 * l}% AND GAIN ${4 + 2 * l} BLOCK`,
      icon: ['.kkkkkkk.', 'kGGGGGGGk', 'kkkkkkkkk', '.kDGGGDk.', '.kDGGGDk.', '.kDGGGDk.', '.kDGGGDk.', '.kkkkkkk.', '.........'],
      cost: 2,
      cooldown: 2,
      target: 'self',
      max: 3,
      effect: (l) => ({ heal: 0.1 + 0.05 * l, block: 4 + 2 * l }),
    },
  ],
};

// ---------------------------------------------------------------- city park

export const parkPack: PackDef = {
  id: 'park',
  name: 'CITY PARK',
  biome: {
    id: 'park',
    name: 'CITY PARK',
    sky: ['#3b5dc9', '#ef7d57'],
    paintFar: (c, w, h, r, p) => {
      for (let x = -10; x < w + 10; x += 14 + Math.floor(r() * 10)) {
        const rad = 12 + Math.floor(r() * 12);
        const cy = h - 62 - rad / 2;
        c.fillStyle = p.D;
        c.beginPath();
        c.arc(x, cy, rad, 0, Math.PI * 2);
        c.fill();
      }
      rect(c, p.D, 0, h - 66, w, 70);
    },
    paintNear: (c, w, h, r, p) => {
      for (let x = 10; x < w; x += 64 + Math.floor(r() * 30)) {
        // tree
        rect(c, p.N, x + 8, h - 70, 5, 60);
        c.fillStyle = p.G;
        c.beginPath();
        c.arc(x + 10, h - 78, 16, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = p.L;
        c.beginPath();
        c.arc(x + 5, h - 84, 6, 0, Math.PI * 2);
        c.fill();
      }
      // bench
      const bx = 90 + Math.floor(r() * 50);
      rect(c, p.k, bx, h - 22, 30, 3);
      rect(c, p.n, bx + 1, h - 21, 28, 1);
      rect(c, p.k, bx, h - 30, 30, 2);
      rect(c, p.k, bx + 2, h - 22, 2, 12);
      rect(c, p.k, bx + 26, h - 22, 2, 12);
      // lamp
      const lx = 200 + Math.floor(r() * 30);
      rect(c, p.k, lx, h - 70, 3, 60);
      rect(c, p.y, lx - 2, h - 76, 7, 5);
    },
    paintGround: (c, w, h, r, p) => {
      rect(c, p.L, 0, 0, w, 2);
      rect(c, p.G, 0, 2, w, 6);
      rect(c, p.n, 0, 8, w, h);
      for (let i = 0; i < 160; i++) rect(c, r() < 0.5 ? p.N : p.o, r() * w, 9 + r() * (h - 9), 1, 1);
      for (let i = 0; i < 40; i++) rect(c, p.D, r() * w, 1 + r() * 6, 1, 2);
    },
    encounters: [
      { id: 'skunk_rats', minDanger: 2, weight: 2, foes: ['rat', 'skunk', 'rat'] },
      { id: 'skunk_pigeons', minDanger: 3, weight: 2, foes: ['pigeon', 'skunk', 'pigeon'] },
      { id: 'skunk_dog', minDanger: 6, weight: 1.5, foes: ['dog', 'skunk'] },
    ],
    elites: ['cat', 'dog', 'skunk'],
    boss: 'goose',
    hazard: { name: 'SPRINKLERS', every: 3, desc: 'WASHES AWAY EVERYONES BLOCK', kind: 'sprinkler', power: 3 },
  },
  enemies: [
    {
      id: 'goose',
      name: 'THE GOOSE',
      frames: [S.GOOSE_0, S.GOOSE_1],
      fps: 3,
      hp: 150,
      boss: true,
      opener: 'honk',
      moves: [
        { id: 'honk', name: 'HONK!', intent: 'debuff', apply: { weak: 2, vuln: 2 }, weight: 1 },
        { id: 'peck', name: 'PECK FLURRY', intent: 'multi', dmg: 4, hits: 3, weight: 2 },
        { id: 'flap', name: 'FLAP', intent: 'block', block: 16, weight: 1 },
        { id: 'windup', name: 'STRETCH NECK', intent: 'charge', weight: 1, after: 'rampage' },
        { id: 'rampage', name: 'GOOSE RAMPAGE', intent: 'attack', dmg: 26, weight: 0 },
      ],
      xp: 50,
      shinies: 40,
      colors: [0xf4f4f4, 0xef7d57, 0x94b0c2],
    },
  ],
  items: [
    {
      id: 'leaf_cape',
      name: 'LEAF CAPE',
      rarity: 2,
      slot: 'back',
      tags: ['speed'],
      desc: '+10% DODGE, +2 AGILITY',
      gear: [{ x: 1, y: 6, rows: ['..kkkk', '.kGLGk', 'kGGLGGk', 'kLGGGk.', '.kGGk..', '..kk...'] }],
      bonus: (b, l) => {
        b.dodge += 0.1 * l;
        b.agi += 2;
      },
    },
  ],
  events: [
    {
      id: 'squirrel_bank',
      title: 'SQUIRREL BANK',
      text: ['A SQUIRREL IN A TINY SUIT', 'OFFERS AN INVESTMENT', 'OPPORTUNITY.'],
      options: [
        {
          label: 'INVEST 10',
          detail: '70%: GET 25 BACK. 30%: GONE',
          can: (r) => r.shinies >= 10,
          run: (r) => {
            r.addShinies(-10);
            if (Math.random() < 0.7) {
              r.addShinies(25);
              return 'THE SQUIRREL PAYS OUT 25!';
            }
            return 'THE SQUIRREL VANISHES UP A TREE.';
          },
        },
        { label: 'NO', detail: 'KEEP YOUR SHINIES', run: () => 'SMART.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------- sewers

export const sewerPack: PackDef = {
  id: 'sewer',
  name: 'THE SEWERS',
  biome: {
    id: 'sewer',
    name: 'THE SEWERS',
    sky: ['#1a1c2c', '#257179'],
    paintFar: (c, w, h, _r, p) => {
      rect(c, p.d, 0, 0, w, h - 40);
      for (let x = 0; x < w; x += 64) {
        c.fillStyle = p.k;
        c.beginPath();
        c.arc(x + 32, h - 60, 26, Math.PI, 0);
        c.fill();
        rect(c, p.k, x + 6, h - 60, 52, 30);
      }
      for (let y = 0; y < h - 90; y += 6) {
        for (let x = (y / 6) % 2 ? 0 : 6; x < w; x += 12) rect(c, p.B, x + 1, y + 1, 10, 4);
      }
    },
    paintNear: (c, w, h, r, p) => {
      rect(c, p.g, 0, h - 100, w, 4);
      rect(c, p.l, 0, h - 100, w, 1);
      for (let x = 20; x < w; x += 60 + Math.floor(r() * 30)) {
        rect(c, p.g, x, h - 100, 6, 70);
        rect(c, p.l, x, h - 100, 1, 70);
        rect(c, p.k, x - 2, h - 34, 10, 4);
        rect(c, p.L, x + 2, h - 30, 2, 3 + Math.floor(r() * 6));
      }
    },
    paintGround: (c, w, h, r, p) => {
      rect(c, p.l, 0, 0, w, 1);
      rect(c, p.g, 0, 1, w, 10);
      for (let x = 0; x < w; x += 16) rect(c, p.d, x, 1, 1, 10);
      rect(c, p.G, 0, 11, w, h);
      rect(c, p.L, 0, 11, w, 1);
      for (let i = 0; i < 60; i++) rect(c, r() < 0.5 ? p.D : p.L, r() * w, 13 + r() * (h - 13), 3, 1);
    },
    encounters: [
      { id: 'gator', minDanger: 3, weight: 2, foes: ['gator'] },
      { id: 'gator_rats', minDanger: 6, weight: 2, foes: ['rat', 'gator', 'rat'] },
      { id: 'sewer_mix', minDanger: 5, weight: 1.5, foes: ['skunk', 'possum', 'crow'] },
    ],
    elites: ['gator', 'dog', 'cat'],
    boss: 'ratking',
    hazard: { name: 'TOXIC FUMES', every: 3, desc: 'POISONS EVERYONE', kind: 'fumes', power: 3 },
  },
  enemies: [
    {
      id: 'gator',
      name: 'SEWER GATOR',
      frames: [S.GATOR_0, S.GATOR_1],
      fps: 2,
      hp: 30,
      moves: [
        { id: 'chomp', name: 'CHOMP', intent: 'attack', dmg: 8, weight: 2 },
        { id: 'submerge', name: 'SUBMERGE', intent: 'block', block: 14, weight: 1, after: 'crunch' },
        { id: 'crunch', name: 'DEATH ROLL', intent: 'attack', dmg: 17, weight: 0 },
      ],
      xp: 10,
      shinies: 6,
      colors: [0x38b764, 0xa7f070, 0x257179],
    },
    {
      id: 'ratking',
      name: 'THE RAT KING',
      frames: [S.RATKING_0, S.RATKING_1],
      fps: 3,
      hp: 170,
      boss: true,
      opener: 'summon',
      moves: [
        { id: 'summon', name: 'SUMMON SUBJECTS', intent: 'summon', summon: 'rat', weight: 2 },
        { id: 'plague', name: 'PLAGUE', intent: 'debuff', apply: { poison: 6 }, weight: 1 },
        { id: 'slam', name: 'CROWN SLAM', intent: 'attack', dmg: 15, weight: 2 },
        { id: 'feast', name: 'ROYAL FEAST', intent: 'heal', heal: 0.15, weight: 1 },
      ],
      xp: 60,
      shinies: 50,
      colors: [0x8f563b, 0xffcd75, 0xf5a5b8],
    },
  ],
  items: [
    {
      id: 'gas_mask',
      name: 'GAS MASK',
      rarity: 1,
      slot: 'face',
      tags: ['tank'],
      desc: 'HEAL 2 AT THE START OF EVERY TURN',
      gear: [{ x: 11, y: 4, rows: ['kkkkkk', 'kCkCgk', 'kkggkk', '..kgk.', '..kk..'] }],
      fx: (l) => ({ regen: 2 * l }),
    },
  ],
  skills: [
    {
      id: 'sludge',
      name: 'SLUDGE BALL',
      desc: (l) => `HIT, POISON ${2 + l} AND WEAKEN`,
      icon: ['...kkk...', '..kGGGk..', '.kGLGGGk.', 'kGGGGGGGk', 'kGGGGLGGk', 'kGGGGGGGk', '.kGGGGGk.', '..kkkkk..', '.........'],
      cost: 1,
      cooldown: 1,
      target: 'one',
      max: 3,
      effect: (l) => ({ dmg: 0.5, apply: { poison: 2 + l, weak: 1 } }),
    },
  ],
};
