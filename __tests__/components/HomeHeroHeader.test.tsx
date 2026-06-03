import { screen } from '@testing-library/react-native';

import { HomeHeroHeader } from '@/components/HomeHeroHeader';

import { renderWithTheme } from '../utils/renderWithTheme';

describe('HomeHeroHeader', () => {
  it('renders the title and subtitle', () => {
    renderWithTheme(
      <HomeHeroHeader title="Tonight's Rooms" subtitle="4 Shows near you this week" />,
    );

    expect(screen.getByText("Tonight's Rooms")).toBeTruthy();
    expect(screen.getByText('4 Shows near you this week')).toBeTruthy();
  });

  it('renders subtitle using muted AppText style', () => {
    renderWithTheme(<HomeHeroHeader title="Hello" subtitle="Muted subtitle" />);

    const subtitle = screen.getByText('Muted subtitle');
    const flatStyle = subtitle.props.style as Record<string, unknown>[];
    const hasColorStyle = flatStyle.some(
      (s) => s && typeof s === 'object' && 'color' in s && s.color !== undefined,
    );

    expect(hasColorStyle).toBe(true);
  });
});
