import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import OnboardingScreen from '../../../app/(onboarding)/index';

import { OnboardingProvider } from '@/providers/OnboardingProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

function getFlattenedStyle(testId: string) {
  const node = screen.getByTestId(testId);
  return StyleSheet.flatten(node.props.style) as {
    backgroundColor?: string;
    color?: string;
  };
}

describe('Onboarding dark theme regression', () => {
  it('uses dark surface and text colors', () => {
    render(
      <ThemeProvider>
        <OnboardingProvider>
          <OnboardingScreen />
        </OnboardingProvider>
      </ThemeProvider>,
    );

    expect(getFlattenedStyle('onboarding-container').backgroundColor).toBe('#0E0E10');
    expect(getFlattenedStyle('onboarding-title-0').color).toBe('#F2F0EA');
    expect(getFlattenedStyle('onboarding-body-0').color).toBe('#8E8B84');
  });
});
