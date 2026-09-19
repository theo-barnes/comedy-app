import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';

// react-i18next is mocked globally — t returns the key.

describe('SocialAuthButtons', () => {
  const defaultProps = {
    onGooglePress: jest.fn(),
  };

  it('always renders the Google button', () => {
    renderWithTheme(<SocialAuthButtons {...defaultProps} />);
    // t('auth.social.googleCta') returns the key
    expect(screen.getByText('auth.social.googleCta')).toBeTruthy();
  });

  it('does not render an Apple button', () => {
    renderWithTheme(<SocialAuthButtons {...defaultProps} />);
    expect(screen.queryByText('auth.social.appleCta')).toBeNull();
  });

  it('shows loading state on the Google button when googleLoading is true', () => {
    renderWithTheme(<SocialAuthButtons {...defaultProps} googleLoading />);
    // When loading, Button hides the text and shows ActivityIndicator.
    expect(screen.queryByText('auth.social.googleCta')).toBeNull();
  });
});
