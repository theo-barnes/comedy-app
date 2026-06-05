import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import { DiscoverShell } from '@/features/discover/components/DiscoverShell';
import { getDiscoverConfig } from '@/features/discover/config';

describe('DiscoverShell', () => {
  it('renders without crashing', () => {
    const config = getDiscoverConfig('fan');
    expect(() => renderWithTheme(<DiscoverShell config={config} />)).not.toThrow();
  });

  it('renders the clips feed directly — no segmented bar', () => {
    const config = getDiscoverConfig('fan');
    renderWithTheme(<DiscoverShell config={config} />);

    // Segmented controls are gone
    expect(screen.queryByRole('button', { name: 'Browse' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Map' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open discover search' })).toBeNull();
  });

  it('renders the clips feed component — segmented bar absent', () => {
    const config = getDiscoverConfig('fan');
    renderWithTheme(<DiscoverShell config={config} />);

    // No browse hero title (BrowseView is gone)
    expect(screen.queryByText(config.browse.heroTitle)).toBeNull();
    // No map filters (MapView is gone)
    expect(screen.queryByText(config.map.filters[0])).toBeNull();
  });
});
