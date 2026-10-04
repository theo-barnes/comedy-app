import { screen } from '@testing-library/react-native';

import { MyProfileScreen } from '@/features/profiles/MyProfileScreen';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUseAuth = jest.fn();

jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('MyProfileScreen', () => {
  it('renders the authenticated viewer identity without a public profile lookup', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, profile: { display_name: 'Jo King' } });

    renderWithTheme(<MyProfileScreen />);

    expect(screen.getByText('@Jo King')).toBeTruthy();
  });
});
