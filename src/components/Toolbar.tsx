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
    <div className="px-6 py-3 flex items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <button
        onClick={onAddShift}
        className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#b03f25] transition-all"
      >
        + Add Shift
      </button>
      <button
        onClick={onClearWeek}
        className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all"
      >
        Clear Week
      </button>
      <button
        onClick={onSaveTemplate}
        className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all"
      >
        Save Template
      </button>
      <button
        onClick={onApplyTemplate}
        className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all"
      >
        Apply Template
      </button>

      <div className="ml-auto flex gap-6">
        <div className="text-right">
          <div className="font-mono text-base font-semibold">{formatCurrency(weekStats.totalCost)}</div>
          <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">Labor Cost</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-base font-semibold">{weekStats.totalHours.toFixed(0)}h</div>
          <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">Hours</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-base font-semibold">{weekStats.totalShifts}</div>
          <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">Shifts</div>
        </div>
      </div>
    </div>
  );
}
