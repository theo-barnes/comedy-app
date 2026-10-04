import { screen } from '@testing-library/react-native';

import { ProfileIdentity } from '@/features/profiles/ProfileIdentity';

import { renderWithTheme } from '../../utils/renderWithTheme';

describe('ProfileIdentity', () => {
  it('renders the supplied account display name without data access', () => {
    renderWithTheme(<ProfileIdentity displayName="Jo King" />);

    expect(screen.getByText('@Jo King')).toBeTruthy();
  });
});
