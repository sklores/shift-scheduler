'use client';

import { useState } from 'react';
import type { Employee, EmployeeRole } from '@/lib/data/types';
import { ROLE_COLORS } from '@/lib/data/types';
import { employeeWeeklyHours, employeeWeeklyCost, formatCurrency } from '@/lib/utils/cost';
import { isOvertime, OT_THRESHOLD_HOURS } from '@/lib/utils/conflicts';
import { useSchedulerContext } from '@/context/SchedulerContext';

interface StaffItemProps {
  employee: Employee;
  onRemove: (id: string) => void;
  onToast: (msg: string) => void;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StaffItem({ employee, onRemove, onToast }: StaffItemProps) {
  const { currentWeekShifts, employees, updateEmployee } = useSchedulerContext();
  const weeklyHrs = employeeWeeklyHours(employee.id, currentWeekShifts);
  const weeklyCost = employeeWeeklyCost(employee.id, currentWeekShifts, employees);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(employee.name);
  const [editRole, setEditRole] = useState<EmployeeRole>(employee.role);

  const handleEditSave = async () => {
    const name = editName.trim();
    if (!name) return;
    await updateEmployee(employee.id, { name, role: editRole });
    onToast('Employee updated');
    setEditing(false);
  };

  const handleEditCancel = () => {
    setEditName(employee.name);
    setEditRole(employee.role);
    setEditing(false);
  };

  return (
    <div className="border-b border-[var(--color-border)] px-5 py-3.5 hover:bg-[var(--color-surface-2)] transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ring-2 ring-white"
          style={{ backgroundColor: ROLE_COLORS[editing ? editRole : employee.role] }}
        >
          {initials(editing ? editName || employee.name : employee.name)}
        </div>

        {editing ? (
          <div className="flex-1 min-w-0 flex gap-2">
            <input
              autoFocus
              type="text"
              className="flex-1 min-w-0 border border-[var(--color-accent)] rounded-md px-2 py-1 text-[13px] bg-white text-[var(--color-text)] outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') handleEditCancel(); }}
            />
            <select
              className="border border-[var(--color-border-strong)] rounded-md px-2 py-1 text-[12px] bg-white text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as EmployeeRole)}
            >
              <option value="server">Server</option>
              <option value="cashier">Cashier</option>
              <option value="cook">Cook</option>
              <option value="host">Host</option>
              <option value="barista">Barista</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium truncate text-[var(--color-text)]">{employee.name}</div>
            <div className="text-[11.5px] text-[var(--color-muted)] capitalize">{employee.role}</div>
          </div>
        )}

        {editing ? (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={handleEditSave}
              className="text-[12px] font-semibold px-3 py-1 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all"
            >
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="text-[12px] font-medium px-3 py-1 rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Rate input */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-mono text-[11px] text-[var(--color-muted)]">$</span>
              <input
                type="number"
                className="w-14 border border-[var(--color-border-strong)] rounded-md px-2 py-1.5 font-mono text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                value={employee.hourlyRate}
                min={0}
                step={0.5}
                onChange={(e) => updateEmployee(employee.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
              />
              <span className="font-mono text-[11px] text-[var(--color-muted)]">/hr</span>
            </div>

            <div className="text-right flex-shrink-0 min-w-[60px]">
              <div className="font-mono text-[14px] font-semibold text-[var(--color-accent)]">
                {formatCurrency(weeklyCost)}
              </div>
              <div
                className={`text-[10px] uppercase tracking-wider font-mono flex items-center justify-end gap-1 ${isOvertime(weeklyHrs) ? 'text-[var(--color-warn)] font-semibold' : 'text-[var(--color-muted)]'}`}
                title={isOvertime(weeklyHrs) ? `${(weeklyHrs - OT_THRESHOLD_HOURS).toFixed(0)}h over 40` : undefined}
              >
                {isOvertime(weeklyHrs) && <span aria-label="Overtime">&#9888;</span>}
                <span>{weeklyHrs.toFixed(0)}h/wk</span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => { setEditName(employee.name); setEditRole(employee.role); setEditing(true); }}
              className="text-[var(--color-muted)] hover:text-[var(--color-accent)] w-7 h-7 rounded-md hover:bg-[var(--color-accent-subtle)] flex items-center justify-center transition-all flex-shrink-0"
              aria-label="Edit"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 1.5L11.5 4L4.5 11H2V8.5L9 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            </button>

            <button
              onClick={() => onRemove(employee.id)}
              className="text-[var(--color-muted)] hover:text-[var(--color-accent)] w-7 h-7 rounded-md hover:bg-[var(--color-accent-subtle)] flex items-center justify-center text-lg leading-none transition-all flex-shrink-0"
              aria-label="Remove"
            >
              &times;
            </button>
          </>
        )}
      </div>

      {/* Phone row */}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-[var(--color-border)]">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-[var(--color-muted)] flex-shrink-0"><path d="M2 3.5C2 2.67 2.67 2 3.5 2H4L5.5 5L4 6C4.5 7.5 5.5 8.5 7 9L8 7.5L11 9V9.5C11 10.33 10.33 11 9.5 11C5.91 11 2 7.09 2 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        <input
          type="tel"
          className="flex-1 border border-[var(--color-border)] rounded-md px-3 py-1.5 font-mono text-[12px] bg-transparent text-[var(--color-text)] focus:border-[var(--color-green)] focus:bg-white outline-none transition-all"
          placeholder="+1 555 000 0000"
          value={employee.phone}
          onChange={(e) => updateEmployee(employee.id, { phone: e.target.value })}
        />
        <span className={`text-[10px] font-mono flex-shrink-0 uppercase tracking-wider ${employee.phone ? 'text-[var(--color-green)]' : 'text-[var(--color-muted)]'}`}>
          {employee.phone ? '✓ has phone' : 'no phone'}
        </span>
      </div>

      {/* Email row */}
      <div className="flex items-center gap-2 mt-1.5">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-[var(--color-muted)] flex-shrink-0"><rect x="1.5" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 4.5L6.5 7.5L11.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        <input
          type="email"
          className="flex-1 border border-[var(--color-border)] rounded-md px-3 py-1.5 font-mono text-[12px] bg-transparent text-[var(--color-text)] focus:border-[var(--color-green)] focus:bg-white outline-none transition-all"
          placeholder="employee@email.com"
          value={employee.email ?? ''}
          onChange={(e) => updateEmployee(employee.id, { email: e.target.value })}
        />
        <span className={`text-[10px] font-mono flex-shrink-0 uppercase tracking-wider ${employee.email ? 'text-[var(--color-green)]' : 'text-[var(--color-muted)]'}`}>
          {employee.email ? '✓ has email' : 'no email'}
        </span>
      </div>
    </div>
  );
}
