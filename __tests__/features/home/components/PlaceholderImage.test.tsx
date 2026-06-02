import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';

describe('PlaceholderImage', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderWithTheme(<PlaceholderImage style={{ width: 100, height: 100 }} />),
    ).not.toThrow();
  });

  it('renders a grey View when no uri is provided', () => {
    const { UNSAFE_queryByType } = renderWithTheme(
      <PlaceholderImage style={{ width: 100, height: 100 }} />,
    );
    const { Image } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders an Image when uri is provided', () => {
    const { UNSAFE_getByType } = renderWithTheme(
      <PlaceholderImage uri="https://example.com/img.jpg" style={{ width: 100, height: 100 }} />,
    );
    const { Image } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });
});
