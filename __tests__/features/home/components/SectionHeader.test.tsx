import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { SectionHeader } from '@/features/home/components/SectionHeader';

describe('SectionHeader', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<SectionHeader label="MY SECTION" />)).not.toThrow();
  });

  it('renders the label text', () => {
    renderWithTheme(<SectionHeader label="MY SECTION" />);
    expect(screen.getByText('MY SECTION')).toBeTruthy();
  });

  it('renders the action link when actionLabel is provided', () => {
    renderWithTheme(<SectionHeader label="MY SECTION" actionLabel="See all" onAction={() => {}} />);
    expect(screen.getByText('See all')).toBeTruthy();
  });

  it('does not render an action link when actionLabel is omitted', () => {
    renderWithTheme(<SectionHeader label="MY SECTION" />);
    expect(screen.queryByText('See all')).toBeNull();
  });

  it('calls onAction when action link is pressed', () => {
    const onAction = jest.fn();
    renderWithTheme(<SectionHeader label="MY SECTION" actionLabel="See all" onAction={onAction} />);
    fireEvent.press(screen.getByText('See all'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders an icon button when iconAction is provided', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <SectionHeader
        label="MY SECTION"
        iconAction={{ iconName: 'map-outline', onPress, accessibilityLabel: 'View on map' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'View on map' })).toBeTruthy();
  });

  it('calls iconAction.onPress when icon button is pressed', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <SectionHeader
        label="MY SECTION"
        iconAction={{ iconName: 'map-outline', onPress, accessibilityLabel: 'View on map' }}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'View on map' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders both actionLabel and iconAction when both are provided', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <SectionHeader
        label="MY SECTION"
        actionLabel="See all"
        onAction={() => {}}
        iconAction={{ iconName: 'map-outline', onPress, accessibilityLabel: 'View on map' }}
      />,
    );
    expect(screen.getByText('See all')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View on map' })).toBeTruthy();
  });
});
