// PROTOTYPE (combat VFX study). Every skill gets an element from data it already has:
// the ink its icon is painted in. The element picks a colour ramp from the game palette,
// a particle shape and a motion, so 536 skills get effects with no per-skill authoring.
import type { SkillDef, SkillEffect, StatusKey } from '../content/types';
import { INKS } from '../content/skills/icons';
import { hex } from '../gfx/palette';

export type Element =
  | 'fire' | 'ice' | 'poison' | 'blood' | 'gold' | 'shadow' | 'holy' | 'earth'
  | 'storm' | 'nature' | 'neon' | 'void' | 'steel' | 'rose' | 'sea' | 'rust';

// rise: drifts up (flames, holy sparks)    burst: radial pop with light gravity
// fall: thrown up, heavy gravity (shards, debris, coins)    implode: sucked into the point
// drift: slow wobble (leaves, petals, spores)
export type Motion = 'rise' | 'burst' | 'fall' | 'implode' | 'drift';

export interface Look {
  ramp: number[]; // bright to dark, palette colours only
  shape: string; // particle texture
  motion: Motion;
  ring?: boolean; // shockwave ring on impact
  bolt?: boolean; // lightning from above
  travel: 'melee' | 'shot' | 'drop' | 'beam'; // how a single-target hit gets there
}

const ramp = (ink: string) => [...INKS[ink]].map(hex);

export const LOOKS: Record<Element, Look> = {
  fire: { ramp: ramp('fire'), shape: 'pt_flame', motion: 'rise', travel: 'shot' },
  ice: { ramp: ramp('ice'), shape: 'fx_shard', motion: 'fall', travel: 'shot' },
  poison: { ramp: ramp('poison'), shape: 'pt_bubble', motion: 'drift', travel: 'shot' },
  blood: { ramp: ramp('blood'), shape: 'pt_drop', motion: 'fall', travel: 'melee' },
  gold: { ramp: ramp('gold'), shape: 'fx_coin', motion: 'fall', travel: 'melee' },
  shadow: { ramp: ramp('shadow'), shape: 'fx_puff', motion: 'implode', travel: 'melee' },
  holy: { ramp: ramp('holy'), shape: 'pt_spark', motion: 'rise', ring: true, travel: 'drop' },
  earth: { ramp: ramp('earth'), shape: 'fx_chunk', motion: 'fall', ring: true, travel: 'melee' },
  storm: { ramp: ramp('storm'), shape: 'fx_streak', motion: 'burst', bolt: true, travel: 'drop' },
  nature: { ramp: ramp('nature'), shape: 'pt_leaf', motion: 'drift', travel: 'shot' },
  neon: { ramp: ramp('neon'), shape: 'px1', motion: 'burst', ring: true, travel: 'beam' },
  void: { ramp: ramp('void'), shape: 'fx_rune', motion: 'implode', ring: true, travel: 'drop' },
  steel: { ramp: ramp('steel'), shape: 'fx_streak', motion: 'burst', travel: 'melee' },
  rose: { ramp: ramp('rose'), shape: 'pt_heart', motion: 'drift', travel: 'shot' },
  sea: { ramp: ramp('sea'), shape: 'pt_drop', motion: 'fall', ring: true, travel: 'shot' },
  rust: { ramp: ramp('rust'), shape: 'fx_chunk', motion: 'fall', travel: 'melee' },
};

// Icons drawn without an ink keep their own colours; their shape names the element.
const SHAPE: Record<string, Element> = {
  flame: 'fire', flake: 'ice', sludge: 'poison', drop: 'blood', coin: 'gold', crown: 'gold', sun: 'holy',
  cross: 'holy', moon: 'shadow', eye: 'void', heart: 'rose', burp: 'poison', fang: 'blood', dice: 'gold',
};

// The starting book predates inks.
const BASE: Record<string, Element> = {
  stink: 'poison', sludge: 'poison', toxicbite: 'poison', shrapnel: 'rust', trick: 'gold', lucky: 'gold',
  snipe: 'gold', comet: 'void', thunder: 'storm', storm: 'rust', snack: 'nature', lickwounds: 'nature',
  dumpster: 'rust', playdead: 'shadow', berserk: 'blood', reckless: 'blood', frenzy: 'blood', howl: 'shadow',
  jeer: 'shadow', sniff: 'void', burp: 'poison', sugarrush: 'neon', headbutt: 'earth', bodyslam: 'earth',
};

const FROM_STATUS: Partial<Record<StatusKey, Element>> = {
  burn: 'fire', chill: 'ice', poison: 'poison', bleed: 'blood', stun: 'storm', regen: 'nature', mark: 'void',
};

export function skillElement(def: SkillDef, e: SkillEffect): Element {
  const look = def.look;
  if (look) {
    const [shape, ink] = look.split('/');
    if (ink && ink in LOOKS) return ink as Element;
    if (SHAPE[shape]) return SHAPE[shape];
  }
  if (BASE[def.id]) return BASE[def.id];
  for (const k of Object.keys(e.apply ?? {}) as StatusKey[]) if (FROM_STATUS[k]) return FROM_STATUS[k]!;
  if (e.heal) return 'nature';
  return 'steel';
}

// Power tier from what the skill does: 1 light, 2 solid, 3 huge. Drives particle counts,
// ring size, shake and hit-stop so a big skill reads as big before the number lands.
export function skillTier(e: SkillEffect): 1 | 2 | 3 {
  const p = (e.dmg ?? 0) * (e.hits ?? 1) + (e.execute ? 1 : 0) + (e.detonate ? 1 : 0) + (e.pctHp ? 1 : 0);
  return p >= 2.4 ? 3 : p >= 1.1 ? 2 : 1;
}
