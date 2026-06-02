import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { Badge } from '@/features/home/components/Badge';

describe('Badge', () => {
  it('renders hotTicket label', () => {
    renderWithTheme(<Badge variant="hotTicket" />);
    expect(screen.getByText('HOT TICKET')).toBeTruthy();
  });

  it('renders headliner label', () => {
    renderWithTheme(<Badge variant="headliner" />);
    expect(screen.getByText('HEADLINER')).toBeTruthy();
  });

  it('renders soldOut label', () => {
    renderWithTheme(<Badge variant="soldOut" />);
    expect(screen.getByText('SOLD OUT')).toBeTruthy();
  });

  it('renders onSale label', () => {
    renderWithTheme(<Badge variant="onSale" />);
    expect(screen.getByText('ON SALE')).toBeTruthy();
  });

  it('renders support label', () => {
    renderWithTheme(<Badge variant="support" />);
    expect(screen.getByText('SUPPORT')).toBeTruthy();
  });
});
