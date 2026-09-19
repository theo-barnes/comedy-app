import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { FanHome } from '@/features/home/fan/FanHome';

describe('FanHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<FanHome />)).not.toThrow();
  });

  it('does not render an empty THIS WEEK section', () => {
    renderWithTheme(<FanHome />);
    expect(screen.queryByText('home.fan.thisWeek')).toBeNull();
  });

  it('does not render an empty PERFORMING NEAR YOU section', () => {
    renderWithTheme(<FanHome />);
    expect(screen.queryByText('home.fan.performingNearYou')).toBeNull();
  });

  it('does not render an empty FRESH CLIPS section', () => {
    renderWithTheme(<FanHome />);
    expect(screen.queryByText('home.fan.freshClips')).toBeNull();
  });

  it('does not render fixture-only body sections', () => {
    renderWithTheme(<FanHome />);
    expect(screen.queryByTestId('fan-home-featured-section')).toBeNull();
    expect(screen.queryByTestId('fan-home-saved-section')).toBeNull();
    expect(screen.queryByText('Trending Tonight')).toBeNull();
  });
});
