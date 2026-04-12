/**
 * Local storage interface for Electron TOTP Manager
 * Replaces backend API calls with local storage operations
 */
import type { Account, AccountCreate, AccountUpdate, TOTPResponse } from '@/types';

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      getAccounts: () => Promise<{ success: boolean; accounts?: Account[]; error?: string }>;
      createAccount: (account: AccountCreate) => Promise<{ success: boolean; account?: Account; error?: string }>;
      updateAccount: (id: number, updates: AccountUpdate) => Promise<{ success: boolean; account?: Account; error?: string }>;
      deleteAccount: (id: number) => Promise<{ success: boolean; error?: string }>;
      bulkDeleteAccounts: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
      reorderAccounts: (accountIds: number[]) => Promise<{ success: boolean; error?: string }>;
      decryptSecret: (encryptedSecret: string) => Promise<{ success: boolean; secret?: string; error?: string }>;
      exportAccounts: () => Promise<{ success: boolean; accounts?: Account[]; error?: string }>;
      importAccounts: (accounts: AccountCreate[]) => Promise<{ success: boolean; imported?: number; error?: string }>;
      saveFile: (content: string, filename: string) => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
    };
  }
}

/**
 * Account API methods (same interface as original API)
 */
export const accountsAPI = {
  /**
   * Get all accounts
   */
  list: async (): Promise<Account[]> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getAccounts();
        if (result.success && result.accounts) {
          return result.accounts;
        }
        throw new Error(result.error || 'Failed to get accounts');
      }
      // Fallback for development
      const stored = localStorage.getItem('totp-accounts');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw error;
    }
  },

  /**
   * Get a specific account by ID
   */
  get: async (id: number): Promise<Account> => {
    try {
      const accounts = await accountsAPI.list();
      const account = accounts.find(acc => acc.id === id);
      if (!account) {
        throw new Error('Account not found');
      }
      return account;
    } catch (error) {
      console.error('Error getting account:', error);
      throw error;
    }
  },

  /**
   * Create a new account
   */
  create: async (data: AccountCreate): Promise<Account> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createAccount(data);
        if (result.success && result.account) {
          return result.account;
        }
        throw new Error(result.error || 'Failed to create account');
      }
      // Fallback for development
      const accounts = await accountsAPI.list();
      const newAccount: Account = {
        ...data,
        id: Date.now(),
        is_pinned: false,
        order: accounts.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      accounts.push(newAccount);
      localStorage.setItem('totp-accounts', JSON.stringify(accounts));
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  },

  /**
   * Update an existing account
   */
  update: async (id: number, data: AccountUpdate): Promise<Account> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateAccount(id, data);
        if (result.success && result.account) {
          return result.account;
        }
        throw new Error(result.error || 'Failed to update account');
      }
      // Fallback for development
      const accounts = await accountsAPI.list();
      const index = accounts.findIndex(acc => acc.id === id);
      if (index === -1) {
        throw new Error('Account not found');
      }
      accounts[index] = { ...accounts[index], ...data };
      localStorage.setItem('totp-accounts', JSON.stringify(accounts));
      return accounts[index];
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  },

  /**
   * Delete an account
   */
  delete: async (id: number): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteAccount(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete account');
        }
        return;
      }
      // Fallback for development
      const accounts = await accountsAPI.list();
      const filtered = accounts.filter(acc => acc.id !== id);
      localStorage.setItem('totp-accounts', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  /**
   * Generate TOTP code for an account (client-side)
   */
  generateTOTP: async (account: Account): Promise<TOTPResponse> => {
    try {
      // Get the secret key
      let secret = account.secret_key;

      // If we have an encrypted secret, decrypt it
      if (account.encrypted_secret && typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.decryptSecret(account.encrypted_secret);
        if (result.success && result.secret) {
          secret = result.secret;
        } else {
          throw new Error(result.error || 'Failed to decrypt secret');
        }
      }

      if (!secret) {
        throw new Error('No secret key available');
      }

      // Use otpauth library for client-side TOTP generation
      const { TOTP } = await import('otpauth');
      const totp = new TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
      });

      const token = totp.generate();

      // Calculate time based on epoch time (30-second cycles)
      const currentTime = Date.now();
      const currentPeriod = Math.floor(currentTime / 30000); // Which 30-second cycle we're in
      const startOfPeriod = currentPeriod * 30000; // Start of current 30-second window
      const endOfPeriod = (currentPeriod + 1) * 30000; // End of current 30-second window

      const timeRemaining = endOfPeriod - currentTime; // Time until next code (in milliseconds)

      return {
        code: token,
        valid_for: 30,
        time_remaining: timeRemaining,
        generated_at: currentTime
      };
    } catch (error) {
      console.error('Error generating TOTP:', error);
      throw error;
    }
  },

  /**
   * Bulk delete multiple accounts
   */
  bulkDelete: async (ids: number[]): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.bulkDeleteAccounts(ids);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete accounts');
        }
        return;
      }
      // Fallback for development
      const accounts = await accountsAPI.list();
      const filtered = accounts.filter(acc => !ids.includes(acc.id));
      localStorage.setItem('totp-accounts', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error bulk deleting accounts:', error);
      throw error;
    }
  },

  /**
   * Reorder accounts
   */
  reorder: async (accountIds: number[]): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.reorderAccounts(accountIds);
        if (!result.success) {
          throw new Error(result.error || 'Failed to reorder accounts');
        }
        return;
      }
      // Fallback for development
      const accounts = await accountsAPI.list();
      const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
      const reordered = accountIds.map(id => accountMap.get(id)).filter(Boolean) as Account[];

      if (reordered.length !== accountIds.length) {
        throw new Error('Some account IDs are invalid');
      }

      reordered.forEach((account, index) => {
        account.order = index;
      });

      localStorage.setItem('totp-accounts', JSON.stringify(reordered));
    } catch (error) {
      console.error('Error reordering accounts:', error);
      throw error;
    }
  },
};

/**
 * Export accounts to CSV
 */
export const exportToCSV = async (accounts: Account[]): Promise<{ success: boolean; canceled?: boolean; error?: string }> => {
  // CSV header
  const headers = ['Service', 'Account Name', 'Secret Key'];

  // Include secret keys for export (since we're local now)
  const rows = accounts.map(account => [
    account.service,
    account.account_name,
    account.secret_key || '' // Include secret if available
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Use Electron save dialog if available
  if (typeof window !== 'undefined' && window.electronAPI) {
    const filename = `totp_accounts_${new Date().toISOString().split('T')[0]}.csv`;
    const result = await window.electronAPI.saveFile(csvContent, filename);
    return result;
  }

  // Fallback for development - direct download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `totp_accounts_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true };
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

export default accountsAPI;