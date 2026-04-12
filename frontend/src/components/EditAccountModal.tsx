/**
 * EditAccountModal component - modal form to edit an existing TOTP account
 */
'use client';

import { useState, useEffect } from 'react';
import { Account, AccountUpdate } from '@/types';
import { accountsAPI } from '@/lib/storage';
import { XMarkIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EditAccountModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
  darkMode?: boolean;
}

interface AlertModal {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
}

export default function EditAccountModal({ account, onClose, onSuccess, darkMode = false }: EditAccountModalProps) {
  const [formData, setFormData] = useState<AccountUpdate>({
    service: account.service,
    account_name: account.account_name,
    secret_key: '',
  });
  const [currentSecret, setCurrentSecret] = useState<string>('');
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountUpdate, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModal>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  // Check if any changes have been made
  const hasChanges = (() => {
    const serviceChanged = formData.service !== account.service;
    const accountNameChanged = formData.account_name !== account.account_name;
    const secretChanged = (formData.secret_key?.trim().length || 0) > 0;
    return serviceChanged || accountNameChanged || secretChanged;
  })();

  // Fetch the current secret key when modal opens
  useEffect(() => {
    const fetchSecret = async () => {
      if (account.secret_key) {
        // Secret is already available (not encrypted)
        setCurrentSecret(account.secret_key);
      } else if (account.encrypted_secret && typeof window !== 'undefined' && window.electronAPI) {
        // Decrypt the secret
        try {
          const result = await window.electronAPI.decryptSecret(account.encrypted_secret);
          if (result.success && result.secret) {
            setCurrentSecret(result.secret);
          }
        } catch (error) {
          console.error('Failed to decrypt secret:', error);
        }
      }
    };

    fetchSecret();
  }, [account]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AccountUpdate, string>> = {};

    if (formData.service !== undefined && !formData.service.trim()) {
      newErrors.service = 'Service name cannot be empty';
    }
    if (formData.account_name !== undefined && !formData.account_name.trim()) {
      newErrors.account_name = 'Account name cannot be empty';
    }
    if (formData.secret_key !== undefined && formData.secret_key.trim() !== '') {
      // Secret key is optional (if not provided, keep existing), but if provided must not be just spaces
      if (!formData.secret_key.trim()) {
        newErrors.secret_key = 'Secret key cannot be empty';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Only include fields that were actually changed
      const updateData: AccountUpdate = {};
      if (formData.service !== account.service) {
        updateData.service = formData.service;
      }
      if (formData.account_name !== account.account_name) {
        updateData.account_name = formData.account_name;
      }
      if (formData.secret_key && formData.secret_key.trim()) {
        updateData.secret_key = formData.secret_key.replace(/\s/g, '');
      }

      await accountsAPI.update(account.id, updateData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update account:', error);
      if (error.response?.data?.detail) {
        setErrors({ secret_key: error.response.data.detail });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Failed to update account. Please check your inputs and try again.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const labelColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const inputFocus = darkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const errorText = darkMode ? 'text-red-400' : 'text-red-600';
  const helpText = darkMode ? 'text-gray-500' : 'text-gray-500';
  const secondaryBtn = darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
  const infoBg = darkMode ? 'bg-blue-900/50 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`${modalBg} rounded-lg shadow-xl max-w-md w-full transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${textColor}`}>Edit Account</h2>
          <button
            onClick={onClose}
            className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Service Name */}
          <div>
            <label htmlFor="service" className={`block text-sm font-medium mb-1 ${labelColor}`}>
              Service Name
            </label>
            <input
              type="text"
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              placeholder="e.g., Google, GitHub, Amazon"
              className={`w-full px-3 py-2.5 border rounded-lg leading-tight ${inputFocus} ${inputBg} ${
                errors.service ? 'border-red-500' : ''
              }`}
            />
            {errors.service && <p className={`mt-1 text-sm ${errorText}`}>{errors.service}</p>}
          </div>

          {/* Account Name */}
          <div>
            <label htmlFor="account_name" className={`block text-sm font-medium mb-1 ${labelColor}`}>
              Account Name
            </label>
            <input
              type="text"
              id="account_name"
              name="account_name"
              value={formData.account_name}
              onChange={handleChange}
              placeholder="e.g., email@example.com"
              className={`w-full px-3 py-2.5 border rounded-lg leading-tight ${inputFocus} ${inputBg} ${
                errors.account_name ? 'border-red-500' : ''
              }`}
            />
            {errors.account_name && (
              <p className={`mt-1 text-sm ${errorText}`}>{errors.account_name}</p>
            )}
          </div>

          {/* Current Secret Key (Display Only) */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
              Current Secret Key
            </label>
            <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`flex-1 font-mono text-sm break-all ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentSecret || 'Loading...'}
              </div>
            </div>
            <p className={`mt-1 text-xs ${helpText}`}>
              Your secret key is stored locally and not stored on an online database.
            </p>
          </div>

          {/* New Secret Key (Optional) */}
          <div>
            <label htmlFor="secret_key" className={`block text-sm font-medium mb-1 ${labelColor}`}>
              New Secret Key (Optional)
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                id="secret_key"
                name="secret_key"
                value={formData.secret_key}
                onChange={handleChange}
                placeholder="Leave empty to apply no changes"
                className={`w-full px-3 py-2.5 pr-10 border rounded-lg font-mono leading-tight ${inputFocus} ${inputBg} ${
                  errors.secret_key ? 'border-red-500' : ''
                }`}
              />
              {formData.secret_key && (
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title={showSecret ? 'Hide' : 'Show'}
                >
                  {showSecret ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            {errors.secret_key && <p className={`mt-1 text-sm ${errorText}`}>{errors.secret_key}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${secondaryBtn}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className={`${modalBg} rounded-lg shadow-xl max-w-md w-full transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
            <div className={`flex justify-between items-center p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {alertModal.type === 'success' ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <h2 className={`text-xl font-semibold ${textColor}`}>{alertModal.title}</h2>
              </div>
              <button
                onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'error' })}
                className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{alertModal.message}</p>
            </div>
            <div className="flex px-6 pb-6">
              <button
                onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'error' })}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
