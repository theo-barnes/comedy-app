import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { EventCard } from '@/features/home/components/EventCard';

describe('EventCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<EventCard title="Store Nights" subtitle="The Comedy Store" />),
    ).not.toThrow();
  });

  it('renders the title', () => {
    renderWithTheme(<EventCard title="Store Nights" subtitle="The Comedy Store" />);
    expect(screen.getByText('Store Nights')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    renderWithTheme(<EventCard title="Store Nights" subtitle="The Comedy Store" />);
    expect(screen.getByText('The Comedy Store')).toBeTruthy();
  });
});
