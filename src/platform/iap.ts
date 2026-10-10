// In-app purchases. On phones: RevenueCat (one SDK for App Store and Google Play, with
// receipt validation and restore). In the browser, or before RevenueCat keys are set,
// purchases run in TEST MODE: the shop asks the player to confirm a fake purchase and
// says clearly that no money is charged.
//
// Purchases belong to the signed-in account: RevenueCat is logged in with the player id,
// and the server credits gems and No Ads from RevenueCat's webhook (server/src/
// Controller/WebhookController.php). The game then reads them back from the server.
// On Steam there is nothing to buy: the game itself is paid.
import { store, save } from '../save';
import { PRODUCTS, Product, REVENUECAT } from './config';
import { isNative, isSteam, platform } from './native';
import { onlineConfigured, signedIn, profile } from './online';

export type BuyResult = 'ok' | 'pending' | 'cancel' | 'error';

// Gems and No Ads are sold here (not on Steam).
export const storeAvailable = () => !isSteam();
// Purchases go through the account (server) rather than this device's save.
const accountMode = () => onlineConfigured() && signedIn();

let configured = false;
const prices = new Map<string, string>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeProducts = new Map<string, any>();

const key = () => (platform() === 'ios' ? REVENUECAT.ios : REVENUECAT.android);

export const testMode = () => !isNative() || !key();

async function rc() {
  return (await import('@revenuecat/purchases-capacitor')).Purchases;
}

export async function initIap() {
  if (testMode() || configured) return;
  try {
    const Purchases = await rc();
    await Purchases.configure({ apiKey: key() });
    configured = true;
    const { products } = await Purchases.getProducts({ productIdentifiers: PRODUCTS.map((p) => p.id), type: 'NON_SUBSCRIPTION' as never });
    for (const p of products) {
      prices.set(p.identifier, p.priceString);
      storeProducts.set(p.identifier, p);
    }
    await syncEntitlements();
  } catch (e) {
    console.warn('IAP init failed', e);
  }
}

export function priceLabel(p: Product) {
  return prices.get(p.id) ?? p.price;
}

// Ties this device's store purchases to the player, so the webhook can credit them.
export async function loginPurchases(playerId: string) {
  if (testMode()) return;
  try {
    await initIap();
    const Purchases = await rc();
    await Purchases.logIn({ appUserID: playerId });
  } catch (e) {
    console.warn('IAP login failed', e);
  }
}

// After a purchase the store tells RevenueCat, RevenueCat tells our server; wait for
// the server to show it (a few seconds at most, usually).
async function waitForCredit(p: Product): Promise<boolean> {
  const before = store.gems;
  for (let i = 0; i < 10; i++) {
    const me = await profile(true);
    if (me && ((p.gems && me.gems >= before + p.gems) || (!p.gems && p.noAds && me.noAds))) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function grant(p: Product) {
  if (p.gems) store.gems += p.gems;
  if (p.noAds) store.noAds = true;
  store.purchases.push(p.id);
  save();
}

// No Ads is a non-consumable: restore it from the store's purchase history.
async function syncEntitlements() {
  if (testMode() || accountMode()) return;
  const Purchases = await rc();
  const { customerInfo } = await Purchases.getCustomerInfo();
  const owned = new Set(customerInfo.allPurchasedProductIdentifiers ?? []);
  if (owned.has('retracoon.noads') || owned.has('retracoon.starter')) {
    store.noAds = true;
    save();
  }
}

export async function buy(id: string, confirmTest: () => Promise<boolean>): Promise<BuyResult> {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return 'error';
  if (testMode()) {
    if (!(await confirmTest())) return 'cancel';
    grant(p);
    return 'ok';
  }
  try {
    const Purchases = await rc();
    const sp = storeProducts.get(id);
    if (!sp) return 'error';
    await Purchases.purchaseStoreProduct({ product: sp });
    if (!accountMode()) {
      grant(p);
      return 'ok';
    }
    return (await waitForCredit(p)) ? 'ok' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err.userCancelled || err.code === '1') return 'cancel';
    console.warn('purchase failed', e);
    return 'error';
  }
}

export async function restore(): Promise<boolean> {
  // Signed in: the account already holds every purchase.
  if (accountMode()) {
    await profile(true);
    return store.noAds;
  }
  if (testMode()) return store.noAds;
  try {
    const Purchases = await rc();
    await Purchases.restorePurchases();
    await syncEntitlements();
    return store.noAds;
  } catch {
    return false;
  }
}
