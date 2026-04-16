'use client';

import type { Shift, Employee } from '@/lib/data/types';
import { ROLE_COLORS } from '@/lib/data/types';
import { formatTime } from '@/lib/utils/time';

interface ShiftBlockProps {
  shift: Shift;
  employee: Employee | undefined;
  onEdit: (shiftId: string) => void;
  onDelete: (shiftId: string) => void;
}

export default function ShiftBlock({ shift, employee, onEdit, onDelete }: ShiftBlockProps) {
  const bg = employee ? (ROLE_COLORS[employee.role] ?? '#1a1916') : '#1a1916';

  return (
    <div
      className="group relative rounded px-2 py-1.5 text-white text-xs cursor-pointer transition-opacity hover:opacity-90 min-h-[30px]"
      style={{ backgroundColor: bg }}
      onClick={() => onEdit(shift.id)}
    >
      <div className="truncate text-[11px] font-medium">
        {shift.note || employee?.name.split(' ')[0] || 'Shift'}
      </div>
      <div className="font-mono text-[10px] text-white/60">
        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
      </div>
      <button
        className="absolute top-0.5 right-1 text-white/30 hover:text-[var(--color-accent)] text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
      >
        &times;
      </button>
    </div>
  );
}
