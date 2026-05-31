import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TabScreenTemplate } from '@/components/TabScreenTemplate';

describe('TabScreenTemplate', () => {
  it('renders the title', () => {
    render(<TabScreenTemplate title="Discover" />);
    expect(screen.getByText('Discover')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    render(<TabScreenTemplate title="Discover" subtitle="Find shows near you" />);
    expect(screen.getByText('Find shows near you')).toBeTruthy();
  });

  it('does not render a subtitle when not provided', () => {
    render(<TabScreenTemplate title="Discover" />);
    expect(screen.queryByText('Find shows near you')).toBeNull();
  });

  it('renders children inside the template', () => {
    const { getByText } = render(
      <TabScreenTemplate title="Discover">
        <Text>Child content</Text>
      </TabScreenTemplate>,
    );
    expect(getByText('Child content')).toBeTruthy();
  });
});
