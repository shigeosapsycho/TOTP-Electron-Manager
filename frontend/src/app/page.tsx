/**
 * Main dashboard page for TOTP Manager
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Account } from '@/types';
import { accountsAPI, exportToCSV } from '@/lib/storage';
import AccountCard from '@/components/AccountCard';
import AddAccountModal from '@/components/AddAccountModal';
import EditAccountModal from '@/components/EditAccountModal';
import BulkEditModal from '@/components/BulkEditModal';
import ConfirmModal from '@/components/ConfirmModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  TrashIcon,
  PencilIcon,
  DocumentArrowUpIcon,
  CheckIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
  // App state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkActionMenu, setShowBulkActionMenu] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    account: Account | null;
    x: number;
    y: number;
  } | null>(null);
  const [draggedAccount, setDraggedAccount] = useState<Account | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning',
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    showOkButton?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Initialize dark mode from localStorage or default to light for first-time users
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setDarkMode(stored === 'true');
    } else {
      // Default to light mode for first-time users
      setDarkMode(false);
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Filter accounts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccounts(accounts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = accounts.filter(
        (account) =>
          account.service.toLowerCase().includes(query) ||
          account.account_name.toLowerCase().includes(query)
      );
      setFilteredAccounts(filtered);
    }
  }, [searchQuery, accounts]);

  // Update select all state when selection changes
  useEffect(() => {
    if (filteredAccounts.length > 0 && selectedIds.size === filteredAccounts.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }

    // Show/hide bulk actions bar
    setShowBulkActions(selectedIds.size > 0);
  }, [selectedIds, filteredAccounts]);

  // Close bulk action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showBulkActionMenu && !target.closest('.bulk-action-menu') && !target.closest('.bulk-action-bubble')) {
        setShowBulkActionMenu(false);
      }
    };

    if (showBulkActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBulkActionMenu]);

  // Close context menu on Escape key or click outside, and prevent scrolling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu) {
        setContextMenu(null);
      }
    };

    const preventScroll = (e: Event) => {
      if (contextMenu) {
        e.preventDefault();
      }
    };

    if (contextMenu) {
      document.addEventListener('keydown', handleEscape);
      // Prevent scrolling when context menu is open without removing scrollbar
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [contextMenu]);

  // Prevent scrolling when modals are open
  useEffect(() => {
    const anyModalOpen = showAddModal || showBulkEditModal || editingAccount || alertModal.isOpen;
    if (anyModalOpen) {
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
    }
  }, [showAddModal, showBulkEditModal, editingAccount, alertModal.isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process shortcuts if any modal is open
      const anyModalOpen = showAddModal || showBulkEditModal || editingAccount || alertModal.isOpen;
      if (anyModalOpen) {
        return;
      }

      // Ctrl+A to select all accounts (toggle: if all selected, deselect all)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        // Only select/deselect all if not in an input field
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target as HTMLElement).isContentEditable
          )
        ) {
          const allIds = new Set(filteredAccounts.map(a => a.id));
          // If all accounts are already selected, deselect all
          if (selectedIds.size === filteredAccounts.length && filteredAccounts.length > 0) {
            setSelectedIds(new Set());
            setLastSelectedId(null);
          } else {
            setSelectedIds(allIds);
            // Set the first account as the last selected for subsequent shift-clicks
            setLastSelectedId(filteredAccounts.length > 0 ? filteredAccounts[0].id : null);
          }
        }
      }

      // Ctrl+D to deselect all accounts
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        // Only deselect if not in an input field
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target as HTMLElement).isContentEditable
          )
        ) {
          clearSelection();
        }
      }

      // Backspace to delete selected accounts with confirmation
      if (e.key === 'Backspace' && selectedIds.size > 0) {
        e.preventDefault();
        // Only trigger if not in an input field
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target as HTMLElement).isContentEditable
          )
        ) {
          handleBulkDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredAccounts, selectedIds, showAddModal, showBulkEditModal, editingAccount, alertModal.isOpen]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountsAPI.list();
      // Sort accounts: pinned first, then by order
      const sorted = [...data].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return (a.order || 0) - (b.order || 0);
      });
      setAccounts(sorted);
      setFilteredAccounts(sorted);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      alert('Failed to load accounts. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    fetchAccounts();
  };

  const handleEditSuccess = () => {
    fetchAccounts();
    setEditingAccount(null);
  };

  const handleStartEdit = (account: Account) => {
    setDragOverIndex(null);
    setDraggedAccount(null);
    setEditingAccount(account);
  };

  const handleDelete = () => {
    fetchAccounts();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedIds(new Set(filteredAccounts.map(a => a.id)));
      // Set the first account as the last selected for subsequent shift-clicks
      setLastSelectedId(filteredAccounts.length > 0 ? filteredAccounts[0].id : null);
    }
    setContextMenu(null);
  }, [selectAll, filteredAccounts]);

  const toggleSelectAccount = (id: number, event?: React.MouseEvent) => {
    // Close context menu when clicking on any account
    setContextMenu(null);

    const isShiftClick = event?.shiftKey;

    // If Shift is held and we have a last selected account, do range selection
    if (isShiftClick && lastSelectedId !== null) {
      const currentIndex = filteredAccounts.findIndex(a => a.id === id);
      const lastIndex = filteredAccounts.findIndex(a => a.id === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const newSelected = new Set(selectedIds);
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);

        // Select all accounts in the range
        for (let i = start; i <= end; i++) {
          newSelected.add(filteredAccounts[i].id);
        }

        setSelectedIds(newSelected);
        return;
      }
    }

    // Regular toggle selection
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      // If we deselect the last selected account, clear the anchor
      if (id === lastSelectedId) {
        setLastSelectedId(null);
      }
    } else {
      newSelected.add(id);
      // Update the anchor point to this account
      setLastSelectedId(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Accounts',
      message: `Are you sure you want to delete ${selectedIds.size} account(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await accountsAPI.bulkDelete(Array.from(selectedIds));
          setSelectedIds(new Set());
          fetchAccounts();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to delete accounts:', error);
          setConfirmModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete some accounts. Please try again.',
            type: 'danger',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const handleExportCSV = async () => {
    if (accounts.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Export',
        message: 'You must have an account added to export to a CSV!',
        type: 'warning',
      });
      return;
    }

    // Export selected accounts, or all if none selected
    const selectedAccounts = accounts.filter(a => selectedIds.has(a.id));
    const accountsToExport = selectedAccounts.length > 0 ? selectedAccounts : accounts;

    // Show info modal while user selects save location
    setAlertModal({
      isOpen: true,
      title: 'Export CSV',
      message: 'Please select where you want to store the CSV file.',
      type: 'info',
      showOkButton: false,
    });

    // Perform export
    const result = await exportToCSV(accountsToExport);

    // Close the info modal
    setAlertModal(prev => ({ ...prev, isOpen: false }));

    // Show result modal
    if (result.success) {
      if (!result.canceled) {
        setAlertModal({
          isOpen: true,
          title: 'Export Successful',
          message: `Successfully exported ${accountsToExport.length} account(s) to CSV!`,
          type: 'success',
        });
      }
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: result.error || 'Failed to export CSV file.',
        type: 'danger',
      });
    }

    // Clear selection after export
    if (selectedIds.size > 0) {
      clearSelection();
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setShowBulkActionMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    // If context menu is already open, close it on any right-click
    if (contextMenu) {
      setContextMenu(null);
    } else {
      setContextMenu({
        account,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu?.account) {
      // If multiple are selected, open bulk edit
      if (selectedIds.size > 1) {
        setShowBulkEditModal(true);
      } else {
        handleStartEdit(contextMenu.account);
      }
      setContextMenu(null);
    }
  };

  const handleBulkEditSuccess = () => {
    clearSelection();
    setShowBulkEditModal(false);
    fetchAccounts();
  };

  const handleContextMenuDelete = () => {
    if (contextMenu?.account) {
      // If multiple are selected, use bulk delete
      if (selectedIds.size > 1) {
        handleBulkDelete();
      } else {
        handleDeleteAccount(contextMenu.account);
      }
      setContextMenu(null);
    }
  };

  const handleContextMenuExport = async () => {
    if (accounts.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Export',
        message: 'You must have an account added to export to a CSV!',
        type: 'warning',
      });
      setContextMenu(null);
      return;
    }
    // Export selected accounts, or all if none selected
    const selectedAccounts = accounts.filter(a => selectedIds.has(a.id));
    const accountsToExport = selectedAccounts.length > 0 ? selectedAccounts : accounts;

    // Show info modal while user selects save location
    setAlertModal({
      isOpen: true,
      title: 'Export CSV',
      message: 'Please select where you want to store the CSV file.',
      type: 'info',
      showOkButton: false,
    });

    // Perform export
    const result = await exportToCSV(accountsToExport);

    // Close the info modal
    setAlertModal(prev => ({ ...prev, isOpen: false }));

    // Show result modal
    if (result.success) {
      if (!result.canceled) {
        setAlertModal({
          isOpen: true,
          title: 'Export Successful',
          message: `Successfully exported ${accountsToExport.length} account(s) to CSV!`,
          type: 'success',
        });
      }
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: result.error || 'Failed to export CSV file.',
        type: 'danger',
      });
    }
    setContextMenu(null);
  };

  const handleContextMenuTogglePin = async () => {
    if (contextMenu?.account) {
      // If multiple are selected, toggle pin for all selected accounts
      if (selectedIds.size > 1) {
        try {
          // Preserve scroll position before any async operations
          const scrollPosition = window.scrollY;

          // Determine target state based on the right-clicked account
          const targetPinnedState = !contextMenu.account.is_pinned;

          // Update both accounts and filteredAccounts immediately to prevent scroll reset
          const updateAccounts = (prevAccounts: Account[]) => {
            const updated = prevAccounts.map(acc =>
              selectedIds.has(acc.id) ? { ...acc, is_pinned: targetPinnedState } : acc
            );
            // Re-sort with pinned accounts first
            return updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return (a.order || 0) - (b.order || 0);
            });
          };

          setAccounts(updateAccounts);
          setFilteredAccounts(updateAccounts);

          // Restore scroll position immediately after state update
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
          });

          // Update all selected accounts in background (don't await)
          selectedIds.forEach(accountId => {
            accountsAPI.update(accountId, { is_pinned: targetPinnedState }).catch(err => {
              console.error('Failed to update account pin status:', err);
            });
          });

          // Clear selection after bulk pin
          clearSelection();
        } catch (error) {
          console.error('Failed to bulk toggle pin:', error);
        }
      } else {
        handleTogglePin(contextMenu.account);
      }
      setContextMenu(null);
    }
  };

  const handleContextMenuClearSelection = () => {
    setSelectedIds(new Set());
    setContextMenu(null);
  };

  const handleDeleteAccount = (account: Account) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Account',
      message: `Are you sure you want to delete ${account.service} (${account.account_name})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await accountsAPI.delete(account.id);
          // Remove the deleted account from selection
          const newSelectedIds = new Set(selectedIds);
          newSelectedIds.delete(account.id);
          setSelectedIds(newSelectedIds);
          fetchAccounts();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to delete account:', error);
          setConfirmModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete account. Please try again.',
            type: 'danger',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  // Drag and drop handlers
  const handleDragStart = (account: Account) => {
    // Prevent dragging if multiple accounts are selected
    if (selectedIds.size > 1) {
      return;
    }
    setDraggedAccount(account);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!draggedAccount) return;

    const targetAccount = filteredAccounts[index];

    // Only allow drag over if both accounts have the same pinned status
    if (draggedAccount.is_pinned !== targetAccount?.is_pinned) {
      setDragOverIndex(null);
      return;
    }

    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (!draggedAccount) {
      setDraggedAccount(null);
      setDragOverIndex(null);
      return;
    }

    if (dragOverIndex === null) {
      setDraggedAccount(null);
      setDragOverIndex(null);
      return;
    }

    const newAccounts = [...filteredAccounts];
    const draggedIndex = newAccounts.findIndex(a => a.id === draggedAccount.id);

    if (draggedIndex !== -1 && draggedIndex !== dragOverIndex) {
      const targetAccount = newAccounts[dragOverIndex];

      // Only allow reordering within the same pinned section
      if (draggedAccount.is_pinned !== targetAccount.is_pinned) {
        setDraggedAccount(null);
        setDragOverIndex(null);
        return;
      }

      // Remove dragged account and insert at new position
      const [removed] = newAccounts.splice(draggedIndex, 1);
      newAccounts.splice(dragOverIndex, 0, removed);

      // Update the order in the backend
      try {
        await accountsAPI.reorder(newAccounts.map(a => a.id));
        // Only update filtered accounts to avoid unnecessary re-renders
        setFilteredAccounts(newAccounts);
      } catch (error) {
        console.error('Failed to reorder accounts:', error);
      }
    }

    setDraggedAccount(null);
    setDragOverIndex(null);
  };

  // Pin/unpin handlers
  const handleTogglePin = async (account: Account) => {
    try {
      const newPinnedState = !account.is_pinned;
      await accountsAPI.update(account.id, { is_pinned: newPinnedState });

      // Preserve scroll position before state update
      const scrollPosition = window.scrollY;

      // Update both accounts and filteredAccounts to prevent scroll reset
      const updateAccounts = (prevAccounts: Account[]) => {
        const updated = prevAccounts.map(acc =>
          acc.id === account.id ? { ...acc, is_pinned: newPinnedState } : acc
        );
        // Re-sort with pinned accounts first
        return updated.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return (a.order || 0) - (b.order || 0);
        });
      };

      setAccounts(updateAccounts);
      setFilteredAccounts(updateAccounts);

      // Restore scroll position after React updates
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
      });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold select-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔐 TOTP Manager</h1>
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
      {showBulkActions && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {/* Expanded Action Menu */}
          {showBulkActionMenu && (
            <div className={`bulk-action-menu mb-2 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} overflow-hidden`}>
              <div className="px-4 py-3 border-b dark:border-gray-700">
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedIds.size} selected
                </p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowBulkEditModal(true);
                    setShowBulkActionMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PencilIcon className="w-5 h-5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    handleBulkDelete();
                    setShowBulkActionMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={clearSelection}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>Clear selection</span>
                </button>
              </div>
            </div>
          )}

          {/* Bubble Button - informational only */}
          <div className="bulk-action-bubble bg-blue-600 text-white rounded-full shadow-lg px-5 py-3 flex items-center gap-2">
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
                onUpdate={fetchAccounts}
                onDelete={handleDelete}
                onEdit={() => handleStartEdit(account)}
                darkMode={darkMode}
                onDeleteConfirm={() => handleDeleteAccount(account)}
                isSelected={selectedIds.has(account.id)}
                onSelect={(e) => toggleSelectAccount(account.id, e)}
                onContextMenu={(e) => handleContextMenu(e, account)}
                isMultipleSelected={selectedIds.size > 1}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                isDragging={draggedAccount?.id === account.id}
                isDragOver={dragOverIndex === index}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddAccountModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} darkMode={darkMode} />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          accounts={accounts.filter(a => selectedIds.has(a.id))}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={handleBulkEditSuccess}
          darkMode={darkMode}
        />
      )}

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={handleEditSuccess}
          darkMode={darkMode}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.onConfirm.toString().includes('Delete') ? 'Delete' : 'Confirm'}
        cancelText="Cancel"
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        darkMode={darkMode}
      />

      {/* Alert Modal */}
      {alertModal.isOpen && (() => {
        const alertIconStyles = {
          warning: darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
          danger: darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700',
          success: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700',
          info: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700',
        } as const;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${alertIconStyles[alertModal.type]}`}>
                  {alertModal.type === 'warning' && (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {alertModal.type === 'danger' && (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {alertModal.type === 'success' && (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {alertModal.type === 'info' && (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {alertModal.title}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {alertModal.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                {alertModal.showOkButton === false ? (
                  <div className="h-10 w-16"></div>
                ) : (
                  <button
                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={() => setContextMenu(null)}
        >
          <div
            className={`absolute rounded-lg shadow-xl py-1 min-w-[160px] ${
              darkMode
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-white border border-gray-200'
            }`}
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleContextMenuEdit}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <PencilIcon className="w-4 h-4" />
              <span>Edit {selectedIds.size > 1 ? `(${selectedIds.size} selected)` : ''}</span>
            </button>
            <button
              onClick={handleContextMenuTogglePin}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                contextMenu.account?.is_pinned
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MapPinIcon className="w-4 h-4" />
              <span>{contextMenu.account?.is_pinned ? 'Unpin' : 'Pin'} {selectedIds.size > 1 ? `(${selectedIds.size} selected)` : ''}</span>
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleContextMenuClearSelection}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                  darkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="w-4 h-4" />
                <span>Clear Selection {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}</span>
              </button>
            )}
            <button
              onClick={handleContextMenuExport}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              <span>Export CSV {selectedIds.size > 1 ? `(${selectedIds.size} selected)` : ''}</span>
            </button>
            <button
              onClick={handleContextMenuDelete}
              className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete {selectedIds.size > 1 ? `(${selectedIds.size} selected)` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Version Footer */}
      <footer className={`mt-auto py-4 text-center text-xs ${
        darkMode ? 'text-gray-500 border-t border-gray-800' : 'text-gray-400 border-t border-gray-200'
      }`}>
        <p>TOTP Manager v2.2.0 | MIT License</p>
      </footer>
    </div>
  );
}