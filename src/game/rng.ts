// Game-logic randomness. Normal runs use Math.random. A daily run uses a seeded stream
// that is reseeded at every stage boundary from (seed, area, stage, what), so everyone
// meets the same areas, foes, bosses and road stops on the same stage, whatever
// happened in the fights before. Visual effects keep using Math.random.
let cur: () => number = Math.random;

export const rand = () => cur();

export function hash(...parts: (string | number)[]) {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seed null: back to Math.random.
export function reseed(seed: number | null, ...keys: (string | number)[]) {
  cur = seed === null ? Math.random : mulberry32(hash(seed, ...keys));
}
