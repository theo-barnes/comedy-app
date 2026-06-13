import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { TipBanner } from '@/features/home/comedian/TipBanner';

const DEFAULT_PROPS = {
  title: 'Add more clips.',
  body: 'Profiles with 3+ clips get 4× more enquiries from promoters.',
  progress: 1 / 3,
  step: 1,
  totalSteps: 3,
  ctaLabel: 'Upload',
};

describe('TipBanner', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<TipBanner {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the tip body text', () => {
    renderWithTheme(<TipBanner {...DEFAULT_PROPS} />);
    expect(
      screen.getByText('Profiles with 3+ clips get 4× more enquiries from promoters.'),
    ).toBeTruthy();
  });

  it('hides the banner when the dismiss button is pressed', () => {
    renderWithTheme(<TipBanner {...DEFAULT_PROPS} />);
    fireEvent.press(screen.getByText('×'));
    expect(
      screen.queryByText('Profiles with 3+ clips get 4× more enquiries from promoters.'),
    ).toBeNull();
  });
});
