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

Keys: **F11** or **Alt+Enter** toggles fullscreen. The title screen has a QUIT button.

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

## Automatic upload

The **Steam** workflow (`.github/workflows/steam.yml`) builds on every manual run and on version tags. On a tag it also uploads to Steam's `beta` branch when these are set (Settings > Secrets and variables > Actions):

- Secrets: `STEAM_USERNAME` (a build account with only upload rights) and `STEAM_CONFIG_VDF` (from logging in once with SteamCMD; see [game-ci/steam-deploy](https://github.com/game-ci/steam-deploy)).
- Variables: `STEAM_APP_ID`, and `API_URL` for the scoreboard.

Depot 1 is Windows, 2 macOS, 3 Linux. You set a build live from Steamworks > SteamPipe > Builds.

## Notes

- The macOS build isn't notarized. Steam runs it fine, but for Gatekeeper-friendly builds add a Developer ID certificate to electron-builder.
- The macOS build is for the architecture of the machine that builds it (Apple Silicon on GitHub's `macos-latest`).
- Steam Deck "Verified" needs full controller support, which the game doesn't have yet (it's tap and mouse). It can still be sold and played on Deck with the touch screen or trackpads.
