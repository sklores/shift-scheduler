'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenPublish: () => void;
}

export default function Header({ onOpenDrawer, onOpenPublish }: HeaderProps) {
  const { weekLabel, changeWeek } = useSchedulerContext();

  return (
    <header className="bg-[var(--color-text)] text-white px-4 sm:px-6 flex items-center justify-between h-14 sticky top-0 z-50 shadow-sm">
      {/* Logo */}
      <div className="font-mono text-[19px] font-semibold tracking-[-0.02em] flex-shrink-0">
        sh<span className="text-[var(--color-accent)]">i</span>ft
      </div>

      {/* Week nav (center) */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono text-[13px] text-white/80 flex-1 justify-center max-w-md mx-2">
        <button
          onClick={() => changeWeek(-1)}
          className="w-8 h-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0"
          aria-label="Previous week"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-center min-w-[130px] text-[12.5px] font-medium tracking-wide">{weekLabel}</span>
        <button
          onClick={() => changeWeek(1)}
          className="w-8 h-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0"
          aria-label="Next week"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Actions (right) */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          onClick={onOpenDrawer}
          className="font-medium text-[12.5px] px-2.5 sm:px-3.5 py-1.5 rounded-md bg-white/[0.08] border border-white/10 text-white/90 hover:bg-white/15 hover:border-white/20 transition-all flex items-center gap-2"
          aria-label="Manage Staff"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 11C2.5 8.79 4.29 7 6.5 7C8.71 7 10.5 8.79 10.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <span className="hidden sm:inline">Staff</span>
        </button>
        <button
          onClick={onOpenPublish}
          className="font-medium text-[12.5px] px-3 sm:px-4 py-1.5 rounded-md bg-[var(--color-green)] border border-[var(--color-green)] text-white hover:bg-[var(--color-green-hover)] transition-all flex items-center gap-2"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><path d="M2 6.5L11 2L9 11L6.5 8L2 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          Publish
        </button>
      </div>
    </header>
  );
}
