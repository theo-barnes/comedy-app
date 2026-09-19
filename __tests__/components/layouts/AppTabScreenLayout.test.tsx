import { Text } from 'react-native';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { renderWithTheme } from '../../utils/renderWithTheme';

const baseProps = {
  city: 'London',
  tabLabel: 'Home',
};

describe('AppTabScreenLayout', () => {
  it('renders the header and children in static mode', () => {
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps}>
        <Text>body content</Text>
      </AppTabScreenLayout>,
    );
    expect(getByText('London')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('body content')).toBeTruthy();
  });

  it('renders header and children in scroll mode', () => {
    const { getByText } = renderWithTheme(
      <AppTabScreenLayout {...baseProps} bodyMode="scroll">
        <Text>scroll body</Text>
      </AppTabScreenLayout>,
    );
    expect(getByText('London')).toBeTruthy();
    expect(getByText('scroll body')).toBeTruthy();
  });
});
