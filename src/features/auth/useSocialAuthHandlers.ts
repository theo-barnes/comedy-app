import { useState, useCallback } from 'react';

import { useAuth } from '@/features/auth/useAuth';

type Options = {
  setError: (message: string | null) => void;
  googleErrorMessage: string;
  appleErrorMessage: string;
};

export function useSocialAuthHandlers({
  setError,
  googleErrorMessage,
  appleErrorMessage,
}: Options) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogle = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError(googleErrorMessage);
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, setError, googleErrorMessage]);

  const handleApple = useCallback(async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch {
      setError(appleErrorMessage);
    } finally {
      setAppleLoading(false);
    }
  }, [signInWithApple, setError, appleErrorMessage]);

  return { handleGoogle, handleApple, googleLoading, appleLoading };
}
