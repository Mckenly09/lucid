// The ONLY file that imports react-native-purchases (subscription.md §4). Everything else uses usePlus().
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { type PlusSnapshot, toSnapshot } from './entitlement';

// Public RevenueCat SDK key (RevenueCat dashboard -> Project settings -> API keys). Not a secret.
// Android only for now: there is no iOS app yet.
const API_KEY = Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;

/**
 * Dev builds without a key get a pretend store, so the paywall, limits and Settings row can be tried before the
 * RevenueCat project exists. It never runs in a release build.
 */
const DUMMY = __DEV__ && !API_KEY;

/** False in a release build without a key: the paywall says subscriptions aren't set up instead of crashing. */
export const available = !!API_KEY || DUMMY;

let configured = false;
let pack: PurchasesPackage | null = null;

let dummy: PlusSnapshot | null = null;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const wait = () => new Promise((r) => setTimeout(r, 800));

/** Ties purchases to the Firebase uid, so Plus follows the student's account to a new phone. */
export async function configure(uid: string) {
  if (!API_KEY) return;
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY, appUserID: uid });
    configured = true;
  } else {
    await Purchases.logIn(uid);
  }
}

export async function logOut() {
  dummy = null;
  if (!configured || (await Purchases.isAnonymous())) return;
  await Purchases.logOut();
}

/** The store's localized price for the monthly plan, or null when there is no offering. */
export async function getOffering(): Promise<string | null> {
  if (DUMMY) return '₱99.00';
  if (!configured) return null;
  const { current } = await Purchases.getOfferings();
  pack = current?.monthly ?? current?.availablePackages[0] ?? null;
  return pack?.product.priceString ?? null;
}

/** Null means "no Plus". Throws when the store can't be reached; callers keep the cached answer then. */
export async function getStatus(): Promise<PlusSnapshot | null> {
  // The dummy store forgets everything on restart, so it acts offline here and the saved answer stands.
  if (DUMMY) throw new Error('Dummy store has no server');
  if (!configured) throw new Error('Purchases not configured');
  return toSnapshot(await Purchases.getCustomerInfo());
}

export async function buy(): Promise<PlusSnapshot | null> {
  if (DUMMY) {
    await wait();
    dummy = { expiresAt: Date.now() + MONTH_MS, willRenew: true };
    return dummy;
  }
  if (!pack) throw new Error('No offering loaded');
  const { customerInfo } = await Purchases.purchasePackage(pack);
  return toSnapshot(customerInfo);
}

export async function restore(): Promise<PlusSnapshot | null> {
  if (DUMMY) {
    await wait();
    return dummy;
  }
  if (!configured) throw new Error('Purchases not configured');
  return toSnapshot(await Purchases.restorePurchases());
}

/** Backing out of Google Play's sheet is not an error to show. */
export const isCancel = (e: unknown) =>
  (e as { userCancelled?: boolean; code?: string } | null)?.userCancelled === true ||
  (e as { code?: string } | null)?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;

/** Google Play is still waiting on the money (cash or carrier payments). Buying again could charge twice. */
export const isPending = (e: unknown) =>
  (e as { code?: string } | null)?.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR;
