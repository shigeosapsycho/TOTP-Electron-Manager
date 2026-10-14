/**
 * Application constants
 */

export const APP_NAME = 'TOTP Manager';
export const APP_VERSION = '2.2.0';
export const APP_LICENSE = 'MIT';

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;
export const TOTP_DIGITS = 6;

export const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  LOCAL_ACCOUNTS: 'totp-accounts',
} as const;
