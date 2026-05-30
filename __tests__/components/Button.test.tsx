import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders the label text', () => {
    render(<Button>Press me</Button>);
    expect(screen.getByText('Press me')).toBeTruthy();
  });

  it('hides label text and shows ActivityIndicator when loading', () => {
    render(<Button loading>Press me</Button>);
    expect(screen.queryByText('Press me')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Press me</Button>);
    fireEvent.press(screen.getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} disabled>
        Press me
      </Button>,
    );
    await user.press(screen.getByText('Press me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
