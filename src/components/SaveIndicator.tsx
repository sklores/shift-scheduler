'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';

/**
 * Small pill in the header showing cloud save status.
 * - idle: nothing
 * - saving: spinner + "Saving…"
 * - saved: checkmark + "Saved" (fades after ~2s)
 * - error: warning + "Offline" with tooltip
 */
export default function SaveIndicator() {
  const { saveStatus, saveError } = useSchedulerContext();

  if (saveStatus === 'idle') return null;

  const base = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition-opacity';

  if (saveStatus === 'saving') {
    return (
      <div className={`${base} bg-white/5 text-white/60`}>
        <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        Saving…
      </div>
    );
  }

  if (saveStatus === 'saved') {
    return (
      <div className={`${base} bg-[var(--color-green)]/20 text-[#b6e5b8]`}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L5 9.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Saved
      </div>
    );
  }

  // error
  return (
    <div
      className={`${base} bg-[var(--color-accent)]/20 text-[#f8bfae]`}
      title={saveError || 'Save failed — your last change may not have synced'}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L11.5 10.5H0.5L6 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M6 4V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="6" cy="8.3" r="0.6" fill="currentColor"/>
      </svg>
      Offline
    </div>
  );
}
