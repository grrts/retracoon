// Bottle Caps (earned by playing) and Gems (bought), skin prices and the weekly sale.
import { skins } from '../content/registry';
import { store, save } from '../save';
import { activeSeasons } from '../world/calendar';
import type { SkinDef } from './types';
import { isSteam } from '../platform/native';
import { onlineConfigured, signedIn, spendGems } from '../platform/online';

export const SKIN_RARITY = [
  { name: 'COMMON', color: 0x94b0c2, caps: 500, gems: 0 },
  { name: 'RARE', color: 0x41a6f6, caps: 1500, gems: 120 },
  { name: 'EPIC', color: 0xb05ccf, caps: 0, gems: 300 },
  { name: 'LEGENDARY', color: 0xffa300, caps: 0, gems: 650 },
];

export interface Price {
  caps: number; // 0 = not buyable with caps
  gems: number; // 0 = not buyable with gems
  was?: { caps: number; gems: number };
  off?: number; // percent off
}

// ISO week number: the sale changes every Monday, the same for every player.
export function weekNumber(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() * 100 + Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export interface WeeklySale {
  week: number;
  featured: string;
  deals: { id: string; off: number }[];
  endsInDays: number;
}

export function weeklySale(d = new Date()): WeeklySale {
  const week = weekNumber(d);
  const rnd = seeded(week * 7919);
  const pool = [...skins.values()].filter((s) => s.group !== 'holiday' && s.id !== 'classic');
  const deals: { id: string; off: number }[] = [];
  const copy = [...pool];
  while (deals.length < 6 && copy.length) {
    const s = copy.splice(Math.floor(rnd() * copy.length), 1)[0];
    deals.push({ id: s.id, off: [30, 40, 50][Math.floor(rnd() * 3)] });
  }
  const epic = pool.filter((s) => s.rarity >= 2);
  const featured = epic.length ? epic[Math.floor(rnd() * epic.length)].id : deals[0]?.id ?? 'classic';
  if (!deals.find((x) => x.id === featured)) deals.unshift({ id: featured, off: 25 });
  const day = d.getDay() || 7;
  return { week, featured, deals, endsInDays: 8 - day };
}

export function isAvailable(s: SkinDef, d = new Date()) {
  if (s.group !== 'holiday') return true;
  return activeSeasons(d).some((x) => x.id === s.season);
}

export function skinPrice(s: SkinDef, d = new Date()): Price {
  const r = SKIN_RARITY[s.rarity];
  let caps = r.caps;
  let gems = r.gems;
  // Outfits cost a bit more; holiday skins are gems only.
  if (s.group === 'outfit') {
    caps = caps ? Math.round(caps * 1.4) : 0;
    gems = gems ? Math.round(gems * 1.2) : s.rarity === 0 ? 0 : gems;
  }
  if (s.group === 'holiday') {
    caps = 0;
    gems = gems || 200;
  }
  if (s.id === 'classic') return { caps: 0, gems: 0 };
  // Steam has no gems: gem-only skins cost caps instead (10 caps per gem).
  if (isSteam()) {
    caps = caps || gems * 10;
    gems = 0;
  }
  const deal = weeklySale(d).deals.find((x) => x.id === s.id);
  if (!deal) return { caps, gems };
  const cut = (n: number) => (n ? Math.round((n * (100 - deal.off)) / 100 / 10) * 10 : 0);
  return { caps: cut(caps), gems: cut(gems), was: { caps, gems }, off: deal.off };
}

export function owns(id: string) {
  return store.skins.includes(id);
}

// Caps are local. Gems belong to the account when signed in, so the server does the
// spending (and the skin is then unlocked on every device).
export async function buySkin(id: string, currency: 'caps' | 'gems'): Promise<'ok' | 'poor' | 'offline' | 'no'> {
  const s = skins.get(id);
  if (!s || owns(id) || !isAvailable(s)) return 'no';
  const p = skinPrice(s);
  const cost = currency === 'caps' ? p.caps : p.gems;
  if (!cost) return 'no';
  if (currency === 'caps' ? store.caps < cost : store.gems < cost) return 'poor';
  if (currency === 'gems' && onlineConfigured() && signedIn()) {
    const res = await spendGems(cost, id);
    if (res !== 'ok') return res;
  } else if (currency === 'caps') store.caps -= cost;
  else store.gems -= cost;
  if (!store.skins.includes(id)) store.skins.push(id);
  store.skin = id;
  save();
  return 'ok';
}

export function equipSkin(id: string) {
  if (!owns(id)) return;
  store.skin = id;
  save();
}

export function addCaps(n: number) {
  store.caps = Math.max(0, store.caps + Math.round(n));
  save();
}

export function addGems(n: number) {
  store.gems = Math.max(0, store.gems + Math.round(n));
  save();
}
