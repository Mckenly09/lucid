import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from './screen';

// Native keyboard and safe-area modules don't run in Jest; stand-ins with a testID show which one Screen picked.
jest.mock('react-native-keyboard-controller', () => {
  const { View } = jest.requireActual('react-native');
  return {
    KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) => (
      <View testID="keyboard-aware-scroll">{children}</View>
    ),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

it('a scrolling form with no footer scrolls the focused field into view instead of moving the screen', async () => {
  const screen = await render(
    <Screen scroll>
      <Text>Form</Text>
    </Screen>,
  );
  expect(screen.getByTestId('keyboard-aware-scroll')).toHaveTextContent('Form');
});

it('a screen with a footer keeps the plain scroll view, so the footer rides up with the keyboard', async () => {
  const screen = await render(
    <Screen scroll footer={<Text>Composer</Text>}>
      <Text>Chat</Text>
    </Screen>,
  );
  expect(screen.queryByTestId('keyboard-aware-scroll')).toBeNull();
  expect(screen.getByText('Chat')).toBeTruthy();
});
