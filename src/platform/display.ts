// Full screen or windowed, and the window size on Steam. Saved in the store and applied
// at start-up; the Steam app also reports F11 / Alt+Enter so the setting stays true.
import type Phaser from 'phaser';
import { store, save } from '../save';
import { steam, isNative } from './native';

export const WINDOW_SIZES: [number, number][] = [
  [960, 540],
  [1280, 720],
  [1600, 900],
  [1920, 1080],
];

let game: Phaser.Game;

/** Full screen and window size only mean something on desktop (Steam or a browser). */
export const hasDisplaySettings = () => !isNative();
export const hasWindowSize = () => !!steam();

export function isFullscreen() {
  return steam() ? store.fullscreen : game.scale.isFullscreen;
}

export function setFullscreen(on: boolean) {
  store.fullscreen = on;
  save();
  const s = steam();
  if (s) {
    s.setFullscreen(on);
    if (!on) applyWindowSize();
  } else if (on) game.scale.startFullscreen();
  else game.scale.stopFullscreen();
}

export function setWindowSize(i: number) {
  store.windowSize = (i + WINDOW_SIZES.length) % WINDOW_SIZES.length;
  save();
  applyWindowSize();
}

function applyWindowSize() {
  const [w, h] = WINDOW_SIZES[store.windowSize] ?? WINDOW_SIZES[1];
  if (!store.fullscreen) steam()?.setWindowSize?.(w, h);
}

export function initDisplay(g: Phaser.Game) {
  game = g;
  const s = steam();
  if (!s) return;
  // The window opens full screen; switch if the player chose a window last time.
  if (!store.fullscreen) {
    s.setFullscreen(false);
    applyWindowSize();
  }
  s.onFullscreen?.((on) => {
    store.fullscreen = on;
    save();
  });
}
