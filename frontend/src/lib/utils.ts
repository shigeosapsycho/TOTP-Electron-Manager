/**
 * Utility functions for TOTP Manager
 */

/**
 * Format seconds remaining as MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds remaining as SS (shows only seconds, but uses milliseconds for smooth progress bar)
 */
export function formatTimeRemainingMs(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const secs = seconds % 60;
  return secs.toString().padStart(2, '0');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Get percentage of time remaining (for progress bar)
 */
export function getTimePercentage(timeRemaining: number, validFor: number = 30): number {
  return (timeRemaining / validFor) * 100;
}

/**
 * Determine color based on time remaining
 */
export function getTimeColor(timeRemaining: number, validFor: number = 30): string {
  const percentage = getTimePercentage(timeRemaining, validFor);
  if (percentage > 50) return 'text-green-500';
  if (percentage > 20) return 'text-yellow-500';
  return 'text-red-500';
}

/**
 * Format code as XXX XXX (with space in middle)
 */
export function formatCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  return code;
}
