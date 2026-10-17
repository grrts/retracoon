# Steam

Retracoon on Steam is the same game in an [Electron](https://www.electronjs.org/) window, with [steamworks.js](https://github.com/ceifa/steamworks.js) for sign-in and the Steam overlay. It runs on Windows, macOS and Linux (so Steam Deck too).

**On Steam it is a paid game:** no ads (Valve doesn't allow ad-based games), no gem shop (Steam requires its own wallet for in-game purchases), and skins that cost gems on phones cost Bottle Caps instead (10 caps per gem). Players sign in automatically with their Steam account.

## Run it locally

```bash
npm ci
npm --prefix steam ci
npm run steam          # builds the game into steam/game and opens it
```

Without Steam running, the game opens but sign-in fails (when the build has an API address). For testing with Steam, start Steam first; until you have your own App ID the wrapper uses Valve's test app 480.

Keys: **F11** or **Alt+Enter** toggles fullscreen. The title screen has SETTINGS (full screen or windowed, window size, volume, key and controller bindings) and a QUIT button.

## Build for upload

```bash
VITE_API_URL=https://api.retracoon.com npm run build:steam
cd steam
npm run dist:win     # out/win-unpacked
npm run dist:mac     # out/mac*/Retracoon.app
npm run dist:linux   # out/linux-unpacked
```

Each OS is best built on that OS; the **Steam** GitHub workflow does all three and keeps them as artifacts.

## Steamworks setup

1. Pay the Steam Direct fee and create the app. Note the **App ID**.
2. Put the App ID in `steam/package.json` as `"steamAppId": 1234560` (or set `STEAM_APP_ID` when launching), and in the server's `STEAM_APP_ID`.
3. Create the publisher Web API key for sign-in ([ACCOUNTS.md](ACCOUNTS.md#steam)).
4. **Depots:** one per OS. Launch options:
   - Windows: `Retracoon.exe`
   - macOS: `Retracoon.app` (inside the `mac*` folder the build makes)
   - Linux: `Retracoon`
5. Store page: price, screenshots (`docs/store/` has art to start from), a link to the privacy policy, and the **Content Survey** (including the AI content disclosure, see [STORE-ELIGIBILITY.md](STORE-ELIGIBILITY.md#steam)).

## Steamworks features

All of these are free: they come with the Steam Direct fee you already pay.

| Feature | State | What you do in Steamworks |
|---|---|---|
| Achievements (30) and stats | **In the game.** Earned on every platform and kept in the save; the Steam app unlocks them. | Enter the stats and achievements below, upload the icons, publish. |
| Rich presence | **In the game.** Friends see "Stage 12 in Gloomy Swamp" or "Daily run, stage 8 in Neon City". | Upload `steam/richpresence.vdf` (Stats & Achievements > Rich Presence Localization). |
| Steam Cloud | **In the game.** The save follows the player between a PC and a Steam Deck; the newest copy wins. | Steam Cloud settings: byte quota 1 MB, 4 files. No Auto-Cloud paths needed (the game uses the Cloud API). |
| Steam Deck keyboard | **In the game.** Name and friend code boxes open Steam's floating keyboard on a Deck. | Nothing. |
| Controller and Deck | Already in the game (see Notes). | Steam Input default "Gamepad", then ask for a Deck review. |
| Trading cards, emoticons, profile backgrounds | Art can be made ahead; Valve switches cards on only once the game meets its confidence bar after launch. | Upload once Steamworks offers it (Community > Trading Cards). |
| Workshop | Not planned: items and worlds are code, not files players can make. | Nothing. |
| Leaderboards | The game's own server already runs the world, daily, season and friend boards. | Nothing. |
| Cosmetic DLC | In the five-year roadmap, not built. Valve takes 30%. | Later. |

### Achievements

The API names are the ones in `src/platform/achievements.ts`; `npm run content:check` fails if this table misses one. Enter each in Stats & Achievements > Achievements with **Set by: Client**. Where a stat is shown, set it as the achievement's progress stat with the goal as the max. Icons (64x64, earned and locked) are in the shared project folder under `marketing/steam/achievements/`.

| API name | Name | Description | Progress stat | Hidden |
|---|---|---|---|---|
| `STAGE_1` | Trash Talk | Win your first fight. |  |  |
| `STAGE_10` | Off the Block | Reach stage 10 in one run. | `best_stage` to 10 |  |
| `STAGE_20` | Long Way From the Bins | Reach stage 20 in one run. | `best_stage` to 20 |  |
| `STAGE_35` | Night Shift | Reach stage 35 in one run. | `best_stage` to 35 |  |
| `STAGE_50` | Urban Legend | Reach stage 50 in one run. | `best_stage` to 50 |  |
| `STAGE_75` | Retracoon | Reach stage 75 in one run. | `best_stage` to 75 |  |
| `BOSS_1` | Found You | Find and beat a hidden boss. |  |  |
| `BOSS_RUN_3` | Boss Rush | Beat 3 bosses in one run. |  |  |
| `BOSS_25` | Big Game Hunter | Beat 25 bosses in total. | `bosses` to 25 |  |
| `ELITE_1` | Shiny Problem | Beat an elite foe. |  |  |
| `COMBO_3` | Clean Sweep | Take out 3 foes in one turn. |  |  |
| `FULL_KIT` | Dressed to Kill | Wear an item in all seven slots. |  |  |
| `LEGENDARY` | Gold Plated | Wear a legendary item. |  |  |
| `FULL_SET` | Matching Outfit | Switch on every bonus of an item set. |  |  |
| `BUILD_SPEED` | Zoomies | Wear 4 SPEED items at once. |  |  |
| `BUILD_TANK` | Trash Can Armor | Wear 4 TANK items at once. |  |  |
| `BUILD_SCAV` | Finders Keepers | Wear 4 SCAVENGER items at once. |  |  |
| `BUILD_CRIT` | Lucky Paws | Wear 4 CRIT items at once. |  |  |
| `BUILD_TRASH` | Garbage Day | Wear 4 TRASH items at once. |  |  |
| `RETREAT` | Live to Scavenge | Retreat and keep your level for the next run. |  |  |
| `LEVEL_10` | Seasoned | Reach level 10. | `best_level` to 10 |  |
| `LEVEL_25` | Veteran | Reach level 25. | `best_level` to 25 |  |
| `WORLDS_10` | Tourist | Visit 10 different worlds. | `worlds` to 10 |  |
| `WORLDS_25` | Globetrotter | Visit 25 different worlds. | `worlds` to 25 |  |
| `WORLDS_ALL` | Seen It All | Visit every world. |  | yes |
| `ITEMS_100` | Hoarder | Find 100 different items. |  |  |
| `FOES_40` | Field Guide | Meet 40 different foes. |  |  |
| `RUNS_50` | One More Run | Start 50 runs. | `runs` to 50 |  |
| `DAILY` | Daily Grind | Finish a daily run. |  |  |
| `SKIN` | New Look | Get a new skin. |  |  |

### Stats

Integer stats, **Set by: Client**, increment only, default 0. The game always sends its best value, so a stat never goes down.

| API name | Display name | What it counts |
|---|---|---|
| `best_stage` | Best stage | Furthest stage reached in one normal run |
| `best_level` | Best level | Highest raccoon level |
| `bosses` | Bosses beaten | Bosses beaten in total |
| `runs` | Runs | Runs started |
| `worlds` | Worlds visited | Different worlds visited |

To test with achievements switched on, Valve's test app 480 won't do: use your own App ID, and reset with Steamworks > "Reset stats" for your account or the `steam.stats.resetAll(true)` call in a dev console.

## Automatic upload

The **Steam** workflow (`.github/workflows/steam.yml`) builds on every manual run and on version tags. On a tag it also uploads to Steam's `beta` branch when these are set (Settings > Secrets and variables > Actions):

- Secrets: `STEAM_USERNAME` (a build account with only upload rights) and `STEAM_CONFIG_VDF` (from logging in once with SteamCMD; see [game-ci/steam-deploy](https://github.com/game-ci/steam-deploy)).
- Variables: `STEAM_APP_ID`, and `API_URL` for the scoreboard.

Depot 1 is Windows, 2 macOS, 3 Linux. You set a build live from Steamworks > SteamPipe > Builds.

## Notes

- The macOS build isn't notarized. Steam runs it fine, but for Gatekeeper-friendly builds add a Developer ID certificate to electron-builder.
- The macOS build is for the architecture of the machine that builds it (Apple Silicon on GitHub's `macos-latest`).
- Steam Deck: every screen works with the built-in controls through the Gamepad API (Steam Input presents the Deck as an Xbox controller): d-pad or stick moves a highlight, A presses, B goes back, and all buttons can be remapped in Settings. For "Verified", set the Steam Input default to "Gamepad" in Steamworks; text entry (friend codes) uses the Steam on-screen keyboard (Steam + X).
