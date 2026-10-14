/**
 * Main dashboard page for TOTP Manager
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Account } from '@/types';
import { accountsAPI, exportToCSV } from '@/lib/storage';
import { APP_LICENSE, APP_NAME, APP_VERSION } from '@/lib/constants';
import { filterAccounts, sortAccounts } from '@/lib/utils';
import { useDarkMode } from '@/lib/useDarkMode';
import AccountCard from '@/components/AccountCard';
import AccountContextMenu from '@/components/AccountContextMenu';
import AddAccountModal from '@/components/AddAccountModal';
import AlertModal, { AlertType } from '@/components/AlertModal';
import BulkEditModal from '@/components/BulkEditModal';
import ConfirmModal from '@/components/ConfirmModal';
import EditAccountModal from '@/components/EditAccountModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  DocumentArrowUpIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface ContextMenuState {
  account: Account;
  x: number;
  y: number;
}

interface AlertState {
  title: string;
  message: string;
  type: AlertType;
  showOkButton?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type: AlertType;
}

const CLOSED_CONFIRM: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  type: 'warning',
};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedAccount, setDraggedAccount] = useState<Account | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>(CLOSED_CONFIRM);
  const [alertModal, setAlertModal] = useState<AlertState | null>(null);

  const filteredAccounts = useMemo(() => filterAccounts(accounts, searchQuery), [accounts, searchQuery]);
  const selectAll = filteredAccounts.length > 0 && selectedIds.size === filteredAccounts.length;
  const anyModalOpen = showAddModal || showBulkEditModal || editingAccount !== null || alertModal !== null;

  const fetchAccounts = useCallback(async () => {
    try {
      setAccounts(sortAccounts(await accountsAPI.list()));
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setAlertModal({ title: 'Error', message: 'Failed to load accounts.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const closeConfirm = useCallback(() => setConfirmModal((prev) => ({ ...prev, isOpen: false })), []);

  // Delete confirmation shared by single and bulk delete
  const confirmDelete = useCallback(
    (title: string, message: string, errorMessage: string, performDelete: () => Promise<void>) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: async () => {
          try {
            await performDelete();
            fetchAccounts();
            closeConfirm();
          } catch (error) {
            console.error(errorMessage, error);
            setConfirmModal({
              isOpen: true,
              title: 'Error',
              message: errorMessage,
              type: 'danger',
              onConfirm: closeConfirm,
            });
          }
        },
      });
    },
    [fetchAccounts, closeConfirm]
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    confirmDelete(
      'Delete Accounts',
      `Are you sure you want to delete ${ids.length} account(s)? This action cannot be undone.`,
      'Failed to delete some accounts. Please try again.',
      async () => {
        await accountsAPI.bulkDelete(ids);
        clearSelection();
      }
    );
  }, [selectedIds, confirmDelete, clearSelection]);

  const handleDeleteAccount = useCallback(
    (account: Account) => {
      confirmDelete(
        'Delete Account',
        `Are you sure you want to delete ${account.service} (${account.account_name})? This action cannot be undone.`,
        'Failed to delete account. Please try again.',
        async () => {
          await accountsAPI.delete(account.id);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(account.id);
            return next;
          });
        }
      );
    },
    [confirmDelete]
  );

  const handleStartEdit = useCallback((account: Account) => {
    setDragOverIndex(null);
    setDraggedAccount(null);
    setEditingAccount(account);
  }, []);

  // Selection

  const toggleSelectAll = () => {
    if (selectAll) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filteredAccounts.map((a) => a.id)));
      // The first account anchors subsequent shift-clicks
      setLastSelectedId(filteredAccounts.length > 0 ? filteredAccounts[0].id : null);
    }
    setContextMenu(null);
  };

  const handleSelect = useCallback(
    (id: number, event: React.MouseEvent) => {
      setContextMenu(null);

      // Shift-click selects the range between the anchor and this account
      if (event.shiftKey && lastSelectedId !== null) {
        const currentIndex = filteredAccounts.findIndex((a) => a.id === id);
        const lastIndex = filteredAccounts.findIndex((a) => a.id === lastSelectedId);

        if (currentIndex !== -1 && lastIndex !== -1) {
          const next = new Set(selectedIds);
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          for (let i = start; i <= end; i++) {
            next.add(filteredAccounts[i].id);
          }
          setSelectedIds(next);
          return;
        }
      }

      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
        if (id === lastSelectedId) {
          setLastSelectedId(null);
        }
      } else {
        next.add(id);
        setLastSelectedId(id);
      }
      setSelectedIds(next);
    },
    [selectedIds, lastSelectedId, filteredAccounts]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (anyModalOpen || isTypingTarget(e.target)) {
        return;
      }

      // Ctrl+A selects all accounts (or deselects when everything is already selected)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        if (selectedIds.size === filteredAccounts.length && filteredAccounts.length > 0) {
          clearSelection();
        } else {
          setSelectedIds(new Set(filteredAccounts.map((a) => a.id)));
          setLastSelectedId(filteredAccounts.length > 0 ? filteredAccounts[0].id : null);
        }
      }

      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        clearSelection();
      }

      if (e.key === 'Backspace' && selectedIds.size > 0) {
        e.preventDefault();
        handleBulkDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [anyModalOpen, filteredAccounts, selectedIds, clearSelection, handleBulkDelete]);

  // Close the context menu on Escape and keep the page from scrolling underneath it
  useEffect(() => {
    if (!contextMenu) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    const preventScroll = (e: Event) => e.preventDefault();

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [contextMenu]);

  // Prevent scrolling when modals are open
  useEffect(() => {
    if (!anyModalOpen) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const preventScroll = (e: Event) => e.preventDefault();
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [anyModalOpen]);

  // Export

  const exportAccounts = async () => {
    if (accounts.length === 0) {
      setAlertModal({
        title: 'Cannot Export',
        message: 'You must have an account added to export to a CSV!',
        type: 'warning',
      });
      return;
    }

    // Export selected accounts, or all if none selected
    const selected = accounts.filter((a) => selectedIds.has(a.id));
    const accountsToExport = selected.length > 0 ? selected : accounts;

    // Info modal stays up while the user picks a save location
    setAlertModal({
      title: 'Export CSV',
      message: 'Please select where you want to store the CSV file.',
      type: 'info',
      showOkButton: false,
    });

    const result = await exportToCSV(accountsToExport);

    if (!result.success) {
      setAlertModal({
        title: 'Export Failed',
        message: result.error || 'Failed to export CSV file.',
        type: 'danger',
      });
    } else if (result.canceled) {
      setAlertModal(null);
    } else {
      setAlertModal({
        title: 'Export Successful',
        message: `Successfully exported ${accountsToExport.length} account(s) to CSV!`,
        type: 'success',
      });
    }
  };

  const handleExportCSV = async () => {
    await exportAccounts();
    if (selectedIds.size > 0) {
      clearSelection();
    }
  };

  // Pinning

  const applyPinned = useCallback((ids: Set<number>, pinned: boolean) => {
    // Re-sorting moves cards around; put the viewport back where it was
    const scrollPosition = window.scrollY;
    setAccounts((prev) =>
      sortAccounts(prev.map((acc) => (ids.has(acc.id) ? { ...acc, is_pinned: pinned } : acc)))
    );
    requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  }, []);

  const handleTogglePin = useCallback(
    async (account: Account) => {
      try {
        const pinned = !account.is_pinned;
        await accountsAPI.update(account.id, { is_pinned: pinned });
        applyPinned(new Set([account.id]), pinned);
      } catch (error) {
        console.error('Failed to toggle pin:', error);
      }
    },
    [applyPinned]
  );

  // Context menu

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, account: Account) => {
      e.preventDefault();
      // A right-click while the menu is open just closes it
      setContextMenu(contextMenu ? null : { account, x: e.clientX, y: e.clientY });
    },
    [contextMenu]
  );

  const handleContextMenuEdit = () => {
    if (!contextMenu) return;
    if (selectedIds.size > 1) {
      setShowBulkEditModal(true);
    } else {
      handleStartEdit(contextMenu.account);
    }
    setContextMenu(null);
  };

  const handleContextMenuTogglePin = () => {
    if (!contextMenu) return;
    if (selectedIds.size > 1) {
      // Target state follows the right-clicked account
      const pinned = !contextMenu.account.is_pinned;
      applyPinned(selectedIds, pinned);
      selectedIds.forEach((id) => {
        accountsAPI.update(id, { is_pinned: pinned }).catch((err) => {
          console.error('Failed to update account pin status:', err);
        });
      });
      clearSelection();
    } else {
      handleTogglePin(contextMenu.account);
    }
    setContextMenu(null);
  };

  const handleContextMenuDelete = () => {
    if (!contextMenu) return;
    if (selectedIds.size > 1) {
      handleBulkDelete();
    } else {
      handleDeleteAccount(contextMenu.account);
    }
    setContextMenu(null);
  };

  const handleContextMenuExport = () => {
    setContextMenu(null);
    exportAccounts();
  };

  const handleContextMenuClearSelection = () => {
    clearSelection();
    setContextMenu(null);
  };

  // Drag and drop reordering

  const handleDragStart = useCallback(
    (account: Account) => {
      // Dragging is for single accounts only
      if (selectedIds.size > 1) return;
      setDraggedAccount(account);
    },
    [selectedIds]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!draggedAccount) return;

      // Only allow reordering within the same pinned section
      if (draggedAccount.is_pinned !== filteredAccounts[index]?.is_pinned) {
        setDragOverIndex(null);
        return;
      }

      e.preventDefault();
      setDragOverIndex(index);
    },
    [draggedAccount, filteredAccounts]
  );

  const handleDragEnd = useCallback(async () => {
    try {
      if (!draggedAccount || dragOverIndex === null) return;

      const draggedIndex = filteredAccounts.findIndex((a) => a.id === draggedAccount.id);
      const target = filteredAccounts[dragOverIndex];
      if (draggedIndex === -1 || draggedIndex === dragOverIndex) return;
      if (!target || draggedAccount.is_pinned !== target.is_pinned) return;

      const reordered = [...filteredAccounts];
      const [moved] = reordered.splice(draggedIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);

      // Write the new order back into the full list so accounts hidden by the search stay put
      const visible = new Set(reordered.map((a) => a.id));
      let next = 0;
      const merged = accounts.map((a) => (visible.has(a.id) ? reordered[next++] : a));

      try {
        await accountsAPI.reorder(merged.map((a) => a.id));
        setAccounts(merged.map((a, order) => ({ ...a, order })));
      } catch (error) {
        console.error('Failed to reorder accounts:', error);
      }
    } finally {
      setDraggedAccount(null);
      setDragOverIndex(null);
    }
  }, [draggedAccount, dragOverIndex, filteredAccounts, accounts]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold select-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔐 {APP_NAME}</h1>
              <p className={`mt-1 text-sm select-none ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your TOTP codes locally in one place!</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>
              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Export to CSV"
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                <span className="select-none">Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline select-none">Add Account</span>
                <span className="sm:hidden select-none">Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Selection Bubble */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          <div className="bg-blue-600 text-white rounded-full shadow-lg px-5 py-3 flex items-center gap-2">
            <span className="font-semibold">{selectedIds.size}</span>
            <span className="text-sm">selected</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Select Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg leading-tight focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          {accounts.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`px-4 py-3 border rounded-lg transition-all font-medium whitespace-nowrap ${
                selectAll
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:shadow-md'
              }`}
            >
              {selectAll ? (
                <>
                  <CheckIcon className="w-4 h-4 inline mr-1" />
                  Selected All
                </>
              ) : (
                'Select All'
              )}
            </button>
          )}
        </div>

        {/* Account Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔑</div>
            {accounts.length === 0 ? (
              <>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No accounts yet</h3>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get started by adding your first TOTP account</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Your First Account
                </button>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No accounts found</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Try adjusting your search query</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                index={index}
                darkMode={darkMode}
                isSelected={selectedIds.has(account.id)}
                isMultipleSelected={selectedIds.size > 1}
                isDragging={draggedAccount?.id === account.id}
                isDragOver={dragOverIndex === index}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                onEdit={handleStartEdit}
                onDelete={handleDeleteAccount}
                onTogglePin={handleTogglePin}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddAccountModal onClose={() => setShowAddModal(false)} onSuccess={fetchAccounts} darkMode={darkMode} />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          accounts={accounts.filter((a) => selectedIds.has(a.id))}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={() => {
            clearSelection();
            setShowBulkEditModal(false);
            fetchAccounts();
          }}
          darkMode={darkMode}
        />
      )}

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={() => {
            fetchAccounts();
            setEditingAccount(null);
          }}
          darkMode={darkMode}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
        darkMode={darkMode}
      />

      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          showOkButton={alertModal.showOkButton}
          onClose={() => setAlertModal(null)}
          darkMode={darkMode}
        />
      )}

      {contextMenu && (
        <AccountContextMenu
          account={contextMenu.account}
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={selectedIds.size}
          darkMode={darkMode}
          onClose={() => setContextMenu(null)}
          onEdit={handleContextMenuEdit}
          onTogglePin={handleContextMenuTogglePin}
          onClearSelection={handleContextMenuClearSelection}
          onExport={handleContextMenuExport}
          onDelete={handleContextMenuDelete}
        />
      )}

      {/* Version Footer */}
      <footer className={`mt-auto py-4 text-center text-xs ${
        darkMode ? 'text-gray-500 border-t border-gray-800' : 'text-gray-400 border-t border-gray-200'
      }`}>
        <p>{APP_NAME} v{APP_VERSION} | {APP_LICENSE} License</p>
      </footer>
    </div>
  );
}
