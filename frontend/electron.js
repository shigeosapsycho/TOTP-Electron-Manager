const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const crypto = require('crypto');

// Maximum GPU disabling
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize stores
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
  console.log('Creating window...');

  mainWindow = new BrowserWindow({
    title: 'TOTP Manager',
    width: 1400,
    height: 950,
    resizable: false,
    minWidth: 1400,
    minHeight: 950,
    x: 100,
    y: 25,
    show: true, // Show immediately
    backgroundColor: '#ffffff',
    autoHideMenuBar: true, // Hide the menu bar (File, Edit, View, etc.)
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: false, // Disable for local file loading
      allowRunningInsecureContent: true
    }
  });

  console.log('Window created, loading content...');

  // Load the app using file:// protocol
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'out', 'index.html')}`;
  console.log('Loading URL:', startUrl);

  mainWindow.loadURL(startUrl).then(() => {
    console.log('URL loaded successfully');
  }).catch(err => {
    console.error('Error loading URL:', err);
  });

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    mainWindow.focus();
  });

  // Crash handling
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  // Remove the application menu completely (no File, Edit, View, Help, etc.)
  const { Menu } = require('electron');
  Menu.setApplicationMenu(null);

  // Don't open DevTools - they can cause GPU crashes
  // mainWindow.webContents.openDevTools();
  // console.log('DevTools opened');

  // Handle window crashes
  mainWindow.on('unresponsive', () => {
    console.log('Window became unresponsive');
  });

  mainWindow.on('responsive', () => {
    console.log('Window became responsive again');
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  console.log('App ready, creating window...');

  try {
    createWindow();
    console.log('createWindow completed successfully');
  } catch (error) {
    console.error('Error creating window:', error);
  }

  app.on('activate', () => {
    console.log('Activate event fired');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('Error during app.whenReady:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for secure operations

// Get all accounts
ipcMain.handle('get-accounts', async () => {
  try {
    const accounts = secureStore.get('accounts', []);
    return { success: true, accounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create account
ipcMain.handle('create-account', async (event, account) => {
  try {
    const accounts = secureStore.get('accounts', []);

    // Get or create encryption key
    let encryptionKey = settingsStore.get('encryption-key');
    if (!encryptionKey) {
      encryptionKey = deriveEncryptionKey('default-key');
      settingsStore.set('encryption-key', encryptionKey);
    }

    // Encrypt secret key
    const encryptedSecret = encryptSecret(account.secret_key, encryptionKey);

    // Create new account with encrypted secret
    const newAccount = {
      ...account,
      id: Date.now(),
      encrypted_secret: encryptedSecret,
      is_pinned: false,
      order: accounts.length,
      created_at: new Date().toISOString()
    };

    accounts.push(newAccount);
    secureStore.set('accounts', accounts);

    // Return account without encrypted secret for UI
    const { encrypted_secret, ...accountForUI } = newAccount;
    return { success: true, account: accountForUI };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update account
ipcMain.handle('update-account', async (event, { id, updates }) => {
  try {
    const accounts = secureStore.get('accounts', []);
    const accountIndex = accounts.findIndex(acc => acc.id === id);

    if (accountIndex === -1) {
      return { success: false, error: 'Account not found' };
    }

    // If updating secret key, encrypt it
    if (updates.secret_key) {
      const encryptionKey = settingsStore.get('encryption-key');
      if (!encryptionKey) {
        return { success: false, error: 'Encryption key not found' };
      }
      updates.encrypted_secret = encryptSecret(updates.secret_key, encryptionKey);
      delete updates.secret_key;
    }

    // Update account
    accounts[accountIndex] = { ...accounts[accountIndex], ...updates };
    secureStore.set('accounts', accounts);

    // Return account without encrypted secret for UI
    const { encrypted_secret, ...accountForUI } = accounts[accountIndex];
    return { success: true, account: accountForUI };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete account
ipcMain.handle('delete-account', async (event, id) => {
  try {
    const accounts = secureStore.get('accounts', []);
    const filteredAccounts = accounts.filter(acc => acc.id !== id);
    secureStore.set('accounts', filteredAccounts);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Bulk delete accounts
ipcMain.handle('bulk-delete-accounts', async (event, ids) => {
  try {
    const accounts = secureStore.get('accounts', []);
    const filteredAccounts = accounts.filter(acc => !ids.includes(acc.id));
    secureStore.set('accounts', filteredAccounts);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reorder accounts
ipcMain.handle('reorder-accounts', async (event, accountIds) => {
  try {
    const accounts = secureStore.get('accounts', []);
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

    // Reorder accounts based on provided IDs
    const reorderedAccounts = accountIds.map(id => accountMap.get(id)).filter(Boolean);

    if (reorderedAccounts.length !== accountIds.length) {
      return { success: false, error: 'Some account IDs are invalid' };
    }

    // Update order field
    reorderedAccounts.forEach((account, index) => {
      account.order = index;
    });

    secureStore.set('accounts', reorderedAccounts);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Decrypt secret for TOTP generation
ipcMain.handle('decrypt-secret', async (event, encryptedSecret) => {
  try {
    const encryptionKey = settingsStore.get('encryption-key');
    if (!encryptionKey) {
      return { success: false, error: 'Encryption key not found' };
    }
    const decryptedSecret = decryptSecret(encryptedSecret, encryptionKey);
    return { success: true, secret: decryptedSecret };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export accounts
ipcMain.handle('export-accounts', async () => {
  try {
    const accounts = secureStore.get('accounts', []);

    // Remove encrypted secrets for export
    const exportData = accounts.map(({ encrypted_secret, ...acc }) => acc);

    return { success: true, accounts: exportData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import accounts
ipcMain.handle('import-accounts', async (event, accounts) => {
  try {
    const existingAccounts = secureStore.get('accounts', []);
    const encryptionKey = settingsStore.get('encryption-key');
    if (!encryptionKey) {
      return { success: false, error: 'Encryption key not found' };
    }

    // Encrypt secrets and add accounts
    const importedAccounts = accounts.map((account, index) => ({
      ...account,
      id: Date.now() + index,
      encrypted_secret: encryptSecret(account.secret_key, encryptionKey),
      is_pinned: false,
      order: existingAccounts.length + index,
      created_at: new Date().toISOString()
    }));

    const updatedAccounts = [...existingAccounts, ...importedAccounts];
    secureStore.set('accounts', updatedAccounts);

    return { success: true, imported: importedAccounts.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save file dialog for CSV export
ipcMain.handle('save-file', async (event, { content, filename }) => {
  try {
    const { dialog } = require('electron');

    const result = await dialog.showSaveDialog({
      title: 'Save CSV File',
      defaultPath: filename,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePath === undefined) {
      return { success: false, canceled: true };
    }

    const fs = require('fs');
    fs.writeFileSync(result.filePath, content, 'utf8');

    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Utility functions

function deriveEncryptionKey(password) {
  // Derive encryption key from master password using PBKDF2
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return key.toString('hex');
}

function encryptSecret(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + authTag + encrypted data
  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
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