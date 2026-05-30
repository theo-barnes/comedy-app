import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BackButton } from '@/components/BackButton';

describe('BackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls router.back() when pressed with no onPress prop', () => {
    render(<BackButton />);
    // Icon mock renders the icon name as Text; fireEvent bubbles up to the Pressable.
    fireEvent.press(screen.getByText('arrow-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('calls the custom onPress handler instead of router.back()', () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} />);
    fireEvent.press(screen.getByText('arrow-back'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });
});
