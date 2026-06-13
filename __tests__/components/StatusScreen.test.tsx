import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';

import { StatusScreen } from '@/components/StatusScreen';

describe('StatusScreen', () => {
  const baseProps = {
    icon: 'checkmark-circle-outline',
    title: 'All done!',
    body: 'Your action was successful.',
  } as const;

  it('renders the title and body', () => {
    renderWithTheme(<StatusScreen {...baseProps} />);
    expect(screen.getByText('All done!')).toBeTruthy();
    expect(screen.getByText('Your action was successful.')).toBeTruthy();
  });

  it('renders the CTA button when cta prop is provided', () => {
    const onPress = jest.fn();
    renderWithTheme(<StatusScreen {...baseProps} cta={{ label: 'Continue', onPress }} />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls cta.onPress when the CTA button is pressed', () => {
    const onPress = jest.fn();
    renderWithTheme(<StatusScreen {...baseProps} cta={{ label: 'Continue', onPress }} />);
    fireEvent.press(screen.getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a CTA button when cta prop is omitted', () => {
    renderWithTheme(<StatusScreen {...baseProps} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
