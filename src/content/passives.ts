// Passive skills: small, always-on buffs that stack without limit. Offered at level-up
// once the skill bar has nothing left to learn or upgrade, so late levels still matter.
// They last for the run only, like skills and items.
import type { Bonus, Fx } from './types';

export interface PassiveDef {
  id: string;
  name: string;
  desc: (n: number) => string; // what n stacks do in total
  each: string; // what one more stack adds
  icon: string[]; // 9x9, 'k' outline
  color: number;
  bonus?: (b: Bonus, n: number) => void;
  fx?: (n: number) => Fx;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const PASSIVES: PassiveDef[] = [
  {
    id: 'brawn',
    name: 'BRAWN',
    desc: (n) => `+${pct(0.06 * n)} DAMAGE`,
    each: '+6% DAMAGE',
    color: 0xef7d57,
    icon: ['..kkkk...', '.koooOk..', '.koOOOk..', 'kkoooOkk.', 'koookOOk.', 'koooooOk.', '.koooook.', '..kkkkk..', '.........'],
    bonus: (b, n) => (b.dmg += 0.06 * n),
  },
  {
    id: 'fur',
    name: 'THICK FUR',
    desc: (n) => `+${8 * n} MAX HEALTH`,
    each: '+8 MAX HEALTH',
    color: 0x38b764,
    icon: ['.kk.kk...', 'krrkrrk..', 'krwrrrk..', 'krrrrrk..', '.krrrk.k.', '..krk.kGk', '...k.kGGG', '.....kkGk', '.......k.'],
    bonus: (b, n) => (b.hp += 8 * n),
  },
  {
    id: 'eye',
    name: 'SHARP EYE',
    desc: (n) => `+${pct(0.02 * n)} CRIT CHANCE`,
    each: '+2% CRIT CHANCE',
    color: 0xffcd75,
    icon: ['.........', '..kkkkk..', '.kwwwwwk.', 'kwwkykwwk', 'kwkyOykwk', 'kwwkykwwk', '.kwwwwwk.', '..kkkkk..', '.........'],
    bonus: (b, n) => (b.crit += 0.02 * n),
  },
  {
    id: 'feet',
    name: 'LIGHT FEET',
    desc: (n) => `+${pct(0.02 * n)} DODGE`,
    each: '+2% DODGE',
    color: 0x73eff7,
    icon: ['.....kk..', '....kCCk.', '...kCCk..', '..kCCk...', '.kCCCCk..', 'kCCwCk...', 'kCCCk....', '.kkk.....', '.........'],
    bonus: (b, n) => (b.dodge += 0.02 * n),
  },
  {
    id: 'hide',
    name: 'TOUGH HIDE',
    desc: (n) => `TAKE ${pct(1 - Math.pow(0.97, n))} LESS DAMAGE`,
    each: 'TAKE 3% LESS DAMAGE',
    color: 0x94b0c2,
    icon: ['.kkkkkkk.', 'kllllllgk', 'kllwlllgk', 'klllllldk', 'klllllldk', '.klllldk.', '..kllgk..', '...kdk...', '....k....'],
    bonus: (b, n) => (b.armor = 1 - (1 - b.armor) * Math.pow(0.97, n)),
  },
  {
    id: 'scrap',
    name: 'SCRAP SHIELD',
    desc: (n) => `+${2 * n} BLOCK EVERY TURN`,
    each: '+2 BLOCK EVERY TURN',
    color: 0x41a6f6,
    icon: ['.kkkkkkk.', 'kbbbbbbck', 'kbcbbbbck', 'kbbbbbbck', 'kbbbbcbck', '.kbbbbck.', '..kbbck..', '...kck...', '....k....'],
    fx: (n) => ({ startBlock: 2 * n }),
  },
  {
    id: 'prickly',
    name: 'PRICKLY',
    desc: (n) => `ATTACKERS TAKE ${2 * n}`,
    each: 'ATTACKERS TAKE +2',
    color: 0xa7f070,
    icon: ['k...k...k', '.k..k..k.', '..kLLLk..', 'kkLLGLLkk', '..LGLGL..', 'kkLLGLLkk', '..kLLLk..', '.k..k..k.', 'k...k...k'],
    fx: (n) => ({ thorns: 2 * n }),
  },
  {
    id: 'wind',
    name: 'SECOND WIND',
    desc: (n) => `HEAL ${n} EVERY TURN`,
    each: 'HEAL +1 EVERY TURN',
    color: 0xf5a5b8,
    icon: ['....k....', '...kPk...', '..kPPPk..', '.kPPwPPk.', 'kPPPwPPPk', '.kkwwwkk.', '..kPwPk..', '..kPPPk..', '...kkk...'],
    fx: (n) => ({ regen: n }),
  },
  {
    id: 'feast',
    name: 'FEAST',
    desc: (n) => `HEAL ${4 * n} ON EVERY KILL`,
    each: 'HEAL +4 ON KILL',
    color: 0xb13e53,
    icon: ['...kkk...', '..kyyyk..', '.kyoyoyk.', 'kyyyyyyyk', 'kkkkkkkkk', 'kGLGLGLGk', 'knnnnnnnk', '.knnnnnk.', '..kkkkk..'],
    fx: (n) => ({ killHeal: 4 * n }),
  },
  {
    id: 'greed',
    name: 'GREED',
    desc: (n) => `+${pct(0.08 * n)} SHINIES`,
    each: '+8% SHINIES',
    color: 0xffa300,
    icon: ['..kkkkk..', '.kOOOOOk.', 'kOyyyyyOk', 'kOykkkyOk', 'kOykOOyOk', 'kOykkkyOk', 'kOyyyyyOk', '.kOOOOOk.', '..kkkkk..'],
    bonus: (b, n) => (b.shinyMult += 0.08 * n),
  },
  {
    id: 'brutal',
    name: 'BRUTAL CRITS',
    desc: (n) => `CRITS DEAL +${pct(0.1 * n)}`,
    each: 'CRITS DEAL +10%',
    color: 0xb05ccf,
    icon: ['k.......k', '.kv...vk.', '..kvwvk..', '..vwwwv..', '..kvwvk..', '.kv...vk.', 'k.......k', '.........', '.........'],
    bonus: (b, n) => (b.critMult += 0.1 * n),
  },
];

export const passives = new Map(PASSIVES.map((p) => [p.id, p]));
