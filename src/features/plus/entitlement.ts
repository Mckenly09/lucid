/** The entitlement id in the RevenueCat dashboard. Gate on this, never on a product id. */
export const PLUS_ENTITLEMENT = 'plus';
/** How long a cached Plus keeps working past its expiry date without the store confirming a renewal. */
export const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Just the part of RevenueCat's CustomerInfo this app reads, so the check stays testable. */
export type CustomerInfoLike =
  | {
      entitlements?: {
        all?: Record<string, { expirationDate?: string | null; willRenew?: boolean } | undefined>;
      };
    }
  | null
  | undefined;

/** What the phone remembers about Plus, saved after every answer from the store. */
export type PlusSnapshot = {
  /** Epoch ms; null means it never expires. */
  expiresAt: number | null;
  willRenew: boolean;
};

export type PlusStatus =
  | 'free'
  /** Paid and inside the period. */
  | 'active'
  /** Past expiry but inside the 3-day grace: probably renewed, the phone just hasn't been online to see it. */
  | 'grace'
  /** Grace is over for a subscription that was set to renew: free until the phone connects once. */
  | 'lapsed';

/** The store's answer reduced to what we keep; null when there is no Plus entitlement. */
export function toSnapshot(info: CustomerInfoLike): PlusSnapshot | null {
  // `all`, not `active`: offline, RevenueCat may drop an expired entitlement from `active`, and our own grace math
  // (plusStatus) needs the expiry date to tell "lapsed, connect once" from plain free.
  const plus = info?.entitlements?.all?.[PLUS_ENTITLEMENT];
  if (!plus) return null;
  return {
    expiresAt: plus.expirationDate ? Date.parse(plus.expirationDate) : null,
    willRenew: plus.willRenew === true,
  };
}

export function plusStatus(snapshot: PlusSnapshot | null | undefined, now: number): PlusStatus {
  if (!snapshot) return 'free';
  if (snapshot.expiresAt === null || now < snapshot.expiresAt) return 'active';
  if (now < snapshot.expiresAt + GRACE_MS) return 'grace';
  return snapshot.willRenew ? 'lapsed' : 'free';
}

export const isPlusActive = (snapshot: PlusSnapshot | null | undefined, now: number) => {
  const s = plusStatus(snapshot, now);
  return s === 'active' || s === 'grace';
};
