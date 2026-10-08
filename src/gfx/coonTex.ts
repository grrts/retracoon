// Builds the raccoon's textures for a skin: six poses with fur recoloured and the
// skin's pattern painted over the fur.
import Phaser from 'phaser';
import { POSES, Pose, buildPose, DEFAULT_FUR, COON_BASE, COON_W } from './coon';
import { PAL } from './palette';
import { mapTexture, outlineMap } from './pixels';
import { skins } from '../content/registry';
import type { SkinDef } from '../meta/types';

const FUR = new Set(['1', '2', '3', '4', 'p']);

// Pixel map for a pose with the skin's pattern: the pattern is painted onto the base
// pose (only over fur), then every pose is derived from that, so it moves with the body.
export function skinnedPose(p: Pose, skin?: SkinDef): string[] {
  if (!skin?.pattern) return buildPose(p);
  const base = COON_BASE.map((r, y) =>
    [...r.padEnd(COON_W, '.')]
      .map((c, x) => {
        const pc = skin.pattern![y]?.[x];
        return pc && pc !== '.' && pc !== ' ' && FUR.has(c) && c !== 'p' ? pc : c;
      })
      .join(''),
  );
  return buildPose(p, base);
}

export function skinPalette(skin?: SkinDef): Record<string, string> {
  const fur = skin?.fur ?? DEFAULT_FUR;
  return { ...PAL, '1': fur['1'], '2': fur['2'], '3': fur['3'], '4': fur['4'], p: fur.p ?? DEFAULT_FUR.p };
}

export function coonKey(skinId: string, pose: Pose) {
  return `coon_${skinId}_${pose}`;
}

export function ensureCoon(scene: Phaser.Scene, skinId: string) {
  const skin = skins.get(skinId) ?? skins.get('classic');
  const id = skin?.id ?? 'classic';
  if (scene.textures.exists(coonKey(id, 'idle0'))) return id;
  const pal = skinPalette(skin);
  for (const p of POSES) mapTexture(scene, coonKey(id, p), skinnedPose(p, skin), pal);
  mapTexture(scene, `coon_${id}_glow`, outlineMap(buildPose('idle0')));
  skin?.outfit?.forEach((g, i) => {
    mapTexture(scene, `outfit_${id}_${i}`, g.rows);
    if (g.alt) mapTexture(scene, `outfit_${id}_${i}_alt`, g.alt);
  });
  return id;
}
