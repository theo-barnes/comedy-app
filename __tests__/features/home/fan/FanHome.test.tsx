import { render, screen } from '@testing-library/react-native';

import { FanHome } from '@/features/home/fan/FanHome';

describe('FanHome', () => {
  it('renders without crashing', () => {
    expect(() => render(<FanHome />)).not.toThrow();
  });

  it('renders the THIS WEEK section header', () => {
    render(<FanHome />);
    // t('home.fan.thisWeek') returns the key in tests
    expect(screen.getByText('home.fan.thisWeek')).toBeTruthy();
  });

  it('renders the PERFORMING NEAR YOU section header', () => {
    render(<FanHome />);
    expect(screen.getByText('home.fan.performingNearYou')).toBeTruthy();
  });

  it('renders the FRESH CLIPS section header', () => {
    render(<FanHome />);
    expect(screen.getByText('home.fan.freshClips')).toBeTruthy();
  });
});
