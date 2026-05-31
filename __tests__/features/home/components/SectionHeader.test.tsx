import { fireEvent, render, screen } from '@testing-library/react-native';

import { SectionHeader } from '@/features/home/components/SectionHeader';

describe('SectionHeader', () => {
  it('renders without crashing', () => {
    expect(() => render(<SectionHeader label="MY SECTION" />)).not.toThrow();
  });

  it('renders the label text', () => {
    render(<SectionHeader label="MY SECTION" />);
    expect(screen.getByText('MY SECTION')).toBeTruthy();
  });

  it('renders the action link when actionLabel is provided', () => {
    render(<SectionHeader label="MY SECTION" actionLabel="See all" onAction={() => {}} />);
    expect(screen.getByText('See all')).toBeTruthy();
  });

  it('does not render an action link when actionLabel is omitted', () => {
    render(<SectionHeader label="MY SECTION" />);
    expect(screen.queryByText('See all')).toBeNull();
  });

  it('calls onAction when action link is pressed', () => {
    const onAction = jest.fn();
    render(<SectionHeader label="MY SECTION" actionLabel="See all" onAction={onAction} />);
    fireEvent.press(screen.getByText('See all'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
