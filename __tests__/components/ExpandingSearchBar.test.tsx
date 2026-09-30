import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ExpandingSearchBar } from '@/components/ExpandingSearchBar';
import { renderWithTheme } from '../utils/renderWithTheme';

type Overrides = Partial<React.ComponentProps<typeof ExpandingSearchBar>>;

function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(3).filter(Boolean));
}

function renderBar(overrides: Overrides = {}) {
  return renderWithTheme(
    <ExpandingSearchBar query="" onQueryChange={() => {}} onSubmit={() => {}} {...overrides}>
      <Text>collapsed content</Text>
    </ExpandingSearchBar>,
  );
}

// The inactive side is hidden from accessibility, which RNTL excludes by default.
const hidden = { includeHiddenElements: true } as const;

describe('ExpandingSearchBar', () => {
  it('renders children and a search toggle while collapsed', () => {
    renderBar();
    expect(screen.getByText('collapsed content')).toBeTruthy();
    expect(screen.getByLabelText('common.search')).toBeTruthy();
    expect(screen.getByLabelText('common.search').props.accessibilityState).toMatchObject({
      expanded: false,
    });
    const input = screen.getByTestId('expanding-search-bar-input', hidden);
    expect(input.props.editable).toBe(false);
    expect(
      flatten(screen.getByTestId('expanding-search-bar-field', hidden).props.style).pointerEvents,
    ).toBe('none');
  });

  it('opens on toggle: field becomes interactive, content is hidden from touch and a11y', () => {
    renderBar();
    fireEvent.press(screen.getByLabelText('common.search'));

    const input = screen.getByTestId('expanding-search-bar-input');
    expect(input.props.editable).toBe(true);
    expect(input.props.placeholder).toBe('search.placeholder');
    expect(
      flatten(screen.getByTestId('expanding-search-bar-field').props.style).pointerEvents,
    ).toBe('auto');
    const content = screen.getByTestId('expanding-search-bar-content', hidden);
    expect(flatten(content.props.style).pointerEvents).toBe('none');
    expect(content.props.accessibilityElementsHidden).toBe(true);
    expect(screen.getByLabelText('common.close')).toBeTruthy();
  });

  it('reports typed text and submission and stays open', () => {
    const onQueryChange = jest.fn();
    const onSubmit = jest.fn();
    renderBar({ query: 'open mic', onQueryChange, onSubmit });
    fireEvent.press(screen.getByLabelText('common.search'));

    const input = screen.getByTestId('expanding-search-bar-input');
    fireEvent.changeText(input, 'open mic night');
    expect(onQueryChange).toHaveBeenCalledWith('open mic night');
    fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('open mic');
    expect(screen.getByLabelText('common.close')).toBeTruthy();
  });

  it('clears the query and restores content when closed', () => {
    const onQueryChange = jest.fn();
    renderBar({ query: 'open mic', onQueryChange });
    fireEvent.press(screen.getByLabelText('common.search'));
    fireEvent.press(screen.getByLabelText('common.close'));

    expect(onQueryChange).toHaveBeenCalledWith('');
    expect(screen.getByLabelText('common.search')).toBeTruthy();
    expect(
      flatten(screen.getByTestId('expanding-search-bar-content').props.style).pointerEvents,
    ).toBe('auto');
  });

  it('supports controlled open state', () => {
    const onOpenChange = jest.fn();
    renderBar({ isOpen: true, onOpenChange, placeholder: 'Find a room' });
    expect(screen.getByTestId('expanding-search-bar-input').props.placeholder).toBe('Find a room');
    fireEvent.press(screen.getByLabelText('common.close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Still open: the parent owns the state.
    expect(screen.getByLabelText('common.close')).toBeTruthy();
  });

  it('honours custom accessibility labels and testID', () => {
    renderBar({ testID: 'home-search', openAccessibilityLabel: 'Open search' });
    expect(screen.getByLabelText('Open search')).toBeTruthy();
    expect(screen.getByTestId('home-search-toggle')).toBeTruthy();
  });
});
