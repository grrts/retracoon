// Minimal PNG writer for previewing pixel maps outside the browser (tools only).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}

// rgba: w*h*4 bytes
// noAlpha writes an RGB file (the App Store rejects icons with an alpha channel).
export function writePng(path: string, w: number, h: number, rgba: Uint8Array | Uint8ClampedArray, noAlpha = false) {
  const bpp = noAlpha ? 3 : 4;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * bpp + 1)] = 0;
    for (let x = 0; x < w; x++) for (let c = 0; c < bpp; c++) raw[y * (w * bpp + 1) + 1 + x * bpp + c] = rgba[(y * w + x) * 4 + c];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = noAlpha ? 2 : 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// A tiny software canvas: draw pixel maps with a palette, scale up, save.
export class Sheet {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number, bg: string | null = '#2b2d42') {
    this.data = new Uint8ClampedArray(w * h * 4);
    if (bg) this.rect(0, 0, w, h, bg);
  }
  px(x: number, y: number, col: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const n = parseInt(col.slice(1), 16);
    const i = (y * this.w + x) * 4;
    this.data[i] = n >> 16;
    this.data[i + 1] = (n >> 8) & 255;
    this.data[i + 2] = n & 255;
    this.data[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, col: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
  }
  map(rows: string[], ox: number, oy: number, pal: Record<string, string>) {
    rows.forEach((r, y) => [...r].forEach((ch, x) => pal[ch] && this.px(ox + x, oy + y, pal[ch])));
  }
  save(path: string, scale = 4) {
    const w = this.w * scale;
    const h = this.h * scale;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const s = ((Math.floor(y / scale) * this.w + Math.floor(x / scale)) * 4);
        out.set(this.data.subarray(s, s + 4), (y * w + x) * 4);
      }
    writePng(path, w, h, out);
  }

  // Save at an exact pixel size with nearest-neighbour scaling, centred on a background.
  saveSized(path: string, outW: number, outH: number, bg: string | null = null, noAlpha = false) {
    const scale = Math.max(1, Math.floor(Math.min(outW / this.w, outH / this.h)));
    const ox = Math.floor((outW - this.w * scale) / 2);
    const oy = Math.floor((outH - this.h * scale) / 2);
    const out = new Uint8ClampedArray(outW * outH * 4);
    if (bg) {
      const n = parseInt(bg.slice(1), 16);
      for (let i = 0; i < outW * outH; i++) out.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4);
    }
    for (let y = 0; y < this.h * scale; y++)
      for (let x = 0; x < this.w * scale; x++) {
        const s = (Math.floor(y / scale) * this.w + Math.floor(x / scale)) * 4;
        if (this.data[s + 3] === 0) continue;
        const X = ox + x;
        const Y = oy + y;
        if (X < 0 || Y < 0 || X >= outW || Y >= outH) continue;
        out.set(this.data.subarray(s, s + 4), (Y * outW + X) * 4);
      }
    writePng(path, outW, outH, out, noAlpha && !!bg);
  }
}
