import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/features/home/components/Badge';

describe('Badge', () => {
  it('renders hotTicket label', () => {
    render(<Badge variant="hotTicket" />);
    expect(screen.getByText('HOT TICKET')).toBeTruthy();
  });

  it('renders headliner label', () => {
    render(<Badge variant="headliner" />);
    expect(screen.getByText('HEADLINER')).toBeTruthy();
  });

  it('renders soldOut label', () => {
    render(<Badge variant="soldOut" />);
    expect(screen.getByText('SOLD OUT')).toBeTruthy();
  });

  it('renders onSale label', () => {
    render(<Badge variant="onSale" />);
    expect(screen.getByText('ON SALE')).toBeTruthy();
  });

  it('renders support label', () => {
    render(<Badge variant="support" />);
    expect(screen.getByText('SUPPORT')).toBeTruthy();
  });
});
