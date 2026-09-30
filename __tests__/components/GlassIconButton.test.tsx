import { fireEvent, screen } from '@testing-library/react-native';

import { GlassIconButton } from '@/components/GlassIconButton';
import { renderWithTheme } from '../utils/renderWithTheme';

describe('GlassIconButton', () => {
  it('renders the icon and forwards presses', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <GlassIconButton iconName="search" onPress={onPress} accessibilityLabel="Search" />,
    );
    // @expo/vector-icons is mocked to render the icon name as text.
    expect(screen.getByText('search')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Search'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sizes the surface as a circle and applies the solid fallback ring', () => {
    renderWithTheme(
      <GlassIconButton
        iconName="close"
        onPress={() => {}}
        accessibilityLabel="Close"
        size={40}
        testID="btn"
      />,
    );
    const flattened = Object.assign(
      {},
      ...[screen.getByTestId('btn').props.style].flat(3).filter(Boolean),
    );
    expect(flattened.width).toBe(40);
    expect(flattened.height).toBe(40);
    expect(flattened.borderWidth).toBe(1);
    expect(flattened.backgroundColor).toBeTruthy();
  });
});
