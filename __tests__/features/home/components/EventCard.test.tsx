import { fireEvent, screen } from '@testing-library/react-native';
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

  it('shows the complete poster rather than cropping its text', () => {
    renderWithTheme(
      <EventCard
        title="Friday Late Show"
        subtitle="The Punchline Club"
        imageUri="https://storage.example.com/poster.png"
      />,
    );
    expect(screen.getByLabelText('Friday Late Show').props.resizeMode).toBe('contain');
  });

  it('shows a broken-image fallback and recovers when the immutable poster URL changes', () => {
    const { rerender } = renderWithTheme(
      <EventCard
        title="Friday Late Show"
        subtitle="The Punchline Club"
        imageUri="https://storage.example.com/old.png"
      />,
    );
    fireEvent(screen.getByLabelText('Friday Late Show'), 'error');
    expect(screen.getByText('events.poster.imageUnavailable')).toBeTruthy();
    rerender(
      <EventCard
        title="Friday Late Show"
        subtitle="The Punchline Club"
        imageUri="https://storage.example.com/new.png"
      />,
    );
    expect(screen.getByLabelText('Friday Late Show').props.source).toEqual({
      uri: 'https://storage.example.com/new.png',
    });
    expect(screen.queryByText('events.poster.imageUnavailable')).toBeNull();
  });
});
