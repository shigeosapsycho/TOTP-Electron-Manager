/**
 * Shared time context for synchronized TOTP timers
 * Uses epoch time to ensure all accounts sync to the same 30-second cycle
 */
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface TimeContextType {
  currentTime: number;        // Current epoch time in milliseconds
  currentPeriod: number;    // Current 30-second period (0, 1, 2, etc.)
  timeRemaining: number;     // Milliseconds until next period
  timeRemainingSeconds: number; // Seconds until next period (for display)
}

const TimeContext = createContext<TimeContextType>({
  currentTime: 0,
  currentPeriod: 0,
  timeRemaining: 30000,
  timeRemainingSeconds: 30,
});

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [timeState, setTimeState] = useState(() => {
    const now = Date.now();
    const period = Math.floor(now / 30000);
    const endOfPeriod = (period + 1) * 30000;
    const timeRemaining = endOfPeriod - now;
    return {
      currentTime: now,
      currentPeriod: period,
      timeRemaining: timeRemaining,
      timeRemainingSeconds: Math.ceil(timeRemaining / 1000),
    };
  });

  useEffect(() => {
    // Update time every 16ms for smooth countdowns (approximately 60fps)
    const interval = setInterval(() => {
      const now = Date.now();
      const period = Math.floor(now / 30000);
      const endOfPeriod = (period + 1) * 30000;
      const timeRemaining = endOfPeriod - now;

      setTimeState({
        currentTime: now,
        currentPeriod: period,
        timeRemaining: timeRemaining,
        timeRemainingSeconds: Math.ceil(timeRemaining / 1000),
      });
    }, 16);

    return () => clearInterval(interval);
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
