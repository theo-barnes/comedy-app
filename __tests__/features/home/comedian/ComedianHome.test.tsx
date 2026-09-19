import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { ComedianHome } from '@/features/home/comedian/ComedianHome';

describe('ComedianHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<ComedianHome />)).not.toThrow();
  });

  it('uses the role label when no profile name is provided', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.getByText('home.comedian.yourGigs')).toBeTruthy();
  });

  it('does not render fixture-driven sections', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.queryByTestId('comedian-home-featured-section')).toBeNull();
    expect(screen.queryByTestId('comedian-home-stats-section')).toBeNull();
    expect(screen.queryByTestId('comedian-home-gigs-section')).toBeNull();
  });

  it('uses a supplied profile name in the greeting', () => {
    renderWithTheme(<ComedianHome displayName="Alex" />);
    expect(screen.getByText('home.comedian.greeting')).toBeTruthy();
  });
});
