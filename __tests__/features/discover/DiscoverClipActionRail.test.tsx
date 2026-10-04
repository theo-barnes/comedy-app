import { fireEvent, screen } from '@testing-library/react-native';

import { DiscoverClipActionRail } from '@/features/discover/components/DiscoverClipActionRail';

import { renderWithTheme } from '../../utils/renderWithTheme';

describe('DiscoverClipActionRail', () => {
  it('renders Like and unavailable Ticket and Interested actions', () => {
    renderWithTheme(
      <DiscoverClipActionRail liked={false} likePending={false} onToggleLike={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Like clip' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tickets coming soon' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Interested coming soon' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('toggles Like and exposes selected state', () => {
    const onToggleLike = jest.fn();
    renderWithTheme(
      <DiscoverClipActionRail liked likePending={false} onToggleLike={onToggleLike} />,
    );

    const like = screen.getByRole('button', { name: 'Unlike clip' });
    expect(like.props.accessibilityState).toMatchObject({ selected: true, disabled: false });

    fireEvent.press(like);
    expect(onToggleLike).toHaveBeenCalledTimes(1);
  });

  it('disables Like while pending and keeps future actions unavailable', () => {
    const onToggleLike = jest.fn();
    renderWithTheme(
      <DiscoverClipActionRail liked={false} likePending onToggleLike={onToggleLike} />,
    );

    const like = screen.getByRole('button', { name: 'Like clip' });
    const ticket = screen.getByRole('button', { name: 'Tickets coming soon' });
    const interested = screen.getByRole('button', { name: 'Interested coming soon' });

    expect(like.props.accessibilityState).toMatchObject({ disabled: true });
    expect(ticket.props.accessibilityState).toMatchObject({ disabled: true });
    expect(interested.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(like);
    fireEvent.press(ticket);
    fireEvent.press(interested);
    expect(onToggleLike).not.toHaveBeenCalled();
  });
});
