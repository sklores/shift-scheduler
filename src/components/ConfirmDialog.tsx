'use client';

import { useEffect } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, options, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options;

  return (
    <div
      data-overlay="confirm"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 animate-[fadeIn_0.12s_ease] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden animate-[scaleIn_0.15s_ease]">
        <div className="p-6">
          <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--color-text-2)] leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-[var(--color-surface-2)] flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`text-[13px] font-medium px-4 py-2 rounded-lg text-white border transition-all ${
              destructive
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
                : 'bg-[var(--color-text)] border-[var(--color-text)] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
