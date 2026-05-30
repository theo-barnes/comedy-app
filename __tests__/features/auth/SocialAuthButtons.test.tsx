import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';

// react-i18next is mocked globally — t returns the key.

describe('SocialAuthButtons', () => {
  const defaultProps = {
    onGooglePress: jest.fn(),
    onApplePress: jest.fn(),
  };

  it('always renders the Google button', () => {
    render(<SocialAuthButtons {...defaultProps} />);
    // t('auth.social.googleCta') returns the key
    expect(screen.getByText('auth.social.googleCta')).toBeTruthy();
  });

  it('renders the Apple button on iOS', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    render(<SocialAuthButtons {...defaultProps} />);
    expect(screen.queryByText('auth.social.appleCta')).toBeTruthy();
  });

  it('does not render the Apple button on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<SocialAuthButtons {...defaultProps} />);
    expect(screen.queryByText('auth.social.appleCta')).toBeNull();
  });

  it('shows loading state on the Google button when googleLoading is true', () => {
    render(<SocialAuthButtons {...defaultProps} googleLoading />);
    // When loading, Button hides the text and shows ActivityIndicator.
    expect(screen.queryByText('auth.social.googleCta')).toBeNull();
  });
});
