/**
 * Shared time context for synchronized TOTP timers
 * Uses epoch time so every account follows the same 30-second cycle
 */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { TOTP_PERIOD_MS } from '@/lib/constants';

interface TimeContextType {
  currentPeriod: number;     // Index of the current 30-second period since the epoch
  timeRemaining: number;     // Milliseconds until the next period
}

const TimeContext = createContext<TimeContextType | null>(null);

function readTime(): TimeContextType {
  const now = Date.now();
  return {
    currentPeriod: Math.floor(now / TOTP_PERIOD_MS),
    timeRemaining: TOTP_PERIOD_MS - (now % TOTP_PERIOD_MS),
  };
}

const msUntilNextSecond = () => 1000 - (Date.now() % 1000) + 1;

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [timeState, setTimeState] = useState(readTime);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Tick on whole-second boundaries: the visible countdown only changes once a second,
    // and the progress bar is animated by CSS, so nothing needs a faster update.
    const tick = () => {
      setTimeState(readTime());
      timer = setTimeout(tick, msUntilNextSecond());
    };
    timer = setTimeout(tick, msUntilNextSecond());

    // Timers are throttled while the window is hidden, so resync as soon as it is shown.
    const resync = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', resync);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resync);
    };
  }, []);

  return (
    <TimeContext.Provider value={timeState}>
      {children}
    </TimeContext.Provider>
  );
}

export function useCurrentTime() {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useCurrentTime must be used within TimeProvider');
  }
  return context;
}
