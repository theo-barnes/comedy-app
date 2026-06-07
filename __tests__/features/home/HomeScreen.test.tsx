import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

// Must be mocked before any transitive import of useAuth resolves
jest.mock('@/features/auth/context', () => ({
  AuthContext: require('react').createContext(null), // eslint-disable-line @typescript-eslint/no-require-imports
}));

import { useAuth } from '@/features/auth/useAuth';
import { HomeScreen } from '@/features/home';

jest.mock('@/features/auth/useAuth');

// Mock child home screens to isolate HomeScreen routing logic
jest.mock('@/features/home/fan/FanHome', () => ({
  FanHome: () => {
    const { Text } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    return require('react').createElement(Text, null, 'FanHome'); // eslint-disable-line @typescript-eslint/no-require-imports
  },
}));
jest.mock('@/features/home/comedian/ComedianHome', () => ({
  ComedianHome: () => {
    const { Text } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    return require('react').createElement(Text, null, 'ComedianHome'); // eslint-disable-line @typescript-eslint/no-require-imports
  },
}));
jest.mock('@/features/home/venue/VenueHome', () => ({
  VenueHome: () => {
    const { Text } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    return require('react').createElement(Text, null, 'VenueHome'); // eslint-disable-line @typescript-eslint/no-require-imports
  },
}));

const mockUseAuth = useAuth as jest.Mock;

describe('HomeScreen', () => {
  it('renders FanHome when profile is null (guest)', () => {
    mockUseAuth.mockReturnValue({ profile: null, isLoading: false, isGuest: true });
    renderWithTheme(<HomeScreen />);
    expect(screen.getByText('FanHome')).toBeTruthy();
  });

  it('renders FanHome for fan role', () => {
    mockUseAuth.mockReturnValue({ profile: { role: 'fan' }, isLoading: false, isGuest: false });
    renderWithTheme(<HomeScreen />);
    expect(screen.getByText('FanHome')).toBeTruthy();
  });

  it('renders ComedianHome for comedian role', () => {
    mockUseAuth.mockReturnValue({
      profile: { role: 'comedian' },
      isLoading: false,
      isGuest: false,
    });
    renderWithTheme(<HomeScreen />);
    expect(screen.getByText('ComedianHome')).toBeTruthy();
  });

  it('renders VenueHome for venue role', () => {
    mockUseAuth.mockReturnValue({ profile: { role: 'venue' }, isLoading: false, isGuest: false });
    renderWithTheme(<HomeScreen />);
    expect(screen.getByText('VenueHome')).toBeTruthy();
  });

  it('renders nothing (null) while loading', () => {
    mockUseAuth.mockReturnValue({ profile: null, isLoading: true, isGuest: false });
    const { toJSON } = renderWithTheme(<HomeScreen />);
    expect(toJSON()).toBeNull();
  });
});
