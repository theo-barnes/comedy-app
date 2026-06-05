import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { FanHome } from '@/features/home/fan/FanHome';

describe('FanHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<FanHome />)).not.toThrow();
  });

  it('renders the THIS WEEK section header', () => {
    renderWithTheme(<FanHome />);
    // t('home.fan.thisWeek') returns the key in tests
    expect(screen.getByText('home.fan.thisWeek')).toBeTruthy();
  });

  it('renders the PERFORMING NEAR YOU section header', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('home.fan.performingNearYou')).toBeTruthy();
  });

  it('renders the FRESH CLIPS section header', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByText('home.fan.freshClips')).toBeTruthy();
  });

  it('renders the standardized body sections', () => {
    renderWithTheme(<FanHome />);
    expect(screen.getByTestId('fan-home-featured-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-this-week-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-performers-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-clips-section')).toBeTruthy();
    expect(screen.getByTestId('fan-home-saved-section')).toBeTruthy();
  });
});
