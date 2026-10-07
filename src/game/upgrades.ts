export interface Stats {
  maxHp: number;
  hp: number;
  moveSpeed: number; // keyboard speed, px/s
  fireDelay: number; // seconds between throws
  shots: number; // pebbles per volley
  damage: number;
  pierce: number;
  side: number; // diagonal throws per side
  dashCooldown: number;
  shock: number; // dash shockwave level
  orbit: number; // orbiting bottle caps
  crit: number; // 0..1
  rage: number; // fire-rate boost when on last heart
  vamp: number; // kills needed per heal (0 = off)
}

export function baseStats(): Stats {
  return {
    maxHp: 3,
    hp: 3,
    moveSpeed: 95,
    fireDelay: 0.34,
    shots: 1,
    damage: 1,
    pierce: 0,
    side: 0,
    dashCooldown: 1.4,
    shock: 0,
    orbit: 0,
    crit: 0,
    rage: 0,
    vamp: 0,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  desc: (lvl: number) => string;
  max: number;
  apply: (s: Stats) => void;
  // Optional gate so we don't offer useless picks.
  can?: (s: Stats) => boolean;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'rapid',
    name: 'RAPID PAWS',
    desc: () => 'THROW 20% FASTER',
    max: 6,
    apply: (s) => (s.fireDelay *= 0.8),
  },
  {
    id: 'twin',
    name: 'DOUBLE TOSS',
    desc: () => '+1 PEBBLE PER THROW',
    max: 4,
    apply: (s) => s.shots++,
  },
  {
    id: 'heavy',
    name: 'HEAVY TRASH',
    desc: () => '+1 DAMAGE',
    max: 5,
    apply: (s) => s.damage++,
  },
  {
    id: 'pierce',
    name: 'SHARP PEBBLES',
    desc: () => 'PEBBLES PIERCE +1 FOE',
    max: 3,
    apply: (s) => s.pierce++,
  },
  {
    id: 'side',
    name: 'WILD TOSS',
    desc: () => 'ALSO THROW DIAGONALLY',
    max: 2,
    apply: (s) => s.side++,
  },
  {
    id: 'heart',
    name: 'BIG BELLY',
    desc: () => '+1 MAX HEART, HEAL 1',
    max: 4,
    apply: (s) => {
      s.maxHp++;
      s.hp = Math.min(s.maxHp, s.hp + 1);
    },
  },
  {
    id: 'snack',
    name: 'SNACK BREAK',
    desc: () => 'HEAL ALL HEARTS',
    max: 99,
    apply: (s) => (s.hp = s.maxHp),
    can: (s) => s.hp < s.maxHp,
  },
  {
    id: 'speed',
    name: 'ZOOMIES',
    desc: () => 'MOVE 15% FASTER',
    max: 3,
    apply: (s) => (s.moveSpeed *= 1.15),
  },
  {
    id: 'dashcd',
    name: 'QUICK FEET',
    desc: () => 'DASH RECHARGES 25% FASTER',
    max: 3,
    apply: (s) => (s.dashCooldown *= 0.75),
  },
  {
    id: 'shock',
    name: 'TRASH QUAKE',
    desc: (l) => (l === 0 ? 'DASH ENDS IN A SHOCKWAVE' : 'BIGGER SHOCKWAVE'),
    max: 3,
    apply: (s) => s.shock++,
  },
  {
    id: 'orbit',
    name: 'BOTTLE CAPS',
    desc: () => '+1 CAP CIRCLES YOU',
    max: 4,
    apply: (s) => s.orbit++,
  },
  {
    id: 'crit',
    name: 'LUCKY TAIL',
    desc: () => '+15% CHANCE FOR 3X HIT',
    max: 3,
    apply: (s) => (s.crit += 0.15),
  },
  {
    id: 'rage',
    name: 'CORNERED',
    desc: () => 'ON LAST HEART: THROW 2X',
    max: 1,
    apply: (s) => (s.rage = 1),
  },
  {
    id: 'vamp',
    name: 'SCAVENGER',
    desc: (l) => (l === 0 ? 'HEAL 1 EVERY 40 KILLS' : 'HEAL EVERY 25 KILLS'),
    max: 2,
    apply: (s) => (s.vamp = s.vamp === 0 ? 40 : 25),
  },
];

export function rollChoices(stats: Stats, levels: Record<string, number>, n = 3): Upgrade[] {
  const pool = UPGRADES.filter((u) => (levels[u.id] ?? 0) < u.max && (!u.can || u.can(stats)));
  // Hurt raccoons are more likely to be offered a snack.
  const weighted: Upgrade[] = [];
  for (const u of pool) {
    const w = u.id === 'snack' ? (stats.hp <= 1 ? 4 : 1) : 2;
    for (let i = 0; i < w; i++) weighted.push(u);
  }
  const out: Upgrade[] = [];
  while (out.length < n && weighted.length) {
    const u = weighted[Math.floor(Math.random() * weighted.length)];
    out.push(u);
    for (let i = weighted.length - 1; i >= 0; i--) if (weighted[i] === u) weighted.splice(i, 1);
  }
  return out;
}
