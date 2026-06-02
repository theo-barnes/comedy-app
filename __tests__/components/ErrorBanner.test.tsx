import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';

import { ErrorBanner } from '@/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { toJSON } = renderWithTheme(<ErrorBanner message={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the error message when provided', () => {
    renderWithTheme(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
