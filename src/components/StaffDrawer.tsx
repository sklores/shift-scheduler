'use client';

import { useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import type { EmployeeRole } from '@/lib/data/types';
import { formatCurrency, laborPlusTax, estimatedTax, PAYROLL_TAX_RATE } from '@/lib/utils/cost';
import StaffItem from './StaffItem';

interface StaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
  onConfirm: (opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;
}

export default function StaffDrawer({ isOpen, onClose, onToast, onConfirm }: StaffDrawerProps) {
  const {
    employees, templates, weekStats,
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
    if (!emp) return;
    const ok = await onConfirm({
      title: `Remove ${emp.name}?`,
      message: 'Their shifts will also be deleted. This cannot be undone.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await removeEmployee(id);
    onToast('Employee removed');
  };

  const handleRename = async (id: string, currentName: string) => {
    const name = prompt('Rename template:', currentName);
    if (name && name.trim()) await renameTemplate(id, name.trim());
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    const ok = await onConfirm({
      title: `Delete template "${name}"?`,
      message: 'This will permanently remove the template.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteTemplate(id);
      onToast('Template deleted');
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        {...(isOpen && { 'data-overlay': 'drawer' })}
        className={`fixed inset-0 bg-black/40 z-[300] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-full sm:w-[540px] h-[100dvh] bg-[var(--color-surface)] shadow-2xl z-[301] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-[var(--color-text)] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[15px] font-semibold">Staff Management</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Add form */}
          <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-3">Add New Employee</h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_80px] gap-2.5 mb-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Full Name</label>
                <input
                  type="text"
                  className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
                  placeholder="Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Role</label>
                <select
                  className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
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
                  className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
                  placeholder="18"
                  value={newRate}
                  min={0}
                  step={0.5}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Phone Number</label>
                <input
                  type="tel"
                  className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
                  placeholder="+1 555 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <button
                onClick={handleAdd}
                className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2.5">Templates</h3>
              <div className="space-y-1.5">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 py-2 px-3 rounded-md hover:bg-[var(--color-surface-2)] transition-colors">
                    <span className="flex-1 text-[13px] font-medium truncate">{t.name}</span>
                    <span className="text-[11px] text-[var(--color-muted)] font-mono">{t.items.length} shifts</span>
                    <button
                      onClick={() => handleRename(t.id, t.name)}
                      className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] font-medium"
                    >
                      rename
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id, t.name)}
                      className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-accent)] font-medium"
                    >
                      delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee list */}
          <div className="py-1">
            {employees.length === 0 ? (
              <div className="px-5 py-8 text-center text-[var(--color-muted)] text-[13px]">
                No employees yet. Add one above.
              </div>
            ) : (
              employees.map(emp => (
                <StaffItem key={emp.id} employee={emp} onRemove={handleRemove} onToast={onToast} />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-5 py-4 flex gap-4 sm:gap-7 bg-[var(--color-surface-2)] flex-shrink-0">
          <div title={`${formatCurrency(weekStats.totalCost)} labor + ${formatCurrency(estimatedTax(weekStats.totalCost))} est. tax (${Math.round(PAYROLL_TAX_RATE * 100)}%)`}>
            <div className="font-mono text-[18px] sm:text-[20px] font-semibold text-[var(--color-accent)]">{formatCurrency(laborPlusTax(weekStats.totalCost))}</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 whitespace-nowrap">Total · incl. tax</div>
          </div>
          <div>
            <div className="font-mono text-[18px] sm:text-[20px] font-semibold">{weekStats.totalHours.toFixed(0)}h</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Hours</div>
          </div>
          <div>
            <div className="font-mono text-[18px] sm:text-[20px] font-semibold">{employees.length}</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Staff</div>
          </div>
        </div>
      </div>
    </>
  );
}
