import fs from 'node:fs';
import path from 'node:path';

import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LiveNowSection } from '@/features/browse/components/BrowseSections';
import { getBrowseConfig } from '@/features/browse/config';
import { darkTokens, lightTokens } from '@/theme/tokens';
import { renderWithTheme } from '../../utils/renderWithTheme';

const browse = getBrowseConfig('fan');

const MODES = [
  { themeMode: 'dark' as const, tokens: darkTokens },
  { themeMode: 'light' as const, tokens: lightTokens },
];

const NO_LITERAL_COLOR_PATTERN = /(#[0-9A-Fa-f]{3,8}\b|rgba?\()/;

function styleOf(testId: string): Record<string, unknown> {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style) ?? {};
}

describe('Browse color token regression', () => {
  describe.each(MODES)('in $themeMode mode', ({ themeMode, tokens }) => {
    it('uses semantic live panel tokens for panel, rows, and text', () => {
      renderWithTheme(<LiveNowSection panel={browse.liveNow} />, { themeMode });

      expect(styleOf('live-now-panel').backgroundColor).toBe(tokens.livePanelSurface);
      expect(styleOf('live-now-time-label').color).toBe(tokens.livePanelTextMuted);
      expect(styleOf('live-now-title').color).toBe(tokens.livePanelTextPrimary);

      expect(styleOf('live-now-row-0').backgroundColor).toBe(tokens.livePanelRow);
      expect(styleOf('live-now-row-name-0').color).toBe(tokens.livePanelTextPrimary);
      expect(styleOf('live-now-row-value-0').color).toBe(tokens.livePanelAccent);
    });
  });

  it('keeps targeted browse file free of literal hex/rgba colors', () => {
    const file = 'src/features/browse/components/BrowseSections.tsx';
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(content).not.toMatch(NO_LITERAL_COLOR_PATTERN);
  });
});
