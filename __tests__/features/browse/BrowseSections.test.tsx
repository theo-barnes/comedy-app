import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import {
  TrendingSection,
  CuratorSection,
  FullBillSection,
  LiveNowSection,
} from '@/features/browse/components/BrowseSections';
import { getBrowseConfig } from '@/features/browse/config';

const browse = getBrowseConfig('fan');

describe('TrendingSection', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(
        <TrendingSection sectionTitle="Trending Tonight" shows={browse.trendingShows} />,
      ),
    ).not.toThrow();
  });

  it('renders the section title', () => {
    renderWithTheme(
      <TrendingSection sectionTitle="Trending Tonight" shows={browse.trendingShows} />,
    );
    expect(screen.getByText('Trending Tonight')).toBeTruthy();
  });
});

describe('CuratorSection', () => {
  it('renders the curator title', () => {
    renderWithTheme(<CuratorSection curator={browse.curator} />);
    expect(screen.getByText(browse.curator.title)).toBeTruthy();
  });
});

describe('FullBillSection', () => {
  it('renders the section title', () => {
    renderWithTheme(
      <FullBillSection sectionTitle={browse.fullBillKicker} shows={browse.fullBillShows} />,
    );
    expect(screen.getByText(browse.fullBillKicker)).toBeTruthy();
  });

  it('renders a map icon button when onMapPress is provided', () => {
    const onMapPress = jest.fn();
    renderWithTheme(
      <FullBillSection
        sectionTitle={browse.fullBillKicker}
        shows={browse.fullBillShows}
        onMapPress={onMapPress}
      />,
    );
    expect(screen.getByRole('button', { name: 'View on map' })).toBeTruthy();
  });

  it('calls onMapPress when the map icon is pressed', () => {
    const onMapPress = jest.fn();
    renderWithTheme(
      <FullBillSection
        sectionTitle={browse.fullBillKicker}
        shows={browse.fullBillShows}
        onMapPress={onMapPress}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'View on map' }));
    expect(onMapPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a map icon when onMapPress is omitted', () => {
    renderWithTheme(
      <FullBillSection sectionTitle={browse.fullBillKicker} shows={browse.fullBillShows} />,
    );
    expect(screen.queryByRole('button', { name: 'View on map' })).toBeNull();
  });
});

describe('LiveNowSection', () => {
  it('renders the live now title and venue count', () => {
    renderWithTheme(<LiveNowSection panel={browse.liveNow} />);
    expect(screen.getByText(browse.liveNow.title)).toBeTruthy();
    expect(screen.getByText(browse.liveNow.kicker)).toBeTruthy();
  });
});
