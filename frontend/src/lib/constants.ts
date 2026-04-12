/**
 * Application constants
 */

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'TOTP Manager';
export const APP_LICENSE = 'MIT';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const TOTP_CODE_LENGTH = 6;
export const TOTP_TIME_STEP = 30;

export const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  SEARCH_HISTORY: 'searchHistory',
} as const;
