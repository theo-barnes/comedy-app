import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';
import { Text } from 'react-native';

import { TabScreenTemplate } from '@/components/TabScreenTemplate';

describe('TabScreenTemplate', () => {
  it('renders the title', () => {
    renderWithTheme(<TabScreenTemplate title="Discover" />);
    expect(screen.getByText('Discover')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    renderWithTheme(<TabScreenTemplate title="Discover" subtitle="Find shows near you" />);
    expect(screen.getByText('Find shows near you')).toBeTruthy();
  });

  it('does not render a subtitle when not provided', () => {
    renderWithTheme(<TabScreenTemplate title="Discover" />);
    expect(screen.queryByText('Find shows near you')).toBeNull();
  });

  it('renders children inside the template', () => {
    const { getByText } = renderWithTheme(
      <TabScreenTemplate title="Discover">
        <Text>Child content</Text>
      </TabScreenTemplate>,
    );
    expect(getByText('Child content')).toBeTruthy();
  });
});
