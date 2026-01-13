import { useState, useEffect } from 'react';

/**
 * Global clock hook that updates at a specified interval.
 *
 * @param tickMs - Interval in milliseconds (default: 60000 = 1 minute)
 * @returns Current timestamp as Date.now()
 *
 * @example
 * const now = useNow(); // Updates every 60 seconds
 * const nowFast = useNow(1000); // Updates every second
 */
export function useNow(tickMs: number = 60000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Update immediately on mount
    setNow(Date.now());

    // Set up interval
    const interval = setInterval(() => {
      setNow(Date.now());
    }, tickMs);

    return () => clearInterval(interval);
  }, [tickMs]);

  return now;
}
