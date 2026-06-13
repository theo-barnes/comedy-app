import { Text } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { renderWithTheme } from '../utils/renderWithTheme';

// jest.setup.ts mocks expo-glass-effect with availability returning false,
// so GlassSurface must take the themed-View fallback path.
describe('GlassSurface', () => {
  it('renders children through the fallback View when glass is unavailable', () => {
    const { getByText } = renderWithTheme(
      <GlassSurface testID="glass">
        <Text>inside glass</Text>
      </GlassSurface>,
    );
    expect(getByText('inside glass')).toBeTruthy();
  });

  it('applies a solid themed background in the fallback path', () => {
    const { getByTestId } = renderWithTheme(
      <GlassSurface testID="glass">
        <Text>content</Text>
      </GlassSurface>,
    );
    const node = getByTestId('glass');
    const flattened = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.flat().filter(Boolean))
      : node.props.style;
    expect(flattened.backgroundColor).toBeTruthy();
  });

  it('passes through custom styles', () => {
    const { getByTestId } = renderWithTheme(
      <GlassSurface testID="glass" style={{ borderRadius: 12 }}>
        <Text>content</Text>
      </GlassSurface>,
    );
    const node = getByTestId('glass');
    const flattened = Object.assign({}, ...[node.props.style].flat(2).filter(Boolean));
    expect(flattened.borderRadius).toBe(12);
  });
});
