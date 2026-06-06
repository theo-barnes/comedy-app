import { Pressable, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import OnboardingScreen from '../../../app/(onboarding)/index';

import { OnboardingProvider } from '@/providers/OnboardingProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

function ThemeSwitchHarness() {
  const { setThemeMode } = useTheme();

  return (
    <>
      <OnboardingScreen />
      <Pressable testID="switch-theme-dark" onPress={() => void setThemeMode('dark')} />
    </>
  );
}

function getFlattenedStyle(testId: string) {
  const node = screen.getByTestId(testId);
  return StyleSheet.flatten(node.props.style) as {
    backgroundColor?: string;
    color?: string;
  };
}

describe('Onboarding theme transition regression', () => {
  it('keeps surface and text colors in sync when switching from light to dark while mounted', async () => {
    render(
      <ThemeProvider initialMode="light">
        <OnboardingProvider>
          <ThemeSwitchHarness />
        </OnboardingProvider>
      </ThemeProvider>,
    );

    expect(getFlattenedStyle('onboarding-container').backgroundColor).toBe('#F5F3EE');
    expect(getFlattenedStyle('onboarding-title-0').color).toBe('#1A1A1A');
    expect(getFlattenedStyle('onboarding-body-0').color).toBe('#6B6B6B');

    fireEvent.press(screen.getByTestId('switch-theme-dark'));

    await waitFor(() => {
      expect(getFlattenedStyle('onboarding-container').backgroundColor).toBe('#0E0E10');
      expect(getFlattenedStyle('onboarding-title-0').color).toBe('#F2F0EA');
      expect(getFlattenedStyle('onboarding-body-0').color).toBe('#8E8B84');
    });
  });
});
