// Accounts, scoreboard and friends, backed by the Retracoon API (server/, see
// docs/ONLINE.md and docs/ACCOUNTS.md). Players sign in with Google, Apple or Steam;
// the token the server hands back is kept on this device. Gems, No Ads and gem
// unlocks live on the server so they follow the account.
// Everything except signing in fails soft: no network or an error means offline.
import { API_URL } from './config';
import { store, save } from '../save';
import { credential, type Provider } from './auth';
import { platform } from './native';

export interface ScoreRow {
  id: string;
  name: string;
  tag: number;
  skin: string;
  bestStage: number;
  bestLevel: number;
  bestDistance: number;
  rank: number | null;
}

export interface Me extends ScoreRow {
  friendCode: string;
  provider: Provider;
  gems: number;
  noAds: boolean;
  unlocks: string[];
}

// NAME#1234: names are shared, the tag makes each one unique.
export const fullName = (p: { name: string; tag?: number }) => (p.tag ? `${p.name}#${p.tag}` : p.name);

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

export const getToken = () => {
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

// An authenticated call. A 401 means this device was signed out (account deleted):
// forget the token so the sign-in screen shows next launch.
async function authed<T>(method: string, path: string, body?: unknown): Promise<Res<T>> {
  if (!getToken()) return { status: 0, data: null };
  const r = await call<T>(method, path, body);
  if (r.status === 401) signOut();
  return r;
}

export const signedIn = () => !!getToken();

// Sign-in is needed to play whenever the game is built with an API address, except on
// iPhone: Apple doesn't allow a login wall in front of a game (guideline 5.1.1(v)), so
// there it is asked for when the player opens the scoreboard or buys something.
export const signInRequired = () => platform() !== 'ios';
export const needsSignIn = () => onlineConfigured() && !signedIn() && signInRequired();
// For account things (scoreboard, purchases): true when the player still has to sign in.
export const mustSignInFor = () => onlineConfigured() && !signedIn();

export type SignInResult = { ok: true; me: Me; created: boolean } | { ok: false; why: 'cancel' | 'rejected' | 'offline' | 'busy' };

export async function signIn(provider: Provider): Promise<SignInResult> {
  const c = await credential(provider);
  if (!c.ok) return { ok: false, why: c.why === 'cancel' ? 'cancel' : 'rejected' };
  const r = await call<{ token: string; created: boolean; player: Me }>('POST', '/auth', { provider, credential: c.credential, code: c.code, name: store.playerName || c.name || randomName(), skin: store.skin }, false);
  if (!r.data) return { ok: false, why: r.status === 0 ? 'offline' : r.status === 429 ? 'busy' : 'rejected' };
  setToken(r.data.token);
  // Scores from this device go to the account again.
  store.bestSubmitted = 0;
  save();
  return { ok: true, me: remember(r.data.player), created: r.data.created };
}

export function signOut() {
  setToken(null);
  me = null;
}

// The signed-in player; null when offline or signed out.
export async function profile(fresh = false): Promise<Me | null> {
  if (me && !fresh) return me;
  if (!onlineConfigured() || !getToken()) return null;
  const r = await authed<{ player: Me }>('GET', '/me');
  return r.data ? remember(r.data.player) : null;
}

// The server is the bank for everything bought with money: copy it into the save.
function remember(p: Me) {
  me = p;
  store.playerName = p.name;
  if (typeof p.gems === 'number') store.gems = p.gems;
  if (typeof p.noAds === 'boolean') store.noAds = p.noAds;
  for (const id of p.unlocks ?? []) if (!store.skins.includes(id)) store.skins.push(id);
  save();
  return p;
}

// Spend gems on an unlock. Needs the server, so gems can't be spent offline.
export async function spendGems(gems: number, item: string): Promise<'ok' | 'poor' | 'offline'> {
  const r = await authed<{ player: Me }>('POST', '/me/spend', { gems, item });
  if (r.data) {
    remember(r.data.player);
    return 'ok';
  }
  return r.status === 409 ? 'poor' : 'offline';
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

// Deletes the player, scores, friends, gems and unlocks on the server, then signs out.
export async function deleteAccount(): Promise<boolean> {
  const r = await authed('DELETE', '/me');
  if (r.status !== 204) return false;
  signOut();
  return true;
}

export async function removeFriend(id: string) {
  await authed('DELETE', `/me/friends/${id}`);
}
