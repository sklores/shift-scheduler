'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenPublish: () => void;
}

export default function Header({ onOpenDrawer, onOpenPublish }: HeaderProps) {
  const { weekLabel, weekLabelCompact, changeWeek } = useSchedulerContext();

  return (
    <header className="bg-[var(--color-text)] text-white px-3 sm:px-6 flex items-center gap-2 justify-between h-14 sticky top-0 z-50 shadow-sm w-full min-w-0">
      {/* Logo */}
      <div className="font-mono text-[18px] sm:text-[19px] font-semibold tracking-[-0.02em] flex-shrink-0">
        sh<span className="text-[var(--color-accent)]">i</span>ft
      </div>

      {/* Week nav — takes remaining space but shrinks first */}
      <div className="flex items-center gap-1 sm:gap-2 font-mono text-white/80 flex-1 min-w-0 justify-center">
        <button
          onClick={() => changeWeek(-1)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0"
          aria-label="Previous week"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Compact on mobile, full on sm+ */}
        <span className="text-center text-[12px] sm:text-[12.5px] font-medium tracking-wide truncate">
          <span className="sm:hidden">{weekLabelCompact}</span>
          <span className="hidden sm:inline">{weekLabel}</span>
        </span>
        <button
          onClick={() => changeWeek(1)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0"
          aria-label="Next week"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={onOpenDrawer}
          className="text-white/90 hover:text-white hover:bg-white/10 w-9 h-9 rounded-md flex items-center justify-center transition-all flex-shrink-0 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 sm:bg-white/[0.08] sm:border sm:border-white/10 sm:gap-2 sm:text-[12.5px] sm:font-medium"
          aria-label="Manage Staff"
        >
          <svg width="15" height="15" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 11C2.5 8.79 4.29 7 6.5 7C8.71 7 10.5 8.79 10.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <span className="hidden sm:inline">Staff</span>
        </button>
        <button
          onClick={onOpenPublish}
          className="bg-[var(--color-green)] border border-[var(--color-green)] text-white hover:bg-[var(--color-green-hover)] transition-all w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 sm:w-auto sm:h-auto sm:px-4 sm:py-1.5 sm:gap-2 sm:text-[12.5px] sm:font-medium"
          aria-label="Publish Schedule"
        >
          <svg width="15" height="15" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><path d="M2 6.5L11 2L9 11L6.5 8L2 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          <span className="hidden sm:inline">Publish</span>
        </button>
      </div>
    </header>
  );
}
