/**
 * AccountContextMenu component - right-click menu for an account (acts on the whole selection when several are selected)
 */
'use client';

import { Account } from '@/types';
import {
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AccountContextMenuProps {
  account: Account;
  x: number;
  y: number;
  selectedCount: number;
  darkMode: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onClearSelection: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function AccountContextMenu({
  account,
  x,
  y,
  selectedCount,
  darkMode,
  onClose,
  onEdit,
  onTogglePin,
  onClearSelection,
  onExport,
  onDelete,
}: AccountContextMenuProps) {
  const itemClass = `w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
    darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
  }`;
  const pinClass = `w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
    account.is_pinned
      ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
      : darkMode
      ? 'text-gray-300 hover:bg-gray-700'
      : 'text-gray-700 hover:bg-gray-100'
  }`;
  const suffix = selectedCount > 1 ? ` (${selectedCount} selected)` : '';

  return (
    <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={onClose}>
      <div
        className={`absolute rounded-lg shadow-xl py-1 min-w-[160px] ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        style={{
          left: `${Math.min(x, window.innerWidth - 180)}px`,
          top: `${Math.min(y, window.innerHeight - 200)}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onEdit} className={itemClass}>
          <PencilIcon className="w-4 h-4" />
          <span>Edit {suffix}</span>
        </button>
        <button onClick={onTogglePin} className={pinClass}>
          <MapPinIcon className="w-4 h-4" />
          <span>{account.is_pinned ? 'Unpin' : 'Pin'} {suffix}</span>
        </button>
        {selectedCount > 0 && (
          <button onClick={onClearSelection} className={itemClass}>
            <XMarkIcon className="w-4 h-4" />
            <span>Clear Selection {selectedCount > 1 ? `(${selectedCount})` : ''}</span>
          </button>
        )}
        <button onClick={onExport} className={itemClass}>
          <DocumentArrowUpIcon className="w-4 h-4" />
          <span>Export CSV {suffix}</span>
        </button>
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Delete {suffix}</span>
        </button>
      </div>
    </div>
  );
}
