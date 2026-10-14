const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Store = require('electron-store');

// Software rendering only: GPU process crashes were seen on some drivers.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const secureStore = new Store({
  name: 'totp-secure-data',
  encryptionKey: 'totp-manager-encryption-key-v2'
});

const settingsStore = new Store({
  name: 'totp-settings',
  encryptionKey: 'totp-manager-settings'
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'TOTP Manager',
    width: 1400,
    height: 950,
    resizable: false,
    minWidth: 1400,
    minHeight: 950,
    x: 100,
    y: 25,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // the static export is loaded from file://
      allowRunningInsecureContent: true
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'out', 'index.html')}`;
  mainWindow.loadURL(startUrl).catch((err) => {
    console.error('Error loading URL:', err);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.focus();
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('Error during app.whenReady:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Key handling

// Reading from an encrypted electron-store re-reads and decrypts the file on every
// get(), and a code refresh decrypts one secret per account, so the key is cached.
let cachedEncryptionKey = null;

function deriveEncryptionKey(password) {
  const salt = crypto.randomBytes(16);
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

function getEncryptionKey({ create = true } = {}) {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  let key = settingsStore.get('encryption-key');
  if (!key && create) {
    key = deriveEncryptionKey('default-key');
    settingsStore.set('encryption-key', key);
  }

  cachedEncryptionKey = key || null;
  return cachedEncryptionKey;
}

function encryptSecret(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    data: encrypted
  });
}

function decryptSecret(encryptedData, key) {
  const { iv, authTag, data } = JSON.parse(encryptedData);

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Ids are creation timestamps; bumping past the highest existing id keeps them
// unique when several accounts are created within the same millisecond.
function nextAccountId(accounts) {
  const highest = accounts.reduce((max, acc) => Math.max(max, acc.id), 0);
  return Math.max(Date.now(), highest + 1);
}

function withoutSecret(account) {
  const copy = { ...account };
  delete copy.encrypted_secret;
  return copy;
}

// IPC handlers

// Wraps a handler so failures come back as { success: false, error } instead of throwing across IPC.
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return { success: true, ...(await fn(...args)) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

handle('get-accounts', () => ({ accounts: secureStore.get('accounts', []) }));

handle('create-account', (account) => {
  const accounts = secureStore.get('accounts', []);

  const newAccount = {
    ...account,
    id: nextAccountId(accounts),
    encrypted_secret: encryptSecret(account.secret_key, getEncryptionKey()),
    is_pinned: false,
    order: accounts.length,
    created_at: new Date().toISOString()
  };

  secureStore.set('accounts', [...accounts, newAccount]);
  return { account: withoutSecret(newAccount) };
});

handle('update-account', ({ id, updates }) => {
  const accounts = secureStore.get('accounts', []);
  const accountIndex = accounts.findIndex((acc) => acc.id === id);

  if (accountIndex === -1) {
    throw new Error('Account not found');
  }

  const { secret_key, ...fields } = updates;
  if (secret_key) {
    fields.encrypted_secret = encryptSecret(secret_key, getEncryptionKey());
  }

  accounts[accountIndex] = { ...accounts[accountIndex], ...fields };
  secureStore.set('accounts', accounts);

  return { account: withoutSecret(accounts[accountIndex]) };
});

handle('bulk-delete-accounts', (ids) => {
  const doomed = new Set(ids);
  const accounts = secureStore.get('accounts', []);
  secureStore.set('accounts', accounts.filter((acc) => !doomed.has(acc.id)));
  return {};
});

handle('reorder-accounts', (accountIds) => {
  const accounts = secureStore.get('accounts', []);
  const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

  const reordered = accountIds.map((id) => accountMap.get(id)).filter(Boolean);
  if (reordered.length !== accountIds.length) {
    throw new Error('Some account IDs are invalid');
  }

  // Accounts missing from the list (e.g. hidden by a search filter) keep their relative order at the end.
  const listed = new Set(accountIds);
  const unlisted = accounts.filter((acc) => !listed.has(acc.id));

  const result = [...reordered, ...unlisted].map((account, index) => ({ ...account, order: index }));
  secureStore.set('accounts', result);
  return {};
});

handle('decrypt-secret', (encryptedSecret) => {
  const key = getEncryptionKey({ create: false });
  if (!key) {
    throw new Error('Encryption key not found');
  }
  return { secret: decryptSecret(encryptedSecret, key) };
});

handle('import-accounts', (accounts) => {
  const existing = secureStore.get('accounts', []);
  const key = getEncryptionKey();
  const firstId = nextAccountId(existing);

  const imported = accounts.map((account, index) => ({
    ...account,
    id: firstId + index,
    encrypted_secret: encryptSecret(account.secret_key, key),
    is_pinned: false,
    order: existing.length + index,
    created_at: new Date().toISOString()
  }));

  secureStore.set('accounts', [...existing, ...imported]);
  return { imported: imported.length };
});

handle('save-file', async ({ content, filename }) => {
  const result = await dialog.showSaveDialog({
    title: 'Save CSV File',
    defaultPath: filename,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePath === undefined) {
    return { canceled: true };
  }

  await fs.promises.writeFile(result.filePath, content, 'utf8');
  return { filePath: result.filePath };
});
