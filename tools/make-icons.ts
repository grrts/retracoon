// App icons, splash screens and store graphics, drawn from the game's own pixel art.
// Run: npx tsx tools/make-icons.ts   (writes into android/, ios/ and docs/store/)
import { mkdirSync } from 'node:fs';
import { Sheet } from './png';
import { buildPose, DEFAULT_FUR } from '../src/gfx/coon';
import { PAL } from '../src/gfx/palette';
import { FONT } from '../src/gfx/font';

const pal: Record<string, string> = { ...PAL, ...DEFAULT_FUR };
const coon = buildPose('idle0');
const NAVY = '#1a1c2c';

function word(s: Sheet, str: string, x: number, y: number, col: string) {
  let cx = x;
  for (const ch of str) {
    const g = FONT[ch];
    if (!g) {
      cx += 4;
      continue;
    }
    // outline first, then the letter
    g.forEach((row, gy) => [...row].forEach((c, gx) => c === '#' && [-1, 0, 1].forEach((dy) => [-1, 0, 1].forEach((dx) => s.px(cx + gx + dx, y + gy + dy, NAVY)))));
    g.forEach((row, gy) => [...row].forEach((c, gx) => c === '#' && s.px(cx + gx, y + gy, col)));
    cx += g[0].length + 1;
  }
}
const wordW = (str: string) => [...str].reduce((a, ch) => a + (FONT[ch]?.[0].length ?? 3) + 1, -1);

// Night alley backdrop with a moon and a trash can, the raccoon front and centre.
function scene(w: number, h: number, withCan = true) {
  const s = new Sheet(w, h, null);
  const bands = ['#1a1c2c', '#212447', '#29366f', '#2f4590', '#3b5dc9', '#3e7fdf'];
  const sky = h - 8;
  for (let y = 0; y < sky; y++) s.rect(0, y, w, 1, bands[Math.min(bands.length - 1, Math.floor((y / sky) * bands.length))]);
  s.rect(w - 12, 4, 6, 6, '#f4f4f4');
  s.rect(w - 11, 3, 4, 8, '#f4f4f4');
  s.rect(0, h - 8, w, 8, '#566c86');
  s.rect(0, h - 8, w, 1, '#94b0c2');
  if (withCan) {
    const can = ['.kkkkkkk.', 'kgggggggk', 'kkkkkkkkk', '.kgglggk.', '.kgglggk.', '.kgglggk.', '.kgglggk.', '.kkkkkkk.'];
    s.map(can, 3, h - 16, pal);
  }
  return s;
}

function icon(size: number) {
  const s = scene(40, 40, false);
  s.map(coon, 2, 40 - 8 - 25 + 1, pal);
  return s;
}

const out = (p: string) => (mkdirSync(p.replace(/\/[^/]+$/, ''), { recursive: true }), p);

// iOS: one 1024 icon (no transparency allowed).
icon(1024).saveSized(out('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024, 1024, NAVY, true);

// Android legacy + round icons, and the adaptive foreground (raccoon only, transparent).
const dens: [string, number][] = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
for (const [d, k] of dens) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  icon(48).saveSized(out(`${dir}/ic_launcher.png`), 48 * k, 48 * k, NAVY);
  icon(48).saveSized(out(`${dir}/ic_launcher_round.png`), 48 * k, 48 * k, NAVY);
  const fg = new Sheet(54, 54, null); // 108dp canvas at half resolution; safe zone is the middle 66%
  fg.map(coon, 9, 14, pal);
  fg.saveSized(out(`${dir}/ic_launcher_foreground.png`), 108 * k, 108 * k);
}

// Splash: the raccoon and the name on the game's background colour.
function splash() {
  const s = new Sheet(80, 48, null);
  s.map(coon, 22, 4, pal);
  word(s, 'RETRACOON', Math.floor((80 - wordW('RETRACOON')) / 2), 34, '#ffcd75');
  return s;
}
const sp = splash();
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) sp.saveSized(out(`ios/App/App/Assets.xcassets/Splash.imageset/${f}`), 2732, 2732, NAVY);
const land: [string, number, number][] = [['mdpi', 480, 320], ['hdpi', 800, 480], ['xhdpi', 1280, 720], ['xxhdpi', 1600, 960], ['xxxhdpi', 1920, 1280]];
for (const [d, w, h] of land) {
  sp.saveSized(out(`android/app/src/main/res/drawable-land-${d}/splash.png`), w, h, NAVY);
  sp.saveSized(out(`android/app/src/main/res/drawable-port-${d}/splash.png`), h, w, NAVY);
}
sp.saveSized(out('android/app/src/main/res/drawable/splash.png'), 480, 320, NAVY);

// Store listing graphics.
icon(512).saveSized(out('docs/store/icon-512.png'), 512, 512, NAVY);
const feat = scene(128, 62);
feat.map(coon, 14, 62 - 8 - 25 + 1, pal);
word(feat, 'RETRACOON', 89 - Math.ceil(wordW('RETRACOON') / 2), 18, '#ffcd75');
word(feat, 'ROGUELIKE', 89 - Math.ceil(wordW('ROGUELIKE') / 2), 30, '#f4f4f4');
feat.saveSized(out('docs/store/feature-graphic-1024x500.png'), 1024, 500, NAVY);
console.log('icons, splash screens and store graphics written');
