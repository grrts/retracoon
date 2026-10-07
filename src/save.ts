// Small persistent store. Storage can be unavailable (private mode), so never assume it works.
interface Store {
  bestDistance: number;
  bestSector: number;
  runs: number;
  muted: boolean;
}

const KEY = 'retracoon.v1';

function load(): Store {
  const base: Store = { bestDistance: 0, bestSector: 0, runs: 0, muted: false };
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
