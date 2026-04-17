'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({ isOpen, onClose, title, headerClassName, footer, children, width = 'max-w-md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/50 animate-[fadeIn_0.15s_ease] p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden w-full ${width} animate-[scaleIn_0.2s_ease] max-h-[90vh] flex flex-col`}>
        <div className={`px-5 py-4 flex items-center justify-between flex-shrink-0 ${headerClassName ?? 'bg-[var(--color-text)] text-white'}`}>
          <h2 className="font-semibold text-[15px]">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] flex gap-2.5 justify-end flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
