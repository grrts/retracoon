// Every enemy and boss, plus which enemies belong to which family (themes pick foes by family).
import type { EnemyDef } from '../types';
import { ENEMIES_STREET } from './street';
import { ENEMIES_STRAYS } from './strays';
import { ENEMIES_BUGS } from './bugs';
import { ENEMIES_SWAMP } from './swamp';
import { ENEMIES_FUNGI } from './fungi';
import { ENEMIES_SPOOKS } from './spooks';
import { ENEMIES_MACHINES } from './machines';
import { ENEMIES_WASTES } from './wastes';
import { ENEMIES_VOID } from './void';
import { BOSSES } from './bosses';

const FAMILY_LISTS: Record<string, EnemyDef[]> = {
  street: ENEMIES_STREET,
  strays: ENEMIES_STRAYS,
  bugs: ENEMIES_BUGS,
  swamp: ENEMIES_SWAMP,
  wastes: ENEMIES_WASTES,
  fungi: ENEMIES_FUNGI,
  spooks: ENEMIES_SPOOKS,
  machines: ENEMIES_MACHINES,
  void: ENEMIES_VOID,
};

export const ENEMIES: EnemyDef[] = [...Object.values(FAMILY_LISTS).flat(), ...BOSSES];

// Family id -> ids of the enemies that show up in normal fights. Helpers that only appear
// through split or summon (no role, e.g. mold_bit) are left out.
export const FAMILIES: Record<string, string[]> = Object.fromEntries(
  Object.entries(FAMILY_LISTS).map(([fam, list]) => [fam, list.filter((e) => e.role).map((e) => e.id)]),
);

export { BOSSES };
