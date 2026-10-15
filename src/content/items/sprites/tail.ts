// Tail gear for forged items: bands, charms, tips and whole new tails. The tail runs
// up the raccoon's back half (x1-9, y5-13). See shape.ts for the colour channels.
import { piece, type Shape } from './shape';

const at = (x: number, y: number, rows: string[], behind = false): Shape => piece('tail', x, y, rows, behind);

export const TAIL: Record<string, Shape> = {
  band: at(-4, 0, ['kkkkkkkk', 'k1111112k', 'k5555556k', 'kkkkkkkk']),
  double_band: at(-4, -3, ['kkkkkkk', 'k55556k', 'kkkkkkk', '.......', 'kkkkkkkk', 'k555556k', 'kkkkkkkk']),
  bow: at(-5, -1, ['kk...kk', 'k1k.k1k', 'k12k21k', 'k1k5k1k', 'kk.k.kk']),
  bell: at(-3, 2, ['.kkk.', 'k112k', 'k122k', 'k1223k', 'kkkkk', '..k..']),
  flame_tip: at(-4, -7, ['...k....', '..k5k...', '.k565k.k', 'k56w65k5', 'k5ww6655', '.k5ww6k.', '..kkkk..']),
  ice_tip: at(-4, -6, ['...kk...', '..k1wk..', '.k1w21k.', 'k12w221k', 'k122223k', '.kkkkkk.']),
  crystal_tip: at(-3, -7, ['..k...', '.k1k..', 'k1w5k.', 'k155k.', 'k156k.', '.k6k..', '..k...']),
  chain: at(-2, 1, ['.kk....', 'k..k...', '.kk.kk.', '...k..k', '....kk.', '...kk..', '..k5k..', '..kkk..']),
  ball_chain: at(-6, 2, ['.....k.', '....k..', '...k...', '.kkk...', 'k112k..', 'k122k..', 'k233k..', '.kkk...']),
  charm: at(-2, 3, ['.k.', '.k.', 'k5k', 'k6k', '.k.']),
  spike_ring: at(-6, 0, ['..kwk.kwk..', 'kwk11111k2k', '..k22222k..', '..kwk.kwk..']),
  feather: at(-5, -9, ['....kk', '...k5k', '..k55k', '.k556k', 'k566k.', 'k6kk..', 'kk....']),
  sock: at(-5, -4, ['.kkkkk.', 'k11111k', 'k55555k', 'k11111k', 'k55555k', 'k11111k', '.kkkkk.']),
  pompom: at(-4, -7, ['..kkk..', '.k151k.', 'k15151k', 'k51515k', '.k515k.', '..kkk..']),
  tassel: at(-2, 2, ['kkk', 'k5k', 'kkk', 'k1k', '121', '1.2', '2.1']),
  streamers: at(-12, -8, ['k........', '5k.......', '.5k......', '..6k.....', '.5..k....', '6....k...', '.5...k...', '..6..k...']),
  cans: at(-14, 4, ['.kkk....kkk...', 'k112k..k112k..', 'k122kkkk122kkk', 'k122k..k122k..', '.kkk....kkk...']),
  balloon: at(-6, -18, ['.kkk..', 'k15wk.', 'k155k.', 'k556k.', '.kkk..', '..k...', '...k..', '..k...', '...k..']),
  tag: at(-3, 3, ['.k...', 'kkkkk', 'k155k', 'k156k', 'kkkkk']),
  glowstick: at(-3, -1, ['..kk.', '.k5k.', '.k5k.', 'k5wk.', 'k56k.', 'kkk..']),
  fur_cover: at(-4, -4, ['..kkkk...', '.k1111k..', 'k112221k.', 'k155551k.', 'k122221k.', 'k155551k.', 'k122221k.', 'k155551k.', 'k122221k.', '.kkkkkk..']),
  scaled_tail: at(-4, -4, ['..kkkk...', '.k1212k..', 'k21212k..', 'k12121k..', 'k21212k..', 'k12121k..', 'k21212k..', '.k5656k..', '..kkkk...']),
  fin: at(-8, -8, ['kk.....', 'k1k....', 'k12k...', 'k122k..', 'k1223k.', '.kkkkk.']),
  stinger: at(-5, -9, ['.....k', '....k5', '...k56', '..k1k.', '.k12k.', 'k12k..', 'kkk...']),
  rattle: at(-3, -6, ['.kkk.', 'k515k', 'k151k', 'k515k', 'k151k', '.kkk.']),
  vine: at(-5, -4, ['.k.....', 'k5k....', '.kk..k.', '..k.k5k', '..kk.k.', '.k.....', 'k5k....', '.kk....', '...k...']),
  flower: at(-5, -9, ['.k.k.', 'k5k5k', '.k6k.', 'k5k5k', '.k1k.', '..k1k', '...k.']),
  anchor: at(-3, 3, ['..k..', '.k1k.', '..k..', 'k.k.k', 'k1k1k', '.kkk.']),
  comet: at(-15, -11, ['k5k..........', '.kk5kk.......', '...kk55kk....', '.....kk556k..', '.......kk56k.', '.........kkk.'], true),
  clover: at(-6, -9, ['.kk.kk.', 'k55k55k', '.k5k5k.', 'k55k55k', '.kk1kk.', '...k1k.', '....kk.']),
  ring: at(-3, 4, ['.kkk.', 'k5.5k', 'k5.5k', '.k6k.']),
  lantern: at(-3, 2, ['..k..', '.kkk.', 'k151k', 'k151k', '.kkk.']),
  spade: at(-6, -10, ['...k...', '..k1k..', '.k112k.', 'k11222k', 'k12k23k', '.kk.kk.', '..k5k..', '..kkk..']),
};
