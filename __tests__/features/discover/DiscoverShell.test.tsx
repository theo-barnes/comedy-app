import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

jest.mock('@/features/discover/components/FeedVideoPlayer', () => ({
  FeedVideoPlayer: () => null,
}));

import { DiscoverShell } from '@/features/discover/components/DiscoverShell';

describe('DiscoverShell', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<DiscoverShell />)).not.toThrow();
  });

  it('does not render former discover controls', () => {
    renderWithTheme(<DiscoverShell />);

    expect(screen.queryByRole('button', { name: 'Browse' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Map' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open discover search' })).toBeNull();
  });

  it('does not render static clip or browse content', () => {
    renderWithTheme(<DiscoverShell />);

    expect(screen.queryByText('Crowd work at the Brickhouse')).toBeNull();
    expect(screen.queryByText('Tonight, London is laughing.')).toBeNull();
  });
});
