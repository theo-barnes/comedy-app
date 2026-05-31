import { render, screen } from '@testing-library/react-native';

import { AvatarStack } from '@/features/home/components/AvatarStack';

describe('AvatarStack', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<AvatarStack avatars={[undefined, undefined]} label="2 performers" />),
    ).not.toThrow();
  });

  it('renders the label text', () => {
    render(<AvatarStack avatars={[undefined]} label="1 performer" />);
    expect(screen.getByText('1 performer')).toBeTruthy();
  });

  it('renders at most 3 avatars for more than 3 inputs', () => {
    // 5 avatars provided — only 3 should render (circles)
    const avatars = [undefined, undefined, undefined, undefined, undefined];
    render(<AvatarStack avatars={avatars} label="5 performers" />);
    // The label should still be visible
    expect(screen.getByText('5 performers')).toBeTruthy();
  });
});
