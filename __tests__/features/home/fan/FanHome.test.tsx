import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { FanHome } from '@/features/home/fan/FanHome';

describe('FanHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<FanHome />)).not.toThrow();
  });

  it('renders the THIS WEEK section header', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('home.fan.thisWeek')).toBeTruthy();
  });

  it('renders the PERFORMING NEAR YOU section header', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('home.fan.performingNearYou')).toBeTruthy();
  });

  it('renders the FRESH CLIPS section header without a Browse action label', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('home.fan.freshClips')).toBeTruthy();
    expect(screen.queryByText('Browse')).toBeNull();
  });

  it('renders the standardized body sections', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByTestId('fan-home-featured-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-this-week-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-performers-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-clips-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-saved-section')).toBeTruthy();
  });

  it('renders browse sections appended below existing content', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('Trending Tonight')).toBeTruthy();
    expect(screen.getByText("This Week's Spotlight")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View on map' })).toBeTruthy();
    expect(screen.getByText('LIVE NOW')).toBeTruthy();
  });
});
