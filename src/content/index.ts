// Every content pack the game ships with. A new pack is one file plus one line here.
import { registerPack } from './registry';
import { corePack } from './core';
import { alleyPack, parkPack, sewerPack } from './areas';

let done = false;
export function loadContent() {
  if (done) return;
  done = true;
  [corePack, alleyPack, parkPack, sewerPack].forEach(registerPack);
}
