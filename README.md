# Retracoon

An 8-bit turn-based roguelike starring a raccoon. The raccoon walks a side-scrolling street, meets critters, and fights them in turn-based battles. Each fight earns XP and loot. Every level-up raises RPG stats and offers a roguelike skill pick. Whatever the raccoon picks up is drawn on it, so the character is the inventory.

## Play locally

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # static build in dist/
npm run build:single  # one self-contained HTML file in dist-single/
npx tsx tools/sim.ts 400  # headless balance check: a bot plays 400 runs
```

## How a run works

- The road is a series of legs: fight, fight, fork, fight, fight, fork, boss. Beating the boss moves on to the next area (Back Alley, City Park, Sewers, then they loop and get harder).
- **Combat:** you get action points each turn and spend them on up to 4 skills. Claw is always yours. Foes show their intent (attack, block, buff, summon and more) above their heads, so you can plan around it. Each area adds a hazard that hits every few turns.
- **Level-ups:** spend 3 points across STR, DEF, AGI, LCK and VIT, then pick 1 of 3 skills. A skill you already own gets stronger instead.
- **Items:** Common to Legendary. Higher rarity adds new mechanics, not just bigger numbers. Each item fills a slot (head, face, body, back, paw, tail, aura) and shows up on the raccoon. A duplicate levels the item up. Two or four items of one build (speed, tank, scavenger, crit, trash) unlock set bonuses.
- **Forks** offer two of: shop, event, camp, chest.
- **Elites** have a random modifier (tough, brutal, spiky, armored, swift) and drop better loot.

## Retreat and death

- A run ends only when you die or retreat. You can retreat from the prompt before any fight.
- **Retreat:** the next run starts at the level and stats you had. Skills, items and shinies are lost.
- **Death:** everything is lost, including stats banked by an earlier retreat. This is the current default; flip it in `RunScene.finish()` if dying should keep banked stats.

## Controls

- **Touch:** tap a skill, tap a foe to target it and see its intent, tap END TURN. Landscape is preferred; portrait shows a hint to rotate.
- **Keyboard:** 1-4 to use skills, Space or Enter to end the turn, Tab or arrows to switch target, P or Esc to pause.

## Content packs

All content is registered through `registerPack()` in `src/content/registry.ts`. A pack can add enemies, encounters (including combos), elites, items, skills, events and whole areas (biome art, encounters, boss, hazard). `src/content/core.ts` is the base pack; `src/content/areas.ts` holds one pack per area. To add a pack, write a `PackDef` and register it in `src/content/index.ts`.

## Ads

At most one ad, shown at startup, and never during a run. There is no ad SDK yet: `src/ads.ts` has `startupAd()` as a no-op hook and `ADS_ENABLED = false`.

## Decisions

- **Engine:** Phaser 3 + TypeScript + Vite. It is small and fast to iterate on, and it wraps cleanly with Capacitor for iOS and Android later.
- **Resolution:** a 180 px tall landscape canvas whose width is 300 to 400 px depending on the screen, scaled with nearest-neighbour.
- **No external assets:** every sprite, the font and all backgrounds are pixel maps in `src/gfx/` turned into textures at boot. All sound is synthesized with WebAudio (`src/audio.ts`).
- **Pure combat engine:** `src/game/combat.ts` has no Phaser code. It returns a list of events that `RunScene` plays back as animations. The same engine powers the balance simulator.
- **Persistence:** best distance, items seen, banked stats and settings live in `localStorage` (`retracoon.v2`), and the game works without it.
