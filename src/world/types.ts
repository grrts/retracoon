// Themes are the places the raccoon walks through. Each is a stack of parallax layers
// painted once into canvases when the theme is entered.
import type { AreaHazard } from '../content/types';

// Paints one layer. `w` is the tile width (the layer repeats horizontally), `h` the
// full screen height. Paint on a transparent canvas; only the sky layer is opaque.
// `rnd` is a seeded random in [0, 1) so a theme looks the same every time.
export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void;

export interface LayerDef {
  paint: Painter;
  speed: number; // 0 = fixed to the screen, 1 = moves with the ground, >1 = foreground
  tile?: number; // tile width in pixels (default 512)
  alpha?: number;
}

export type WeatherKind = 'rain' | 'snow' | 'leaves' | 'fireflies' | 'spores' | 'embers' | 'bubbles' | 'dust' | 'stars' | 'petals' | 'sparks' | 'ash';

export interface WeatherDef {
  kind: WeatherKind;
  density: number; // particles on screen at once, roughly 10..80
  colors: string[]; // palette hex colours
}

export interface ThemeDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  sky: string[]; // gradient stops, top to bottom (2 to 4 hex colours)
  // Back to front, drawn behind the actors. Speeds should increase front to back,
  // typically: celestial 0.02, clouds 0.05, far 0.12, mid 0.3, near 0.55, props 0.8.
  layers: LayerDef[];
  ground: Painter; // painted into a strip GROUND_H tall that scrolls at speed 1
  front?: LayerDef; // sparse silhouettes in front of the actors (speed ~1.35)
  weather?: WeatherDef;
  light?: number; // multiply tint for actors (0xffffff = none), e.g. 0xc0c8ff at night
  families: string[]; // enemy families that live here
  boss: string; // boss enemy id
  hazard?: AreaHazard;
  events?: string[]; // event ids that only happen here
}

// A holiday overlay that dresses up whichever theme you are in during its dates.
export interface SeasonDef {
  id: string;
  name: string;
  from: [number, number]; // [month 1-12, day]
  to: [number, number]; // inclusive; may wrap the new year
  props?: LayerDef; // extra layer of decorations drawn just behind the actors
  front?: LayerDef; // extra decorations in front
  weather?: WeatherDef; // replaces the theme's weather
  skyTint?: string; // colour mixed into the sky gradient (hex)
  banner: string; // shown when a run starts during the season
}
