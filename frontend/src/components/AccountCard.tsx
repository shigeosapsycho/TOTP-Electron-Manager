/**
 * AccountCard component - displays a single TOTP account with code and countdown
 */
'use client';

import { memo, useEffect, useState } from 'react';
import { Account } from '@/types';
import { accountsAPI } from '@/lib/storage';
import { TOTP_PERIOD_MS } from '@/lib/constants';
import { CountdownTone, formatCode, formatTimeRemainingMs, getCountdownTone, copyToClipboard } from '@/lib/utils';
import { DocumentDuplicateIcon, PencilIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useCurrentTime } from '@/contexts/TimeContext';

interface AccountCardProps {
  account: Account;
  index: number;
  darkMode: boolean;
  isSelected: boolean;
  isMultipleSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: (id: number, event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent, account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onTogglePin: (account: Account) => void;
  onDragStart: (account: Account) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const BAR_COLOR: Record<CountdownTone, { light: string; dark: string }> = {
  ok: { light: 'bg-green-500', dark: 'bg-green-600' },
  warn: { light: 'bg-yellow-500', dark: 'bg-yellow-600' },
  critical: { light: 'bg-red-500', dark: 'bg-red-600' },
};

const LABEL_COLOR: Record<CountdownTone, string> = {
  ok: 'text-green-600',
  warn: 'text-yellow-500',
  critical: 'text-red-500',
};

/**
 * Progress bar for the current period. It is animated by CSS (compositor transform) so the
 * page does not re-render every frame; the offset is read from the clock once when the bar
 * mounts, and the parent remounts it each period via `key`.
 */
function CountdownBar({ colorClass }: { colorClass: string }) {
  const [elapsed] = useState(() => Date.now() % TOTP_PERIOD_MS);

  return (
    <div
      className={`countdown-bar h-2 w-full rounded-full ${colorClass}`}
      style={{ animationDuration: `${TOTP_PERIOD_MS}ms`, animationDelay: `-${elapsed}ms` }}
    />
  );
}

function AccountCard({
  account,
  index,
  darkMode,
  isSelected,
  isMultipleSelected,
  isDragging,
  isDragOver,
  onSelect,
  onContextMenu,
  onEdit,
  onDelete,
  onTogglePin,
  onDragStart,
  onDragOver,
  onDragEnd,
}: AccountCardProps) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { currentPeriod, timeRemaining } = useCurrentTime();
  const { encrypted_secret, secret_key } = account;

  // Generate the code for the current period; runs again when the period rolls over or the secret changes.
  useEffect(() => {
    let cancelled = false;

    accountsAPI
      .generateCode({ encrypted_secret, secret_key }, currentPeriod * TOTP_PERIOD_MS)
      .then((next) => {
        if (!cancelled) setCode(next);
      })
      .catch((error) => console.error('Failed to generate TOTP:', error));

    return () => {
      cancelled = true;
    };
  }, [encrypted_secret, secret_key, currentPeriod]);

  const handleCopy = async () => {
    if (!code) return;
    if (await copyToClipboard(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onSelect(account.id, e);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, index);
  };

  const tone = getCountdownTone(timeRemaining);

  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const subtextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const iconColor = darkMode ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500';
  const deleteColor = darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500';
  const pinColor = account.is_pinned
    ? darkMode
      ? 'text-blue-400 hover:text-blue-300'
      : 'text-blue-600 hover:text-blue-700'
    : iconColor;
  const copyColor = copied
    ? 'bg-green-100 text-green-600'
    : darkMode
    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700';

  const selectedBorder = isSelected
    ? 'border-2 border-blue-500 shadow-xl'
    : darkMode
    ? 'border-2 border-transparent hover:border-gray-700'
    : 'border-2 border-transparent hover:border-gray-300';

  const selectedBg = isSelected
    ? darkMode
      ? 'bg-gray-800'
      : 'bg-blue-50'
    : darkMode
    ? 'bg-gray-900'
    : 'bg-white';

  const draggingStyles = isDragging
    ? 'opacity-60 scale-105 shadow-2xl rotate-2'
    : isDragOver && !isSelected
    ? 'border-2 border-dashed border-blue-500 translate-x-8 scale-105'
    : isDragOver && isSelected
    ? 'translate-x-8 scale-105'
    : '';

  const dragTransition = isDragging || isDragOver
    ? 'transition-all duration-200 ease-out'
    : 'transition-all duration-300';

  return (
    <div
      onClick={handleCardClick}
      onContextMenu={(e) => onContextMenu(e, account)}
      draggable={!isMultipleSelected}
      onDragStart={(e) => {
        onDragStart(account);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={handleDragOver}
      onDrop={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={`relative rounded-lg shadow-md p-6 pt-8 hover:shadow-lg cursor-pointer ${dragTransition} ${selectedBg} ${selectedBorder} ${draggingStyles}`}
    >
      {/* Header - Service and Account Name */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${textColor}`}>{account.service}</h3>
          <p className={`text-sm ${subtextColor}`}>{account.account_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onTogglePin(account);
            }}
            className={`p-2 transition-colors ${pinColor}`}
            title={account.is_pinned ? 'Unpin account' : 'Pin account'}
          >
            <MapPinIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className={`p-2 ${iconColor} transition-colors`}
            title="Edit account"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account);
            }}
            className={`p-2 ${deleteColor} transition-colors`}
            title="Delete account"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TOTP Code Display */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {code ? (
            <>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-mono font-bold tracking-wider ${textColor}`}>
                  {formatCode(code)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                  className={`p-2 rounded-lg transition-colors ${copyColor}`}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Countdown Timer */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 overflow-hidden rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <CountdownBar
                      key={currentPeriod}
                      colorClass={darkMode ? BAR_COLOR[tone].dark : BAR_COLOR[tone].light}
                    />
                  </div>
                  <span className={`text-sm font-mono font-semibold ${LABEL_COLOR[tone]}`}>
                    {formatTimeRemainingMs(timeRemaining)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className={subtextColor}>Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(AccountCard);
