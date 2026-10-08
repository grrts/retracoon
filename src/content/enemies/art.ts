// Helpers for enemy pixel art. Maps are authored without their outer outline: `sprite`
// pads ragged rows, then wraps the silhouette in a 1 px 'k' outline (4-neighbour, so
// corners stay round). Interior lines (eyes, mouths, seams) are drawn by hand with 'k'.

const isClear = (ch: string | undefined) => ch === undefined || ch === '.' || ch === ' ';

// Pads every row to the same width and adds the outline (output is 2 px wider and taller).
export function sprite(rows: string[], bare = 'k'): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  const g = rows.map((r) => r.replace(/ /g, '.').padEnd(w, '.'));
  const at = (x: number, y: number) => (y < 0 || y >= g.length ? undefined : g[y][x]);
  // only coloured pixels get an outline; 'k' lines (whiskers, legs) and any other keys in
  // `bare` (thin tentacles, sparks) are left without one
  const solid = (x: number, y: number) => {
    const ch = at(x, y);
    return !isClear(ch) && !bare.includes(ch!);
  };
  const out: string[] = [];
  for (let y = -1; y <= g.length; y++) {
    let row = '';
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      if (!isClear(ch)) row += ch;
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) row += 'k';
      else row += '.';
    }
    out.push(row);
  }
  return out;
}

// A copy of `rows` with some rows replaced: { rowIndex: 'new row' }.
export function patch(rows: string[], rep: Record<number, string>): string[] {
  return rows.map((r, i) => rep[i] ?? r);
}

// Two outlined idle frames of the same size: the base and a patched copy.
export function frames(base: string[], rep: Record<number, string>, bare = 'k'): string[][] {
  const a = patch(base, {});
  const b = patch(base, rep);
  const w = Math.max(...a.concat(b).map((r) => r.length));
  return [sprite(a.map((r) => r.padEnd(w, '.')), bare), sprite(b.map((r) => r.padEnd(w, '.')), bare)];
}

// Two outlined frames from two full maps (padded to a common size).
export function frames2(a: string[], b: string[], bare = 'k'): string[][] {
  const w = Math.max(...a.concat(b).map((r) => r.length));
  const h = Math.max(a.length, b.length);
  const pad = (m: string[]) => [...Array(h - m.length).fill(''), ...m].map((r) => r.padEnd(w, '.'));
  return [sprite(pad(a), bare), sprite(pad(b), bare)];
}

// Swap palette keys, e.g. for a boss's enraged frames: recolor(f, { b: 'r', c: 'o' }).
export function recolor(fr: string[][], map: Record<string, string>): string[][] {
  return fr.map((rows) => rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join('')));
}

// Mirror a map left-to-right (for art drawn facing right).
export const mirror = (rows: string[]): string[] => rows.map((r) => [...r].reverse().join(''));
