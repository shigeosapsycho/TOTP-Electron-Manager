/**
 * Utility functions for TOTP Manager
 */
import type { Account } from '@/types';

/**
 * Format milliseconds remaining as whole seconds, zero padded (e.g. "07")
 */
export function formatTimeRemainingMs(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return (seconds % 60).toString().padStart(2, '0');
}

export type CountdownTone = 'ok' | 'warn' | 'critical';

/**
 * Bucket the time left in a period into a color tone
 */
export function getCountdownTone(milliseconds: number): CountdownTone {
  if (milliseconds > 15000) return 'ok';
  if (milliseconds > 5000) return 'warn';
  return 'critical';
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
 * Format code as XXX XXX (with space in middle)
 */
export function formatCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  return code;
}

/**
 * Pinned accounts first, then by stored order
 */
export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return (a.order || 0) - (b.order || 0);
  });
}

/**
 * Keep accounts whose service or account name contains the query (case insensitive)
 */
export function filterAccounts(accounts: Account[], query: string): Account[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return accounts;
  return accounts.filter(
    (account) =>
      account.service.toLowerCase().includes(needle) ||
      account.account_name.toLowerCase().includes(needle)
  );
}
