const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Account operations
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  createAccount: (account) => ipcRenderer.invoke('create-account', account),
  updateAccount: (id, updates) => ipcRenderer.invoke('update-account', { id, updates }),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  bulkDeleteAccounts: (ids) => ipcRenderer.invoke('bulk-delete-accounts', ids),
  reorderAccounts: (accountIds) => ipcRenderer.invoke('reorder-accounts', accountIds),

  // TOTP generation
  decryptSecret: (encryptedSecret) => ipcRenderer.invoke('decrypt-secret', encryptedSecret),

  // Import/Export
  exportAccounts: () => ipcRenderer.invoke('export-accounts'),
  importAccounts: (accounts) => ipcRenderer.invoke('import-accounts', accounts),
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', { content, filename }),

  // Utility methods
  on: (channel, func) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
  },
  once: (channel, func) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.once(channel, subscription);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose platform information
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});

// Expose node version
contextBridge.exposeInMainWorld('nodeVersion', process.versions.node);