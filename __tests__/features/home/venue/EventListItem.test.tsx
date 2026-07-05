import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { EventListItem } from '@/features/home/venue/EventListItem';

describe('EventListItem', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(
        <EventListItem
          title="Friday Night Late Show"
          venue="The Punchline Club"
          date="Fri, 6 Jun"
          statusBadge="soldOut"
          progress={1.0}
        />,
      ),
    ).not.toThrow();
  });

  it('renders the title', () => {
    renderWithTheme(
      <EventListItem
        title="Friday Night Late Show"
        venue="The Punchline Club"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
      />,
    );
    expect(screen.getByText('Friday Night Late Show')).toBeTruthy();
  });

  it('renders venue and date', () => {
    renderWithTheme(
      <EventListItem
        title="Friday Night Late Show"
        venue="The Punchline Club"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
      />,
    );
    expect(screen.getByText('The Punchline Club · Fri, 6 Jun')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <EventListItem
        title="Friday Night Late Show"
        venue="The Punchline Club"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText('Friday Night Late Show'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
