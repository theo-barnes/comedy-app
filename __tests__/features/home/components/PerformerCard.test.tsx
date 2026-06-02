import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { PerformerCard } from '@/features/home/components/PerformerCard';

describe('PerformerCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<PerformerCard name="Asha Mehta" subtitle="29.1K" />),
    ).not.toThrow();
  });

  it('renders the performer name', () => {
    renderWithTheme(<PerformerCard name="Asha Mehta" subtitle="29.1K" />);
    expect(screen.getByText('Asha Mehta')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    renderWithTheme(<PerformerCard name="Asha Mehta" subtitle="29.1K" />);
    expect(screen.getByText('29.1K')).toBeTruthy();
  });
});
