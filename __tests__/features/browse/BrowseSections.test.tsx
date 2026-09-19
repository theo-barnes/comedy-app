import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import {
  TrendingSection,
  CuratorSection,
  FullBillSection,
  LiveNowSection,
} from '@/features/browse/components/BrowseSections';
import type { BrowseShow, CuratorSpotlight, LiveNowPanel } from '@/features/browse/types';

const show: BrowseShow = {
  id: 'show-1',
  date: 'Tonight',
  title: 'Test Show',
  venue: 'Test Venue',
  neighbourhood: 'N1',
  price: '£10',
  imageUri: 'https://example.com/show.jpg',
};

const curator: CuratorSpotlight = {
  kicker: 'Test picks',
  title: 'Test curator title',
  avatarUris: [],
  extraLabel: '',
  cta: 'See picks',
};

const liveNow: LiveNowPanel = {
  kicker: 'LIVE NOW',
  timeLabel: '21:14',
  title: 'One room is live.',
  venues: [{ name: 'Test Venue', value: '2 seats' }],
  cta: 'See all',
};

describe('TrendingSection', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<TrendingSection sectionTitle="Trending Tonight" shows={[show]} />),
    ).not.toThrow();
  });

  it('renders the section title', () => {
    renderWithTheme(<TrendingSection sectionTitle="Trending Tonight" shows={[show]} />);
    expect(screen.getByText('Trending Tonight')).toBeTruthy();
  });
});

describe('CuratorSection', () => {
  it('renders the curator title', () => {
    renderWithTheme(<CuratorSection curator={curator} />);
    expect(screen.getByText(curator.title)).toBeTruthy();
  });
});

describe('FullBillSection', () => {
  it('renders the section title', () => {
    renderWithTheme(<FullBillSection sectionTitle="This week" shows={[show]} />);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('renders a map icon button when onMapPress is provided', () => {
    const onMapPress = jest.fn();
    renderWithTheme(
      <FullBillSection sectionTitle="This week" shows={[show]} onMapPress={onMapPress} />,
    );
    expect(screen.getByRole('button', { name: 'View on map' })).toBeTruthy();
  });

  it('calls onMapPress when the map icon is pressed', () => {
    const onMapPress = jest.fn();
    renderWithTheme(
      <FullBillSection sectionTitle="This week" shows={[show]} onMapPress={onMapPress} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'View on map' }));
    expect(onMapPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a map icon when onMapPress is omitted', () => {
    renderWithTheme(<FullBillSection sectionTitle="This week" shows={[show]} />);
    expect(screen.queryByRole('button', { name: 'View on map' })).toBeNull();
  });
});

describe('LiveNowSection', () => {
  it('renders the live now title and venue count', () => {
    renderWithTheme(<LiveNowSection panel={liveNow} />);
    expect(screen.getByText(liveNow.title)).toBeTruthy();
    expect(screen.getByText(liveNow.kicker)).toBeTruthy();
  });
});
