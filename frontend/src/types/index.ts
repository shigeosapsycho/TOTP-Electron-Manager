/**
 * TypeScript type definitions for TOTP Manager
 */

export interface Account {
  id: number;
  service: string;
  account_name: string;
  is_pinned?: boolean;
  order?: number;
  created_at: string;
  updated_at: string;
  encrypted_secret?: string; // For local storage
  secret_key?: string; // For display/import/export
}

export interface AccountCreate {
  service: string;
  account_name: string;
  secret_key: string;
}

export interface AccountUpdate {
  service?: string;
  account_name?: string;
  secret_key?: string;
  is_pinned?: boolean;
  order?: number;
}

export interface TOTPResponse {
  code: string;
  valid_for: number;
  time_remaining: number;
  generated_at: number;
}

export interface AccountWithTOTP extends Account {
  totp?: TOTPResponse;
}

export interface APIError {
  detail: string;
}
