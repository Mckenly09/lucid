import { toAuthError } from './google';
import { AuthError } from './types';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {},
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: (e: unknown) => typeof e === 'object' && e !== null && 'code' in e,
  isCancelledResponse: () => false,
}));

const coded = (code: string) => Object.assign(new Error(code), { code });

test.each([
  ['SIGN_IN_CANCELLED', 'cancelled'],
  ['IN_PROGRESS', 'cancelled'],
  ['PLAY_SERVICES_NOT_AVAILABLE', 'play-services'],
  ['10', 'developer'],
  ['7', 'offline'],
  ['12500', 'other'],
])('code %s maps to %s', (code, kind) => {
  expect(toAuthError(coded(code)).kind).toBe(kind);
});

test('keeps an AuthError and wraps unknown errors', () => {
  const e = new AuthError('offline');
  expect(toAuthError(e)).toBe(e);
  expect(toAuthError('boom').kind).toBe('other');
});
