const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  createAccount: (account) => ipcRenderer.invoke('create-account', account),
  updateAccount: (id, updates) => ipcRenderer.invoke('update-account', { id, updates }),
  bulkDeleteAccounts: (ids) => ipcRenderer.invoke('bulk-delete-accounts', ids),
  reorderAccounts: (accountIds) => ipcRenderer.invoke('reorder-accounts', accountIds),
  decryptSecret: (encryptedSecret) => ipcRenderer.invoke('decrypt-secret', encryptedSecret),
  importAccounts: (accounts) => ipcRenderer.invoke('import-accounts', accounts),
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', { content, filename }),
});
