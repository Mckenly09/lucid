// Purchases are native only; the web build has no store.
import type { PlusSnapshot } from './entitlement';

export const available = false;

export async function configure(_uid: string) {}
export async function logOut() {}
export async function getOffering(): Promise<string | null> {
  return null;
}
export async function getStatus(): Promise<PlusSnapshot | null> {
  throw new Error('Purchases are not available on web');
}
export async function buy(): Promise<PlusSnapshot | null> {
  throw new Error('Purchases are not available on web');
}
export async function restore(): Promise<PlusSnapshot | null> {
  throw new Error('Purchases are not available on web');
}
export const isCancel = (_e: unknown) => false;
export const isPending = (_e: unknown) => false;
