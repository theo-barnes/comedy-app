import { fireEvent, render, screen } from '@testing-library/react-native';

import { EventListItem } from '@/features/home/venue/EventListItem';

describe('EventListItem', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <EventListItem
          title="Store Nights: Friday Late"
          venue="The Comedy Store"
          date="Fri, 6 Jun"
          statusBadge="soldOut"
          progress={1.0}
        />,
      ),
    ).not.toThrow();
  });

  it('renders the title', () => {
    render(
      <EventListItem
        title="Store Nights: Friday Late"
        venue="The Comedy Store"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
      />,
    );
    expect(screen.getByText('Store Nights: Friday Late')).toBeTruthy();
  });

  it('renders venue and date', () => {
    render(
      <EventListItem
        title="Store Nights: Friday Late"
        venue="The Comedy Store"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
      />,
    );
    expect(screen.getByText('The Comedy Store · Fri, 6 Jun')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(
      <EventListItem
        title="Store Nights: Friday Late"
        venue="The Comedy Store"
        date="Fri, 6 Jun"
        statusBadge="soldOut"
        progress={1.0}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText('Store Nights: Friday Late'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
