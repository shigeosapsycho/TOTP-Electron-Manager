/**
 * ConfirmModal component - reusable confirmation dialog
 */
'use client';

import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  darkMode?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
  darkMode = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const modalBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const messageColor = darkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const secondaryBtn = darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50';

  // Icon and colors based on type
  const iconConfig = {
    danger: {
      icon: ExclamationTriangleIcon,
      iconBg: darkMode ? 'bg-red-900/50' : 'bg-red-100',
      iconColor: darkMode ? 'text-red-400' : 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconBg: darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100',
      iconColor: darkMode ? 'text-yellow-400' : 'text-yellow-600',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: InformationCircleIcon,
      iconBg: darkMode ? 'bg-blue-900/50' : 'bg-blue-100',
      iconColor: darkMode ? 'text-blue-400' : 'text-blue-600',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircleIcon,
      iconBg: darkMode ? 'bg-green-900/50' : 'bg-green-100',
      iconColor: darkMode ? 'text-green-400' : 'text-green-600',
      confirmBg: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className={`${modalBg} rounded-lg shadow-xl max-w-md w-full transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.iconBg}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <h2 className={`text-xl font-semibold ${textColor}`}>{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={messageColor}>{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${secondaryBtn}`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${config.confirmBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
