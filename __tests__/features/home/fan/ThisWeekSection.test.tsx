import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { ThisWeekSection } from '@/features/home/fan/ThisWeekSection';

const DEFAULT_PROPS = {
  events: [
    { id: '1', title: 'Friday Night Late Show', subtitle: 'The Punchline Club · Soho' },
    { id: '2', title: 'New Acts Night', subtitle: 'Brickhouse Comedy Club' },
  ],
  sectionLabel: 'home.fan.thisWeek',
  actionLabel: 'common.seeAll',
};

describe('ThisWeekSection', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<ThisWeekSection {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders section header and action label', () => {
    renderWithTheme(<ThisWeekSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('home.fan.thisWeek')).toBeTruthy();
    expect(screen.getByText('common.seeAll')).toBeTruthy();
  });

  it('renders event cards from provided data', () => {
    renderWithTheme(<ThisWeekSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Friday Night Late Show')).toBeTruthy();
    expect(screen.getByText('The Punchline Club · Soho')).toBeTruthy();
    expect(screen.getByText('New Acts Night')).toBeTruthy();
  });
});
