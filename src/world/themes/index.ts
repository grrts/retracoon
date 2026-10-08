// All themes, tier by tier.
import type { ThemeDef } from '../types';
import { TIER_1 } from './tier1';
import { TIER_2 } from './tier2';
import { TIER_3 } from './tier3';
import { TIER_4 } from './tier4';
import { TIER_5 } from './tier5';

export const THEMES: ThemeDef[] = [...TIER_1, ...TIER_2, ...TIER_3, ...TIER_4, ...TIER_5];
export { TIER_1, TIER_2, TIER_3, TIER_4, TIER_5 };
