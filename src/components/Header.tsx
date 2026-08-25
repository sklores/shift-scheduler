'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';
import { useAuth } from '@/context/AuthContext';
import SaveIndicator from './SaveIndicator';

export type ViewMode = 'week' | 'month';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenPublish: () => void;
  viewMode: ViewMode;
  onSetViewMode: (v: ViewMode) => void;
}

// Shared Week/Month tab-bar strip. On the blue bar the active segment
// inverts to white-on-accent so it still reads as "selected".
function ViewToggle({ viewMode, onSetViewMode, size = 'md' }: { viewMode: ViewMode; onSetViewMode: (v: ViewMode) => void; size?: 'md' | 'sm' }) {
  const seg = size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]';
  const btn = (v: ViewMode, label: string) =>
    `${seg} font-medium transition-colors ${
      viewMode === v
        ? 'bg-white text-[var(--color-accent)]'
        : 'bg-transparent text-white/70 hover:bg-white/15 hover:text-white'
    }`;
  return (
    <div className="flex items-center rounded-lg border border-white/25 overflow-hidden flex-shrink-0">
      <button onClick={() => onSetViewMode('week')} className={btn('week', 'Week')}>Week</button>
      <button onClick={() => onSetViewMode('month')} className={btn('month', 'Month')}>Month</button>
    </div>
  );
}

export default function Header({ onOpenDrawer, onOpenPublish, viewMode, onSetViewMode }: HeaderProps) {
  const { weekLabel, weekLabelCompact, changeWeek, isDraftMode, toggleDraftMode } = useSchedulerContext();
  const { signOut, isOwner, isEmbedded } = useAuth();

  const navBtn = "w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center flex-shrink-0";

  // Draft pill (amber = the one borrowed accent)
  const draftPill = (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-warn-light)] text-[var(--color-warn)] text-[11px] font-bold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warn)] animate-pulse inline-block" />
      Draft
    </span>
  );

  const exitDraftBtn = (
    <button
      onClick={toggleDraftMode}
      className="px-3 py-1.5 rounded-lg border border-[var(--color-warn)]/40 bg-[var(--color-warn-light)] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/15 text-[13px] font-semibold transition-all flex-shrink-0"
    >
      Exit Draft
    </button>
  );

  // ── Embedded slim bar (accent-blue, per operator request) ──
  if (isEmbedded) {
    return (
      <header className="bg-[var(--color-accent)] px-3 sm:px-4 flex items-center gap-2 justify-between h-11 sticky top-0 z-50 w-full min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
          {isDraftMode ? (
            draftPill
          ) : viewMode === 'month' ? (
            <span className="text-[13px] font-medium text-white/70">Month Overview</span>
          ) : (
            <>
              <button onClick={() => changeWeek(-1)} className={navBtn} aria-label="Previous week">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span className="text-[13px] font-semibold tracking-wide truncate px-1 text-white">{weekLabel}</span>
              <button onClick={() => changeWeek(1)} className={navBtn} aria-label="Next week">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          )}
        </div>
        {!isDraftMode && <ViewToggle viewMode={viewMode} onSetViewMode={onSetViewMode} size="sm" />}
        {isDraftMode && exitDraftBtn}
      </header>
    );
  }

  // ── Full standalone header (accent-blue bar) ──
  return (
    <header className="bg-[var(--color-accent)] px-3 sm:px-6 flex items-center gap-2 justify-between h-14 sticky top-0 z-50 w-full min-w-0">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="text-[18px] sm:text-[19px] font-extrabold tracking-[-0.02em] text-white">
          <span className={isDraftMode ? 'text-[var(--color-warn)]' : 'text-[var(--color-teal)]'}>&amp;</span>shift
        </div>
        {isDraftMode && <span className="hidden sm:inline-flex">{draftPill}</span>}
      </div>

      {/* Center: week nav or month label */}
      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 justify-center">
        {isDraftMode ? (
          <span className="text-center text-[13.5px] sm:text-[14px] font-semibold tracking-wide text-white/70 select-none">
            Draft Week
          </span>
        ) : viewMode === 'month' ? (
          <span className="text-center text-[13.5px] sm:text-[14px] font-semibold tracking-wide text-white/70 select-none">
            Month Overview
          </span>
        ) : (
          <>
            <button onClick={() => changeWeek(-1)} className={navBtn} aria-label="Previous week">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className="text-center text-[13.5px] sm:text-[14px] font-semibold tracking-wide truncate text-white">
              <span className="sm:hidden">{weekLabelCompact}</span>
              <span className="hidden sm:inline">{weekLabel}</span>
            </span>
            <button onClick={() => changeWeek(1)} className={navBtn} aria-label="Next week">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {!isDraftMode && isOwner && <div className="hidden sm:block"><SaveIndicator /></div>}

        {!isDraftMode && <ViewToggle viewMode={viewMode} onSetViewMode={onSetViewMode} />}

        {!isDraftMode && isOwner && (
          <button
            onClick={onOpenDrawer}
            className="rounded-lg border border-white/25 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-all w-9 h-9 flex items-center justify-center flex-shrink-0 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 sm:gap-2 sm:text-[13px] sm:font-medium"
            aria-label="Manage Staff"
          >
            <svg width="15" height="15" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 11C2.5 8.79 4.29 7 6.5 7C8.71 7 10.5 8.79 10.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <span className="hidden sm:inline">Staff</span>
          </button>
        )}
        {!isDraftMode && isOwner && (
          <button
            onClick={onOpenPublish}
            className="rounded-lg bg-[var(--color-green)] text-white font-semibold hover:bg-[var(--color-green-hover)] transition-all w-9 h-9 flex items-center justify-center flex-shrink-0 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 sm:gap-2 sm:text-[13px]"
            aria-label="Publish Schedule"
          >
            <svg width="15" height="15" viewBox="0 0 13 13" fill="none" className="flex-shrink-0"><path d="M2 6.5L11 2L9 11L6.5 8L2 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
            <span className="hidden sm:inline">Publish</span>
          </button>
        )}
        {isDraftMode && exitDraftBtn}
        <button
          onClick={signOut}
          className="text-white/60 hover:text-white hover:bg-white/15 w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
          aria-label="Sign out"
          title="Sign out"
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M6 4V3C6 2.45 6.45 2 7 2H11C11.55 2 12 2.45 12 3V12C12 12.55 11.55 13 11 13H7C6.45 13 6 12.55 6 12V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9 7.5H2M2 7.5L4 5.5M2 7.5L4 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </header>
  );
}
