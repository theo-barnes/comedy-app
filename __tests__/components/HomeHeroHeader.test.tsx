import { screen } from '@testing-library/react-native';

import { HomeHeroHeader } from '@/components/HomeHeroHeader';

import { renderWithTheme } from '../utils/renderWithTheme';

describe('HomeHeroHeader', () => {
  it('renders the title', () => {
    renderWithTheme(<HomeHeroHeader title="Tonight's Rooms" />);

    expect(screen.getByText("Tonight's Rooms")).toBeTruthy();
  });
});
