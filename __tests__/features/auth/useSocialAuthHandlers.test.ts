import { act, renderHook } from '@testing-library/react-native';

import { useSocialAuthHandlers } from '@/features/auth/useSocialAuthHandlers';

// Mock useAuth so the hook can be rendered without an AuthProvider.
const mockSignInWithGoogle = jest.fn();
const mockSignInWithApple = jest.fn();

jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    signInWithApple: mockSignInWithApple,
  }),
}));

function makeOptions(overrides?: Partial<Parameters<typeof useSocialAuthHandlers>[0]>) {
  return {
    setError: jest.fn(),
    googleErrorMessage: 'Google sign-in failed',
    appleErrorMessage: 'Apple sign-in failed',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSocialAuthHandlers', () => {
  it('googleLoading is false before the handler is called', () => {
    const { result } = renderHook(() => useSocialAuthHandlers(makeOptions()));
    expect(result.current.googleLoading).toBe(false);
  });

  it('appleLoading is false before the handler is called', () => {
    const { result } = renderHook(() => useSocialAuthHandlers(makeOptions()));
    expect(result.current.appleLoading).toBe(false);
  });

  it('clears error and sets googleLoading while Google sign-in is in progress', async () => {
    let resolveSignIn!: () => void;
    mockSignInWithGoogle.mockReturnValue(
      new Promise<void>((res) => {
        resolveSignIn = res;
      }),
    );

    const setError = jest.fn();
    const { result } = renderHook(() => useSocialAuthHandlers(makeOptions({ setError })));

    act(() => {
      result.current.handleGoogle();
    });

    expect(setError).toHaveBeenCalledWith(null);
    expect(result.current.googleLoading).toBe(true);

    await act(async () => {
      resolveSignIn();
    });

    expect(result.current.googleLoading).toBe(false);
  });

  it('sets error message when Google sign-in throws', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('network error'));
    const setError = jest.fn();

    const { result } = renderHook(() =>
      useSocialAuthHandlers(makeOptions({ setError, googleErrorMessage: 'Google sign-in failed' })),
    );

    await act(async () => {
      await result.current.handleGoogle();
    });

    expect(setError).toHaveBeenCalledWith('Google sign-in failed');
    expect(result.current.googleLoading).toBe(false);
  });

  it('sets error message when Apple sign-in throws', async () => {
    mockSignInWithApple.mockRejectedValue(new Error('auth cancelled'));
    const setError = jest.fn();

    const { result } = renderHook(() =>
      useSocialAuthHandlers(makeOptions({ setError, appleErrorMessage: 'Apple sign-in failed' })),
    );

    await act(async () => {
      await result.current.handleApple();
    });

    expect(setError).toHaveBeenCalledWith('Apple sign-in failed');
    expect(result.current.appleLoading).toBe(false);
  });
});
