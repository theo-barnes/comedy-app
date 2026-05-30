import { render, screen } from '@testing-library/react-native';

import { ErrorBanner } from '@/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { toJSON } = render(<ErrorBanner message={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the error message when provided', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
