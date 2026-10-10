// Small persistent store. Storage can be unavailable (private mode), so never assume it works.
export interface Kept {
  level: number;
  stats: { str: number; def: number; agi: number; lck: number; vit: number };
  statPoints: number;
}

export interface Store {
  bestDistance: number;
  bestStage: number;
  bestLevel: number;
  runs: number;
  bossKills: number;
  seen: string[]; // item ids ever found
  foesSeen: string[]; // enemy ids ever met
  themesSeen: string[];
  kept: Kept | null; // stats banked by retreating
  muted: boolean;
  // meta progression and the shop
  caps: number; // Bottle Caps, earned by playing
  gems: number; // premium currency
  skins: string[]; // owned skin ids
  skin: string; // equipped skin id
  noAds: boolean;
  purchases: string[]; // product ids bought (for restore and receipts in test mode)
  lastRunGear: { slot: string; id: string; lvl: number }[]; // shown in the wardrobe preview
  tutorialDone: boolean;
  signInOffered: boolean; // the launch sign-in screen was shown once
  tipsSeen: string[]; // one-time hints already shown during runs
  // online scoreboard
  playerName: string;
  bestSubmitted: number; // best stage already sent to the scoreboard
}

const KEY = 'retracoon.v3';
const OLD_KEY = 'retracoon.v2';

function base(): Store {
  return {
    bestDistance: 0,
    bestStage: 0,
    bestLevel: 0,
    runs: 0,
    bossKills: 0,
    seen: [],
    foesSeen: [],
    themesSeen: [],
    kept: null,
    muted: false,
    caps: 0,
    gems: 0,
    skins: ['classic'],
    skin: 'classic',
    noAds: false,
    purchases: [],
    lastRunGear: [],
    tutorialDone: false,
    signInOffered: false,
    tipsSeen: [],
    playerName: '',
    bestSubmitted: 0,
  };
}

function load(): Store {
  const b = base();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...b, ...JSON.parse(raw) };
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      return { ...b, bestDistance: o.bestDistance ?? 0, runs: o.runs ?? 0, bossKills: o.bossKills ?? 0, seen: o.seen ?? [], muted: !!o.muted };
    }
  } catch {
    /* ignore */
  }
  return b;
}

export const store: Store = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}
