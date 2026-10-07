# Retracoon

An 8-bit endless roguelike scroller starring a raccoon. Run, throw trash at critters, pick rewards, get stronger, face harder threats, die, go again. There is no ending: the goal is to get further than last time.

## Play locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
npm run build:single  # one self-contained HTML file in dist-single/
```

## Controls

- **Touch:** drag anywhere to move (relative drag, your thumb never covers the raccoon). Tap the dash button, or double-tap anywhere, to dash.
- **Keyboard:** arrows/WASD to move, Space/Shift to dash, P/Esc to pause.
- Throwing is automatic.

## Decisions

- **Engine:** Phaser 3 + TypeScript + Vite. Small, fast to iterate, and wraps cleanly with Capacitor for iOS/Android later.
- **Resolution:** 180 px wide portrait canvas, height stretches between 320 and 390 px to fill tall phones, scaled with nearest-neighbour.
- **No external assets:** every sprite, the font and all backgrounds are pixel maps in `src/gfx/art.ts` turned into textures at boot. All sound is synthesized with WebAudio (`src/audio.ts`).
- **Collision:** simple manual AABB checks instead of a physics engine, which keeps hitstop/slow-mo trivial and the code small.
- **Persistence:** best distance and settings in `localStorage` (fails gracefully when unavailable).
