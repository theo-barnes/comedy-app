import { useState, useCallback } from 'react';

import { useAuth } from '@/features/auth/useAuth';

type Options = {
  setError: (message: string | null) => void;
  googleErrorMessage: string;
};

export function useSocialAuthHandlers({ setError, googleErrorMessage }: Options) {
  const { signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

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

  return { handleGoogle, googleLoading };
}
