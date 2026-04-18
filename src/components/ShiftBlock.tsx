'use client';

import { useState } from 'react';
import type { Shift, Employee } from '@/lib/data/types';
import { ROLE_COLORS } from '@/lib/data/types';
import { formatTime, calcHours } from '@/lib/utils/time';

interface ShiftBlockProps {
  shift: Shift;
  employee: Employee | undefined;
  onEdit: (shiftId: string) => void;
  onDelete: (shiftId: string) => void;
  draggable?: boolean;
  showEmployeeName?: boolean;
  compact?: boolean;
  conflict?: boolean;
}

export default function ShiftBlock({
  shift,
  employee,
  onEdit,
  onDelete,
  draggable = true,
  showEmployeeName = false,
  compact = false,
  conflict = false,
}: ShiftBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const bg = employee ? (ROLE_COLORS[employee.role] ?? '#1f1b16') : '#1f1b16';
  const hours = calcHours(shift.startTime, shift.endTime);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/shift-id', shift.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  return (
    <div
      data-shift-block
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      className={`group relative rounded-md text-white cursor-pointer transition-all hover:brightness-110 hover:shadow-sm ${
        isDragging ? 'opacity-40' : ''
      } ${compact ? 'px-2 py-1.5 min-h-[34px]' : 'px-2.5 py-2 min-h-[42px]'} ${
        conflict ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-white' : ''
      }`}
      style={{ backgroundColor: bg }}
      onClick={() => onEdit(shift.id)}
      title={conflict ? 'This shift overlaps with another shift for this employee' : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className={`truncate font-medium ${compact ? 'text-[11px]' : 'text-[12px]'} flex items-center gap-1`}>
            {conflict && <span aria-label="Conflict">&#9888;</span>}
            <span className="truncate">{shift.note || (showEmployeeName && employee ? employee.name : employee?.name.split(' ')[0]) || 'Shift'}</span>
          </div>
          <div className={`font-mono text-white/70 ${compact ? 'text-[10px]' : 'text-[10.5px]'} mt-0.5 flex items-center gap-1.5`}>
            <span>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</span>
            {!compact && <span className="text-white/50">·</span>}
            {!compact && <span className="text-white/50">{hours}h</span>}
          </div>
        </div>
        <button
          className="text-white/40 hover:text-white text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-0.5 p-0.5"
          onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
          aria-label="Delete shift"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
