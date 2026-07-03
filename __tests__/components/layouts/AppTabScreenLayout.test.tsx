import { Text } from 'react-native';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUseLiquidGlassSupport = jest.fn((): boolean => false);
jest.mock('@/components/GlassSurface', () => {
  const actual = jest.requireActual('@/components/GlassSurface');
  return {
    ...actual,
    useLiquidGlassSupport: () => mockUseLiquidGlassSupport(),
  };
});

const baseProps = {
  city: 'London',
  tabLabel: 'Home',
};

describe('AppTabScreenLayout', () => {
  beforeEach(() => {
    mockUseLiquidGlassSupport.mockReturnValue(false);
  });

  it('renders the header and children in static mode', () => {
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps}>
        <Text>body content</Text>
      </AppTabScreenLayout>,
    );
    expect(getByText('London')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('body content')).toBeTruthy();
  });

  it('renders the header over the body in overlayHeader mode without glass', () => {
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps} overlayHeader>
        <Text>overlay body</Text>
      </AppTabScreenLayout>,
    );
    expect(getByText('London')).toBeTruthy();
    expect(getByText('overlay body')).toBeTruthy();
  });

  it('renders the overlay header inside a glass band when Liquid Glass is enabled', () => {
    mockUseLiquidGlassSupport.mockReturnValue(true);
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps} overlayHeader>
        <Text>overlay body</Text>
      </AppTabScreenLayout>,
    );
    // Header and body must both stay reachable when wrapped in GlassSurface.
    expect(getByText('London')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('overlay body')).toBeTruthy();
  });

  it('renders header and children in scroll mode', () => {
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps} bodyMode="scroll">
        <Text>scroll body</Text>
      </AppTabScreenLayout>,
    );
    expect(getByText('London')).toBeTruthy();
    expect(getByText('scroll body')).toBeTruthy();
  });
});
