/**
 * BulkImportModal component - modal form to import multiple TOTP accounts at once
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { accountsAPI } from '@/lib/storage';
import { XMarkIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  darkMode?: boolean;
}

interface ImportAccount {
  service: string;
  account_name: string;
  secret_key: string;
  line: number;
}

interface ImportError {
  line: number;
  account: ImportAccount;
  error: string;
}

interface AlertModal {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
}

type ImportTab = 'text' | 'json';

// Google Authenticator JSON format
interface GoogleAuthAccount {
  name: string;
  secret: string;
  issuer?: string;
  algorithm?: string;
  digits?: number;
  type?: string;
}

interface GoogleAuthExport {
  accounts?: GoogleAuthAccount[];
}

// LastPass Authenticator JSON format
interface LastPassAccount {
  username: string;
  secret: string;
  issuer?: string;
  service?: string;
}

export default function BulkImportModal({ onClose, onSuccess, darkMode = false }: BulkImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: ImportError[];
  } | null>(null);
  const [alertModal, setAlertModal] = useState<AlertModal>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const modalBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-black';
  const labelColor = darkMode ? 'text-gray-200' : 'text-gray-900';
  const textAreaBg = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-400 text-black placeholder-gray-400';
  const textAreaFocus = darkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const helpText = darkMode ? 'text-gray-400' : 'text-gray-800';
  const secondaryBtn = darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-400 text-gray-900 hover:bg-gray-50';
  const successBg = darkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-900';
  const errorBg = darkMode ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-900';
  const exampleBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-400';
  const exampleText = darkMode ? 'text-gray-200' : 'text-black';
  const codeBg = darkMode ? 'bg-black bg-opacity-40' : 'bg-gray-200';
  const tabActive = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const tabInactive = darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  // Parse Google Authenticator JSON export
  const parseGoogleAuthJSON = (data: GoogleAuthExport): ImportAccount[] => {
    const accounts: ImportAccount[] = [];

    if (!data.accounts || !Array.isArray(data.accounts)) {
      return accounts;
    }

    data.accounts.forEach((account, index) => {
      if (!account.secret) return;

      let service = account.issuer || '';
      let accountName = '';

      // Parse name field which can be "Issuer:account" or "account"
      if (account.name) {
        const parts = account.name.split(':');
        if (parts.length >= 2) {
          if (!service) service = parts[0].trim();
          accountName = parts.slice(1).join(':').trim();
        } else {
          accountName = account.name.trim();
        }
      }

      // Fallback if we still don't have a service name
      if (!service) {
        service = accountName.split('@')[0] || 'Unknown';
      }

      accounts.push({
        service,
        account_name: accountName || 'Unknown',
        secret_key: account.secret.replace(/\s/g, ''),
        line: index + 1,
      });
    });

    return accounts;
  };

  // Parse LastPass Authenticator JSON export
  const parseLastPassJSON = (data: LastPassAccount[]): ImportAccount[] => {
    const accounts: ImportAccount[] = [];

    if (!Array.isArray(data)) {
      return accounts;
    }

    data.forEach((account, index) => {
      if (!account.secret) return;

      const service = account.issuer || account.service || account.username.split('@')[0] || 'Unknown';
      const accountName = account.username || 'Unknown';

      accounts.push({
        service,
        account_name: accountName,
        secret_key: account.secret.replace(/\s/g, ''),
        line: index + 1,
      });
    });

    return accounts;
  };

  // Parse uploaded JSON file
  const parseJSONFile = (file: File): Promise<ImportAccount[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Try Google Authenticator format
          if (data.accounts && Array.isArray(data.accounts)) {
            resolve(parseGoogleAuthJSON(data));
            return;
          }

          // Try LastPass format (array of accounts)
          if (Array.isArray(data) && data.length > 0 && data[0].secret) {
            resolve(parseLastPassJSON(data));
            return;
          }

          // Try direct array format
          if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            if (firstItem.name || firstItem.username) {
              // Assume LastPass format
              resolve(parseLastPassJSON(data));
              return;
            }
          }

          reject(new Error('Unknown JSON format. Please export from Google Authenticator or LastPass Authenticator.'));
        } catch (error) {
          reject(new Error('Invalid JSON file. Please check the file format.'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJsonFile(file);
    }
  };

  // Parse JSON accounts from uploaded file
  const parseJSONAccounts = async (): Promise<ImportAccount[]> => {
    if (!jsonFile) {
      throw new Error('Please select a JSON file first.');
    }

    try {
      return await parseJSONFile(jsonFile);
    } catch (error) {
      throw error;
    }
  };

  const parseInput = (): ImportAccount[] => {
    const accounts: ImportAccount[] = [];
    const lines = inputText.trim().split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      const parts = trimmedLine.split(':');
      if (parts.length >= 3) {
        accounts.push({
          service: parts[0].trim(),
          account_name: parts[1].trim(),
          secret_key: parts.slice(2).join(':').trim().replace(/\s+/g, ''), // Handle colons in secret key
          line: index + 1,
        });
      }
    });

    return accounts;
  };

  const validateAccount = (account: ImportAccount): string | null => {
    if (!account.service) return 'Service name is required';
    if (!account.account_name) return 'Account name is required';
    if (!account.secret_key) return 'Secret key is required';
    if (account.secret_key.length < 10) return 'Secret key appears too short';
    return null;
  };

  const handleImport = async () => {
    let accounts: ImportAccount[] = [];

    try {
      if (activeTab === 'text') {
        accounts = parseInput();
      } else {
        accounts = await parseJSONAccounts();
      }

      if (accounts.length === 0) {
        setAlertModal({
          isOpen: true,
          title: 'No Accounts Found',
          message: activeTab === 'text'
            ? 'No accounts found. Please check the format and try again.'
            : 'No valid accounts found in the JSON file. Please make sure you exported from Google Authenticator or LastPass Authenticator.',
          type: 'error',
        });
        return;
      }

      setIsSubmitting(true);
      const errors: ImportError[] = [];
      let successCount = 0;

      // Validate all accounts first
      const validationErrors: ImportError[] = [];
      accounts.forEach((account) => {
        const error = validateAccount(account);
        if (error) {
          validationErrors.push({
            line: account.line,
            account,
            error,
          });
        }
      });

      if (validationErrors.length > 0) {
        setImportResults({
          success: 0,
          failed: validationErrors,
        });
        setIsSubmitting(false);
        return;
      }

      // Import accounts one by one
      for (const account of accounts) {
        try {
          await accountsAPI.create(account);
          successCount++;
        } catch (error: any) {
          errors.push({
            line: account.line,
            account,
            error: error.message || 'Import failed',
          });
        }
      }

      setImportResults({
        success: successCount,
        failed: errors,
      });

      if (successCount > 0 && errors.length === 0) {
        // All successful
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (successCount > 0) {
        // Partial success
        setTimeout(() => {
          onSuccess();
          setImportResults(null);
          setInputText('');
          setJsonFile(null);
        }, 3000);
      }

      setIsSubmitting(false);
    } catch (error: any) {
      setIsSubmitting(false);
      setAlertModal({
        isOpen: true,
        title: 'Import Error',
        message: error.message || 'Failed to import accounts. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`${modalBg} rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="min-w-0 flex-1">
            <h2 className={`text-xl sm:text-2xl font-bold ${textColor}`}>Bulk Import Accounts</h2>
            <p className={`text-xs sm:text-sm ${helpText} mt-1 hidden sm:block`}>Import multiple TOTP accounts at once</p>
          </div>
          <button
            onClick={onClose}
            className={`ml-4 transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 sm:px-6`}>
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'text' ? tabActive : tabInactive
            }`}
          >
            Text Format
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'json' ? tabActive : tabInactive
            }`}
          >
            JSON Import
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {activeTab === 'text' ? (
            <>
              {/* Format Instructions */}
              <div className={`rounded-lg p-4 sm:p-6 ${exampleBg} border`}>
                <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${textColor}`}>
                  <DocumentArrowDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="truncate">How to Format Your Accounts</span>
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  {/* The Format */}
                  <div>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${textColor}`}>📝 The Format:</p>
                    <div className={`${codeBg} rounded-lg p-3 sm:p-4 mb-2 sm:mb-3 overflow-x-auto`}>
                      <code className={`text-sm sm:text-lg font-mono block text-center whitespace-nowrap ${textColor}`}>
                        SERVICE : ACCOUNT NAME : SECRET KEY
                      </code>
                    </div>
                    <p className={`text-xs sm:text-sm ${helpText}`}>
                      Use colons (:) to separate each part. One account per line.
                    </p>
                  </div>

                  {/* Important Notes */}
                  <div className={`rounded-lg p-3 sm:p-4 ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>💡 Important Notes:</p>
                    <ul className={`text-xs sm:text-sm space-y-1 ${helpText} list-disc list-inside`}>
                      <li>Secret keys are encrypted and stored securely</li>
                      <li>Spaces in secret keys will be automatically removed</li>
                      <li>Empty lines are ignored</li>
                      <li>Must use exactly 2 colons per line (SERVICE:ACCOUNT NAME:KEY)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="bulkInput" className={`block text-sm font-medium ${labelColor}`}>
                    Paste Your Accounts Below
                  </label>
                  <span className={`text-xs sm:text-sm ${helpText}`}>
                    {parseInput().length} account{parseInput().length !== 1 ? 's' : ''} detected
                  </span>
                </div>
                <textarea
                  id="bulkInput"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="SERVICE:ACCOUNT NAME:SECRET KEY"
                  className={`w-full px-3 sm:px-4 py-3 border rounded-lg font-mono text-xs sm:text-sm leading-relaxed min-h-[150px] sm:min-h-[200px] ${textAreaFocus} ${textAreaBg} transition-colors resize-none`}
                />
              </div>
            </>
          ) : (
            <>
              {/* JSON Import Instructions */}
              <div className={`rounded-lg p-4 sm:p-6 ${exampleBg} border`}>
                <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${textColor}`}>
                  <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="truncate">Import from Authenticator Apps</span>
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  {/* Supported Apps */}
                  <div>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${textColor}`}>📱 Supported Apps:</p>
                    <ul className={`text-xs sm:text-sm space-y-1 ${helpText} list-disc list-inside`}>
                      <li><strong>Google Authenticator</strong> - Export from Settings {'>'} Export accounts</li>
                      <li><strong>LastPass Authenticator</strong> - Export from Settings {'>'} Export Accounts</li>
                    </ul>
                  </div>

                  {/* How to Export */}
                  <div className={`rounded-lg p-3 sm:p-4 ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>💡 How to Export:</p>
                    <ol className={`text-xs sm:text-sm space-y-1 ${helpText} list-decimal list-inside`}>
                      <li>Open your authenticator app</li>
                      <li>Go to Settings and find "Export" option</li>
                      <li>Save the JSON file to your device</li>
                      <li>Upload the file below</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  Upload JSON File
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center ${
                  darkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                } transition-colors`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {jsonFile ? (
                    <div className="space-y-2">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-blue-600" />
                      <p className={`font-medium ${textColor}`}>{jsonFile.name}</p>
                      <p className={`text-sm ${helpText}`}>
                        {(jsonFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={() => {
                          setJsonFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className={`font-medium ${textColor}`}>Drop your JSON file here</p>
                        <p className={`text-sm ${helpText}`}>or</p>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Browse Files
                      </button>
                      <p className={`text-xs ${helpText}`}>
                        Supports Google Authenticator and LastPass Authenticator exports
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-3">
              {/* Success Message */}
              {importResults.success > 0 && (
                <div className={`${successBg} border rounded-lg p-3 sm:p-4`}>
                  <p className="font-semibold text-sm sm:text-base">✅ Successfully imported {importResults.success} account(s)</p>
                </div>
              )}

              {/* Errors */}
              {importResults.failed.length > 0 && (
                <div className={`${errorBg} border rounded-lg p-3 sm:p-4`}>
                  <p className="font-semibold text-sm sm:text-base mb-2">❌ Failed to import {importResults.failed.length} account(s):</p>
                  <div className="space-y-2 max-h-40 sm:max-h-60 overflow-y-auto">
                    {importResults.failed.map((failure, index) => (
                      <div key={index} className="text-xs sm:text-sm">
                        <p className="font-mono">
                          Line {failure.line}: <strong>{failure.account.service}</strong> ({failure.account.account_name})
                        </p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                          Error: {failure.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg transition-colors text-sm sm:text-base ${secondaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isSubmitting || (activeTab === 'text' ? !inputText.trim() : !jsonFile)}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="hidden sm:inline">Importing...</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">
                  {activeTab === 'text'
                    ? `Import ${parseInput().length} Account${parseInput().length !== 1 ? 's' : ''}`
                    : 'Import JSON'}
                </span>
                <span className="sm:hidden">Import</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className={`${modalBg} rounded-lg shadow-xl max-w-md w-full transition-colors duration-300 bg-opacity-95 ${darkMode ? 'backdrop-blur-xl' : ''}`}>
            <div className={`flex justify-between items-center p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {alertModal.type === 'success' ? (
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  )}
                </div>
                <h2 className={`text-lg sm:text-xl font-semibold ${textColor}`}>{alertModal.title}</h2>
              </div>
              <button
                onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'success' })}
                className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{alertModal.message}</p>
            </div>
            <div className="flex px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'success' })}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
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
