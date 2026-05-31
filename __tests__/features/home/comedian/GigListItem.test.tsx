import { fireEvent, render, screen } from '@testing-library/react-native';

import { GigListItem } from '@/features/home/comedian/GigListItem';

describe('GigListItem', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />,
      ),
    ).not.toThrow();
  });

  it('renders the venue', () => {
    render(<GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />);
    expect(screen.getByText('The Comedy Store')).toBeTruthy();
  });

  it('renders the date', () => {
    render(<GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />);
    expect(screen.getByText('Fri, 6 Jun · 9 PM')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(
      <GigListItem
        venue="The Comedy Store"
        date="Fri, 6 Jun · 9 PM"
        roleBadge="headliner"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText('The Comedy Store'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
