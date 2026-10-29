import type { User } from '@react-native-firebase/auth';

import { toAccount } from './AuthProvider';

// Never call Firebase or Google in tests (AGENTS.md).
jest.mock('@react-native-firebase/auth', () => ({ getAuth: jest.fn(), onAuthStateChanged: jest.fn() }));
jest.mock('./google', () => ({ configureGoogle: jest.fn() }));
jest.mock('@/db/user-data', () => ({ moveUserData: jest.fn() }));
jest.mock('./local-profile', () => ({ useLocalProfile: jest.fn() }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

const user = (providerId: string, emailVerified: boolean) =>
  ({ uid: 'u1', displayName: 'Ana', email: 'ana@email.com', photoURL: null, emailVerified, providerData: [{ providerId }] }) as unknown as User;

it('lets a Google account in, verified flag or not', () => {
  expect(toAccount(user('google.com', false))?.verified).toBe(true);
});

it('keeps an email account out until its email is confirmed', () => {
  expect(toAccount(user('password', false))).toMatchObject({ verified: false, user: { usesPassword: true } });
  expect(toAccount(user('password', true))?.verified).toBe(true);
});

it('has no account when signed out', () => {
  expect(toAccount(null)).toBeNull();
});
