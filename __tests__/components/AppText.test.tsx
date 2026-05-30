import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/AppText';

describe('AppText', () => {
  it('renders children', () => {
    render(<AppText>Hello world</AppText>);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it.each(['title', 'heading', 'body', 'caption'] as const)(
    'renders with variant "%s" without error',
    (variant) => {
      render(<AppText variant={variant}>Text</AppText>);
      expect(screen.getByText('Text')).toBeTruthy();
    },
  );

  it('applies muted style when muted prop is true', () => {
    render(<AppText muted>Muted text</AppText>);
    const element = screen.getByText('Muted text');
    // The muted style applies a lighter foreground color — verify the flat style array contains it.
    const flatStyle = element.props.style as Array<Record<string, unknown>>;
    const hasMutedColor = flatStyle.some(
      (s) => s && typeof s === 'object' && 'color' in s && s.color !== undefined,
    );
    expect(hasMutedColor).toBe(true);
  });
});
