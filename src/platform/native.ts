// Are we running inside the iOS/Android app (Capacitor), the Steam app (Electron, see
// steam/), or a plain browser?
import { Capacitor } from '@capacitor/core';

// What the Steam app's preload script exposes (steam/preload.cjs).
export interface SteamBridge {
  ticket(): Promise<string | null>; // Web API auth ticket, hex
  name(): Promise<string>; // Steam persona name
  quit(): void;
  setFullscreen(on: boolean): void;
  setWindowSize?(w: number, h: number): void; // newer builds of the Steam app
  onFullscreen?(cb: (on: boolean) => void): void;
  // Newer builds of the Steam app (Steamworks features):
  achievement?(ids: string[], stats: Record<string, number>): void; // unlock these, set these stats
  presence?(status: 'menu' | 'run' | 'daily', vars?: Record<string, string>): void; // rich presence
  cloudRead?(): string | null; // the save in Steam Cloud
  cloudWrite?(json: string): void;
  keyboard?(x: number, y: number, w: number, h: number): void; // Steam Deck on-screen keyboard
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
