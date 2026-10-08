# Monetization: one ad, a skin shop, and gems

## The rules

- **One ad.** A full-screen ad when the game starts. No banners, no ads during or after a run, no "watch an ad" rewards, no ads for currency.
- **No Ads** (or the Starter Pack) removes that ad forever.
- **Skins are cosmetic only.** They never change stats. Everything that matters for winning is earned by playing.
- **No loot boxes.** You always see exactly which skin you are buying.

## Currencies

| | How you get it | What it buys |
|---|---|---|
| **Bottle Caps** | Every run pays out: distance / 12 + 3 per stage + 5 per elite + 25 per boss, plus caps from events | Common and Rare skins |
| **Gems** | Bought with real money | Rare, Epic, Legendary and holiday skins |

Prices live in `src/meta/economy.ts`:

| Rarity | Caps | Gems |
|---|---|---|
| Common | 500 | |
| Rare | 1500 | 120 |
| Epic | | 300 |
| Legendary | | 650 |

Outfits cost about 40% more caps or 20% more gems than plain fur. Holiday skins are gems only (200 by default).

## The weekly sale

Every Monday a new set of 6 skins goes 30 to 50% off, plus one featured Epic or Legendary skin. The pick is seeded by the ISO week number, so every player sees the same sale and nothing needs a server (`weeklySale()` in `src/meta/economy.ts`).

## Holiday skins

Holiday skins are only sold while their season is on (by the phone's date). Each season also dresses up the backgrounds and weather. Seasons are defined in `src/world/seasons.ts`: Christmas, Halloween, Valentine's, Easter, King's Day, Summer, Lunar New Year and St Patrick's. To preview one in the browser, call `forceSeason('christmas')` from `src/world/calendar.ts`.

## Store products

Create these with the **same ids** in both the Play Console and App Store Connect. Prices are suggestions; the stores show each player their local price.

| Product id | Type | What it gives | Price |
|---|---|---|---|
| `retracoon.noads` | Non-consumable | Removes the launch ad | €2.99 |
| `retracoon.starter` | Non-consumable | No Ads + 300 gems | €4.99 |
| `retracoon.gems80` | Consumable | 80 gems | €0.99 |
| `retracoon.gems500` | Consumable | 500 gems | €4.99 |
| `retracoon.gems1200` | Consumable | 1200 gems | €9.99 |
| `retracoon.gems2600` | Consumable | 2600 gems | €19.99 |

The list is in `src/platform/config.ts` (`PRODUCTS`).

## In-app purchases: RevenueCat

RevenueCat is one SDK for both stores. It validates receipts and handles restores, so there is no server to run.

1. Create a project at [revenuecat.com](https://www.revenuecat.com) and add two apps: Google Play (`com.retracoon.game`) and App Store (`com.retracoon.game`).
2. Connect the stores: a Play service account JSON for Google, an App Store Connect in-app purchase key for Apple. RevenueCat's dashboard walks you through both.
3. Import the six products.
4. Copy the two **public** SDK keys (Project settings > API keys) into `REVENUECAT.android` and `REVENUECAT.ios` in `src/platform/config.ts`.

Until those keys are set, and always in the browser, the shop runs in **test mode**: buying asks for confirmation, says no money is charged, and grants the item locally. Restore Purchases is on the Gems tab and restores No Ads.

Code: `src/platform/iap.ts`.

## Ads: AdMob

1. Create an AdMob account and add two apps (Android and iOS).
2. In each app create **one** ad unit of type *Interstitial*.
3. Put the ids in:
   - `src/platform/config.ts`: `ADMOB.android.interstitial`, `ADMOB.ios.interstitial`, and set `ADMOB.testing = false`.
   - `android/app/src/main/res/values/strings.xml`: `admob_app_id` (the app id with a `~`).
   - `ios/App/App/Info.plist`: `GADApplicationIdentifier`.
4. **Privacy messages:** in AdMob > Privacy & messaging, create a GDPR message (required for the EU and UK) and an IDFA explainer for iOS. The game already asks for consent with Google's UMP form before showing the ad.
5. Add `app-ads.txt` to your website once AdMob gives you the line for it.

In the browser the launch ad is a placeholder screen that says it is the only ad, can be skipped after 5 seconds, and links to No Ads. Code: `src/platform/ads.ts` and `AdScene` in `src/scenes/MetaScenes.ts`.

## Turning ads off entirely

Set `ADS_ON = false` in `src/platform/config.ts`.
