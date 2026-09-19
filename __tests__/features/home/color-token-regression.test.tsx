/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';

import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { darkTokens } from '@/theme/tokens';
import { Badge } from '@/features/home/components/Badge';
import { ClipCard } from '@/features/home/fan/ClipCard';
import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';
import { renderWithTheme } from '../../utils/renderWithTheme';

const FEATURED_EVENT_PROPS = {
  title: 'The Storytellers Invitational',
  venue: 'The Velvet Curtain',
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

const NO_LITERAL_COLOR_PATTERN = /(#[0-9A-Fa-f]{3,8}\b|rgba?\()/;

function styleOf(testId: string): Record<string, unknown> {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style) ?? {};
}

describe('Home color token regression', () => {
  it('uses semantic badge tokens instead of hardcoded literals', () => {
    renderWithTheme(<Badge variant="hotTicket" />);
    expect(styleOf('badge-pill-hotTicket').backgroundColor).toBe(darkTokens.badgeFill);
    expect(styleOf('badge-label-hotTicket').color).toBe(darkTokens.badgeInk);

    renderWithTheme(<Badge variant="soldOut" />);
    expect(styleOf('badge-pill-soldOut').backgroundColor).toBe(darkTokens.errorFill);
    expect(styleOf('badge-label-soldOut').color).toBe(darkTokens.errorInk);

    renderWithTheme(<Badge variant="headliner" />);
    expect(styleOf('badge-pill-headliner').backgroundColor).toBe(darkTokens.primaryRest);
    expect(styleOf('badge-label-headliner').color).toBe(darkTokens.onPrimary);
  });

  it('uses tokenized fan image scrims', () => {
    renderWithTheme(<FeaturedEventCard {...FEATURED_EVENT_PROPS} />);
    expect(styleOf('featured-event-bottom-overlay').backgroundColor).toBe(
      darkTokens.mediaScrimSoft,
    );

    renderWithTheme(<ClipCard {...CLIP_PROPS} />);
    expect(styleOf('clip-duration-badge').backgroundColor).toBe(darkTokens.mediaScrimStrong);
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
