// Ads policy: exactly one ad, a full-screen ad when the game launches. No banners, no
// ads during or after a run, no watch-an-ad rewards, no ads for currency.
// Buying No Ads (or the Starter Pack) removes it.
//
// On phones this uses Google AdMob through @capacitor-community/admob. In the browser
// build the same slots show a placeholder so the experience can be seen and tested.
import { store } from '../save';
import { ADMOB, ADS_ON } from './config';
import { isNative, platform } from './native';

export const adsEnabled = () => ADS_ON && !store.noAds;

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

// Native launch interstitial. Resolves when it closes or fails. Returns false on web,
// where the Ad scene shows the placeholder instead.
export async function showNativeLaunchAd(): Promise<boolean> {
  if (!isNative() || !adsEnabled()) return false;
  if (!(await initAds())) return true;
  try {
    const { AdMob } = await admob();
    await AdMob.prepareInterstitial({ adId: units().interstitial, isTesting: ADMOB.testing });
    await AdMob.showInterstitial();
  } catch (e) {
    console.warn('launch ad failed', e);
  }
  return true;
}
