// What a shared run says: who ended it, and the Wordle-style line that goes with the card.
import type { Foe } from './combat';
import { TIERS } from './combat';
import { enemyKey } from '../gfx/textures';

export interface Killer {
  name: string; // "FERAL SWAMP KING", "POISON", "FALLING POTS"
  id?: string; // enemy id, for the wiki link
  tex?: string; // texture of the foe as it looked, for the card
}

export function killerOf(k: { foe?: Foe; what?: string } | null | undefined): Killer | null {
  if (k?.foe) {
    const f = k.foe;
    const p2 = f.phase === 2 && f.def.phase2;
    const name = p2 ? f.def.phase2!.name : f.def.name;
    const tier = f.def.boss ? 0 : f.tier;
    return {
      name: `${TIERS[tier]?.name ? `${TIERS[tier].name} ` : ''}${name}`,
      id: f.def.id,
      tex: enemyKey(f.def.id, 0, tier, p2 && f.def.phase2!.frames ? 2 : 1),
    };
  }
  return k?.what ? { name: k.what } : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-16" -> "16 Oct"
export function shortDay(day: string) {
  const [, m, d] = day.split('-').map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]}` : day;
}

// Content names are written in capitals for the pixel font; prose wants "Swamp King".
export function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

export interface ShareFacts {
  mode: 'normal' | 'daily';
  day: string | null;
  reason: 'death' | 'retreat';
  stage: number;
  killer: Killer | null;
}

// How the run ended, as a phrase: "beaten by the Swamp King", "taken out by Poison".
export function endPhrase(f: ShareFacts) {
  if (f.reason === 'retreat') return 'retreated in time';
  if (!f.killer) return 'wiped out';
  if (!f.killer.id) return `taken out by ${titleCase(f.killer.name)}`;
  return `beaten by the ${titleCase(f.killer.name.replace(/^THE /, ''))}`;
}

// The line shared with the card. Daily runs read like a Wordle result:
// "Retracoon daily 16 Oct · stage 23 · beaten by the Swamp King"
export function shareLine(f: ShareFacts) {
  if (f.mode === 'daily' && f.day) return `Retracoon daily ${shortDay(f.day)} · stage ${f.stage} · ${endPhrase(f)}`;
  return `My raccoon reached stage ${f.stage} in Retracoon · ${endPhrase(f)}`;
}
