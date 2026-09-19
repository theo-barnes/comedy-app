/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';

import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LiveNowSection } from '@/features/browse/components/BrowseSections';
import type { LiveNowPanel } from '@/features/browse/types';
import { darkTokens } from '@/theme/tokens';
import { renderWithTheme } from '../../utils/renderWithTheme';

const liveNow: LiveNowPanel = {
  kicker: 'LIVE NOW',
  timeLabel: '21:14',
  title: 'One room is live.',
  venues: [{ name: 'Test Venue', value: '2 seats' }],
  cta: 'See all',
};

const NO_LITERAL_COLOR_PATTERN = /(#[0-9A-Fa-f]{3,8}\b|rgba?\()/;

function styleOf(testId: string): Record<string, unknown> {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style) ?? {};
}

describe('Browse color token regression', () => {
  it('uses semantic live panel tokens for panel, rows, and text', () => {
    renderWithTheme(<LiveNowSection panel={liveNow} />);

    expect(styleOf('live-now-panel').backgroundColor).toBe(darkTokens.livePanelSurface);
    expect(styleOf('live-now-time-label').color).toBe(darkTokens.livePanelTextMuted);
    expect(styleOf('live-now-title').color).toBe(darkTokens.livePanelTextPrimary);

    expect(styleOf('live-now-row-0').backgroundColor).toBe(darkTokens.livePanelRow);
    expect(styleOf('live-now-row-name-0').color).toBe(darkTokens.livePanelTextPrimary);
    expect(styleOf('live-now-row-value-0').color).toBe(darkTokens.livePanelAccent);
  });

  it('keeps targeted browse file free of literal hex/rgba colors', () => {
    const file = 'src/features/browse/components/BrowseSections.tsx';
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(content).not.toMatch(NO_LITERAL_COLOR_PATTERN);
  });
});
