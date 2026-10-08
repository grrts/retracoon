# Publishing to Google Play and the App Store

The game is a Vite web build wrapped in a native shell with [Capacitor](https://capacitorjs.com). The `android/` and `ios/` folders are real Android Studio and Xcode projects, already set up for landscape, the app id `com.retracoon.game`, icons, splash screens, AdMob and in-app purchases.

Everything in this repo is done. What is left needs your own accounts, so it is listed here step by step.

## What you need

| | Google Play | App Store |
|---|---|---|
| Developer account | [Play Console](https://play.google.com/console), one-time $25 | [Apple Developer Program](https://developer.apple.com/programs/), $99 per year |
| Build machine | Any OS with Android Studio, or GitHub Actions | A Mac with Xcode 16+, or GitHub Actions (macOS runner) |
| Ads | [AdMob](https://admob.google.com) account | same AdMob account |
| Purchases | [RevenueCat](https://www.revenuecat.com) project (free tier is fine) | same RevenueCat project |
| Privacy policy URL | required | required |

## Build commands

```bash
npm install
npm run cap:sync    # builds the game and copies it into android/ and ios/
npm run android     # opens Android Studio
npm run ios         # opens Xcode (Mac only)
npm run icons       # regenerates icons, splash screens and store graphics from the pixel art
```

## Before the first release

1. **Change the app id if you want another one.** `com.retracoon.game` is set in `capacitor.config.ts`, `android/app/build.gradle` (`namespace` and `applicationId`) and the Xcode project's bundle identifier. It cannot change after the first upload.
2. **Ads:** replace Google's test ids with yours (see [MONETIZATION.md](MONETIZATION.md)), and set `ADMOB.testing = false` in `src/platform/config.ts`.
3. **Purchases:** create the products and paste the RevenueCat keys (see [MONETIZATION.md](MONETIZATION.md)). Without keys the shop runs in test mode and says so on screen.
4. **Privacy policy:** host [privacy-policy.md](privacy-policy.md) somewhere public (GitHub Pages works) after filling in your contact email.

## Google Play

### Signing key (once)

Google Play uses an *upload key* you create, and keeps the real signing key itself (Play App Signing).

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Keep `upload.jks` and its passwords somewhere safe and out of git.

### Build a release bundle locally

```bash
npm run cap:sync
cd android
ANDROID_KEYSTORE_PATH=/path/to/upload.jks ANDROID_KEYSTORE_PASSWORD=... ANDROID_KEY_ALIAS=upload ANDROID_KEY_PASSWORD=... \
VERSION_CODE=1 VERSION_NAME=1.0.0 ./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

`VERSION_CODE` must go up by one for every upload.

### Or let GitHub build it

Add these repository secrets (Settings > Secrets and variables > Actions):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | optional: a Play Console service account key, for automatic uploads |

Then run the **Android** workflow from the Actions tab. It always produces a debug APK you can install on a phone, plus a signed `.aab` when the key secrets exist. Pushing a tag such as `v1.0.0` also uploads the bundle to the internal testing track when `PLAY_SERVICE_ACCOUNT_JSON` is set. The very first upload must be done by hand in the Play Console.

### Play Console steps

1. Create the app: name **Retracoon**, game, free, with in-app purchases and ads.
2. **App content:** privacy policy URL, ads = yes, target audience 13+ (keeps you out of the Families policy), content rating questionnaire (cartoon violence only), data safety form (see the table in [privacy-policy.md](privacy-policy.md)).
3. **Monetize > Products > In-app products:** create the six products from [MONETIZATION.md](MONETIZATION.md).
4. **Store listing:** copy from [store-listing.md](store-listing.md). Graphics are in `docs/store/` (512 icon, 1024x500 feature graphic). Take phone screenshots from the game in landscape.
5. Upload the `.aab` to **Internal testing**, add yourself as a tester, test the ad and a purchase with a license tester account, then promote to production.

## App Store

### Xcode (on a Mac)

1. `npm run ios`, select the **App** target > Signing & Capabilities, pick your team. Automatic signing creates the certificates.
2. Add the **In-App Purchase** capability.
3. Set the version (Marketing Version) and build number.
4. Product > Archive, then Distribute App > App Store Connect > Upload.

### Or let GitHub build it

Create an App Store Connect API key (Users and Access > Integrations > App Store Connect API, role *App Manager*) and add:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | key id |
| `ASC_ISSUER_ID` | issuer id |
| `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8` |
| `APPLE_TEAM_ID` | your 10-character team id |

The **iOS** workflow always checks that the project compiles. On a `v*` tag with these secrets it archives, signs and uploads to TestFlight.

### App Store Connect steps

1. My Apps > + > New App: bundle id `com.retracoon.game`, name Retracoon, primary category Games > Role Playing (secondary: Arcade).
2. **In-App Purchases:** create the six products from [MONETIZATION.md](MONETIZATION.md) (No Ads and Starter Pack are *Non-Consumable*, gem packs are *Consumable*).
3. **App Privacy:** answer with the table in [privacy-policy.md](privacy-policy.md). The app asks for tracking permission (App Tracking Transparency) because AdMob can use the advertising id.
4. **Age rating:** infrequent cartoon violence, no gambling (skins are bought directly, there are no loot boxes).
5. Listing text from [store-listing.md](store-listing.md); screenshots at 6.9" and 13" iPad sizes in landscape.
6. Pick the TestFlight build, submit for review. Mention in the review notes that the only ad shows at launch and that purchases can be restored from the Skin Shop > Gems tab.

## Releasing an update

1. Bump nothing by hand: CI uses the run number as build number and the tag as the version.
2. `git tag v1.1.0 && git push --tags`.
3. Promote the new internal / TestFlight build when you have tested it.
