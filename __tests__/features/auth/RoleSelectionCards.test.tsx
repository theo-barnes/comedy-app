import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../utils/renderWithTheme';

import { RoleSelectionCards } from '@/features/auth/RoleSelectionCards';
import type { UserRole } from '@/types';

// react-i18next is mocked globally — t returns the i18n key.

describe('RoleSelectionCards', () => {
  it('renders a card for each role option', () => {
    renderWithTheme(<RoleSelectionCards selectedRole="fan" onRoleChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks only the selected role card as checked', () => {
    renderWithTheme(<RoleSelectionCards selectedRole="comedian" onRoleChange={() => {}} />);
    const checkedCards = screen
      .getAllByRole('radio')
      .filter((el) => el.props.accessibilityState?.checked === true);
    expect(checkedCards).toHaveLength(1);
  });

  it('calls onRoleChange with the role of the pressed card', () => {
    const onRoleChange = jest.fn();
    renderWithTheme(<RoleSelectionCards selectedRole="fan" onRoleChange={onRoleChange} />);
    // Cards are ordered: fan (0), comedian (1), venue (2)
    const cards = screen.getAllByRole('radio');
    fireEvent.press(cards[2]!);
    expect(onRoleChange).toHaveBeenCalledWith('venue' as UserRole);
  });

  it('calls onRoleChange when a different card is pressed', () => {
    const onRoleChange = jest.fn();
    renderWithTheme(<RoleSelectionCards selectedRole="fan" onRoleChange={onRoleChange} />);
    const cards = screen.getAllByRole('radio');
    fireEvent.press(cards[1]!);
    expect(onRoleChange).toHaveBeenCalledWith('comedian' as UserRole);
  });
});
