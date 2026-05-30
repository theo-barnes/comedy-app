import { act, renderHook } from '@testing-library/react-native';

import { useCountdown } from '@/hooks/useCountdown';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCountdown', () => {
  it('starts with remaining equal to 0 before start() is called', () => {
    const { result } = renderHook(() => useCountdown(30));
    expect(result.current.remaining).toBe(0);
  });

  it('sets remaining to the given seconds after start() is called', () => {
    const { result } = renderHook(() => useCountdown(30));
    act(() => {
      result.current.start();
    });
    expect(result.current.remaining).toBe(30);
  });

  it('decrements remaining by 1 each second', () => {
    const { result } = renderHook(() => useCountdown(5));
    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remaining).toBe(4);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remaining).toBe(3);
  });

  it('stops at 0 and does not go negative', () => {
    const { result } = renderHook(() => useCountdown(3));
    act(() => {
      result.current.start();
    });
    // Advance one second at a time so React can flush and re-create the interval
    // (clearing the old one) between each tick.
    for (let i = 0; i < 10; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(result.current.remaining).toBe(0);
  });
});
