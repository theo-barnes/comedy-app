import { render, screen } from '@testing-library/react-native';

import { ClipCard } from '@/features/home/fan/ClipCard';

describe('ClipCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <ClipCard
          title="Why I love public transport"
          comedianName="Asha Mehta"
          viewCount="1.2K views"
          duration="2:14"
        />,
      ),
    ).not.toThrow();
  });

  it('renders the clip title', () => {
    render(
      <ClipCard
        title="Why I love public transport"
        comedianName="Asha Mehta"
        viewCount="1.2K views"
        duration="2:14"
      />,
    );
    expect(screen.getByText('Why I love public transport')).toBeTruthy();
  });

  it('renders the view count', () => {
    render(
      <ClipCard
        title="Why I love public transport"
        comedianName="Asha Mehta"
        viewCount="1.2K views"
        duration="2:14"
      />,
    );
    expect(screen.getByText('1.2K views')).toBeTruthy();
  });
});
