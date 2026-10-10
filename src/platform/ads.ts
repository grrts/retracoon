// Ads policy: exactly one ad, an App Open ad when the game launches (AdMob's format for
// launch: interstitials are not allowed on app load). A note says it is coming first.
// No banners, no ads during or after a run, no watch-an-ad rewards, no ads for currency.
// Buying No Ads (or the Starter Pack) removes it.
//
// On phones this uses Google AdMob through @capacitor-community/admob. In the browser
// build the same slots show a placeholder so the experience can be seen and tested.
import { store } from '../save';
import { ADMOB, ADS_ON } from './config';
import { isNative, isSteam, platform } from './native';

// Steam is a paid game: never any ads there.
export const adsEnabled = () => ADS_ON && !store.noAds && !isSteam();

let ready: Promise<boolean> | null = null;

async function admob() {
  const m = await import('@capacitor-community/admob');
  return m;
}

export function initAds(): Promise<boolean> {
  if (!isNative() || !adsEnabled()) return Promise.resolve(false);
  if (!ready)
    ready = (async () => {
      try {
        const { AdMob } = await admob();
        await AdMob.initialize({ initializeForTesting: ADMOB.testing });
        // EU/UK consent (UMP). Shows Google's consent form when required.
        try {
          const info = await AdMob.requestConsentInfo();
          if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
        } catch {
          /* consent not configured yet */
        }
        if (platform() === 'ios') {
          try {
            await AdMob.requestTrackingAuthorization();
          } catch {
            /* ignore */
          }
        }
        return true;
      } catch (e) {
        console.warn('AdMob init failed', e);
        return false;
      }
    })();
  return ready;
}

const units = () => (platform() === 'ios' ? ADMOB.ios : ADMOB.android);

// Native launch ad (App Open format). Resolves when it closes or fails. Returns false on
// web, where the Ad scene shows the placeholder instead.
export async function showNativeLaunchAd(): Promise<boolean> {
  if (!isNative() || !adsEnabled()) return false;
  if (!(await initAds())) return true;
  try {
    const { AdMob, AppOpenAdPluginEvents } = await admob();
    await AdMob.loadAppOpen({ adId: units().appOpen });
    await new Promise<void>((done) => {
      const subs: Promise<{ remove: () => Promise<void> }>[] = [];
      const finish = () => {
        clearTimeout(timer);
        subs.forEach((p) => void p.then((h) => h.remove()));
        done();
      };
      // Never leave the player stuck on a black screen.
      const timer = setTimeout(finish, 60000);
      subs.push(AdMob.addListener(AppOpenAdPluginEvents.Closed, finish));
      subs.push(AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, finish));
      AdMob.showAppOpen().catch(finish);
    });
  } catch (e) {
    console.warn('launch ad failed', e);
  }
  return true;
}
