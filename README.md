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

Sign in is offered first (Google, Apple or Steam), or play as a guest and sign in later for the scoreboard and shop. Then a short **How to play**, which can't be skipped the first time, explains the goal: get as far as you can on a road that never ends, and know when to retreat. It can be opened again from the title screen. The one launch ad comes only after that, with a note before it.

## How a run works

- **Stages.** Every fight cleared is a stage, and difficulty grows exponentially, forever: foes get about 18% tougher per fight (half from fights cleared, half from distance walked). A fresh raccoon that doesn't retreat around the fifth fight dies soon after. Foe health and damage keep compounding, and deeper foes come in **Mean**, **Feral** and **Mythic** tiers with armor, regeneration and thorns.
- **Bosses.** Each area hides its boss at a random stage between 4 and 10, so you can never plan for it. Beating the boss moves you to a new area with a new theme.
- **Combat.** You get action points each turn and spend them on up to 4 skills. Foes show their intent above their heads. Areas add hazards (falling pots, fumes, sprinklers, quakes, spores, lightning).
- **Level-ups.** Spend 3 points across STR, DEF, AGI, LCK and VIT, then pick 1 of 3 cards (tap a card to select it, then LEARN), or SKIP. Every stat point counts in full; crit, dodge and damage cut cap at 95%. New skills are offered only while one of the 4 slots is free; after that only upgrades for your own skills. **Passive skills** (+6% damage, +8 max health, +2% crit and more) fill the rest, and once every skill is maxed every card is a passive. Passives stack forever but last one run. The **BAG** button in a run shows your gear, skills and passives in full.
- **Road stops** every two or three fights: tap one of two roads (shop, event, camp or treasure), then GO. Healing is scarce.
- **Rewards:** tap an item to try it on (the preview raccoon wears it and the card says what it replaces), then TAKE.
- **Items** show up on the raccoon. Rarer and higher-level gear glows; a full kit shines; set bonuses fly a flag.

## Retreat and death

- **Retreat** before any fight: the run ends, and your raccoon keeps its level and stats for the next run, which starts from the street again. Items, skills and shinies are lost. Retreating in time is how you get further.
- **Death:** everything is reset. The next run starts at level 1.
- Every run pays **Bottle Caps** for the skin shop either way.

## Scoreboard and friends

**SCORES** on the title screen shows the world board and a friends board, ranked by best stage. Players sign in with Google, Apple or Steam; names show as NAME#1234 so they never clash, and gems and purchases follow the account. Everyone gets a 6-letter friend code; add a friend by typing their code. Runs are sent when they end, and again later if the phone was offline. Details: [docs/ONLINE.md](docs/ONLINE.md).

## Shop, skins and the one ad

- 250 raccoon skins: fur colours, outfits and holiday skins. Bought with Bottle Caps (earned by playing) or Gems (bought).
- A new weekly sale every Monday, the same for every player.
- Holiday skins (Christmas, Halloween and more) are only sold in season, and the backgrounds dress up for the season too.
- **One ad**, at launch. No banners, no ads during runs, no ads for currency. No Ads removes it.

Details: [docs/MONETIZATION.md](docs/MONETIZATION.md).

## Phones

The `android/` and `ios/` folders are the native projects. Building, signing and store submission: [docs/PUBLISHING.md](docs/PUBLISHING.md). Store text and graphics: [docs/store-listing.md](docs/store-listing.md), `docs/store/`. Privacy policy: [docs/privacy-policy.md](docs/privacy-policy.md). Accounts and sign-in: [docs/ACCOUNTS.md](docs/ACCOUNTS.md). Store rules check: [docs/STORE-ELIGIBILITY.md](docs/STORE-ELIGIBILITY.md).

## Steam

The `steam/` folder wraps the same game in Electron with Steamworks for Windows, macOS and Linux (Steam Deck). It is a paid game there: no ads and no gem shop. `npm run steam` runs it locally. Building and uploading: [docs/STEAM.md](docs/STEAM.md).

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
