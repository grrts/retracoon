# Store eligibility check

Checked October 2026 against Google Play, the App Store and Steam, for the build in this repository. **Fixed** means this pull request changed the game to pass. **You** means something only you can do in a store console or account. Store rules change; re-check before each submission.

## Google Play

| Rule | Status |
|---|---|
| **AdMob: no interstitials on app load.** AdMob says "Do not place interstitial ads on app load" and recommends App Open ads for launch. | **Fixed.** The launch ad is now an App Open ad, shown after a note that an ad is coming. Create an *App open* ad unit (not Interstitial) in AdMob. |
| **Account deletion.** Apps with accounts need an in-app deletion path *and* a web link where users can request deletion. | **Fixed.** In app: Scores > Account > Delete account. Web: `/account/delete` on the API server. **You:** set `SUPPORT_EMAIL` on the server and put `https://<api>/account/delete` in Play Console > Data safety. |
| **Data safety form** must match what the app collects. | **You:** fill it in from the table in [privacy-policy.md](privacy-policy.md) (account ids, nickname, scores, purchase history, ad id). |
| **Payments for digital goods** use Google Play Billing. | Pass. RevenueCat uses Play Billing. |
| **Target API level.** | Pass. `targetSdkVersion = 36`. |
| **Families / children.** A cartoon raccoon can look aimed at kids; if Play decides the app targets children, only Families-certified ad SDKs and no personalized ads are allowed. | **You:** in Target audience choose 13+ and don't market to kids. The privacy policy already says the game isn't directed at children. |
| **Sign-in.** Play allows requiring sign-in. | Pass. Google sign-in. |
| **Loot boxes / gambling.** | Pass. No random paid rewards; prices are shown up front. |

## Apple App Store

| Rule | Status |
|---|---|
| **5.1.1(v): no login wall** for features that aren't account-based. Apple's review board: "requiring users to fully register for an account before entering the game is not [acceptable]." | **Fixed.** Everyone can start as a guest; sign-in is offered at the first launch and asked for at the scoreboard and the shop. |
| **5.1.1(v): account deletion in the app.** | **Fixed.** Scores > Account > Delete account. |
| **Sign in with Apple token revocation** on account deletion. | **Fixed.** The server trades Apple's authorization code for a token and revokes it on deletion. **You:** create the Sign in with Apple key and set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`. |
| **4.8 Login services:** an app offering Google sign-in must also offer an equivalent private option. | Pass. Sign in with Apple is offered on iPhone, listed first. |
| **3.1.1: digital goods through In-App Purchase**, and restorable non-consumables need Restore. | Pass. App Store IAP via RevenueCat; Restore Purchases is on the Gems tab (and No Ads also follows the account). |
| **App Tracking Transparency** before personalized ads. | Pass. The game asks before the launch ad. **You:** fill in the App Privacy labels from the privacy policy table. |
| **Age rating questionnaire** (new 13+/16+/18+ ratings). | **You:** answer it in App Store Connect; cartoon violence, no user chat, ads present. |
| **Privacy policy URL.** | **You:** publish [privacy-policy.md](privacy-policy.md) (fill in contact, date and API address). |

## Steam

| Rule | Status |
|---|---|
| **No ad-based business models or forced ads** (Valve's onboarding rules, February 2025). | Pass. The Steam build never shows ads. |
| **In-game purchases must use the Steam wallet.** | Pass. No purchases on Steam: the game is paid up front and gem-only skins cost Bottle Caps. |
| **AI content disclosure** in the Content Survey (pre-generated content made with AI tools). | **You:** this game's code and pixel art were made with AI help, so disclose that in the Content Survey. |
| **Third-party accounts** must be disclosed on the store page. | Pass. Sign-in uses the Steam account itself. |
| **Privacy policy and store page review**, Steam Direct fee, 30 days before release. | **You.** |
| **Steam Deck Verified** needs full controller support. | Not required to sell. The game is tap and mouse only, so it will rate as Playable at best for now. |

## Sources

- AdMob, interstitial guidance: https://support.google.com/admob/answer/6201362
- Google Play, account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ and the 5.1.1(v) review-board answer quoted at https://developer.apple.com/forums/thread/724336
- Valve's ad rules: https://www.pcgamesn.com/steam/advertisements
- Steam AI disclosure: https://www.videogameschronicle.com/news/steam-pages-will-now-disclose-which-games-use-ai-generated-content/
