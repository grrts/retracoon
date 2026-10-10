// Online scoreboard and friends, backed by the Retracoon API (server/, see docs/ONLINE.md).
// Players never make an account: on first use the game registers and keeps the token
// it gets back. Everything here fails soft: no URL, no network, or an error means offline.
import { API_URL } from './config';
import { store, save } from '../save';

export interface ScoreRow {
  id: string;
  name: string;
  skin: string;
  bestStage: number;
  bestLevel: number;
  bestDistance: number;
  rank: number | null;
}

export interface Me extends ScoreRow {
  friendCode: string;
}

export const onlineConfigured = () => !!API_URL;

const TOKEN_KEY = 'retracoon.api';
let me: Me | null = null;

const ADJ = ['SNEAKY', 'GRUMPY', 'SPEEDY', 'LUCKY', 'TINY', 'MIGHTY', 'SHADY', 'FUZZY', 'SLY', 'BRAVE', 'MESSY', 'CHUNKY'];
const NOUN = ['BANDIT', 'COON', 'PAWS', 'RASCAL', 'TRASHER', 'MASK', 'SNOUT', 'TAIL'];

export function randomName() {
  const r = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  return `${r(ADJ)} ${r(NOUN)} ${Math.floor(Math.random() * 90 + 10)}`.slice(0, 16);
}

// Names: 3-16 characters, letters, digits and spaces (the pixel font has these).
export function cleanName(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: we'll register again next time */
  }
};

interface Res<T> {
  status: number;
  data: T | null;
}

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<Res<T>> {
  if (!API_URL) return { status: 0, data: null };
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  // Give up after 8 s (AbortSignal.timeout is missing on older Android WebViews).
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: abort.signal });
    const text = await res.text();
    return { status: res.status, data: text && res.ok ? (JSON.parse(text) as T) : null };
  } catch (e) {
    console.warn('online unavailable', e);
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// An authenticated call; if the server no longer knows our token, register again once.
async function authed<T>(method: string, path: string, body?: unknown): Promise<Res<T>> {
  if (!(await profile())) return { status: 0, data: null };
  const r = await call<T>(method, path, body);
  if (r.status !== 401) return r;
  setToken(null);
  me = null;
  if (!(await profile())) return r;
  return call<T>(method, path, body);
}

// Make sure this device has a player; returns it, or null when offline.
export async function profile(): Promise<Me | null> {
  if (me) return me;
  if (!onlineConfigured()) return null;
  if (getToken()) {
    const r = await call<{ player: Me }>('GET', '/me');
    if (r.data) return remember(r.data.player);
    if (r.status !== 401) return null;
    setToken(null);
  }
  if (!store.playerName) {
    store.playerName = randomName();
    save();
  }
  const r = await call<{ token: string; player: Me }>('POST', '/players', { name: store.playerName, skin: store.skin }, false);
  if (!r.data) return null;
  setToken(r.data.token);
  // A fresh player has no scores yet: send our best again.
  store.bestSubmitted = 0;
  return remember(r.data.player);
}

function remember(p: Me) {
  me = p;
  if (store.playerName !== p.name) {
    store.playerName = p.name;
    save();
  }
  return p;
}

export async function rename(name: string): Promise<boolean> {
  const n = cleanName(name);
  if (n.length < 3) return false;
  const r = await authed<{ player: Me }>('PATCH', '/me', { name: n });
  if (!r.data) return false;
  remember(r.data.player);
  return true;
}

// Called after every run. Only sends when the best stage went up.
export async function submitBest() {
  if (store.bestStage <= 0 || store.bestStage <= store.bestSubmitted) return;
  const r = await authed<{ player: Me }>('POST', '/me/runs', { stage: store.bestStage, level: Math.max(1, store.bestLevel), distance: Math.max(0, Math.floor(store.bestDistance)), skin: store.skin });
  if (!r.data) return;
  remember(r.data.player);
  store.bestSubmitted = store.bestStage;
  save();
}

export async function worldScores(limit = 50): Promise<ScoreRow[] | null> {
  const r = await call<{ players: ScoreRow[] }>('GET', `/leaderboard?limit=${limit}`, undefined, false);
  return r.data?.players ?? null;
}

// You and your friends, best first.
export async function friendScores(): Promise<ScoreRow[] | null> {
  const r = await authed<{ players: ScoreRow[] }>('GET', '/me/friends');
  return r.data?.players ?? null;
}

export type AddResult = { ok: true; name: string } | { ok: false; why: 'unknown' | 'self' | 'already' | 'full' | 'busy' | 'offline' };

export async function addFriend(code: string): Promise<AddResult> {
  const r = await authed<{ friend: ScoreRow }>('POST', '/me/friends', { code: code.trim().toUpperCase() });
  if (r.data) return { ok: true, name: r.data.friend.name };
  const why = r.status === 404 ? 'unknown' : r.status === 409 ? 'already' : r.status === 429 ? 'busy' : r.status === 422 ? (code.trim().toUpperCase() === me?.friendCode ? 'self' : 'full') : 'offline';
  return { ok: false, why };
}

export async function removeFriend(id: string) {
  await authed('DELETE', `/me/friends/${id}`);
}
