import type { Ledger } from './game/ledger';
import type { Replay } from './game/replay';

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
  runOpen: boolean; // a normal run started and hasn't ended yet (see RunScene.create)
  muted: boolean;
  // meta progression and the shop
  caps: number; // Bottle Caps, earned by playing
  gems: number; // premium currency
  skins: string[]; // owned skin ids
  skin: string; // equipped skin id
  noAds: boolean;
  purchases: string[]; // product ids bought (for restore and receipts in test mode)
  lastRunGear: { slot: string; id: string; lvl: number }[]; // shown in the wardrobe preview
  tutorialDone: boolean; // saw the old page-by-page tutorial (before first-run hints)
  signInOffered: boolean; // the launch sign-in screen was shown once
  tipsSeen: string[]; // one-time hints already shown during runs
  // online scoreboard
  playerName: string;
  bestSubmitted: number; // best stage already sent to the scoreboard
  pendingRuns: PendingRun[]; // finished runs waiting to be sent (phone was offline)
  // daily run
  dailyDay: string; // the UTC day of dailyBest
  dailyBest: { stage: number; timeMs: number } | null; // this device's best daily run that day
  dailyRuns: number; // attempts that day
  // gameplay tracking (see platform/track.ts)
  trackingOff: boolean;
  // settings
  vol: { master: number; music: number; sfx: number }; // 0-10 each
  shake: boolean;
  haptics: boolean; // vibration on phones, rumble on controllers
  fullscreen: boolean; // desktop
  windowSize: number; // index into WINDOW_SIZES (Steam, windowed)
  keys: Record<string, string[]>; // action -> KeyboardEvent.code; missing = default (see input.ts)
  pad: Record<string, number[]>; // action -> gamepad button index
  achievements: string[]; // ids earned (platform/achievements.ts)
  savedAt: number; // when this save was written; the newer of this and Steam Cloud's wins
}

export interface PendingRun {
  mode: 'normal' | 'daily';
  day: string | null;
  stage: number;
  level: number;
  distance: number;
  timeMs: number;
  skin: string;
  log?: Ledger; // how the score added up, for the server's checks
  ticket?: string; // the server's run ticket the run was played on
  replay?: Replay; // every choice, so the server can replay the run
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
    runOpen: false,
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
    pendingRuns: [],
    dailyDay: '',
    dailyBest: null,
    dailyRuns: 0,
    trackingOff: false,
    vol: { master: 10, music: 10, sfx: 10 },
    shake: true,
    haptics: true,
    fullscreen: true,
    windowSize: 1,
    keys: {},
    pad: {},
    achievements: [],
    savedAt: 0,
  };
}

// On Steam the save is also kept in Steam Cloud (steam/main.cjs), so it follows the
// player between a PC and a Steam Deck. Whichever copy was written last wins.
const STEAM_BRIDGE = () => (globalThis as { retracoonSteam?: { cloudRead?(): string | null; cloudWrite?(json: string): void } }).retracoonSteam;

function cloudSave(): Partial<Store> | null {
  try {
    const raw = STEAM_BRIDGE()?.cloudRead?.();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function load(): Store {
  const b = base();
  try {
    const raw = localStorage.getItem(KEY);
    const local: Partial<Store> | null = raw ? JSON.parse(raw) : null;
    const cloud = cloudSave();
    if (cloud && (cloud.savedAt ?? 0) > (local?.savedAt ?? 0)) return { ...b, ...cloud };
    if (local) return { ...b, ...local };
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

// Hints that replaced the old tutorial pages. Players who already read those pages
// don't need them again.
const FIRST_RUN_HINTS = ['goal', 'combat', 'intent', 'danger', 'boss', 'first_win'];
if (store.tutorialDone) for (const id of FIRST_RUN_HINTS) if (!store.tipsSeen.includes(id)) store.tipsSeen.push(id);

export function save() {
  store.savedAt = Date.now();
  const json = JSON.stringify(store);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* ignore */
  }
  try {
    STEAM_BRIDGE()?.cloudWrite?.(json);
  } catch {
    /* ignore */
  }
}
