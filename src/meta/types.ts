// Cosmetic skins for the raccoon. A skin recolours the fur channels of the base
// sprite (see gfx/coon.ts) and can add pattern pixels and outfit pieces on top.
import type { Gear } from '../content/types';

export type SkinRarity = 0 | 1 | 2 | 3; // common, rare, epic, legendary
export type SkinGroup = 'fur' | 'outfit' | 'holiday';

export interface SkinDef {
  id: string;
  name: string; // shown in the shop, max 16 characters
  rarity: SkinRarity;
  group: SkinGroup;
  season?: string; // SeasonDef id; holiday skins are only sold during that season
  // Colours for the fur channels '1' (main), '2' (dark), '3' (light), '4' (white), 'p' (inner ear).
  fur: { '1': string; '2': string; '3': string; '4': string; p?: string };
  // Optional pattern: pixels painted over the base pose, in base coordinates
  // ('.' = leave as is). Only drawn where the base sprite has fur (not outline).
  pattern?: string[];
  outfit?: Gear[]; // pieces drawn like gear, behind the run's real gear
  effect?: 'sparkle' | 'glow' | 'trail' | 'hearts' | 'snow' | 'flames' | 'bubbles' | 'notes';
  glow?: string; // colour for the 'glow' effect
}
