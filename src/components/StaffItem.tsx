'use client';

import type { Employee } from '@/lib/data/types';
import { employeeWeeklyHours, employeeWeeklyCost, formatCurrency } from '@/lib/utils/cost';
import { useSchedulerContext } from '@/context/SchedulerContext';

interface StaffItemProps {
  employee: Employee;
  onRemove: (id: string) => void;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StaffItem({ employee, onRemove }: StaffItemProps) {
  const { shifts, employees, updateEmployee } = useSchedulerContext();
  const weeklyHrs = employeeWeeklyHours(employee.id, shifts);
  const weeklyCost = employeeWeeklyCost(employee.id, shifts, employees);

  return (
    <div className="border-b border-[var(--color-border)] px-5 py-3 hover:bg-[var(--color-bg)] transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: employee.color }}
        >
          {initials(employee.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{employee.name}</div>
          <div className="text-xs text-[var(--color-muted)] capitalize">{employee.role}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="font-mono text-xs text-[var(--color-muted)]">$</span>
          <input
            type="number"
            className="w-16 border border-[var(--color-border)] rounded px-2 py-1.5 font-mono text-[13px] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            value={employee.hourlyRate}
            min={0}
            step={0.5}
            onChange={(e) => updateEmployee(employee.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
          />
          <span className="font-mono text-xs text-[var(--color-muted)]">/hr</span>
        </div>
        <div className="text-right flex-shrink-0 min-w-[60px]">
          <div className="font-mono text-[15px] font-semibold text-[var(--color-accent)]">
            {formatCurrency(weeklyCost)}
          </div>
          <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">{weeklyHrs.toFixed(0)}h/wk</div>
        </div>
        <button
          onClick={() => onRemove(employee.id)}
          className="text-[#ccc] hover:text-[var(--color-accent)] text-xl leading-none p-1 transition-colors flex-shrink-0"
        >
          &times;
        </button>
      </div>

      {/* Phone row */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-muted)] flex-shrink-0">&#x1F4F1;</span>
        <input
          type="tel"
          className="flex-1 border border-[var(--color-border)] rounded px-2.5 py-1 font-mono text-xs bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-green)] outline-none"
          placeholder="+1 555 000 0000"
          value={employee.phone}
          onChange={(e) => updateEmployee(employee.id, { phone: e.target.value })}
        />
        <span className={`text-[11px] font-mono flex-shrink-0 ${employee.phone ? 'text-[var(--color-green)]' : 'text-[var(--color-muted)]'}`}>
          {employee.phone ? '&#10003;' : 'no phone'}
        </span>
      </div>
    </div>
  );
}
