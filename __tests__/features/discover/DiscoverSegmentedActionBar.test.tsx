import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../utils/renderWithTheme';

import { DiscoverSegmentedActionBar } from '@/features/discover/components/DiscoverSegmentedActionBar';

const MODES = [
  { id: 'browse', label: 'Browse', icon: 'home-outline' },
  { id: 'clips', label: 'Clips', icon: 'grid-outline' },
  { id: 'map', label: 'Map', icon: 'map-outline' },
] as const;

describe('DiscoverSegmentedActionBar', () => {
  it('marks the active view and triggers view changes', () => {
    const onViewChange = jest.fn();

    renderWithTheme(
      <DiscoverSegmentedActionBar
        modes={MODES}
        activeView="browse"
        onViewChange={onViewChange}
        onSearchPress={jest.fn()}
        onFilterPress={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Browse' }).props.accessibilityState?.selected).toBe(
      true,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Clips' }));
    expect(onViewChange).toHaveBeenCalledWith('clips');
  });

  it('passes active view context to search and filter actions', () => {
    const onSearchPress = jest.fn();
    const onFilterPress = jest.fn();

    renderWithTheme(
      <DiscoverSegmentedActionBar
        modes={MODES}
        activeView="map"
        onViewChange={jest.fn()}
        onSearchPress={onSearchPress}
        onFilterPress={onFilterPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open discover search' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open discover filters' }));

    expect(onSearchPress).toHaveBeenCalledWith('map');
    expect(onFilterPress).toHaveBeenCalledWith('map');
  });

  it('disables filter action when filterEnabled is false', () => {
    const onFilterPress = jest.fn();

    renderWithTheme(
      <DiscoverSegmentedActionBar
        modes={MODES}
        activeView="browse"
        onViewChange={jest.fn()}
        onSearchPress={jest.fn()}
        onFilterPress={onFilterPress}
        filterEnabled={false}
      />,
    );

    const filterButton = screen.getByRole('button', { name: 'Open discover filters' });
    expect(filterButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(filterButton);
    expect(onFilterPress).not.toHaveBeenCalled();
  });
});
