# Retracoon

An 8-bit turn-based roguelike starring a raccoon. It starts on the street between the trash cans and walks on forever: into the woods, the jungle, the swamp, the mushroom kingdom and around fifty other places, each harder than the last. Fights are turn-based, level-ups raise RPG stats and offer roguelike skill picks, and every item you find is drawn on the raccoon, so the character is the inventory.

Runs on the web, and ships to Google Play and the App Store with Capacitor.

## Play locally

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static web build in dist/
npm run build:single   # one self-contained HTML file in dist-single/
npm run sim            # balance check: bots play hundreds of runs
npm run assets:count   # how much art the game ships
```

The online scoreboard has its own server in `server/` (PHP, Symfony). See [docs/ONLINE.md](docs/ONLINE.md).

## First launch

A short **How to play** explains the goal before the first run: get as far as you can on a road that never ends, and know when to retreat. It can be opened again from the title screen.

## How a run works

- **Stages.** Every fight cleared is a stage, and difficulty grows with every stage, forever. Foe health and damage scale faster than linearly, and deeper foes come in **Mean**, **Feral** and **Mythic** tiers with armor, regeneration and thorns.
- **Bosses.** Each area hides its boss at a random stage between 2 and 20, so you can never plan for it. Beating the boss moves you to a new area with a new theme.
- **Combat.** You get action points each turn and spend them on up to 4 skills. Foes show their intent above their heads. Areas add hazards (falling pots, fumes, sprinklers, quakes, spores, lightning).
- **Level-ups.** Spend 3 points across STR, DEF, AGI, LCK and VIT, then pick 1 of 3 skills (tap a card to select it, then LEARN). Stats have diminishing returns past 10 and 20, so dumping everything into one stat stops paying off.
- **Road stops** every two or three fights: shop, event, camp or treasure. Healing is scarce.
- **Rewards:** tap an item to try it on (the preview raccoon wears it and the card says what it replaces), then TAKE.
- **Items** show up on the raccoon. Rarer and higher-level gear glows; a full kit shines; set bonuses fly a flag.

## Retreat and death

- **Retreat** before any fight: the run ends, and your raccoon keeps its level and stats for the next run, which starts from the street again. Items, skills and shinies are lost. Retreating in time is how you get further.
- **Death:** everything is reset. The next run starts at level 1.
- Every run pays **Bottle Caps** for the skin shop either way.

## Scoreboard and friends

**SCORES** on the title screen shows the world board and a friends board, ranked by best stage. Everyone gets a random name (changeable) and a 6-letter friend code; add a friend by typing their code. No account or login. Runs are sent when they end, and again later if the phone was offline. Details: [docs/ONLINE.md](docs/ONLINE.md).

## Shop, skins and the one ad

- 250 raccoon skins: fur colours, outfits and holiday skins. Bought with Bottle Caps (earned by playing) or Gems (bought).
- A new weekly sale every Monday, the same for every player.
- Holiday skins (Christmas, Halloween and more) are only sold in season, and the backgrounds dress up for the season too.
- **One ad**, at launch. No banners, no ads during runs, no ads for currency. No Ads removes it.

Details: [docs/MONETIZATION.md](docs/MONETIZATION.md).

## Phones

The `android/` and `ios/` folders are the native projects. Building, signing and store submission: [docs/PUBLISHING.md](docs/PUBLISHING.md). Store text and graphics: [docs/store-listing.md](docs/store-listing.md), `docs/store/`. Privacy policy: [docs/privacy-policy.md](docs/privacy-policy.md).

## Controls

- **Touch:** tap a skill, tap a foe to target it, tap END TURN.
- **Keyboard:** 1-4 skills, Space or Enter ends the turn, Tab or arrows switch target, P or Esc pauses.

## Code map

| | |
|---|---|
| `src/game/` | Rules with no rendering: `combat.ts` (engine, scaling, tiers), `run.ts` (stats, loot, retreat), `encounters.ts`, `views.ts` (the raccoon with its gear) |
| `src/scenes/` | Phaser screens: run, overlays, title, skin shop, launch ad |
| `src/content/` | Enemies, items, skills and events |
| `src/world/` | Themes (backgrounds), seasons, the parallax renderer |
| `src/meta/` | Skins and the economy |
| `src/platform/` | AdMob, RevenueCat, native shell, scoreboard client (`online.ts`) |
| `server/` | Scoreboard and friends API (Symfony + PostgreSQL) |
| `src/gfx/` | Pixel maps, palette, font, texture builders |
| `tools/` | Balance simulator, art previews, icon generator, asset counter |

How to add art and content: [docs/CONTENT.md](docs/CONTENT.md).

## Decisions

- **Engine:** Phaser 3 + TypeScript + Vite, wrapped with Capacitor for iOS and Android.
- **Resolution:** a 216 px tall landscape canvas, 360 to 480 px wide depending on the screen, scaled with nearest-neighbour.
- **No external assets:** every sprite, the font and all backgrounds are pixel maps or small painter functions turned into textures at runtime. Sound is synthesized with WebAudio.
- **Pure combat engine:** `src/game/combat.ts` has no Phaser code. It returns events that `RunScene` plays back, and the same engine powers the simulator.
- **Persistence:** progress, currencies and owned skins live in `localStorage` (`retracoon.v3`, migrated from v2). The game works without it.
