'use client';

import { useEffect } from 'react';

interface CheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
const CMD = IS_MAC ? '⌘' : 'Ctrl';

interface Shortcut {
  keys: string[];
  desc: string;
}

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Navigate',
    items: [
      { keys: ['↑', '↓', '←', '→'], desc: 'Move focus between cells' },
      { keys: ['['], desc: 'Previous week' },
      { keys: [']'], desc: 'Next week' },
    ],
  },
  {
    title: 'Shifts',
    items: [
      { keys: ['Enter'], desc: 'Add shift (or save open modal)' },
      { keys: ['E'], desc: 'Edit first shift in focused cell' },
      { keys: ['Del'], desc: 'Delete first shift in focused cell' },
      { keys: ['C'], desc: 'Copy first shift in focused cell' },
      { keys: ['V'], desc: 'Paste into focused cell' },
    ],
  },
  {
    title: 'App',
    items: [
      { keys: [CMD, '⇧', 'S'], desc: 'Open Staff drawer' },
      { keys: [CMD, '⇧', 'P'], desc: 'Open Publish' },
      { keys: ['Esc'], desc: 'Close open dialog' },
      { keys: ['?'], desc: 'Show this cheat sheet' },
    ],
  },
];

export default function CheatSheet({ isOpen, onClose }: CheatSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-overlay="cheatsheet"
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/50 animate-[fadeIn_0.12s_ease] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl animate-[scaleIn_0.15s_ease]">
        <div className="bg-[var(--color-text)] text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-[15px] font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-3">
                {group.title}
              </h3>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <div key={item.desc} className="flex items-start gap-2.5">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </div>
                    <span className="text-[12.5px] text-[var(--color-text-2)] leading-snug">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 pt-2 text-[11px] text-[var(--color-muted)] font-mono">
          Press <Kbd>?</Kbd> anytime to open this sheet.
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-text-2)] font-mono text-[11px] leading-none">
      {children}
    </kbd>
  );
}
