import { screen } from '@testing-library/react-native';

import { HomeHeroHeader } from '@/components/HomeHeroHeader';

import { renderWithTheme } from '../utils/renderWithTheme';

describe('HomeHeroHeader', () => {
  // Noon UTC keeps the calendar day stable across test-runner timezones.
  const date = new Date('2026-09-27T12:00:00Z');

  it('renders the brand name as a header', () => {
    renderWithTheme(<HomeHeroHeader date={date} />);

    expect(screen.getByRole('header', { name: 'Cues' })).toBeTruthy();
  });

  it('renders the long weekday and month date', () => {
    renderWithTheme(<HomeHeroHeader date={date} />);

    expect(screen.getByText('Sunday, September 27')).toBeTruthy();
  });
});
