// Draws a theme as scrolling layers: far layers crawl, near layers rush past, a sparse
// foreground passes in front of the fighters, and weather drifts over everything.
import Phaser from 'phaser';
import { W, H, GROUND_Y } from '../config';
import { canvasTexture } from '../gfx/pixels';
import { rng } from '../gfx/textures';
import { activeSeason } from './calendar';
import type { LayerDef, SeasonDef, ThemeDef, WeatherDef } from './types';
import { PAL } from '../gfx/palette';

const TILE = 512;
export const GROUND_H = H - GROUND_Y;

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

// Banded sky gradient: chunky steps instead of a smooth blend, for the 8-bit look.
function paintSky(ctx: CanvasRenderingContext2D, stops: string[], h: number, tint?: string) {
  const bands = 18;
  const bh = Math.ceil(h / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    let col = mix(stops[seg], stops[seg + 1], lt);
    if (tint) {
      const rgb = col.match(/\d+/g)!.map(Number);
      const tt = hexToRgb(tint);
      col = `rgb(${rgb.map((v, k) => Math.round(v * 0.75 + tt[k] * 0.25)).join(',')})`;
    }
    ctx.fillStyle = col;
    ctx.fillRect(0, i * bh, 4, bh);
  }
}

interface Live {
  sprite: Phaser.GameObjects.TileSprite;
  speed: number;
}

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  phase: number;
}

export class Parallax {
  theme!: ThemeDef;
  season: SeasonDef | null;
  private live: Live[] = [];
  private keys: string[] = [];
  private particles: Particle[] = [];
  private weather?: WeatherDef;
  scroll = 0;
  private t = 0;

  constructor(private scene: Phaser.Scene, theme: ThemeDef, private depthBack = -20, private depthFront = 40) {
    this.season = activeSeason();
    this.setTheme(theme);
  }

  setTheme(theme: ThemeDef) {
    this.destroyLayers();
    this.theme = theme;
    const id = theme.id;
    const s = this.season;
    const seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const sky = canvasTexture(this.scene, `th_${id}_sky${s?.skyTint ? '_' + s.id : ''}`, 4, H, (ctx) => paintSky(ctx, theme.sky, H, s?.skyTint));
    this.keys.push(sky);
    this.addLayer(sky, 0, this.depthBack, W, H, 0);
    const make = (name: string, def: LayerDef, i: number, depth: number) => {
      const tile = def.tile ?? TILE;
      const key = canvasTexture(this.scene, `th_${id}_${name}`, tile, H, (ctx) => {
        ctx.imageSmoothingEnabled = false;
        def.paint(ctx, tile, H, rng(seed + i * 101));
      });
      this.keys.push(key);
      const ts = this.addLayer(key, def.speed, depth, W, H, 0);
      if (def.alpha !== undefined) ts.setAlpha(def.alpha);
    };
    theme.layers.forEach((l, i) => make(`L${i}`, l, i, this.depthBack + 1 + i));
    if (s?.props) make(`S_${s.id}`, s.props, 50, this.depthBack + 15);
    const gkey = canvasTexture(this.scene, `th_${id}_ground`, TILE, GROUND_H + 2, (ctx) => {
      ctx.imageSmoothingEnabled = false;
      theme.ground(ctx, TILE, GROUND_H + 2, rng(seed + 999));
    });
    this.keys.push(gkey);
    this.addLayer(gkey, 1, this.depthBack + 16, W, GROUND_H + 2, GROUND_Y - 2);
    if (theme.front) make('front', theme.front, 77, this.depthFront);
    if (s?.front) make(`SF_${s.id}`, s.front, 88, this.depthFront + 1);
    this.setWeather(s?.weather ?? theme.weather);
    this.update(0, false);
  }

  private addLayer(key: string, speed: number, depth: number, w: number, h: number, y: number) {
    const ts = this.scene.add.tileSprite(0, y, w, h, key).setOrigin(0).setDepth(depth);
    this.live.push({ sprite: ts, speed });
    return ts;
  }

  private destroyLayers() {
    this.live.forEach((l) => l.sprite.destroy());
    this.live = [];
    // Free the old theme's canvases; themes are rebuilt when revisited.
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.keys = [];
    this.particles.forEach((p) => p.img.destroy());
    this.particles = [];
  }

  destroy() {
    this.destroyLayers();
  }

  private setWeather(w?: WeatherDef) {
    this.weather = w;
    if (!w) return;
    const n = Math.min(90, Math.round(w.density * (W / 400)));
    for (let i = 0; i < n; i++) this.particles.push(this.spawn(w, true));
  }

  private spawn(w: WeatherDef, anywhere: boolean): Particle {
    const k = w.kind;
    const key =
      k === 'snow' || k === 'ash'
        ? 'pt_flake'
        : k === 'rain'
          ? 'pt_drop'
          : k === 'leaves' || k === 'petals'
            ? 'pt_leaf'
            : k === 'bubbles'
              ? 'pt_bubble'
              : k === 'stars' || k === 'sparks'
                ? 'pt_star'
                : 'px1';
    const col = w.colors[Math.floor(Math.random() * w.colors.length)] ?? '#ffffff';
    const img = this.scene.add.image(Math.random() * W, anywhere ? Math.random() * H : -6, key).setTint(parseInt((PAL[col] ?? col).slice(1), 16)).setDepth(this.depthFront + 5);
    const p: Particle = { img, vx: 0, vy: 0, phase: Math.random() * 6.28 };
    if (k === 'rain') (p.vx = -20), (p.vy = 160 + Math.random() * 40), img.setAlpha(0.7);
    else if (k === 'snow') (p.vx = -6), (p.vy = 12 + Math.random() * 14), img.setAlpha(0.9);
    else if (k === 'ash') (p.vx = -4), (p.vy = 8 + Math.random() * 6), img.setAlpha(0.6);
    else if (k === 'leaves' || k === 'petals') (p.vx = -14), (p.vy = 14 + Math.random() * 10);
    else if (k === 'fireflies') (p.vx = 0), (p.vy = 0), img.setAlpha(0.9), img.setScale(1);
    else if (k === 'spores' || k === 'dust') (p.vx = -3), (p.vy = -3 - Math.random() * 4), img.setAlpha(0.7);
    else if (k === 'embers' || k === 'sparks') (p.vx = -4), (p.vy = -18 - Math.random() * 14);
    else if (k === 'bubbles') (p.vx = 0), (p.vy = -12 - Math.random() * 10), img.setAlpha(0.7);
    else if (k === 'stars') (p.vx = 0), (p.vy = 0), img.setAlpha(0.5), img.setDepth(this.depthBack + 0.5);
    if (!anywhere && (p.vy < 0)) img.y = H + 6;
    return p;
  }

  // dx: how far the ground moved this frame (0 while standing still).
  update(dt: number, walking: boolean, dx = 0) {
    this.t += dt;
    this.scroll += dx;
    for (const l of this.live) l.sprite.tilePositionX = Math.round(this.scroll * l.speed);
    const w = this.weather;
    if (!w) return;
    for (const p of this.particles) {
      const im = p.img;
      if (w.kind === 'fireflies') {
        im.x += Math.cos(this.t * 1.3 + p.phase) * 8 * dt - (walking ? dx * 0.6 : 0);
        im.y += Math.sin(this.t * 1.7 + p.phase) * 6 * dt;
        im.setAlpha(0.4 + 0.5 * Math.abs(Math.sin(this.t * 2 + p.phase)));
      } else if (w.kind === 'stars') {
        im.setAlpha(0.3 + 0.4 * Math.abs(Math.sin(this.t + p.phase)));
        im.x -= dx * 0.02;
      } else {
        const sway = w.kind === 'leaves' || w.kind === 'petals' || w.kind === 'snow' ? Math.sin(this.t * 2 + p.phase) * 10 : 0;
        im.x += (p.vx + sway) * dt - dx * 0.9;
        im.y += p.vy * dt;
      }
      if (im.x < -8) im.x += W + 16;
      if (im.x > W + 8) im.x -= W + 16;
      if (im.y > H + 8) {
        im.y = -6;
        im.x = Math.random() * W;
      }
      if (im.y < -8) {
        im.y = H + 6;
        im.x = Math.random() * W;
      }
      if (w.kind === 'stars' && im.y > GROUND_Y - 20) im.y = Math.random() * (GROUND_Y - 40);
    }
  }
}
