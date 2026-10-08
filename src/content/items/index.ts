// Every item, gathered from the per-slot files.
import type { ItemDef } from '../types';
import { ITEMS_HEAD } from './head';
import { ITEMS_FACE } from './face';
import { ITEMS_BODY } from './body';
import { ITEMS_BACK } from './back';
import { ITEMS_PAW } from './paw';
import { ITEMS_TAIL } from './tail';
import { ITEMS_AURA } from './aura';

export const ITEMS: ItemDef[] = [...ITEMS_HEAD, ...ITEMS_FACE, ...ITEMS_BODY, ...ITEMS_BACK, ...ITEMS_PAW, ...ITEMS_TAIL, ...ITEMS_AURA];
