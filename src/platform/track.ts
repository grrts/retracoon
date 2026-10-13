// Gameplay tracking for the soft launch: a few events (app opened, run started and
// ended, tutorial done, ...) under a random install id made on this device, posted in
// batches to our own server (POST /api/events, see server/src/Controller/EventController).
// Nothing personal: no account id, no name, no ad id. Players can turn it off on the
// pause screen (store.trackingOff). Never throws, never blocks the game.
import { API_URL } from './config';
import { platform } from './native';
import { store } from '../save';

export type TrackEvent =
  | 'app_open'
  | 'tutorial_done'
  | 'run_start'
  | 'run_end'
  | 'area_reached'
  | 'boss_beaten'
  | 'level_up'
  | 'sign_in'
  | 'purchase'
  | 'shop_open'
  | 'scores_open';

type Props = Record<string, string | number | boolean | null>;
interface Queued {
  name: TrackEvent;
  at: number;
  props?: Props;
}

const DEVICE_KEY = 'retracoon.device';
const QUEUE_KEY = 'retracoon.events';
const MAX_QUEUE = 300;
const BATCH = 50;
export const VERSION = '1.0.0';

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function deviceId(): string {
  const ls = storage();
  let id = ls?.getItem(DEVICE_KEY) ?? '';
  if (!/^[a-z0-9-]{8,36}$/.test(id)) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    try {
      ls?.setItem(DEVICE_KEY, id);
    } catch {
      /* private mode: a new id each launch */
    }
  }
  return id;
}

let queue: Queued[] = (() => {
  try {
    return JSON.parse(storage()?.getItem(QUEUE_KEY) ?? '[]') as Queued[];
  } catch {
    return [];
  }
})();

function persist() {
  try {
    storage()?.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function track(name: TrackEvent, props?: Props) {
  if (!API_URL || store.trackingOff) return;
  queue.push({ name, at: Date.now(), props });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
  // Run results are worth sending right away; the rest rides the timer.
  if (name === 'run_end' || name === 'app_open') void flush();
}

let sending = false;
export async function flush(keepalive = false) {
  if (sending || !queue.length || !API_URL || store.trackingOff) return;
  sending = true;
  const batch = queue.slice(0, BATCH);
  try {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device: deviceId(), platform: platform(), version: VERSION, events: batch }),
      keepalive,
    });
    // Sent, or refused for good (bad data): either way don't send these again.
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      queue = queue.slice(batch.length);
      persist();
    }
  } catch {
    /* offline: try again later */
  } finally {
    sending = false;
  }
}

// Turning tracking off also drops whatever was waiting to be sent.
export function setTracking(on: boolean) {
  store.trackingOff = !on;
  if (!on) {
    queue = [];
    persist();
  }
}

let started = false;
export function startTracking() {
  if (started) return;
  started = true;
  track('app_open');
  window.setInterval(() => void flush(), 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true);
    else track('app_open');
  });
}
