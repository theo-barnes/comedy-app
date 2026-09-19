import { screen } from '@testing-library/react-native';

import SavedScreen from '../../../app/(tabs)/saved';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockIsApiConfigured = jest.fn(() => true);
const mockUseSavedItems = jest.fn();

jest.mock('@/features/location', () => ({
  useHeaderLocationLabel: () => ({
    cityLabel: 'London',
    onCityPress: jest.fn(),
  }),
}));

jest.mock('@/lib/api/client', () => ({
  isApiConfigured: () => mockIsApiConfigured(),
}));

jest.mock('@/lib/api/saved', () => ({
  useSavedItems: () => mockUseSavedItems(),
}));

function savedQuery(overrides = {}) {
  return {
    data: undefined,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe('SavedScreen', () => {
  beforeEach(() => {
    mockIsApiConfigured.mockReturnValue(true);
    mockUseSavedItems.mockReturnValue(savedQuery());
  });

  it('renders the shared header without duplicating the Saved title', () => {
    mockIsApiConfigured.mockReturnValue(false);

    renderWithTheme(<SavedScreen />);

    expect(screen.getByText('London')).toBeTruthy();
    expect(screen.getAllByText('Saved')).toHaveLength(1);
    expect(screen.getByText('Your saved gigs and comedians will appear here.')).toBeTruthy();
  });

  it('keeps the shared header visible while loading', () => {
    mockUseSavedItems.mockReturnValue(savedQuery({ isLoading: true }));

    renderWithTheme(<SavedScreen />);

    expect(screen.getByText('London')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByTestId('saved-loading')).toBeTruthy();
  });

  it('renders the empty state beneath the shared header', () => {
    mockUseSavedItems.mockReturnValue(savedQuery({ data: { items: [] } }));

    renderWithTheme(<SavedScreen />);

    expect(
      screen.getByText('Nothing saved yet. Tap the bookmark on any clip or show to keep it here.'),
    ).toBeTruthy();
  });

  it('renders the error state beneath the shared header', () => {
    mockUseSavedItems.mockReturnValue(savedQuery({ isError: true }));

    renderWithTheme(<SavedScreen />);

    expect(
      screen.getByText("We couldn't load your saved items. Pull to refresh or try again later."),
    ).toBeTruthy();
  });

  it('renders saved items beneath the shared header', () => {
    mockUseSavedItems.mockReturnValue(
      savedQuery({
        data: {
          items: [
            {
              contentId: 'clip-1',
              contentType: 'video_clip',
              creatorId: 'comedian-1',
              savedAt: '2026-08-16T12:00:00.000Z',
              title: 'Late Set',
            },
          ],
        },
      }),
    );

    renderWithTheme(<SavedScreen />);

    expect(screen.getByText('Late Set')).toBeTruthy();
    expect(screen.getByText(/Clip · saved/)).toBeTruthy();
  });
});
