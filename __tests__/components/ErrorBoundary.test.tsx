import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';

// A component that throws on demand.
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Kaboom');
  return <Text>All good</Text>;
}

describe('ErrorBoundary', () => {
  // Suppress the React error overlay logs during intentional throws.
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('renders the error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    // The error UI shows i18n keys (mocked to return key as-is).
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.getByText('common.retry')).toBeTruthy();
  });

  it('re-renders children after pressing the retry button', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    // Update child to non-throwing BEFORE pressing retry so the reset re-render succeeds.
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    fireEvent.press(screen.getByText('common.retry'));

    expect(screen.getByText('All good')).toBeTruthy();
  });
});
