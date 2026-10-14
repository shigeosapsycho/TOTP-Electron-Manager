/**
 * Account storage for the Electron TOTP Manager.
 * Talks to the main process through the preload bridge; falls back to
 * localStorage when running in a plain browser (`next dev`).
 */
import type { Account, AccountCreate, AccountSecret, AccountUpdate } from '@/types';
import { STORAGE_KEYS, TOTP_DIGITS, TOTP_PERIOD_SECONDS } from '@/lib/constants';

interface IpcResult {
  success: boolean;
  error?: string;
}

type ExportResult = IpcResult & { canceled?: boolean };

declare global {
  interface Window {
    electronAPI?: {
      getAccounts: () => Promise<IpcResult & { accounts?: Account[] }>;
      createAccount: (account: AccountCreate) => Promise<IpcResult & { account?: Account }>;
      updateAccount: (id: number, updates: AccountUpdate) => Promise<IpcResult & { account?: Account }>;
      bulkDeleteAccounts: (ids: number[]) => Promise<IpcResult>;
      reorderAccounts: (accountIds: number[]) => Promise<IpcResult>;
      decryptSecret: (encryptedSecret: string) => Promise<IpcResult & { secret?: string }>;
      importAccounts: (accounts: AccountCreate[]) => Promise<IpcResult & { imported?: number }>;
      saveFile: (content: string, filename: string) => Promise<ExportResult>;
    };
  }
}

const getBridge = () => (typeof window === 'undefined' ? undefined : window.electronAPI);

/**
 * Throw if the main process reported a failure, otherwise return the result
 */
function unwrap<T extends IpcResult>(result: T, fallbackMessage: string): T {
  if (!result.success) {
    throw new Error(result.error || fallbackMessage);
  }
  return result;
}

function ensure<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function readLocalAccounts(): Account[] {
  const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_ACCOUNTS);
  return stored ? JSON.parse(stored) : [];
}

function writeLocalAccounts(accounts: Account[]): void {
  localStorage.setItem(STORAGE_KEYS.LOCAL_ACCOUNTS, JSON.stringify(accounts));
}

function createLocalAccount(data: AccountCreate, id: number, order: number): Account {
  const now = new Date().toISOString();
  return { ...data, id, is_pinned: false, order, created_at: now, updated_at: now };
}

// otpauth is only needed once a code is generated, so it stays out of the initial bundle.
let otpauthModule: Promise<typeof import('otpauth')> | undefined;
const loadOtpauth = () => (otpauthModule ??= import('otpauth'));

/**
 * Plain-text secret for an account, decrypting it through the main process when needed
 */
async function resolveSecret(account: AccountSecret): Promise<string> {
  const bridge = getBridge();

  if (account.encrypted_secret && bridge) {
    const result = unwrap(await bridge.decryptSecret(account.encrypted_secret), 'Failed to decrypt secret');
    return ensure(result.secret, 'Failed to decrypt secret');
  }

  if (!account.secret_key) {
    throw new Error('No secret key available');
  }
  return account.secret_key;
}

export const accountsAPI = {
  list: async (): Promise<Account[]> => {
    const bridge = getBridge();
    if (bridge) {
      const result = unwrap(await bridge.getAccounts(), 'Failed to get accounts');
      return ensure(result.accounts, 'Failed to get accounts');
    }
    return readLocalAccounts();
  },

  create: async (data: AccountCreate): Promise<Account> => {
    const bridge = getBridge();
    if (bridge) {
      const result = unwrap(await bridge.createAccount(data), 'Failed to create account');
      return ensure(result.account, 'Failed to create account');
    }

    const accounts = readLocalAccounts();
    const account = createLocalAccount(data, Date.now(), accounts.length);
    writeLocalAccounts([...accounts, account]);
    return account;
  },

  /**
   * Create many accounts in one round trip (one store write instead of one per account)
   */
  createMany: async (items: AccountCreate[]): Promise<number> => {
    const bridge = getBridge();
    if (bridge) {
      const result = unwrap(await bridge.importAccounts(items), 'Failed to import accounts');
      return ensure(result.imported, 'Failed to import accounts');
    }

    const accounts = readLocalAccounts();
    const baseId = Date.now();
    const created = items.map((item, index) => createLocalAccount(item, baseId + index, accounts.length + index));
    writeLocalAccounts([...accounts, ...created]);
    return created.length;
  },

  update: async (id: number, data: AccountUpdate): Promise<Account> => {
    const bridge = getBridge();
    if (bridge) {
      const result = unwrap(await bridge.updateAccount(id, data), 'Failed to update account');
      return ensure(result.account, 'Failed to update account');
    }

    const accounts = readLocalAccounts();
    const index = accounts.findIndex((acc) => acc.id === id);
    if (index === -1) {
      throw new Error('Account not found');
    }
    accounts[index] = { ...accounts[index], ...data };
    writeLocalAccounts(accounts);
    return accounts[index];
  },

  delete: async (id: number): Promise<void> => {
    return accountsAPI.bulkDelete([id]);
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    const bridge = getBridge();
    if (bridge) {
      unwrap(await bridge.bulkDeleteAccounts(ids), 'Failed to delete accounts');
      return;
    }

    const doomed = new Set(ids);
    writeLocalAccounts(readLocalAccounts().filter((acc) => !doomed.has(acc.id)));
  },

  reorder: async (accountIds: number[]): Promise<void> => {
    const bridge = getBridge();
    if (bridge) {
      unwrap(await bridge.reorderAccounts(accountIds), 'Failed to reorder accounts');
      return;
    }

    const accounts = readLocalAccounts();
    const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));
    const reordered = accountIds.map((id) => accountMap.get(id)).filter((acc): acc is Account => !!acc);
    if (reordered.length !== accountIds.length) {
      throw new Error('Some account IDs are invalid');
    }

    const listed = new Set(accountIds);
    const unlisted = accounts.filter((acc) => !listed.has(acc.id));
    writeLocalAccounts([...reordered, ...unlisted].map((acc, order) => ({ ...acc, order })));
  },

  getSecret: resolveSecret,

  /**
   * Six-digit code for an account at the given time (defaults to now)
   */
  generateCode: async (account: AccountSecret, timestamp: number = Date.now()): Promise<string> => {
    const [secret, { TOTP }] = await Promise.all([resolveSecret(account), loadOtpauth()]);
    return new TOTP({
      secret,
      algorithm: 'SHA1',
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
    }).generate({ timestamp });
  },
};

/**
 * Export accounts (including secret keys) to a CSV file
 */
export const exportToCSV = async (accounts: Account[]): Promise<ExportResult> => {
  // The encrypted copy is what edits keep current, so resolve through it rather than the stored plaintext field.
  const secrets = await Promise.all(
    accounts.map((account) => resolveSecret(account).catch(() => account.secret_key || ''))
  );
  const rows = [
    ['Service', 'Account Name', 'Secret Key'],
    ...accounts.map((account, i) => [account.service, account.account_name, secrets[i]]),
  ];
  const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const filename = `totp_accounts_${new Date().toISOString().split('T')[0]}.csv`;

  const bridge = getBridge();
  if (bridge) {
    return bridge.saveFile(csvContent, filename);
  }

  // Plain browser: trigger a download
  const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { success: true };
};

export default accountsAPI;
