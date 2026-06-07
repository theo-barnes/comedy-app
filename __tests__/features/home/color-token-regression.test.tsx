/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';

import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { darkTokens, lightTokens } from '@/theme/tokens';
import { Badge } from '@/features/home/components/Badge';
import { ClipCard } from '@/features/home/fan/ClipCard';
import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';
import { renderWithTheme } from '../../utils/renderWithTheme';

const FEATURED_EVENT_PROPS = {
  title: 'The Moth Invitational',
  venue: 'The Moth Club',
  neighbourhood: 'Hackney',
  date: 'Fri, 6 Jun',
  time: '9 PM',
  price: '£15',
  badges: ['hotTicket' as const],
  performerAvatars: [undefined],
  performerLabel: '3 performers',
};

const CLIP_PROPS = {
  title: 'Why I love public transport',
  comedianName: 'Asha Mehta',
  viewCount: '1.2K views',
  duration: '2:14',
};

const MODES = [
  { themeMode: 'dark' as const, tokens: darkTokens },
  { themeMode: 'light' as const, tokens: lightTokens },
];

const NO_LITERAL_COLOR_PATTERN = /(#[0-9A-Fa-f]{3,8}\b|rgba?\()/;

function styleOf(testId: string): Record<string, unknown> {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style) ?? {};
}

describe('Home color token regression', () => {
  describe.each(MODES)('in $themeMode mode', ({ themeMode, tokens }) => {
    it('uses semantic badge tokens instead of hardcoded literals', () => {
      renderWithTheme(<Badge variant="hotTicket" />, { themeMode });
      expect(styleOf('badge-pill-hotTicket').backgroundColor).toBe(tokens.badgeFill);
      expect(styleOf('badge-label-hotTicket').color).toBe(tokens.badgeInk);

      renderWithTheme(<Badge variant="soldOut" />, { themeMode });
      expect(styleOf('badge-pill-soldOut').backgroundColor).toBe(tokens.errorFill);
      expect(styleOf('badge-label-soldOut').color).toBe(tokens.errorInk);

      renderWithTheme(<Badge variant="headliner" />, { themeMode });
      expect(styleOf('badge-pill-headliner').backgroundColor).toBe(tokens.primaryRest);
      expect(styleOf('badge-label-headliner').color).toBe(tokens.onPrimary);
    });

    it('uses tokenized fan image scrims', () => {
      renderWithTheme(<FeaturedEventCard {...FEATURED_EVENT_PROPS} />, { themeMode });
      expect(styleOf('featured-event-bottom-overlay').backgroundColor).toBe(tokens.mediaScrimSoft);

      renderWithTheme(<ClipCard {...CLIP_PROPS} />, { themeMode });
      expect(styleOf('clip-duration-badge').backgroundColor).toBe(tokens.mediaScrimStrong);
    });
  });

  it('keeps targeted home files free of literal hex/rgba colors', () => {
    const files = [
      'src/features/home/components/Badge.tsx',
      'src/features/home/fan/FeaturedEventCard.tsx',
      'src/features/home/fan/ClipCard.tsx',
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(content).not.toMatch(NO_LITERAL_COLOR_PATTERN);
    }
  });
});
