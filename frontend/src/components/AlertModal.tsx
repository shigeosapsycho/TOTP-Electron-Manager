/**
 * AlertModal component - single-button notice dialog (OK is optional while an action is pending)
 */
'use client';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

interface AlertModalProps {
  title: string;
  message: string;
  type: AlertType;
  showOkButton?: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const ICON_PATHS: Record<AlertType, string> = {
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  danger: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export default function AlertModal({ title, message, type, showOkButton = true, onClose, darkMode = false }: AlertModalProps) {
  const iconStyles = {
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
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconStyles[type]}`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON_PATHS[type]} />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          {showOkButton ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          ) : (
            <div className="h-10 w-16"></div>
          )}
        </div>
      </div>
    </div>
  );
}
