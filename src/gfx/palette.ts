// Sweetie 16 palette plus a few browns and a pink for critters.
export const PAL: Record<string, string> = {
  k: '#1a1c2c', // near-black
  p: '#5d275d', // plum
  r: '#b13e53', // red
  o: '#ef7d57', // orange
  y: '#ffcd75', // yellow
  L: '#a7f070', // lime
  G: '#38b764', // green
  D: '#257179', // teal
  B: '#29366f', // navy
  b: '#3b5dc9', // blue
  c: '#41a6f6', // sky
  C: '#73eff7', // ice
  w: '#f4f4f4', // white
  l: '#94b0c2', // light grey
  g: '#566c86', // grey
  d: '#333c57', // dark grey
  n: '#8f563b', // brown
  N: '#5c3a2e', // dark brown
  P: '#f5a5b8', // pink
  a: '#434b68', // asphalt
  v: '#b05ccf', // violet
  O: '#ffa300', // gold
  e: '#7a4a8f', // dark violet
  // extended palette for the wider world
  H: '#0e0f1a', // night
  u: '#3b1f5c', // deep purple
  M: '#c0398e', // magenta
  h: '#ff77c8', // hot pink
  R: '#6e1f2e', // dark red
  q: '#ff4b1f', // lava
  Y: '#fff3b0', // pale yellow
  Q: '#fff6e0', // cream
  s: '#e8c170', // sand
  S: '#b88a4a', // dark sand
  T: '#d6a77a', // tan
  U: '#7a4a33', // brick
  E: '#16382c', // deep forest
  F: '#2d6a3e', // forest
  z: '#6a8f3a', // moss
  m: '#9be2b0', // mint
  t: '#5fd3c9', // teal light
  i: '#c7f2ff', // frost
  A: '#1e6fbf', // ocean
  I: '#24305e', // indigo
  j: '#4d3b24', // mud
  J: '#86745a', // driftwood
};

// Names for the palette keys, for painters that prefer words.
export const C = PAL;

export const hex = (key: string): number => parseInt(PAL[key].slice(1), 16);

export const COL = {
  black: hex('k'),
  white: hex('w'),
  red: hex('r'),
  orange: hex('o'),
  yellow: hex('y'),
  lime: hex('L'),
  green: hex('G'),
  sky: hex('c'),
  ice: hex('C'),
  grey: hex('g'),
  light: hex('l'),
  dark: hex('d'),
  navy: hex('B'),
  plum: hex('p'),
  pink: hex('P'),
};
