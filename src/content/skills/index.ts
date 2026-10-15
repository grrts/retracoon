// Every skill: the 36 originals, 100 open skills, 200 stat-locked, 100 level-locked and
// 100 mastery skills (level and stat). See book.ts for how locked skills scale.
import type { SkillDef } from '../types';
import { SKILLS as BASE } from './base';
import { FREE_SKILLS } from './free';
import { STR_SKILLS, DEF_SKILLS, AGI_SKILLS, LCK_SKILLS, VIT_SKILLS } from './stats';
import { LEVEL_SKILLS, MASTERY_SKILLS } from './levels';

export const SKILLS: SkillDef[] = [...BASE, ...FREE_SKILLS, ...STR_SKILLS, ...DEF_SKILLS, ...AGI_SKILLS, ...LCK_SKILLS, ...VIT_SKILLS, ...LEVEL_SKILLS, ...MASTERY_SKILLS];
