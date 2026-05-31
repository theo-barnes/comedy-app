import { render, screen } from '@testing-library/react-native';

import { StatCard } from '@/features/home/comedian/StatCard';

describe('StatCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />),
    ).not.toThrow();
  });

  it('renders the value', () => {
    render(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('1.4K')).toBeTruthy();
  });

  it('renders the label', () => {
    render(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('PROFILE VIEWS')).toBeTruthy();
  });

  it('renders the delta', () => {
    render(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('+18% this week')).toBeTruthy();
  });
});
