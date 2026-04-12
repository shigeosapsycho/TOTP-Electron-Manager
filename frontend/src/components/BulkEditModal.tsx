/**
 * BulkEditModal component - modal form to edit multiple TOTP accounts at once
 */
'use client';

import { useState } from 'react';
import { Account } from '@/types';
import { accountsAPI } from '@/lib/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BulkEditModalProps {
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
  darkMode?: boolean;
}

export default function BulkEditModal({ accounts, onClose, onSuccess, darkMode = false }: BulkEditModalProps) {
  const [serviceName, setServiceName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{
    updated: number;
    failed: number;
  } | null>(null);

  const modalBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const labelColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const inputFocus = darkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const helpText = darkMode ? 'text-gray-500' : 'text-gray-500';
  const secondaryBtn = darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
  const infoBg = darkMode ? 'bg-blue-900/50 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800';
  const successBg = darkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-800';

  const handleSubmit = async () => {
    if (!serviceName.trim() && !accountName.trim()) {
      alert('Please enter at least one field to update');
      return;
    }

    setIsSubmitting(true);
    let updatedCount = 0;
    let failedCount = 0;

    for (const account of accounts) {
      try {
        const updateData: any = {};
        if (serviceName.trim()) {
          updateData.service = serviceName.trim();
        }
        if (accountName.trim()) {
          updateData.account_name = accountName.trim();
        }

        await accountsAPI.update(account.id, updateData);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update account ${account.id}:`, error);
        failedCount++;
      }
    }

    setResults({
      updated: updatedCount,
      failed: failedCount,
    });

    if (updatedCount > 0 && failedCount === 0) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } else if (updatedCount > 0) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`${modalBg} rounded-lg shadow-xl max-w-md w-full transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-semibold ${textColor}`}>Bulk Edit Accounts</h2>
            <p className={`text-sm ${helpText} mt-1`}>Update {accounts.length} selected account(s)</p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Selected Accounts Info */}
          <div className={`${infoBg} border rounded-lg p-4`}>
            <p className="text-sm font-semibold mb-2">Selected Accounts:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {accounts.map(account => (
                <p key={account.id} className="text-xs font-mono">
                  • {account.service} ({account.account_name})
                </p>
              ))}
            </div>
          </div>

          {/* Fields to Update */}
          <div className="space-y-4">
            <div>
              <label htmlFor="serviceName" className={`block text-sm font-medium mb-1 ${labelColor}`}>
                New Service Name
              </label>
              <input
                type="text"
                id="serviceName"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Leave empty to keep current"
                className={`w-full px-3 py-2.5 border rounded-lg leading-tight ${inputFocus} ${inputBg}`}
              />
              <p className={`mt-1 text-xs ${helpText}`}>
                This will replace the service name for ALL selected accounts
              </p>
            </div>

            <div>
              <label htmlFor="accountName" className={`block text-sm font-medium mb-1 ${labelColor}`}>
                New Account Name
              </label>
              <input
                type="text"
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Leave empty to keep current"
                className={`w-full px-3 py-2.5 border rounded-lg leading-tight ${inputFocus} ${inputBg}`}
              />
              <p className={`mt-1 text-xs ${helpText}`}>
                This will replace the account name for ALL selected accounts
              </p>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className={`${successBg} border rounded-lg p-4`}>
              {results.failed === 0 ? (
                <p className="font-semibold">✅ Successfully updated {results.updated} account(s)</p>
              ) : (
                <p className="font-semibold">
                  ⚠️ Updated {results.updated} account(s), {results.failed} failed
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${secondaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update All'}
          </button>
        </div>
      </div>
    </div>
  );
}
