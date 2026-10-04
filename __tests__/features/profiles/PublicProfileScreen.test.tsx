import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PublicProfileScreen } from '@/features/profiles/PublicProfileScreen';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUsePublicProfile = jest.fn();

jest.mock('@/lib/api/client', () => ({ isApiConfigured: () => true }));
jest.mock('@/lib/api/public-profiles', () => ({
  usePublicProfile: (userId: string) => mockUsePublicProfile(userId),
}));

describe('PublicProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the fetched public identity and returns using the back arrow', () => {
    mockUsePublicProfile.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'creator-1', displayName: 'Jo King' },
    });

    renderWithTheme(<PublicProfileScreen userId="creator-1" />);

    expect(mockUsePublicProfile).toHaveBeenCalledWith('creator-1');
    expect(screen.getByText('@Jo King')).toBeTruthy();
    fireEvent.press(screen.getByText('arrow-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows an unavailable state for a missing profile', () => {
    mockUsePublicProfile.mockReturnValue({ isPending: false, isError: true, data: undefined });

    renderWithTheme(<PublicProfileScreen userId="missing" />);

    expect(screen.getByText('Profile unavailable')).toBeTruthy();
  });
});
