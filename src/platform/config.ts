// Account keys for ads and purchases. Fill these in from your own AdMob and RevenueCat
// dashboards (see docs/MONETIZATION.md). Until then the game uses Google's public test
// ad units on phones, and a clearly marked test mode for purchases.

export const APP_ID = 'com.retracoon.game';

// Master switch for ads. Players who buy No Ads never see any either way.
export const ADS_ON = true;

export const ADMOB = {
  // true = use Google's test ads (safe while developing; set false for release)
  testing: true,
  android: {
    interstitial: 'ca-app-pub-3940256099942544/1033173712', // Google test unit
  },
  ios: {
    interstitial: 'ca-app-pub-3940256099942544/4411468910', // Google test unit
  },
};

export const REVENUECAT = {
  // Public SDK keys from RevenueCat > Project settings > API keys. Empty = test mode.
  android: '',
  ios: '',
};

export interface Product {
  id: string; // store product id (same in App Store Connect and Play Console)
  title: string;
  desc: string;
  gems?: number;
  noAds?: boolean;
  price: string; // fallback label; the stores' localised price replaces it on phones
}

export const PRODUCTS: Product[] = [
  { id: 'retracoon.noads', title: 'NO ADS', desc: 'REMOVES THE LAUNCH AD FOREVER', noAds: true, price: '€2.99' },
  { id: 'retracoon.starter', title: 'STARTER PACK', desc: 'NO ADS + 300 GEMS', noAds: true, gems: 300, price: '€4.99' },
  { id: 'retracoon.gems80', title: 'POCKET OF GEMS', desc: '80 GEMS', gems: 80, price: '€0.99' },
  { id: 'retracoon.gems500', title: 'BAG OF GEMS', desc: '500 GEMS', gems: 500, price: '€4.99' },
  { id: 'retracoon.gems1200', title: 'BIN OF GEMS', desc: '1,200 GEMS', gems: 1200, price: '€9.99' },
  { id: 'retracoon.gems2600', title: 'DUMPSTER OF GEMS', desc: '2,600 GEMS', gems: 2600, price: '€19.99' },
];

// Online scoreboard and friends: the Retracoon API in server/ (see docs/ONLINE.md).
// Set VITE_API_URL when building, e.g. https://api.retracoon.com. Empty = the scoreboard
// says it is not connected yet and the game works offline.
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
