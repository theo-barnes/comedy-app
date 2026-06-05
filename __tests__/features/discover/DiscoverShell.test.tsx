import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import { DiscoverShell } from '@/features/discover/components/DiscoverShell';
import { getDiscoverConfig } from '@/features/discover/config';

describe('DiscoverShell', () => {
  it('renders Discover segmented top controls and no mode icons', () => {
    const config = getDiscoverConfig('fan');

    renderWithTheme(<DiscoverShell config={config} />);

    expect(screen.getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clips' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Map' })).toBeTruthy();

    expect(screen.queryByText('home-outline')).toBeNull();
    expect(screen.queryByText('grid-outline')).toBeNull();
    expect(screen.queryByText('map-outline')).toBeNull();

    expect(screen.getByRole('button', { name: 'Open discover search' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Open discover filters' }).props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('switches views when segmented controls are pressed', () => {
    const config = getDiscoverConfig('fan');

    renderWithTheme(<DiscoverShell config={config} />);

    expect(screen.getByText(config.browse.heroTitle)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clips' }));
    expect(screen.getByRole('button', { name: 'Clips' }).props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.queryByText(config.browse.heroTitle)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Map' }));
    expect(screen.getByText(config.map.filters[0])).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Open discover filters' }).props.accessibilityState
        ?.disabled,
    ).toBe(false);
  });
});
