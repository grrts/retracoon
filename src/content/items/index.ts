// Every item, gathered from the per-slot files. Sets claim their looks first, so they
// are imported before the forged lists.
import type { ItemDef } from '../types';
import { SETS, SET_ITEMS } from './sets';
import { ITEMS_HEAD } from './head';
import { ITEMS_FACE } from './face';
import { ITEMS_BODY } from './body';
import { ITEMS_BACK } from './back';
import { ITEMS_PAW } from './paw';
import { ITEMS_TAIL } from './tail';
import { ITEMS_AURA } from './aura';
import { HEAD } from './forged/head';
import { FACE } from './forged/face';
import { BODY } from './forged/body';
import { BACK } from './forged/back';
import { PAW } from './forged/paw';
import { TAIL } from './forged/tail';
import { AURA } from './forged/aura';

export { SETS };
export const ITEMS: ItemDef[] = [...ITEMS_HEAD, ...ITEMS_FACE, ...ITEMS_BODY, ...ITEMS_BACK, ...ITEMS_PAW, ...ITEMS_TAIL, ...ITEMS_AURA, ...SET_ITEMS, ...HEAD, ...FACE, ...BODY, ...BACK, ...PAW, ...TAIL, ...AURA];
