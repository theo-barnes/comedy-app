import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { ActCard } from '@/features/home/venue/ActCard';

describe('ActCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(
        <ActCard name="Asha Mehta" rating={4.9} tagline="Sharp. Absurdist. Unavoidable." />,
      ),
    ).not.toThrow();
  });

  it('renders the performer name', () => {
    renderWithTheme(
      <ActCard name="Asha Mehta" rating={4.9} tagline="Sharp. Absurdist. Unavoidable." />,
    );
    expect(screen.getByText('Asha Mehta')).toBeTruthy();
  });

  it('renders the ENQUIRE button', () => {
    renderWithTheme(
      <ActCard name="Asha Mehta" rating={4.9} tagline="Sharp. Absurdist. Unavoidable." />,
    );
    // t('home.venue.enquire') returns key in tests
    expect(screen.getByText('home.venue.enquire')).toBeTruthy();
  });
});
