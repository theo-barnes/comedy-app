import { render, screen } from '@testing-library/react-native';

import { EventCard } from '@/features/home/components/EventCard';

describe('EventCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<EventCard title="Store Nights" subtitle="The Comedy Store" />),
    ).not.toThrow();
  });

  it('renders the title', () => {
    render(<EventCard title="Store Nights" subtitle="The Comedy Store" />);
    expect(screen.getByText('Store Nights')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<EventCard title="Store Nights" subtitle="The Comedy Store" />);
    expect(screen.getByText('The Comedy Store')).toBeTruthy();
  });
});
