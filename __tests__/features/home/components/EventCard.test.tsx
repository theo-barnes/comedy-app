import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { EventCard } from '@/features/home/components/EventCard';

describe('EventCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<EventCard title="Friday Late Show" subtitle="The Punchline Club" />),
    ).not.toThrow();
  });

  it('renders the title', () => {
    renderWithTheme(<EventCard title="Friday Late Show" subtitle="The Punchline Club" />);
    expect(screen.getByText('Friday Late Show')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    renderWithTheme(<EventCard title="Friday Late Show" subtitle="The Punchline Club" />);
    expect(screen.getByText('The Punchline Club')).toBeTruthy();
  });
});
