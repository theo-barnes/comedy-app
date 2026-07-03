/**
 * Exercises GlassSurface's glass-enabled path. The global mock in
 * jest.setup.ts reports Liquid Glass as unavailable, so this file flips the
 * availability mocks to true BEFORE importing GlassSurface — availability is
 * captured at module scope.
 */
import { AccessibilityInfo, Text } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

(isLiquidGlassAvailable as jest.Mock).mockReturnValue(true);
(isGlassEffectAPIAvailable as jest.Mock).mockReturnValue(true);

// eslint-disable-next-line import/first
import { ThemeProvider } from '@/providers/ThemeProvider';
// eslint-disable-next-line import/first
import { renderWithTheme } from '../utils/renderWithTheme';

// Import after availability mocks so module-level `glassAvailable` is true.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GlassSurface, useLiquidGlassSupport } = require('@/components/GlassSurface');

function flattenStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(3).filter(Boolean));
}

describe('GlassSurface (Liquid Glass available)', () => {
  it('renders the glass view without a solid themed background', () => {
    const { getByTestId, getByText } = renderWithTheme(
      <GlassSurface testID="glass">
        <Text>inside glass</Text>
      </GlassSurface>,
    );
    expect(getByText('inside glass')).toBeTruthy();
    const flattened = flattenStyle(getByTestId('glass').props.style);
    expect(flattened.backgroundColor).toBeUndefined();
  });

  it('falls back to a solid surface when Reduce Transparency is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
    const { getByTestId } = renderWithTheme(
      <GlassSurface testID="glass">
        <Text>reduced</Text>
      </GlassSurface>,
    );
    await waitFor(() => {
      const flattened = flattenStyle(getByTestId('glass').props.style);
      expect(flattened.backgroundColor).toBeTruthy();
    });
  });

  it('reports support through useLiquidGlassSupport', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
    const { result } = renderHook(() => useLiquidGlassSupport() as boolean, {
      wrapper: ({ children }: React.PropsWithChildren) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current).toBe(true);
  });
});
