// Every gear shape the forge can draw a new item with, per slot.
import type { Slot } from '../../types';
import type { Shape } from './shape';
import { HEAD } from './head';
import { FACE } from './face';
import { BODY } from './body';
import { BACK } from './back';
import { PAW } from './paw';
import { TAIL } from './tail';
import { AURA } from './aura';

export const SHAPES: Partial<Record<Slot, Record<string, Shape>>> = { head: HEAD, face: FACE, body: BODY, back: BACK, paw: PAW, tail: TAIL, aura: AURA };
