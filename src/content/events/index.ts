// Every road event, gathered from the group files.
import type { EventDef } from '../types';
import { EVENTS_GENERAL } from './general';
import { EVENTS_TOWN } from './town';
import { EVENTS_WILD } from './wild';
import { EVENTS_FAR } from './far';
import { EVENTS_STRANGE } from './strange';
import { EVENTS_BEYOND } from './beyond';

export { EVENTS_GENERAL, EVENTS_TOWN, EVENTS_WILD, EVENTS_FAR, EVENTS_STRANGE, EVENTS_BEYOND };
export const EVENTS: EventDef[] = [...EVENTS_GENERAL, ...EVENTS_TOWN, ...EVENTS_WILD, ...EVENTS_FAR, ...EVENTS_STRANGE, ...EVENTS_BEYOND];
