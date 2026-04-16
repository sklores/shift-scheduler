'use client';

import { useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { EMPLOYEE_COLORS } from '@/lib/data/types';
import type { EmployeeRole } from '@/lib/data/types';
import { formatCurrency } from '@/lib/utils/cost';
import StaffItem from './StaffItem';

interface StaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function StaffDrawer({ isOpen, onClose, onToast }: StaffDrawerProps) {
  const {
    employees, shifts, templates, weekStats,
    addEmployee, removeEmployee,
    renameTemplate, deleteTemplate,
    nextColor,
  } = useSchedulerContext();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<EmployeeRole>('server');
  const [newRate, setNewRate] = useState('16');
  const [newPhone, setNewPhone] = useState('');

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    await addEmployee({
      name,
      role: newRole,
      hourlyRate: parseFloat(newRate) || 0,
      phone: newPhone.trim(),
      color: nextColor,
      isActive: true,
    });

    setNewName('');
    setNewPhone('');
    setNewRate('16');
    onToast('Employee added');
  };

  const handleRemove = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp || !confirm(`Remove ${emp.name}? Their shifts will also be deleted.`)) return;
    await removeEmployee(id);
    onToast('Employee removed');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/35 z-[300] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-[520px] h-screen bg-[var(--color-surface)] shadow-2xl z-[301] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-[#1a1916] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-mono text-[15px] font-semibold">Staff Management</h2>
          <button onClick={onClose} className="text-[#aaa] hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Add form */}
          <div className="px-5 py-4 border-b-2 border-[var(--color-border)] bg-[var(--color-bg)]">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)] mb-3">Add New Employee</h3>
            <div className="grid grid-cols-[1fr_100px_70px] gap-2 mb-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Full Name</label>
                <input
                  type="text"
                  className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                  placeholder="Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Role</label>
                <select
                  className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as EmployeeRole)}
                >
                  <option value="server">Server</option>
                  <option value="cashier">Cashier</option>
                  <option value="cook">Cook</option>
                  <option value="host">Host</option>
                  <option value="barista">Barista</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">$/hr</label>
                <input
                  type="number"
                  className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                  placeholder="18"
                  value={newRate}
                  min={0}
                  step={0.5}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Phone Number</label>
                <input
                  type="tel"
                  className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                  placeholder="+1 555 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <button
                onClick={handleAdd}
                className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#b03f25] transition-all flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          {/* Templates section */}
          {templates.length > 0 && (
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[#faf9f6]">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)] mb-2.5">Templates</h3>
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 font-mono text-xs truncate">{t.name}</span>
                  <span className="text-[10px] text-[var(--color-muted)]">{t.items.length} shifts</span>
                  <button
                    onClick={async () => {
                      const name = prompt('Rename template:', t.name);
                      if (name && name.trim()) await renameTemplate(t.id, name.trim());
                    }}
                    className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)] font-mono"
                  >
                    rename
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete template "${t.name}"?`)) await deleteTemplate(t.id);
                    }}
                    className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)] font-mono"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Employee list */}
          <div>
            {employees.length === 0 ? (
              <div className="px-5 py-7 text-center text-[var(--color-muted)] text-xs font-mono">
                No employees yet. Add one above.
              </div>
            ) : (
              employees.map(emp => (
                <StaffItem key={emp.id} employee={emp} onRemove={handleRemove} />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[var(--color-border)] px-5 py-4 flex gap-7 bg-[#faf9f6] flex-shrink-0">
          <div>
            <div className="font-mono text-xl font-semibold">{formatCurrency(weekStats.totalCost)}</div>
            <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Weekly Labor Cost</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold">{weekStats.totalHours.toFixed(0)}h</div>
            <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Hours Scheduled</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold">{employees.length}</div>
            <div className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Employees</div>
          </div>
        </div>
      </div>
    </>
  );
}
