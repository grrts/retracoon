// Haptics: short buzzes for the big moments. The Capacitor Haptics plugin on phones,
// navigator.vibrate in mobile browsers that have it (Android Chrome; never iOS Safari),
// and rumble on a connected controller (Steam and desktop browsers). Anything missing is
// skipped quietly. Kept to a handful of moments so it never buzzes on every tap.
import { store } from './save';
import { isNative, isSteam } from './platform/native';
import { IS_TOUCH } from './config';

export type Buzz = 'crit' | 'hurt' | 'bigHurt' | 'boss' | 'loot' | 'levelUp' | 'record';

type Impact = 'light' | 'medium' | 'heavy';
// Phone patterns: impacts (or the 'success' notification) separated by pauses in ms.
type Step = Impact | 'success' | number;

interface Pattern {
  phone: Step[];
  web: number[]; // navigator.vibrate: on, off, on, ...
  pad: { ms: number; strong: number; weak: number };
  gap: number; // ignore repeats of the same buzz within this many ms
}

const PATTERNS: Record<Buzz, Pattern> = {
  crit: { phone: ['heavy'], web: [18], pad: { ms: 90, strong: 0.5, weak: 0.6 }, gap: 90 },
  hurt: { phone: ['medium'], web: [28], pad: { ms: 120, strong: 0.4, weak: 0.2 }, gap: 120 },
  bigHurt: { phone: ['heavy', 70, 'medium'], web: [40, 40, 20], pad: { ms: 220, strong: 0.8, weak: 0.4 }, gap: 200 },
  boss: { phone: ['heavy', 90, 'heavy', 90, 'heavy'], web: [50, 50, 50, 50, 90], pad: { ms: 500, strong: 1, weak: 0.8 }, gap: 600 },
  loot: { phone: ['success'], web: [12, 60, 12, 60, 24], pad: { ms: 150, strong: 0.2, weak: 0.6 }, gap: 400 },
  levelUp: { phone: ['light', 60, 'medium', 60, 'heavy'], web: [10, 50, 16, 50, 30], pad: { ms: 220, strong: 0.3, weak: 0.5 }, gap: 400 },
  record: { phone: ['success', 120, 'heavy'], web: [20, 40, 20, 40, 60], pad: { ms: 300, strong: 0.6, weak: 0.6 }, gap: 1000 },
};

type HapticsPlugin = typeof import('@capacitor/haptics');
let plugin: Promise<HapticsPlugin | null> | null = null;
const loadPlugin = () => (plugin ??= import('@capacitor/haptics').catch(() => null));

const canVibrate = () => IS_TOUCH && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

interface Rumble {
  playEffect(type: 'dual-rumble', p: { duration: number; strongMagnitude: number; weakMagnitude: number }): Promise<unknown>;
}
function rumblePads(p: Pattern['pad']) {
  for (const pad of navigator.getGamepads?.() ?? []) {
    const act = (pad as (Gamepad & { vibrationActuator?: Rumble }) | null)?.vibrationActuator;
    if (!pad?.connected || !act?.playEffect) continue;
    act.playEffect('dual-rumble', { duration: p.ms, strongMagnitude: p.strong, weakMagnitude: p.weak }).catch(() => undefined);
  }
}

/** Whether this device can buzz at all (decides if Settings shows the switch). */
export function hasHaptics() {
  return isNative() || isSteam() || canVibrate() || !!navigator.getGamepads?.().some((p) => p?.connected);
}

const last: Partial<Record<Buzz, number>> = {};

export function buzz(kind: Buzz) {
  if (store.haptics === false) return;
  const p = PATTERNS[kind];
  const now = performance.now();
  if ((last[kind] ?? -Infinity) + p.gap > now) return;
  last[kind] = now;
  try {
    rumblePads(p.pad);
    if (isNative()) void playPhone(p.phone);
    else if (canVibrate()) navigator.vibrate(p.web);
  } catch {
    /* haptics are a nicety; never let them break the game */
  }
}

async function playPhone(steps: Step[]) {
  const mod = await loadPlugin();
  if (!mod) return;
  const { Haptics, ImpactStyle, NotificationType } = mod;
  const style = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  for (const s of steps) {
    if (typeof s === 'number') await new Promise((res) => setTimeout(res, s));
    else if (s === 'success') await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    else await Haptics.impact({ style: style[s] }).catch(() => undefined);
  }
}
