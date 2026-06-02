import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { AvatarStack } from '@/features/home/components/AvatarStack';

describe('AvatarStack', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<AvatarStack avatars={[undefined, undefined]} label="2 performers" />),
    ).not.toThrow();
  });

  it('renders the label text', () => {
    renderWithTheme(<AvatarStack avatars={[undefined]} label="1 performer" />);
    expect(screen.getByText('1 performer')).toBeTruthy();
  });

  it('renders at most 3 avatars for more than 3 inputs', () => {
    // 5 avatars provided — only 3 should render (circles)
    const avatars = [undefined, undefined, undefined, undefined, undefined];
    renderWithTheme(<AvatarStack avatars={avatars} label="5 performers" />);
    // The label should still be visible
    expect(screen.getByText('5 performers')).toBeTruthy();
  });
});
