import { render, screen } from '@testing-library/react-native';

import { ComedianHome } from '@/features/home/comedian/ComedianHome';

describe('ComedianHome', () => {
  it('renders without crashing', () => {
    expect(() => render(<ComedianHome />)).not.toThrow();
  });

  it('renders the YOUR GIGS section header', () => {
    render(<ComedianHome />);
    expect(screen.getByText('home.comedian.yourGigs')).toBeTruthy();
  });

  it('renders the OTHERS ON THE CIRCUIT section header', () => {
    render(<ComedianHome />);
    expect(screen.getByText('home.comedian.othersOnCircuit')).toBeTruthy();
  });
});
