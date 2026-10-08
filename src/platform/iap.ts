// In-app purchases. On phones: RevenueCat (one SDK for App Store and Google Play, with
// receipt validation and restore). In the browser, or before RevenueCat keys are set,
// purchases run in TEST MODE: the shop asks the player to confirm a fake purchase and
// says clearly that no money is charged.
import { store, save } from '../save';
import { PRODUCTS, Product, REVENUECAT } from './config';
import { isNative, platform } from './native';

export type BuyResult = 'ok' | 'cancel' | 'error';

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

function grant(p: Product) {
  if (p.gems) store.gems += p.gems;
  if (p.noAds) store.noAds = true;
  store.purchases.push(p.id);
  save();
}

// No Ads is a non-consumable: restore it from the store's purchase history.
async function syncEntitlements() {
  if (testMode()) return;
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
    grant(p);
    return 'ok';
  } catch (e) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err.userCancelled || err.code === '1') return 'cancel';
    console.warn('purchase failed', e);
    return 'error';
  }
}

export async function restore(): Promise<boolean> {
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
