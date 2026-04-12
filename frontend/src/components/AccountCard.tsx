/**
 * AccountCard component - displays a single TOTP account with code and countdown
 */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Account, TOTPResponse } from '@/types';
import { accountsAPI } from '@/lib/storage';
import { formatCode, formatTimeRemaining, formatTimeRemainingMs, getTimeColor, copyToClipboard } from '@/lib/utils';
import { DocumentDuplicateIcon, PencilIcon, TrashIcon, CheckIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useCurrentTime } from '@/contexts/TimeContext';

interface TimeContextType {
  currentTime: number;
  currentPeriod: number;
  timeRemaining: number;
  timeRemainingSeconds: number;
}

interface AccountCardProps {
  account: Account;
  index?: number;
  onUpdate?: () => void;
  onDelete?: () => void;
  onEdit?: (account: Account) => void;
  darkMode?: boolean;
  onDeleteConfirm?: () => void;
  isSelected?: boolean;
  onSelect?: (event: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (account: Account) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onTogglePin?: (account: Account) => void;
  isMultipleSelected?: boolean;
}

interface TOTPData {
  code: string;
  valid_for: number;
  time_remaining: number; // Time remaining in milliseconds
  generated_at: number; // Timestamp when code was generated
}

export default function AccountCard({
  account,
  index = 0,
  onUpdate,
  onDelete,
  onEdit,
  darkMode = false,
  onDeleteConfirm,
  isSelected = false,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDragOver = false,
  onTogglePin,
  isMultipleSelected = false,
}: AccountCardProps) {
  const [totp, setTotp] = useState<TOTPResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const timeState = useCurrentTime() as TimeContextType;

  // Fetch TOTP code
  const fetchTOTP = useCallback(async () => {
    try {
      const response = await accountsAPI.generateTOTP(account);
      setTotp(response);
    } catch (error) {
      console.error('Failed to generate TOTP:', error);
    }
  }, [account]);

  // Initial fetch and setup countdown
  useEffect(() => {
    fetchTOTP();
  }, [account]);

  // Sync all accounts to epoch time periods
  useEffect(() => {
    if (!totp || !totp.generated_at) return;

    // Check if we've entered a new 30-second period
    const currentPeriod = timeState.currentPeriod;

    // Calculate when the current TOTP was generated (in milliseconds)
    const generatedAtInMillis = totp.generated_at;
    const generatedPeriod = Math.floor(generatedAtInMillis / 30000);

    // If we're in a different period, fetch new TOTP
    if (currentPeriod !== generatedPeriod) {
      fetchTOTP();
    } else {
      // Update countdown using global time remaining (milliseconds)
      setTotp((prev) => {
        if (!prev) return null;
        return { ...prev, time_remaining: timeState.timeRemaining };
      });
    }
  }, [timeState.currentPeriod, timeState.timeRemaining, fetchTOTP]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!totp) return;
    const success = await copyToClipboard(totp.code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  // Handle card click for selection
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onSelect?.(e);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart?.(account);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  // Pin toggle handler
  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.preventDefault();
    e.nativeEvent.stopPropagation();
    onTogglePin?.(account);
  };

  const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const subtextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const iconColor = darkMode ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500';
  const deleteColor = darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500';
  const progressGreen = darkMode ? 'bg-green-600' : 'bg-green-500';
  const progressYellow = darkMode ? 'bg-yellow-600' : 'bg-yellow-500';
  const progressRed = darkMode ? 'bg-red-600' : 'bg-red-500';

  // Selection styles
  const selectedBorder = isSelected
    ? 'border-2 border-blue-500 shadow-xl'
    : darkMode
    ? 'border-2 border-transparent hover:border-gray-700'
    : 'border-2 border-transparent hover:border-gray-300';

  const selectedBg = isSelected
    ? darkMode
      ? 'bg-gray-800'
      : 'bg-blue-50'
    : cardBg;

  // Dragging styles
  const draggingStyles = isDragging
    ? 'opacity-60 scale-105 shadow-2xl rotate-2'
    : isDragOver && !isSelected
    ? 'border-2 border-dashed border-blue-500 translate-x-8 scale-105'
    : isDragOver && isSelected
    ? 'translate-x-8 scale-105'
    : '';

  // Add smooth transitions for drag animations
  const dragTransition = isDragging || isDragOver
    ? 'transition-all duration-200 ease-out'
    : 'transition-all duration-300';

  return (
    <div
      onClick={handleCardClick}
      onContextMenu={onContextMenu}
      draggable={!isMultipleSelected}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
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
            onClick={handleTogglePin}
            className={`p-2 transition-colors ${
              account.is_pinned
                ? darkMode
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-700'
                : iconColor
            }`}
            title={account.is_pinned ? 'Unpin account' : 'Pin account'}
          >
            <MapPinIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(account);
            }}
            className={`p-2 ${iconColor} transition-colors`}
            title="Edit account"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConfirm?.();
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
          {totp ? (
            <>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-mono font-bold tracking-wider ${textColor}`}>
                  {formatCode(totp.code)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-600'
                      : darkMode
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700'
                  }`}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Countdown Timer */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-2 rounded-full transition-[width] duration-75 ease-out ${
                        totp.time_remaining > 15000
                          ? progressGreen
                          : totp.time_remaining > 5000
                          ? progressYellow
                          : progressRed
                      }`}
                      style={{ width: `${(totp.time_remaining / (totp.valid_for * 1000)) * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-mono font-semibold ${
                    totp.time_remaining > 15000
                      ? 'text-green-600'
                      : totp.time_remaining > 5000
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }`}>
                    {formatTimeRemainingMs(totp.time_remaining)}
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
