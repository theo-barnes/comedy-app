import { render, screen } from '@testing-library/react-native';

import { HomeHeader } from '@/features/home/components/HomeHeader';

describe('HomeHeader', () => {
  it('renders without crashing', () => {
    expect(() => render(<HomeHeader city="London" role="fan" />)).not.toThrow();
  });

  it('renders the city name', () => {
    render(<HomeHeader city="London" role="fan" />);
    expect(screen.getByText('London')).toBeTruthy();
  });

  it('shows FAN for fan role', () => {
    render(<HomeHeader city="London" role="fan" />);
    expect(screen.getByText('FAN')).toBeTruthy();
  });

  it('shows COMEDIAN for comedian role', () => {
    render(<HomeHeader city="London" role="comedian" />);
    expect(screen.getByText('COMEDIAN')).toBeTruthy();
  });

  it('shows PROMOTER for venue role', () => {
    render(<HomeHeader city="London" role="venue" />);
    expect(screen.getByText('PROMOTER')).toBeTruthy();
  });

  it('renders notification badge count when notificationCount > 0', () => {
    render(<HomeHeader city="London" role="fan" notificationCount={5} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does not render badge when notificationCount is 0', () => {
    render(<HomeHeader city="London" role="fan" notificationCount={0} />);
    expect(screen.queryByText('0')).toBeNull();
  });
});
