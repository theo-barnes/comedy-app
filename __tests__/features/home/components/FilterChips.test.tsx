import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { FilterChips } from '@/features/home/components/FilterChips';

const OPTIONS = ['All', 'Comedy', 'Improv'];

type Overrides = Partial<React.ComponentProps<typeof FilterChips>>;

function renderChips(overrides: Overrides = {}) {
  return renderWithTheme(
    <FilterChips options={OPTIONS} selected="All" onSelect={() => {}} {...overrides} />,
  );
}

describe('FilterChips', () => {
  it('renders without crashing', () => {
    expect(() => renderChips()).not.toThrow();
  });

  it('renders all option labels', () => {
    renderChips();
    for (const option of OPTIONS) {
      expect(screen.getByText(option)).toBeTruthy();
    }
  });

  it('calls onSelect with the tapped value', () => {
    const onSelect = jest.fn();
    renderChips({ onSelect });
    fireEvent.press(screen.getByText('Comedy'));
    expect(onSelect).toHaveBeenCalledWith('Comedy');
  });

  it('marks the selected chip with accessibilityState.selected=true', () => {
    renderChips({ selected: 'Improv' });
    const chips = screen.getAllByRole('button');
    expect(chips).toHaveLength(OPTIONS.length);
    expect(chips[2]?.props.accessibilityState).toMatchObject({ selected: true });
    expect(chips[0]?.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('renders a glass pill only behind the selected chip', () => {
    renderChips({ selected: 'Improv' });
    expect(screen.getByTestId('filter-chip-glass-Improv')).toBeTruthy();
    expect(screen.queryByTestId('filter-chip-glass-All')).toBeNull();
    expect(screen.queryByTestId('filter-chip-glass-Comedy')).toBeNull();
  });

  it('falls back to a solid bordered pill when glass is unavailable', () => {
    // jest.setup.ts mocks expo-glass-effect as unavailable.
    renderChips();
    const pill = screen.getByTestId('filter-chip-glass-All');
    const flattened = Object.assign({}, ...[pill.props.style].flat(3).filter(Boolean));
    expect(flattened.backgroundColor).toBeTruthy();
    expect(flattened.borderWidth).toBe(1);
    expect(flattened.borderBottomColor).toBeUndefined();
  });
});
