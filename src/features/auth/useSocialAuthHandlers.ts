import { useState, useCallback } from 'react';

import { useAuth } from '@/features/auth/useAuth';

type Options = {
  setError: (message: string | null) => void;
  googleErrorMessage: string;
  appleErrorMessage: string;
};

function createAsyncHandler(
  fn: () => Promise<void>,
  setLoading: (v: boolean) => void,
  setError: (msg: string | null) => void,
  errorMessage: string,
) {
  return async () => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch {
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
}

export function useSocialAuthHandlers({
  setError,
  googleErrorMessage,
  appleErrorMessage,
}: Options) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogle = useCallback(
    createAsyncHandler(signInWithGoogle, setGoogleLoading, setError, googleErrorMessage),
    [signInWithGoogle, setError, googleErrorMessage],
  );

  const handleApple = useCallback(
    createAsyncHandler(signInWithApple, setAppleLoading, setError, appleErrorMessage),
    [signInWithApple, setError, appleErrorMessage],
  );

  return { handleGoogle, handleApple, googleLoading, appleLoading };
}
