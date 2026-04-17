'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';
import { formatCurrency } from '@/lib/utils/cost';

interface ToolbarProps {
  onAddShift: () => void;
  onClearWeek: () => void;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
}

export default function Toolbar({ onAddShift, onClearWeek, onSaveTemplate, onApplyTemplate }: ToolbarProps) {
  const { weekStats } = useSchedulerContext();

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] w-full min-w-0">
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
        <button
          onClick={onAddShift}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all flex-shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <span className="text-base leading-none -mt-px">+</span> Add Shift
        </button>
        <button
          onClick={onApplyTemplate}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all flex-shrink-0"
        >
          Apply Template
        </button>
        <button
          onClick={onSaveTemplate}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all flex-shrink-0"
        >
          Save Template
        </button>
        <button
          onClick={onClearWeek}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-muted)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] transition-all flex-shrink-0"
        >
          Clear Week
        </button>

        {/* Stats — desktop */}
        <div className="hidden md:flex ml-auto gap-2">
          <Stat label="Labor Cost" value={formatCurrency(weekStats.totalCost)} accent />
          <Stat label="Hours" value={`${weekStats.totalHours.toFixed(0)}h`} />
          <Stat label="Shifts" value={String(weekStats.totalShifts)} />
        </div>
      </div>

      {/* Stats — mobile (below buttons) */}
      <div className="flex md:hidden gap-2 mt-3">
        <Stat label="Cost" value={formatCurrency(weekStats.totalCost)} accent fill />
        <Stat label="Hours" value={`${weekStats.totalHours.toFixed(0)}h`} fill />
        <Stat label="Shifts" value={String(weekStats.totalShifts)} fill />
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false, fill = false }: { label: string; value: string; accent?: boolean; fill?: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] ${fill ? 'flex-1' : ''}`}>
      <div className={`font-mono text-[15px] font-semibold leading-tight ${accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
