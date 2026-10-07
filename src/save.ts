// Small persistent store. Storage can be unavailable (private mode), so never assume it works.
export interface Kept {
  level: number;
  stats: { str: number; def: number; agi: number; lck: number; vit: number };
  statPoints: number;
}

interface Store {
  bestDistance: number;
  bestLevel: number;
  runs: number;
  bossKills: number;
  seen: string[]; // item ids ever found
  kept: Kept | null; // stats banked by retreating
  muted: boolean;
}

const KEY = 'retracoon.v2';

function load(): Store {
  const base: Store = { bestDistance: 0, bestLevel: 0, runs: 0, bossKills: 0, seen: [], kept: null, muted: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return base;
}

export const store: Store = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}
