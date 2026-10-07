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
};

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
