/**
 * API client for communicating with the TOTP Manager backend
 */
import axios from 'axios';
import type { Account, AccountCreate, AccountUpdate, TOTPResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Account API methods
 */
export const accountsAPI = {
  /**
   * Get all accounts
   */
  list: async (): Promise<Account[]> => {
    const response = await api.get<Account[]>('/api/accounts');
    return response.data;
  },

  /**
   * Get a specific account by ID
   */
  get: async (id: number): Promise<Account> => {
    const response = await api.get<Account>(`/api/accounts/${id}`);
    return response.data;
  },

  /**
   * Create a new account
   */
  create: async (data: AccountCreate): Promise<Account> => {
    const response = await api.post<Account>('/api/accounts', data);
    return response.data;
  },

  /**
   * Update an existing account
   */
  update: async (id: number, data: AccountUpdate): Promise<Account> => {
    const response = await api.put<Account>(`/api/accounts/${id}`, data);
    return response.data;
  },

  /**
   * Delete an account
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/accounts/${id}`);
  },

  /**
   * Generate TOTP code for an account
   */
  generateTOTP: async (id: number): Promise<TOTPResponse> => {
    const response = await api.get<TOTPResponse>(`/api/accounts/${id}/totp`);
    return response.data;
  },

  /**
   * Bulk delete multiple accounts
   */
  bulkDelete: async (ids: number[]): Promise<void> => {
    await Promise.all(ids.map(id => api.delete(`/api/accounts/${id}`)));
  },

  /**
   * Reorder accounts
   */
  reorder: async (accountIds: number[]): Promise<void> => {
    await api.put('/api/accounts/reorder', { account_ids: accountIds });
  },
};

/**
 * Export accounts to CSV
 */
export const exportToCSV = (accounts: Account[]): void => {
  // CSV header
  const headers = ['Service', 'Account Name', 'Secret Key'];

  // We only include service and account name since we can't get the secret keys
  // Create rows without secret key (users will need to add those manually if re-importing)
  const rows = accounts.map(account => [
    account.service,
    account.account_name,
    '', // Secret key is encrypted and not accessible
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `totp_accounts_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Import accounts from CSV
 */
export const importFromCSV = (csvText: string): AccountCreate[] => {
  const lines = csvText.trim().split('\n');
  const accounts: AccountCreate[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV (handle quotes)
    const matches = line.match(/("([^"]*)"|([^,]+))/g);
    if (matches && matches.length >= 2) {
      const service = matches[0].replace(/"/g, '').trim();
      const accountName = matches[1].replace(/"/g, '').trim();
      const secretKey = matches[2]?.replace(/"/g, '').trim();

      if (service && accountName && secretKey) {
        accounts.push({
          service,
          account_name: accountName,
          secret_key: secretKey
        });
      }
    }
  }

  return accounts;
};

export default api;
