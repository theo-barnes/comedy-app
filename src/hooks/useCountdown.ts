import { useCallback, useEffect, useState } from 'react';

export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const start = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, start };
}
