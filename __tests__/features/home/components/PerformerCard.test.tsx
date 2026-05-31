import { render, screen } from '@testing-library/react-native';

import { PerformerCard } from '@/features/home/components/PerformerCard';

describe('PerformerCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<PerformerCard name="Asha Mehta" subtitle="29.1K" />)).not.toThrow();
  });

  it('renders the performer name', () => {
    render(<PerformerCard name="Asha Mehta" subtitle="29.1K" />);
    expect(screen.getByText('Asha Mehta')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<PerformerCard name="Asha Mehta" subtitle="29.1K" />);
    expect(screen.getByText('29.1K')).toBeTruthy();
  });
});
