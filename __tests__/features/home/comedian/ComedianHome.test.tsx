import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { ComedianHome } from '@/features/home/comedian/ComedianHome';

describe('ComedianHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<ComedianHome />)).not.toThrow();
  });

  it('renders the shared brand header', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.getByText('Cues')).toBeTruthy();
  });

  it('does not render fixture-driven sections', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.queryByTestId('comedian-home-featured-section')).toBeNull();
    expect(screen.queryByTestId('comedian-home-stats-section')).toBeNull();
    expect(screen.queryByTestId('comedian-home-gigs-section')).toBeNull();
  });
});
