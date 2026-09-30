import { screen } from '@testing-library/react-native';

import MapScreen from '../../../app/(tabs)/map';
import { renderWithTheme } from '../../utils/renderWithTheme';

jest.mock('@/features/location', () => ({
  useHeaderLocationLabel: () => ({
    cityLabel: 'London',
    onCityPress: jest.fn(),
  }),
}));

describe('MapScreen', () => {
  it('renders the shared header and placeholder copy', () => {
    renderWithTheme(<MapScreen />);

    expect(screen.getByText('London')).toBeTruthy();
    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getByText('A live map of local comedy shows is coming soon.')).toBeTruthy();
  });
});
