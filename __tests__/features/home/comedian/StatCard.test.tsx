import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { StatCard } from '@/features/home/comedian/StatCard';

describe('StatCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />),
    ).not.toThrow();
  });

  it('renders the value', () => {
    renderWithTheme(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('1.4K')).toBeTruthy();
  });

  it('renders the label', () => {
    renderWithTheme(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('PROFILE VIEWS')).toBeTruthy();
  });

  it('renders the delta', () => {
    renderWithTheme(<StatCard value="1.4K" label="PROFILE VIEWS" delta="+18% this week" />);
    expect(screen.getByText('+18% this week')).toBeTruthy();
  });
});
