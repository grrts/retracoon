// Are we running inside the iOS/Android app (Capacitor), the Steam app (Electron, see
// steam/), or a plain browser?
import { Capacitor } from '@capacitor/core';

// What the Steam app's preload script exposes (steam/preload.cjs).
export interface SteamBridge {
  ticket(): Promise<string | null>; // Web API auth ticket, hex
  name(): Promise<string>; // Steam persona name
  quit(): void;
  setFullscreen(on: boolean): void;
}

export const steam = (): SteamBridge | null => (globalThis as { retracoonSteam?: SteamBridge }).retracoonSteam ?? null;
export const isSteam = () => !!steam();
export const isNative = () => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'steam' | 'web' => (isSteam() ? 'steam' : (Capacitor.getPlatform() as 'ios' | 'android' | 'web'));

// App shell setup on phones: full screen, landscape, hide the splash once the game runs.
export async function initNative() {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {
    /* not available */
  }
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    /* not available */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* not available */
  }
}
