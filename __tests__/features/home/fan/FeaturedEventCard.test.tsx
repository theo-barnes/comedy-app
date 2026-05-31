import { render, screen } from '@testing-library/react-native';

import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';

const DEFAULT_PROPS = {
  title: 'The Moth Invitational',
  venue: 'The Moth Club',
  neighbourhood: 'Hackney',
  date: 'Fri, 6 Jun',
  time: '9 PM',
  price: '£15',
  badges: ['hotTicket' as const],
  performerAvatars: [undefined],
  performerLabel: '3 performers',
};

describe('FeaturedEventCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<FeaturedEventCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    render(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('The Moth Invitational')).toBeTruthy();
  });

  it('renders the price', () => {
    render(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('£15')).toBeTruthy();
  });

  it('renders venue and neighbourhood', () => {
    render(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('The Moth Club · Hackney')).toBeTruthy();
  });

  it('renders the heart icon for saving', () => {
    render(<FeaturedEventCard {...DEFAULT_PROPS} />);
    // @expo/vector-icons is mocked to render icon name as Text
    expect(screen.getByText('heart-outline')).toBeTruthy();
  });
});
