import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';

import { ScreenHeader } from '@/components/ScreenHeader';

describe('ScreenHeader', () => {
  it('renders city and tab label without inline tabs', () => {
    renderWithTheme(<ScreenHeader city="London" tabLabel="Discover" />);

    expect(screen.getByText('London')).toBeTruthy();
    expect(screen.getByText('Discover')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Browse' })).toBeNull();
  });

  it('renders inline tabs and marks selected tab', () => {
    renderWithTheme(
      <ScreenHeader
        city="London"
        tabLabel="Discover"
        inlineTabs={[
          { id: 'browse', label: 'Browse' },
          { id: 'clips', label: 'Clips' },
          { id: 'map', label: 'Map' },
        ]}
        activeInlineTabId="clips"
      />,
    );

    expect(screen.getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clips' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Map' })).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Clips' }).props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Browse' }).props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it('calls onInlineTabPress when a tab is pressed', () => {
    const onInlineTabPress = jest.fn();

    renderWithTheme(
      <ScreenHeader
        city="London"
        tabLabel="Discover"
        inlineTabs={[
          { id: 'browse', label: 'Browse' },
          { id: 'clips', label: 'Clips' },
          { id: 'map', label: 'Map' },
        ]}
        activeInlineTabId="browse"
        onInlineTabPress={onInlineTabPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Map' }));
    expect(onInlineTabPress).toHaveBeenCalledTimes(1);
    expect(onInlineTabPress).toHaveBeenCalledWith('map');
  });

  it('supports long city labels while keeping inline tabs interactive', () => {
    renderWithTheme(
      <ScreenHeader
        city="City of Westminster and Kensington"
        tabLabel="Discover"
        inlineTabs={[
          { id: 'browse', label: 'Browse' },
          { id: 'clips', label: 'Clips' },
          { id: 'map', label: 'Map' },
        ]}
        activeInlineTabId="browse"
      />,
    );

    expect(screen.getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clips' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Map' })).toBeTruthy();
    expect(screen.getByText('City of Westminster and Kensington').props.numberOfLines).toBe(1);
  });
});
