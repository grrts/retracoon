# Accounts and sign-in

Players sign in with Google, Apple or Steam. The account *is* the player: the server keeps one player per account, so the same Google, Apple or Steam account on a second device gets the same name, scores, friends, gems, No Ads and gem-bought skins.

| Platform | Sign-in options |
|---|---|
| Android | Google |
| iPhone / iPad | Apple, Google |
| Steam | Steam (automatic at every launch) |
| Browser | Google (and Apple if a Services ID is set) |

Anyone can play as a guest (Apple doesn't allow a login wall in front of a game, guideline 5.1.1(v), so the game does the same everywhere). Sign-in is offered once at the first launch, with NOT NOW to skip, and asked for when a guest opens the scoreboard, buys something or spends gems.

Until the game is built with `VITE_API_URL`, there is no sign-in at all and everything works offline (handy for development).

## Names: NAME#1234

Names are 3-16 letters, digits and spaces, and are not unique on their own. Each player gets a random free 4-digit **tag** (1000-9999) for their name, and the database has a unique index on (name, tag), so two players can never show as the same NAME#1234. Renaming picks a new free tag.

## How sign-in is checked

The game never sends a password. It sends what the provider gives it, and the server checks it with the provider (`server/src/Service/AccountVerifier.php`):

- **Google and Apple:** an ID token (a signed JWT). The server checks the signature against Google's or Apple's public keys, the issuer, expiry, and that it was issued for *our* app (the audience).
- **Steam:** a Web API auth ticket. The server asks Steam (`ISteamUserAuth/AuthenticateUserTicket`) who it belongs to, and refuses publisher-banned accounts.

Each sign-in returns a new random token for that device (stored server-side only as a SHA-256 hash).

## Setting it up

### Google

In [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials, create OAuth client ids:

1. **Web application**: its client id is the *web client id*. Add your website origin if you'll offer browser play.
2. **Android**: package `com.retracoon.game` and the SHA-1 of your signing key (both the upload key and Google Play's app signing key, from Play Console > App integrity).
3. **iOS**: bundle id `com.retracoon.game`.

Then:

- Build the game with `VITE_GOOGLE_WEB_CLIENT_ID=<web id>` and `VITE_GOOGLE_IOS_CLIENT_ID=<ios id>` (GitHub: repository variables of the same names, passed in the build workflows).
- iOS: add the iOS client's *reversed client id* (`com.googleusercontent.apps.…`) as a URL scheme in `ios/App/App/Info.plist` (Xcode > App target > Info > URL Types).
- Server: `GOOGLE_CLIENT_IDS=<web id>,<android id>,<ios id>`.

### Apple

1. Apple Developer > Identifiers > `com.retracoon.game`: turn on **Sign in with Apple**. The app already has the entitlement (`ios/App/App/App.entitlements`).
2. Apple Developer > Keys: create a key with Sign in with Apple, download the `.p8`.
3. Server: `APPLE_AUDIENCES=com.retracoon.game`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (the `.p8` contents, newlines as `\n`). The key is used to revoke a player's Apple tokens when they delete their account, which Apple requires.
4. Optional, Apple on the web: create a Services ID with a return URL, build with `VITE_APPLE_SERVICE_ID` and `VITE_APPLE_REDIRECT_URL`, and add the Services ID to `APPLE_AUDIENCES`.

### Steam

1. Steamworks partner site > Users & Permissions > Manage Groups: create a **publisher Web API key**.
2. Server: `STEAM_WEB_API_KEY=<key>` and `STEAM_APP_ID=<your app id>`.

The Steam app asks Steam for a ticket for the identity `retracoon`; the server checks it with the same identity.

## Purchases

Purchases belong to the account, not the phone:

1. After sign-in the game logs in to RevenueCat with the player id (`Purchases.logIn`).
2. The store charges the player; RevenueCat validates the receipt and calls our webhook.
3. `POST /api/webhooks/revenuecat` credits gems or No Ads to that player, once per transaction id. A refund (RevenueCat `CANCELLATION`) takes it back.
4. The game reads gems and No Ads from the server. Spending gems on a skin goes through the server too (`POST /api/me/spend`), so the skin unlocks on every device.

Setup: RevenueCat > Project settings > Integrations > **Webhooks**: URL `https://<your api>/api/webhooks/revenuecat`, and an Authorization header value of `Bearer <secret>`. Put the same `<secret>` in the server's `REVENUECAT_WEBHOOK_AUTH`.

Bottle Caps (earned by playing) stay on the device. On Steam there is nothing to buy.

## Deleting an account

- **In the game:** Scores > Account > Delete account (type DELETE). Deletes the player, scores, friends, gems, unlocks, purchase records and every sign-in, and revokes Sign in with Apple.
- **On the web:** `https://<your api>/account/delete` explains the in-game path and, when `SUPPORT_EMAIL` is set, how to ask by email. Google Play requires this link in the Data safety form.
