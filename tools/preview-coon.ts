// Renders every raccoon pose side by side: npx tsx tools/preview-coon.ts out.png
import { Sheet } from './png';
import { POSES, buildPose, DEFAULT_FUR, COON_W, COON_H } from '../src/gfx/coon';
import { PAL } from '../src/gfx/palette';
const pal: Record<string, string> = { ...PAL, ...DEFAULT_FUR };
const s = new Sheet((COON_W + 4) * POSES.length + 4, COON_H + 8);
POSES.forEach((p, i) => s.map(buildPose(p), 4 + i * (COON_W + 4), 4, pal));
s.save(process.argv[2] ?? 'coon.png', 6);
