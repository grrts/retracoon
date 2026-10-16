// Achievements: earned on every platform (kept in the save), and unlocked on Steam
// through the Steam app's bridge. The ids are the Steamworks API names, so the list in
// docs/STEAM.md and the one entered in Steamworks must match this one exactly.
import type { RunState } from '../game/run';
import { equipped, tagCounts, setCounts } from '../game/run';
import { sets, themes } from '../content/registry';
import { store, save } from '../save';
import { steam } from './native';

export interface AchievementDef {
  id: string; // Steamworks API name
  name: string;
  desc: string;
  hidden?: boolean; // Steam shows "hidden achievement" until it is earned
  // Earned yet? `r` is the run in progress or just finished, when there is one.
  test(r: RunState | null): boolean;
  // A Steam stat that shows progress towards it in the Steam client (see STATS).
  stat?: StatId;
  goal?: number;
}

// Integer stats, also defined in Steamworks (Stats & Achievements > Stats).
export type StatId = 'best_stage' | 'bosses' | 'runs' | 'worlds' | 'best_level';
const STATS: Record<StatId, () => number> = {
  best_stage: () => store.bestStage,
  bosses: () => store.bossKills,
  runs: () => store.runs,
  worlds: () => store.themesSeen.length,
  best_level: () => store.bestLevel,
};

const stage = (n: number) => (r: RunState | null) => store.bestStage >= n || (!!r && r.mode === 'normal' && r.stage >= n);
const level = (n: number) => (r: RunState | null) => store.bestLevel >= n || (!!r && r.mode === 'normal' && r.level >= n);
const tag = (t: keyof ReturnType<typeof tagCounts>) => (r: RunState | null) => !!r && tagCounts(r)[t] >= 4;
const fullSet = (r: RunState | null) =>
  !!r &&
  Object.entries(setCounts(r)).some(([id, n]) => {
    const s = sets.get(id);
    return !!s && n >= Math.max(...s.bonuses.map((b) => b.n));
  });

export const ACHIEVEMENTS: AchievementDef[] = [
  // How far can you get?
  { id: 'STAGE_1', name: 'Trash Talk', desc: 'Win your first fight.', test: stage(1) },
  { id: 'STAGE_10', name: 'Off the Block', desc: 'Reach stage 10 in one run.', test: stage(10), stat: 'best_stage', goal: 10 },
  { id: 'STAGE_20', name: 'Long Way From the Bins', desc: 'Reach stage 20 in one run.', test: stage(20), stat: 'best_stage', goal: 20 },
  { id: 'STAGE_35', name: 'Night Shift', desc: 'Reach stage 35 in one run.', test: stage(35), stat: 'best_stage', goal: 35 },
  { id: 'STAGE_50', name: 'Urban Legend', desc: 'Reach stage 50 in one run.', test: stage(50), stat: 'best_stage', goal: 50 },
  { id: 'STAGE_75', name: 'Retracoon', desc: 'Reach stage 75 in one run.', test: stage(75), stat: 'best_stage', goal: 75 },
  // Bosses
  { id: 'BOSS_1', name: 'Found You', desc: 'Find and beat a hidden boss.', test: () => store.bossKills >= 1 },
  { id: 'BOSS_RUN_3', name: 'Boss Rush', desc: 'Beat 3 bosses in one run.', test: (r) => !!r && r.bosses >= 3 },
  { id: 'BOSS_25', name: 'Big Game Hunter', desc: 'Beat 25 bosses in total.', test: () => store.bossKills >= 25, stat: 'bosses', goal: 25 },
  // The raccoon wears its loot
  { id: 'ELITE_1', name: 'Shiny Problem', desc: 'Beat an elite foe.', test: (r) => !!r && r.elites >= 1 },
  { id: 'COMBO_3', name: 'Clean Sweep', desc: 'Take out 3 foes in one turn.', test: (r) => !!r && r.bestCombo >= 3 },
  { id: 'FULL_KIT', name: 'Dressed to Kill', desc: 'Wear an item in all seven slots.', test: (r) => !!r && equipped(r).length >= 7 },
  { id: 'LEGENDARY', name: 'Gold Plated', desc: 'Wear a legendary item.', test: (r) => !!r && equipped(r).some((e) => e.def.rarity === 4) },
  { id: 'FULL_SET', name: 'Matching Outfit', desc: 'Switch on every bonus of an item set.', test: fullSet },
  // Builds, found rather than picked
  { id: 'BUILD_SPEED', name: 'Zoomies', desc: 'Wear 4 SPEED items at once.', test: tag('speed') },
  { id: 'BUILD_TANK', name: 'Trash Can Armor', desc: 'Wear 4 TANK items at once.', test: tag('tank') },
  { id: 'BUILD_SCAV', name: 'Finders Keepers', desc: 'Wear 4 SCAVENGER items at once.', test: tag('scav') },
  { id: 'BUILD_CRIT', name: 'Lucky Paws', desc: 'Wear 4 CRIT items at once.', test: tag('crit') },
  { id: 'BUILD_TRASH', name: 'Garbage Day', desc: 'Wear 4 TRASH items at once.', test: tag('trash') },
  // The raccoon you keep
  { id: 'RETREAT', name: 'Live to Scavenge', desc: 'Retreat and keep your level for the next run.', test: () => !!store.kept },
  { id: 'LEVEL_10', name: 'Seasoned', desc: 'Reach level 10.', test: level(10), stat: 'best_level', goal: 10 },
  { id: 'LEVEL_25', name: 'Veteran', desc: 'Reach level 25.', test: level(25), stat: 'best_level', goal: 25 },
  // Exploring
  { id: 'WORLDS_10', name: 'Tourist', desc: 'Visit 10 different worlds.', test: () => store.themesSeen.length >= 10, stat: 'worlds', goal: 10 },
  { id: 'WORLDS_25', name: 'Globetrotter', desc: 'Visit 25 different worlds.', test: () => store.themesSeen.length >= 25, stat: 'worlds', goal: 25 },
  { id: 'WORLDS_ALL', name: 'Seen It All', desc: 'Visit every world.', hidden: true, test: () => themes.size > 0 && store.themesSeen.filter((t) => themes.has(t)).length >= themes.size },
  { id: 'ITEMS_100', name: 'Hoarder', desc: 'Find 100 different items.', test: () => store.seen.length >= 100 },
  { id: 'FOES_40', name: 'Field Guide', desc: 'Meet 40 different foes.', test: () => store.foesSeen.length >= 40 },
  // Coming back
  { id: 'RUNS_50', name: 'One More Run', desc: 'Start 50 runs.', test: () => store.runs >= 50, stat: 'runs', goal: 50 },
  { id: 'DAILY', name: 'Daily Grind', desc: 'Finish a daily run.', test: () => !!store.dailyBest },
  { id: 'SKIN', name: 'New Look', desc: 'Get a new skin.', test: () => store.skins.length >= 2 },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// Check everything and unlock what's newly earned. Cheap; call it whenever something
// that could earn one has happened (a fight won, a run over, a skin bought).
export function checkAchievements(r: RunState | null = null) {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (store.achievements.includes(a.id)) continue;
    try {
      if (a.test(r)) fresh.push(a.id);
    } catch {
      /* content not loaded yet */
    }
  }
  if (fresh.length) {
    store.achievements.push(...fresh);
    save();
  }
  pushToSteam(fresh.length > 0);
}

// Earned while Steam was closed or offline, or before an update added the bridge:
// Steam ignores achievements it already has, so sending all of them again is safe.
export function syncAchievements() {
  pushToSteam(true);
}

let lastStats = '';
function pushToSteam(all: boolean) {
  const s = steam();
  if (!s?.achievement) return;
  const stats = Object.fromEntries(Object.entries(STATS).map(([k, f]) => [k, f()]));
  const key = JSON.stringify(stats);
  if (!all && key === lastStats) return;
  lastStats = key;
  s.achievement(store.achievements.filter((id) => byId.has(id)), stats);
}

// What friends see next to the player's name in Steam ("Stage 12 in Gloomy Swamp").
export function steamPresence(r: RunState | null) {
  const s = steam();
  if (!s?.presence) return;
  if (!r) return s.presence('menu');
  const world = themes.get(r.theme)?.name ?? '';
  const nice = world.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  s.presence(r.mode === 'daily' ? 'daily' : 'run', { stage: String(r.stage + 1), world: nice });
}
