import { fireEvent, render } from '@testing-library/react-native';

import { askNow } from '@/features/chat/ask-now';

import Calculator from '@/app/tools/calculator';
import PeriodicTable from '@/app/tools/periodic-table';

// Never call Firebase or the model in tests (AGENTS.md): auth and the chat starter are faked.
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
jest.mock('@/features/chat/ask-now', () => ({ askNow: jest.fn() }));
// Lucide ships ESM, Screen needs native keyboard/safe-area modules and Button needs Reanimated; none matters to what's tested here.
jest.mock('@/components/icon', () => ({ Icon: () => null }));
jest.mock('@/components/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(() => jest.clearAllMocks());

it('calculator: keys build an expression, "=" shows the result, Explain sends it to a Math chat', async () => {
  const s = await render(<Calculator />);
  for (const key of ['square root', '9', 'parentheses', 'plus', '1', 'equals']) await fireEvent.press(s.getByLabelText(key));
  expect(s.getByText('√(9) + 1')).toBeTruthy();
  await fireEvent.press(s.getByLabelText('Explain step by step'));
  // The question carries the result, so this also checks "=" worked it out.
  expect(askNow).toHaveBeenCalledWith('u1', 'math', 'Explain step by step how to work out √(9) + 1 = 4.');
});

it('calculator: Basic hides the scientific keys', async () => {
  const s = await render(<Calculator />);
  await fireEvent.press(s.getByLabelText('Basic'));
  expect(s.queryByLabelText('sine')).toBeNull();
  expect(s.getByLabelText('equals')).toBeTruthy();
});

it('periodic table: opens on carbon, search selects a match, Ask goes to Science', async () => {
  const s = await render(<PeriodicTable />);
  expect(s.getByText('Carbon')).toBeTruthy();
  await fireEvent.changeText(s.getByLabelText('Search elements'), 'iron');
  expect(s.getByText('Iron')).toBeTruthy();
  expect(s.getByText('Transition metal · Group 8 · Period 4')).toBeTruthy();
  await fireEvent.press(s.getByText('Ask Lucid about iron'));
  expect(askNow).toHaveBeenCalledWith('u1', 'science', 'Tell me about Iron (Fe).');
});

it('periodic table: tapping a cell shows that element', async () => {
  const s = await render(<PeriodicTable />);
  await fireEvent.press(s.getByLabelText('Neon, Ne, atomic number 10, Noble gases'));
  expect(s.getByText('Neon')).toBeTruthy();
  expect(s.getByText('Noble gas · Group 18 · Period 2')).toBeTruthy();
  expect(s.getByText('Valence e⁻')).toBeTruthy();
});
