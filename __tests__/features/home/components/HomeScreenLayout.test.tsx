import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';

import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';

import { renderWithTheme } from '../../../utils/renderWithTheme';

describe('HomeScreenLayout', () => {
  it('renders shared header, hero text, and role content', () => {
    renderWithTheme(
      <HomeScreenLayout heroTitle="Hello">
        <Text>Role specific block</Text>
      </HomeScreenLayout>,
    );

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Role specific block')).toBeTruthy();
  });
});
