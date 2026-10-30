import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useAuth } from '@/features/auth/useAuth';
import { storage } from '@/utils/kv-storage';

import { isPlusActive, type PlusSnapshot, plusStatus } from './entitlement';
import { record, remaining, type Usage } from './limits';
import * as purchases from './purchases';

type PlusStore = {
  /** Last answer from the store per uid; the source of truth while offline. */
  snapshots: Record<string, PlusSnapshot | null>;
  /** Today's Quiz me + Practice starts per uid. */
  usage: Record<string, Usage>;
  price: string | null;
  busy: boolean;
  error: string | null;
};

const usePlusStore = create<PlusStore>()(
  persist((): PlusStore => ({ snapshots: {}, usage: {}, price: null, busy: false, error: null }), {
    name: 'plus',
    storage: createJSONStorage(() => storage),
    partialize: ({ snapshots, usage }) => ({ snapshots, usage }),
  }),
);

const setSnapshot = (uid: string, snapshot: PlusSnapshot | null) =>
  usePlusStore.setState((s) => ({
    snapshots: { ...s.snapshots, [uid]: snapshot },
  }));

/** Asks the store again. Offline or on an outage it keeps the cached answer: never take Plus away without one. */
async function refresh(uid: string) {
  try {
    setSnapshot(uid, await purchases.getStatus());
  } catch {
    // Offline: the cached snapshot and its 3-day grace stand.
  }
}

/** Mount once at the root: ties RevenueCat to the signed-in uid and re-checks on start and on return to the app. */
export function usePlusSync() {
  const { user } = useAuth();
  const uid = user && !user.isLocal ? user.uid : null;

  useEffect(() => {
    if (!uid) {
      void purchases.logOut().catch(() => {});
      return;
    }
    void purchases.configure(uid).then(
      () => refresh(uid),
      () => {},
    );
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh(uid);
    });
    return () => sub.remove();
  }, [uid]);
}

export function usePlus() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const snapshot = usePlusStore((s) => s.snapshots[uid]);
  const price = usePlusStore((s) => s.price);
  const busy = usePlusStore((s) => s.busy);
  const error = usePlusStore((s) => s.error);
  // shortcut: the clock is read when the screen mounts, so a screen left open across the expiry moment keeps the old
  // answer until it remounts or the store answers again; tick it on AppState 'active' if that ever matters.
  const [now] = useState(Date.now);

  /** Loads the store's price and re-checks status. Needs internet. */
  const load = useCallback(async () => {
    usePlusStore.setState({ error: null });
    void refresh(uid);
    try {
      const p = await purchases.getOffering();
      if (p) usePlusStore.setState({ price: p });
    } catch {
      // The paywall shows its offline message; the button waits for a price.
    }
  }, [uid]);

  const run = async (action: () => Promise<PlusSnapshot | null>, notFound: string, failed: string) => {
    usePlusStore.setState({ busy: true, error: null });
    try {
      const next = await action();
      setSnapshot(uid, next);
      const ok = isPlusActive(next, Date.now());
      if (!ok) usePlusStore.setState({ error: notFound });
      return ok;
    } catch (e) {
      if (purchases.isPending(e)) {
        // No "try again": a second tap could start a second payment.
        usePlusStore.setState({ error: 'Payment is pending. Lucid Plus turns on when Google Play confirms it.' });
      } else if (!purchases.isCancel(e)) {
        usePlusStore.setState({ error: failed });
      }
      return false;
    } finally {
      usePlusStore.setState({ busy: false });
    }
  };

  return {
    status: plusStatus(snapshot, now),
    isPlus: isPlusActive(snapshot, now),
    /** When the current period ends; renews then if `willRenew`. */
    expiresAt: snapshot?.expiresAt ?? null,
    willRenew: snapshot?.willRenew ?? false,
    /** Offline profiles have no account for a purchase to follow. */
    canBuy: purchases.available && !!user && !user.isLocal,
    available: purchases.available,
    price,
    busy,
    error,
    load,
    buy: () =>
      run(
        purchases.buy,
        "The store didn't confirm the purchase. Tap Restore purchase.",
        "Payment didn't go through. Try again.",
      ),
    restore: () =>
      run(
        purchases.restore,
        'No Lucid Plus found for this Google Play account.',
        "Couldn't reach Google Play. Check your connection and try again.",
      ),
  };
}

/**
 * Counts one Quiz me or Practice toward today's free limit. Call it once the questions are ready, so a quiz the
 * model failed to make doesn't use up a free start.
 */
export function countStart(uid: string) {
  const { usage } = usePlusStore.getState();
  usePlusStore.setState({ usage: { ...usage, [uid]: record(usage[uid], new Date()) } });
}

/**
 * Free plan: 5 Quiz me + Practice a day, counted per uid on this phone (by `countStart`). `run(start)` starts if
 * any are left, otherwise sets `blocked` so the caller shows the limit sheet.
 */
export function useDailyLimit() {
  const { user } = useAuth();
  const { isPlus } = usePlus();
  const [blocked, setBlocked] = useState(false);
  const uid = user?.uid ?? '';

  return {
    blocked,
    dismiss: () => setBlocked(false),
    run: (start: () => void) => {
      if (remaining(usePlusStore.getState().usage[uid], new Date(), isPlus) <= 0) {
        setBlocked(true);
        return;
      }
      start();
    },
  };
}
