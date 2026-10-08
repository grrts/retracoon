// Every raccoon skin. The default 'classic' skin comes first.
import type { SkinDef } from '../types';
import { FUR_SKINS } from './fur';
import { OUTFIT_SKINS } from './outfit';
import { HOLIDAY_SKINS } from './holiday';

export const SKINS: SkinDef[] = [...FUR_SKINS, ...OUTFIT_SKINS, ...HOLIDAY_SKINS];
