import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import Register from '@/app/(auth)/register';
import ResetPassword from '@/app/(auth)/reset-password';
import SignIn from '@/app/(auth)/sign-in';
import VerifyEmail from '@/app/(auth)/verify-email';

import { AuthError } from './types';

// Never call Firebase in tests (AGENTS.md): the screens get a fake useAuth().
const mockAuth = {
  user: { uid: 'u1', name: 'Ana', email: 'ana@email.com', photoUrl: null },
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  continueOffline: jest.fn(),
  registerWithEmail: jest.fn(),
  resetPassword: jest.fn(),
  checkVerified: jest.fn(),
  resendVerification: jest.fn(),
  cancelRegistration: jest.fn(),
  signOut: jest.fn(),
  verificationSentAt: jest.fn(() => 0),
};
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({}) }));
// Lucide ships ESM, Screen needs native keyboard/safe-area modules, Button and RiseIn need Reanimated; none matters to what's tested here.
jest.mock('@/components/icon', () => ({ Icon: () => null }));
jest.mock('@/components/logo', () => ({ Logo: () => null }));
jest.mock('@/components/rise-in', () => ({ STAGGER: 0, RiseIn: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/sheet', () => ({ Sheet: () => null }));
jest.mock('@/components/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityState={{ disabled }}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/screen', () => ({
  Screen: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => (
    <>
      {children}
      {footer}
    </>
  ),
}));

beforeEach(() => jest.clearAllMocks());

it('log in: waits for email and password, then signs in', async () => {
  const s = await render(<SignIn />);
  await fireEvent.press(s.getByText('Log in'));
  expect(mockAuth.signInWithEmail).not.toHaveBeenCalled();
  await fireEvent.changeText(s.getByLabelText('Email'), 'ana@email.com');
  await fireEvent.changeText(s.getByLabelText('Password'), 'pass1234');
  await fireEvent.press(s.getByText('Log in'));
  expect(mockAuth.signInWithEmail).toHaveBeenCalledWith('ana@email.com', 'pass1234');
});

it('log in: shows the wrong-password message', async () => {
  mockAuth.signInWithEmail.mockRejectedValueOnce(new AuthError('wrong-password'));
  const s = await render(<SignIn />);
  await fireEvent.changeText(s.getByLabelText('Email'), 'ana@email.com');
  await fireEvent.changeText(s.getByLabelText('Password'), 'nope');
  await fireEvent.press(s.getByText('Log in'));
  expect(await s.findByText("That email and password don't match. Try again or reset your password.")).toBeTruthy();
});

it('register: needs the password rules and both agreements before creating the account', async () => {
  const s = await render(<Register />);
  await fireEvent.changeText(s.getByLabelText('Your name'), 'Ana Santos');
  await fireEvent.changeText(s.getByLabelText('Email'), 'ana@email.com');
  await fireEvent.changeText(s.getByLabelText('Password'), 'password');
  await fireEvent.press(s.getByLabelText("I'm 18 or older, or my parent or guardian agrees to me using Lucid."));
  await fireEvent.press(s.getByLabelText('I agree to the Terms and Privacy Policy.'));
  await fireEvent.press(s.getByText('Create account'));
  expect(mockAuth.registerWithEmail).not.toHaveBeenCalled(); // no number yet
  expect(s.getByLabelText('Has a number: not yet')).toBeTruthy();

  await fireEvent.changeText(s.getByLabelText('Password'), 'password1');
  await fireEvent.press(s.getByText('Create account'));
  expect(mockAuth.registerWithEmail).toHaveBeenCalledWith('Ana Santos', 'ana@email.com', 'password1');
});

it('confirm email: tells the student when the link was not tapped yet', async () => {
  mockAuth.checkVerified.mockResolvedValueOnce(false);
  const s = await render(<VerifyEmail />);
  expect(s.getByText('ana@email.com')).toBeTruthy();
  await fireEvent.press(s.getByText("I've confirmed it — continue"));
  expect(await s.findByText('Not confirmed yet. Tap the link in the email first.')).toBeTruthy();
});

it('confirm email: starts the resend wait once the email goes out, even after the screen opened', async () => {
  jest.useFakeTimers();
  try {
    // Right after registering, the screen opens before the email is sent.
    const s = await render(<VerifyEmail />);
    expect(s.getByText('Resend email')).toBeTruthy();
    mockAuth.verificationSentAt.mockReturnValue(Date.now());
    await act(() => jest.advanceTimersByTime(1000));
    expect(s.getByText(/^Resend email in 0:4\d$/)).toBeTruthy();
  } finally {
    mockAuth.verificationSentAt.mockReturnValue(0);
    jest.useRealTimers();
  }
});

it('reset password: confirms without saying whether the account exists', async () => {
  mockAuth.resetPassword.mockResolvedValueOnce(undefined);
  const s = await render(<ResetPassword />);
  await fireEvent.changeText(s.getByLabelText('Email'), 'ana@email.com');
  await fireEvent.press(s.getByText('Send reset link'));
  await waitFor(() => expect(s.getByText(/If an account uses ana@email.com/)).toBeTruthy());
});
