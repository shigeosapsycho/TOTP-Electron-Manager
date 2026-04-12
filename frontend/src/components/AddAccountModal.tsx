/**
 * AddAccountModal component - modal form to add a new TOTP account or bulk import
 */
'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { AccountCreate } from '@/types';
import { accountsAPI } from '@/lib/storage';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentTextIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface AddAccountModalProps {
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

type ImportTab = 'single' | 'mass' | 'json' | 'csv';

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

interface ImportResults {
  success: number;
  failed: ImportError[];
}

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
  username?: string;
  userName?: string;
  secret: string;
  issuerName?: string;
  originalIssuerName?: string;
  issuer?: string;
  originalUserName?: string;
  service?: string;
  accountID?: string;
  folderData?: any;
  isFavorite?: boolean;
  timeStep?: number;
  digits?: number;
  algorithm?: string;
  creationTimestamp?: number;
}

interface LastPassExport {
  folders?: any[];
  accounts: LastPassAccount[];
  version?: number;
  localDeviceId?: string | null;
  deviceName?: string;
}

export default function AddAccountModal({ onClose, onSuccess, darkMode = false }: AddAccountModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('single');
  const [formData, setFormData] = useState<AccountCreate>({
    service: '',
    account_name: '',
    secret_key: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AccountCreate, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModal>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  // Bulk import states
  const [inputText, setInputText] = useState('');
  const [debouncedInputText, setDebouncedInputText] = useState('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce input text to avoid excessive re-renders
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedInputText(inputText);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputText]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  // Computed styles - only compute when darkMode changes
  const modalBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const labelColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const inputFocus = darkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const errorText = darkMode ? 'text-red-400' : 'text-red-600';
  const helpText = darkMode ? 'text-gray-500' : 'text-gray-500';
  const secondaryBtn = darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
  const tabActive = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const tabInactive = darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  const exampleBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-400';
  const codeBg = darkMode ? 'bg-black bg-opacity-40' : 'bg-gray-200';
  const successBg = darkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-900';
  const errorBg = darkMode ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-900';
  const textAreaBg = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-400 text-black placeholder-gray-400';

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AccountCreate, string>> = {};

    if (!formData.service.trim()) {
      newErrors.service = 'Service name is required';
    }
    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required';
    }
    if (!formData.secret_key.trim()) {
      newErrors.secret_key = 'Secret key is required';
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
      await accountsAPI.create({
        ...formData,
        secret_key: formData.secret_key.replace(/\s/g, ''), // Remove spaces
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create account:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to create account. Please check your inputs and try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      if (account.name) {
        const parts = account.name.split(':');
        if (parts.length >= 2) {
          if (!service) service = parts[0].trim();
          accountName = parts.slice(1).join(':').trim();
        } else {
          accountName = account.name.trim();
        }
      }

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
  const parseLastPassJSON = (data: LastPassAccount[] | LastPassExport): ImportAccount[] => {
    const accounts: ImportAccount[] = [];

    // Handle the actual LastPass export format with accounts array
    if (data && typeof data === 'object' && !Array.isArray(data) && 'accounts' in data) {
      const lastPassData = data as LastPassExport;
      if (Array.isArray(lastPassData.accounts)) {
        lastPassData.accounts.forEach((account, index) => {
          if (!account.secret) return;

          const service = account.issuerName || account.originalIssuerName || 'Unknown';
          const accountName = account.userName || account.originalUserName || 'Unknown';

          accounts.push({
            service,
            account_name: accountName,
            secret_key: account.secret.replace(/\s/g, ''),
            line: index + 1,
          });
        });
      }
    }
    // Handle simple array format (for compatibility)
    else if (Array.isArray(data)) {
      data.forEach((account, index) => {
        if (!account.secret) return;

        const service = account.issuerName || account.originalIssuerName || account.service || account.issuer || 'Unknown';
        const accountName = account.userName || account.originalUserName || account.username || 'Unknown';

        accounts.push({
          service,
          account_name: accountName,
          secret_key: account.secret.replace(/\s/g, ''),
          line: index + 1,
        });
      });
    }

    return accounts;
  };

  // Parse uploaded JSON file
  const parseJSONFile = useCallback((file: File): Promise<ImportAccount[]> => {
    return new Promise<ImportAccount[]>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Check for LastPass export format (has accounts array and version)
          if (data && typeof data === 'object' && 'accounts' in data && Array.isArray(data.accounts) && 'version' in data) {
            resolve(parseLastPassJSON(data as LastPassExport));
            return;
          }

          // Check for Google Authenticator format
          if (data.accounts && Array.isArray(data.accounts) && !('version' in data)) {
            resolve(parseGoogleAuthJSON(data));
            return;
          }

          // Check for simple array format
          if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            if (firstItem.secret) {
              resolve(parseLastPassJSON(data));
              return;
            }
            if (firstItem.name || firstItem.username) {
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
  }, []);

  // Parse uploaded CSV file
  const parseCSVFile = useCallback((file: File): Promise<ImportAccount[]> => {
    return new Promise<ImportAccount[]>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.trim().split('\n');
          const accounts: ImportAccount[] = [];

          // Check if file has at least a header row
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or missing data rows.'));
            return;
          }

          // Validate header row (accept both quoted and unquoted)
          const header = lines[0].trim();
          const validHeaders = [
            'Service,Account Name,Secret Key',
            '"Service","Account Name","Secret Key"'
          ];

          if (!validHeaders.includes(header)) {
            reject(new Error('Invalid CSV format. Header must be: Service,Account Name,Secret Key'));
            return;
          }

          // Parse data rows (skip header row at index 0)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Parse CSV with quoted fields
            // Format: "Service","Account Name","Secret Key"
            const matches = line.match(/^"([^"]+)","([^"]+)","([^"]+)"$/);

            if (matches && matches.length === 4) {
              accounts.push({
                service: matches[1],
                account_name: matches[2],
                secret_key: matches[3].replace(/\s/g, ''), // Remove spaces from secret
                line: i + 1, // Line number (1-indexed)
              });
            }
            // Skip malformed lines silently - they'll be caught in validation
          }

          resolve(accounts);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read CSV file.'));
      reader.readAsText(file);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJsonFile(file);
    }
  };

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const parseInput = useCallback((): ImportAccount[] => {
    const accounts: ImportAccount[] = [];
    const lines = debouncedInputText.trim().split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const parts = trimmedLine.split(':');
      if (parts.length >= 3) {
        accounts.push({
          service: parts[0].trim(),
          account_name: parts[1].trim(),
          secret_key: parts.slice(2).join(':').trim().replace(/\s+/g, ''),
          line: index + 1,
        });
      }
    });

    return accounts;
  }, [debouncedInputText]);

  const validateAccount = useCallback((account: ImportAccount): string | null => {
    if (!account.service) return 'Service name is required';
    if (!account.account_name) return 'Account name is required';
    if (!account.secret_key) return 'Secret key is required';
    if (account.secret_key.length < 10) return 'Secret key appears too short';
    return null;
  }, []);

  const parseJSONAccounts = useCallback(async (): Promise<ImportAccount[]> => {
    if (!jsonFile) {
      throw new Error('Please select a JSON file first.');
    }

    try {
      return await parseJSONFile(jsonFile);
    } catch (error) {
      throw error;
    }
  }, [jsonFile, parseJSONFile]);

  const handleBulkImport = async () => {
    let accounts: ImportAccount[] = [];

    try {
      // Get accounts based on active tab
      if (activeTab === 'json') {
        accounts = await parseJSONAccounts();

        if (accounts.length === 0) {
          setAlertModal({
            isOpen: true,
            title: 'No Accounts Found',
            message: 'No valid accounts found in the JSON file. Please make sure you exported from Google Authenticator or LastPass Authenticator.',
            type: 'error',
          });
          return;
        }
      } else if (activeTab === 'mass') {
        accounts = parseInput();

        if (accounts.length === 0) {
          setAlertModal({
            isOpen: true,
            title: 'No Accounts Found',
            message: 'No accounts found. Please check the format and try again.',
            type: 'error',
          });
          return;
        }
      } else if (activeTab === 'csv') {
        try {
          accounts = await parseCSVFile(csvFile!);

          if (accounts.length === 0) {
            setAlertModal({
              isOpen: true,
              title: 'No Accounts Found',
              message: 'No valid accounts found in the CSV file. Please check the format.',
              type: 'error',
            });
            return;
          }
        } catch (error: any) {
          setAlertModal({
            isOpen: true,
            title: 'Import Error',
            message: error.message || 'Failed to import CSV file. Please check the format.',
            type: 'error',
          });
          return;
        }
      }

      setIsSubmitting(true);
      const errors: ImportError[] = [];
      let successCount = 0;

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
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (successCount > 0) {
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

  // Memoized mass import computations (only when mass tab is active)
  const parsedMassAccounts = useMemo(() => {
    return activeTab === 'mass' ? parseInput() : [];
  }, [debouncedInputText, activeTab, parseInput]);

  // Simplified stats - only calculate what's needed
  const massImportStats = useMemo(() => {
    if (activeTab !== 'mass') {
      return { bulkLines: 0, nonEmptyBulkLines: 0, malformedBulkLines: 0, massPreviewAccounts: [] };
    }
    const bulkLines = debouncedInputText.split('\n');
    const nonEmptyBulkLines = bulkLines.filter((line) => line.trim().length > 0);
    const malformedBulkLines = nonEmptyBulkLines.filter((line) => line.trim().split(':').length < 3).length;
    const massPreviewAccounts = parsedMassAccounts.slice(0, 3);
    return { bulkLines: bulkLines.length, nonEmptyBulkLines: nonEmptyBulkLines.length, malformedBulkLines, massPreviewAccounts };
  }, [debouncedInputText, parsedMassAccounts, activeTab]);

  // Memoized single form computations (only when single tab is active)
  const singleFormStats = useMemo(() => {
    if (activeTab !== 'single') {
      return {
        sanitizedSecret: '',
        singleCompletionCount: 0,
        singleCompletionPercent: 0,
        singlePreviewService: '',
        singlePreviewAccount: '',
        singlePreviewSecret: '',
        isSingleFormComplete: false
      };
    }
    const sanitizedSecret = formData.secret_key.replace(/\s/g, '');
    const singleCompletionCount = [formData.service, formData.account_name, sanitizedSecret].filter((value) => value.trim()).length;
    const singleCompletionPercent = Math.round((singleCompletionCount / 3) * 100);
    const singlePreviewService = formData.service.trim() || 'GitHub';
    const singlePreviewAccount = formData.account_name.trim() || 'name@example.com';
    const singlePreviewSecret = sanitizedSecret
      ? `${sanitizedSecret.slice(0, 4)}${sanitizedSecret.length > 8 ? '•'.repeat(Math.min(Math.max(sanitizedSecret.length - 8, 0), 12)) : ''}${sanitizedSecret.slice(-4)}`
      : 'SBR••••••JOJO';
    const isSingleFormComplete = [formData.service, formData.account_name, formData.secret_key].every((value) => value.trim().length > 0);
    return { sanitizedSecret, singleCompletionCount, singleCompletionPercent, singlePreviewService, singlePreviewAccount, singlePreviewSecret, isSingleFormComplete };
  }, [formData, activeTab]);

  // Simple style object - no memoization needed
  const styles = {
    infoCardBg: darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200',
    subtleCardBg: darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200',
    accentCardBg: darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`${modalBg} rounded-lg shadow-xl max-w-5xl w-full h-[min(90vh,52rem)] overflow-hidden flex flex-col bg-opacity-95`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold select-none ${textColor}`}>Add Account</h2>
            <p className={`text-xs sm:text-sm select-none ${helpText} mt-1 hidden sm:block`}>Add a single account or import multiple at once</p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 sm:px-6`}>
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 px-4 py-3 font-medium text-sm select-none ${
              activeTab === 'single' ? tabActive : tabInactive
            }`}
          >
            Add Account
          </button>
          <button
            onClick={() => setActiveTab('mass')}
            className={`flex-1 px-4 py-3 font-medium text-sm select-none transition-all duration-200 ${
              activeTab === 'mass' ? tabActive : tabInactive
            }`}
          >
            Mass Input
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 px-4 py-3 font-medium text-sm select-none transition-all duration-200 ${
              activeTab === 'json' ? tabActive : tabInactive
            }`}
          >
            JSON Import
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex-1 px-4 py-3 font-medium text-sm select-none transition-all duration-200 ${
              activeTab === 'csv' ? tabActive : tabInactive
            }`}
          >
            CSV Import
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'single' ? (
            <form key="single" id="singleAccountForm" onSubmit={handleSubmit} className="h-full p-4 sm:p-6">
              <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-4">
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
                    {errors.account_name && <p className={`mt-1 text-sm ${errorText}`}>{errors.account_name}</p>}
                  </div>

                  <div>
                    <label htmlFor="secret_key" className={`block text-sm font-medium mb-1 ${labelColor}`}>
                      Secret Key
                    </label>
                    <input
                      type="text"
                      id="secret_key"
                      name="secret_key"
                      value={formData.secret_key}
                      onChange={handleChange}
                      placeholder="e.g., JBSWY3DPEHPK3DFGHJKDFGNHDGFHDFGHSZG41S"
                      className={`w-full px-3 py-2.5 border rounded-lg leading-tight ${inputFocus} ${inputBg} ${
                        errors.secret_key ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.secret_key && <p className={`mt-1 text-sm ${errorText}`}>{errors.secret_key}</p>}
                    <p className={`mt-2 text-xs ${helpText}`}>
                      Spaces are removed automatically before the account is saved.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 ${styles.accentCardBg}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${textColor}`}>Setup progress</p>
                        <p className={`text-xs mt-1 ${helpText}`}>{singleFormStats.singleCompletionCount} of 3 fields completed</p>
                      </div>
                      <div className={`text-lg font-bold ${textColor}`}>{singleFormStats.singleCompletionPercent}%</div>
                    </div>
                    <div className={`mt-3 h-2 w-full rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white/80'}`}>
                      <div className="h-2 rounded-full bg-blue-600 transition-[width] duration-150 ease-out" style={{ width: `${singleFormStats.singleCompletionPercent}%` }} />
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${styles.subtleCardBg}`}>
                    <h3 className={`text-sm font-semibold ${textColor}`}>Live preview</h3>
                    <div className={`mt-3 rounded-lg border p-4 ${darkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="space-y-3">
                        <div>
                          <p className={`text-xs uppercase tracking-wide ${helpText}`}>Service</p>
                          <p className={`mt-1 font-medium ${textColor}`}>{singleFormStats.singlePreviewService}</p>
                        </div>
                        <div>
                          <p className={`text-xs uppercase tracking-wide ${helpText}`}>Account</p>
                          <p className={`mt-1 font-medium break-all ${textColor}`}>{singleFormStats.singlePreviewAccount}</p>
                        </div>
                        <div>
                          <p className={`text-xs uppercase tracking-wide ${helpText}`}>Secret</p>
                          <p className={`mt-1 font-mono text-sm break-all ${textColor}`}>{singleFormStats.singlePreviewSecret}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${styles.infoCardBg}`}>
                    <h3 className={`text-sm font-semibold ${textColor}`}>Quick tips</h3>
                    <ul className={`mt-3 space-y-2 text-sm ${helpText}`}>
                      <li>• Use the name of the service or website for easy scanning later.</li>
                      <li>• Account name is usually your email address or username.</li>
                      <li>• Paste the raw TOTP secret key, not the 6-digit code.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          ) : activeTab === 'mass' ? (
            <div key="mass" className="h-full p-4 sm:p-6">
              <div className="grid h-full gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 sm:p-5 ${exampleBg}`}>
                    <h3 className={`text-base sm:text-lg font-bold mb-3 flex items-center gap-2 ${textColor}`}>
                      <DocumentArrowDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="truncate">How to Format Your Accounts</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className={`font-semibold mb-2 text-sm sm:text-base ${textColor}`}>Required format</p>
                        <div className={`${codeBg} rounded-lg p-3 sm:p-4 overflow-x-auto`}>
                          <code className={`text-sm sm:text-base font-mono block text-center whitespace-nowrap ${textColor}`}>
                            SERVICE : ACCOUNT NAME : SECRET KEY
                          </code>
                        </div>
                      </div>
                      <div className={`rounded-lg border p-3 ${styles.subtleCardBg}`}>
                        <p className={`text-sm font-semibold ${textColor}`}>Examples</p>
                        <div className={`mt-2 space-y-2 font-mono text-xs sm:text-sm ${helpText}`}>
                          <p>GitHub:richard@example.com:JBSWY3DPEHPK3PXP</p>
                          <p>Google:dmusic@gmail.com:NB2W45DFOIZA====</p>
                          <p>Gmail:dennylovessonic@gmail.com:LFAKFNDFJWNRA</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${styles.accentCardBg}`}>
                    <h3 className={`text-sm font-semibold ${textColor}`}>Import summary</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className={`rounded-lg border p-3 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-white bg-white/70'}`}>
                        <p className={`text-xs uppercase tracking-wide ${helpText}`}>Detected</p>
                        <p className={`mt-1 text-2xl font-bold ${textColor}`}>{massImportStats.nonEmptyBulkLines > 0 ? parsedMassAccounts.length : 0}</p>
                      </div>
                      <div className={`rounded-lg border p-3 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-white bg-white/70'}`}>
                        <p className={`text-xs uppercase tracking-wide ${helpText}`}>Malformed lines</p>
                        <p className={`mt-1 text-2xl font-bold ${massImportStats.malformedBulkLines > 0 ? (darkMode ? 'text-red-300' : 'text-red-600') : textColor}`}>{massImportStats.malformedBulkLines}</p>
                      </div>
                    </div>
                    <ul className={`mt-3 space-y-2 text-sm ${helpText}`}>
                      <li>• One account per line.</li>
                      <li>• Empty lines are ignored.</li>
                      <li>• Extra spaces in secret keys are removed automatically.</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4 min-h-0">
                  <div>
                    <div className="flex justify-between items-center mb-2 gap-3">
                      <label htmlFor="bulkInput" className={`block text-sm font-medium ${labelColor}`}>
                        Paste Your Accounts Below
                      </label>
                      {/* <span className={`text-xs sm:text-sm ${helpText}`}>
                        {parsedMassAccounts.length} account{parsedMassAccounts.length !== 1 ? 's' : ''} ready
                      </span> */}
                    </div>
                    <textarea
                      id="bulkInput"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="SERVICE:ACCOUNT NAME:SECRET KEY"
                      className={`w-full px-3 sm:px-4 py-3 border rounded-lg font-mono text-xs sm:text-sm leading-relaxed h-[200px] sm:h-[200px] ${inputFocus} ${textAreaBg} transition-colors resize-none`}
                    />
                  </div>

                  <div className={`rounded-xl border p-4 ${styles.subtleCardBg}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={`text-sm font-semibold ${textColor}`}>Preview</h3>
                      <span className={`text-xs ${helpText}`}>Showing first {massImportStats.massPreviewAccounts.length || 0}</span>
                    </div>

                    {massImportStats.massPreviewAccounts.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {massImportStats.massPreviewAccounts.map((account) => (
                          <div
                            key={`${account.line}-${account.service}-${account.account_name}`}
                            className={`rounded-lg border p-3 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`font-medium truncate ${textColor}`}>{account.service}</p>
                                <p className={`text-sm break-all ${helpText}`}>{account.account_name}</p>
                              </div>
                              <span className={`text-xs ${helpText}`}>Line {account.line}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`mt-3 rounded-lg border border-dashed p-6 text-center text-sm ${helpText} ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        Paste a few lines to see a live preview here.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {importResults && (
                <div className="mt-4 space-y-3">
                  {importResults.success > 0 && (
                    <div className={`${successBg} border rounded-lg p-3 sm:p-4`}>
                      <p className="font-semibold text-sm sm:text-base">✅ Successfully imported {importResults.success} account(s)</p>
                    </div>
                  )}

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
          ) : activeTab === 'json' ? (
            <>
              {/* JSON Import Instructions */}
              <div key="json" className={`rounded-lg p-4 sm:p-6 ${exampleBg} border m-4 sm:m-6`}>
                <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${textColor}`}>
                  <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="truncate">Import from Authenticator Apps</span>
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${textColor}`}>📱 Apps Supported:</p>
                    <ul className={`text-xs sm:text-sm space-y-1 ${helpText} list-disc list-inside`}>
                      <li><strong>Google Authenticator</strong></li>
                      <li><strong>LastPass Authenticator</strong></li>
                    </ul>
                  </div>

                  {/* <div className={`rounded-lg p-3 sm:p-4 ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>💡 How to Export:</p>
                    <ol className={`text-xs sm:text-sm space-y-1 ${helpText} list-decimal list-inside`}>
                      <li>Open your authenticator app</li>
                      <li>Go to Settings and find "Export" option</li>
                      <li>Save the JSON file to your device</li>
                      <li>Upload the file below</li>
                    </ol>
                  </div> */}
                </div>
              </div>

              {/* File Upload */}
              <div className="px-4 sm:px-6 pb-4">
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

              {/* Import Results */}
              {importResults && (
                <div className="px-4 sm:px-6 pb-4 space-y-3">
                  {importResults.success > 0 && (
                    <div className={`${successBg} border rounded-lg p-3 sm:p-4`}>
                      <p className="font-semibold text-sm sm:text-base">✅ Successfully imported {importResults.success} account(s)</p>
                    </div>
                  )}

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
            </>
          ) : activeTab === 'csv' ? (
            <div key="csv" className="h-full p-4 sm:p-6">
              <div className="grid h-full gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1fr)]">
                {/* Left Column - Instructions */}
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 sm:p-5 ${exampleBg}`}>
                    <h3 className={`text-base sm:text-lg font-bold mb-3 flex items-center gap-2 ${textColor}`}>
                      <DocumentArrowDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="truncate">Import from CSV Export</span>
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className={`font-semibold mb-2 text-sm sm:text-base ${textColor}`}>Expected Format</p>
                        <div className={`${codeBg} rounded-lg p-3 sm:p-4 overflow-x-auto`}>
                          <code className={`text-sm sm:text-base font-mono block text-center whitespace-nowrap ${textColor}`}>
                            Service,Account Name,Secret Key
                          </code>
                        </div>
                      </div>

                      <div className={`rounded-lg border p-3 ${styles.subtleCardBg}`}>
                        <p className={`text-sm font-semibold ${textColor}`}>Example</p>
                        <div className={`mt-2 font-mono text-xs sm:text-sm ${helpText}`}>
                          <p>"GitHub","richard@example.com","JBSWY3DPEHPK3PXP"</p>
                          <p>"Google","dmusic@gmail.com","NB2W45DFOIZA===="</p>
                        </div>
                      </div>

                      <div className={`rounded-lg border p-3 ${styles.infoCardBg}`}>
                        <p className={`text-sm font-semibold ${textColor}`}>💡 Tips</p>
                        <ul className={`mt-2 space-y-1 text-xs sm:text-sm ${helpText} list-disc list-inside`}>
                          <li>Import CSV files previously exported from this app</li>
                          <li>First row must be the header: Service,Account Name,Secret Key</li>
                          <li>Data rows must have quoted fields: "Service","Account Name","Secret Key"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - File Upload */}
                <div className="space-y-4">
                  <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                    Upload CSV File
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center ${
                    darkMode
                      ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  } transition-colors`}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVFileSelect}
                      className="hidden"
                      id="csvFileInput"
                    />
                    <label htmlFor="csvFileInput" className="cursor-pointer">
                      {csvFile ? (
                        <div className="space-y-2">
                          <DocumentTextIcon className="w-12 h-12 mx-auto text-blue-600" />
                          <p className={`font-medium ${textColor}`}>{csvFile.name}</p>
                          <p className={`text-sm ${helpText}`}>
                            {(csvFile.size / 1024).toFixed(1)} KB
                          </p>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setCsvFile(null);
                              const input = document.getElementById('csvFileInput') as HTMLInputElement;
                              if (input) input.value = '';
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
                            <p className={`font-medium ${textColor}`}>Drop your CSV file here</p>
                            <p className={`text-sm ${helpText}`}>or click to browse</p>
                          </div>
                          <p className={`text-xs ${helpText}`}>
                            Accepts .csv files exported from TOTP Manager
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Import results display */}
                  {importResults && (
                    <div className={`rounded-xl border p-4 ${styles.subtleCardBg}`}>
                      <h3 className={`text-sm font-semibold ${textColor}`}>Import Results</h3>
                      <div className="mt-3 space-y-2">
                        {importResults.success > 0 && (
                          <div className={`${successBg} border rounded-lg p-3`}>
                            <p className="text-sm font-medium">✅ Successfully imported {importResults.success} account(s)</p>
                          </div>
                        )}
                        {importResults.failed.length > 0 && (
                          <div className={`${errorBg} border rounded-lg p-3 max-h-40 overflow-y-auto`}>
                            <p className="text-sm font-medium mb-2">❌ Failed to import {importResults.failed.length} account(s):</p>
                            {importResults.failed.map((failure, index) => (
                              <div key={index} className="text-xs mt-1">
                                <p>Line {failure.line}: <strong>{failure.account.service}</strong></p>
                                <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Error: {failure.error}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className={`flex gap-3 px-4 sm:px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${secondaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          {activeTab === 'single' ? (
            <button
              type="submit"
              form="singleAccountForm"
              disabled={isSubmitting || !singleFormStats.isSingleFormComplete}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Account'}
            </button>
          ) : activeTab === 'mass' ? (
            <button
              onClick={handleBulkImport}
              disabled={isSubmitting || !inputText.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Importing...' : `Import ${parsedMassAccounts.length > 0 ? parsedMassAccounts.length : ''} Account${parsedMassAccounts.length !== 1 ? 's' : ''}`}
            </button>
          ) : activeTab === 'csv' ? (
            <button
              onClick={handleBulkImport}
              disabled={isSubmitting || !csvFile}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Importing...' : 'Import'}
            </button>
          ) : (
            <button
              onClick={handleBulkImport}
              disabled={isSubmitting || !jsonFile}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
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
