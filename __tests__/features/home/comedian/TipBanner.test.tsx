import { fireEvent, render, screen } from '@testing-library/react-native';

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
    expect(() => render(<TipBanner {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the tip body text', () => {
    render(<TipBanner {...DEFAULT_PROPS} />);
    expect(
      screen.getByText('Profiles with 3+ clips get 4× more enquiries from promoters.'),
    ).toBeTruthy();
  });

  it('hides the banner when the dismiss button is pressed', () => {
    render(<TipBanner {...DEFAULT_PROPS} />);
    fireEvent.press(screen.getByText('×'));
    expect(
      screen.queryByText('Profiles with 3+ clips get 4× more enquiries from promoters.'),
    ).toBeNull();
  });
});
