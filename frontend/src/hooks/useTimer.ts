import { useState, useCallback, useRef, useEffect } from 'react';

interface TimerOptions {
  onComplete?: () => void;
  onTick?: (secondsRemaining: number) => void;
}

/**
 * Custom hook for countdown timer
 * Useful for rest timers between sets
 */
export function useTimer(initialSeconds: number = 0, options?: TimerOptions) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    setIsRunning(false);
    setSeconds(newSeconds ?? initialSeconds);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialSeconds]);

  const addTime = useCallback((additionalSeconds: number) => {
    setSeconds(prev => prev + additionalSeconds);
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const newValue = prev - 1;
          options?.onTick?.(newValue);
          
          if (newValue <= 0) {
            setIsRunning(false);
            options?.onComplete?.();
            return 0;
          }
          
          return newValue;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds, options]);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    addTime,
  };
}
