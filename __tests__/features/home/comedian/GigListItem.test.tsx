import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { GigListItem } from '@/features/home/comedian/GigListItem';

describe('GigListItem', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(
        <GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />,
      ),
    ).not.toThrow();
  });

  it('renders the venue', () => {
    renderWithTheme(
      <GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />,
    );
    expect(screen.getByText('The Comedy Store')).toBeTruthy();
  });

  it('renders the date', () => {
    renderWithTheme(
      <GigListItem venue="The Comedy Store" date="Fri, 6 Jun · 9 PM" roleBadge="headliner" />,
    );
    expect(screen.getByText('Fri, 6 Jun · 9 PM')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(
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
