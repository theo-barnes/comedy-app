import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { ComedianHome } from '@/features/home/comedian/ComedianHome';

describe('ComedianHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<ComedianHome />)).not.toThrow();
  });

  it('renders the YOUR GIGS section header', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.getByText('home.comedian.yourGigs')).toBeTruthy();
  });

  it('renders the OTHERS ON THE CIRCUIT section header', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.getByText('home.comedian.othersOnCircuit')).toBeTruthy();
  });

  it('renders the standardized body sections', () => {
    renderWithTheme(<ComedianHome />);
    expect(screen.getByTestId('comedian-home-featured-section')).toBeTruthy();
    expect(screen.getByTestId('comedian-home-stats-section')).toBeTruthy();
    expect(screen.getByTestId('comedian-home-tip-section')).toBeTruthy();
    expect(screen.getByTestId('comedian-home-gigs-section')).toBeTruthy();
    expect(screen.getByTestId('comedian-home-same-night-section')).toBeTruthy();
  });
});
