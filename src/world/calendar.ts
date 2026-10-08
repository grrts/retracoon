// Which holiday season is on right now (by the device's date), if any.
import { seasons } from '../content/registry';
import type { SeasonDef } from './types';

let override: string | null | undefined;

// For testing and previews: force a season id, or null for none.
export function forceSeason(id: string | null | undefined) {
  override = id;
}

export function inWindow(s: SeasonDef, date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const v = m * 100 + d;
  const from = s.from[0] * 100 + s.from[1];
  const to = s.to[0] * 100 + s.to[1];
  return from <= to ? v >= from && v <= to : v >= from || v <= to;
}

export function activeSeason(date = new Date()): SeasonDef | null {
  if (override !== undefined) return override ? seasons.find((s) => s.id === override) ?? null : null;
  return seasons.find((s) => inWindow(s, date)) ?? null;
}

export function activeSeasons(date = new Date()): SeasonDef[] {
  if (override !== undefined) return override ? seasons.filter((s) => s.id === override) : [];
  return seasons.filter((s) => inWindow(s, date));
}
