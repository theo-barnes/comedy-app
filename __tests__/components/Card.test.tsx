import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';
import { Text } from 'react-native';

import { Card } from '@/components/Card';

describe('Card', () => {
  it('renders its children', () => {
    renderWithTheme(
      <Card>
        <Text>Content</Text>
      </Card>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <Card onPress={onPress}>
        <Text>Content</Text>
      </Card>,
    );
    fireEvent.press(screen.getByText('Content'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call any press handler when onPress is not provided', () => {
    // Should render without error and not be pressable
    expect(() =>
      renderWithTheme(
        <Card>
          <Text>Content</Text>
        </Card>,
      ),
    ).not.toThrow();
  });
});
