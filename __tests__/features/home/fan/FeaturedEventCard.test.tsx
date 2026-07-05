import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';

const DEFAULT_PROPS = {
  title: 'The Storytellers Invitational',
  venue: 'The Velvet Curtain',
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
    expect(() => renderWithTheme(<FeaturedEventCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    renderWithTheme(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('The Storytellers Invitational')).toBeTruthy();
  });

  it('renders the price', () => {
    renderWithTheme(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('£15')).toBeTruthy();
  });

  it('renders venue and neighbourhood', () => {
    renderWithTheme(<FeaturedEventCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('The Velvet Curtain · Hackney')).toBeTruthy();
  });

  it('renders the heart icon for saving', () => {
    renderWithTheme(<FeaturedEventCard {...DEFAULT_PROPS} />);
    // @expo/vector-icons is mocked to render icon name as Text
    expect(screen.getByText('heart-outline')).toBeTruthy();
  });
});
