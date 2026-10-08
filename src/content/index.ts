// Every piece of content the game ships with, loaded into the registry once at boot.
// To add content, add it to the matching folder's list; nothing else needs to change.
import { items, skills, enemies, families, events, themes, seasons, skins } from './registry';
import { ITEMS } from './items';
import { SKILLS } from './skills';
import { EVENTS } from './events';
import { ENEMIES, FAMILIES } from './enemies';
import { THEMES } from '../world/themes';
import { SEASONS } from '../world/seasons';
import { SKINS } from '../meta/skins';

let done = false;

function put<T extends { id: string }>(map: Map<string, T>, list: T[], what: string) {
  for (const x of list) {
    if (map.has(x.id)) console.warn(`duplicate ${what} id: ${x.id}`);
    map.set(x.id, x);
  }
}

export function loadContent() {
  if (done) return;
  done = true;
  put(items, ITEMS, 'item');
  put(skills, SKILLS, 'skill');
  put(enemies, ENEMIES, 'enemy');
  for (const [k, v] of Object.entries(FAMILIES)) families.set(k, v);
  events.push(...EVENTS);
  put(themes, THEMES, 'theme');
  seasons.push(...SEASONS);
  put(skins, SKINS, 'skin');
}
