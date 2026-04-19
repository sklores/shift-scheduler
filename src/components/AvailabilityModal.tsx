'use client';

import { useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import Modal from './Modal';
import type { Employee } from '@/lib/data/types';

interface AvailabilityModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function AvailabilityModal({ employee, isOpen, onClose, onToast }: AvailabilityModalProps) {
  const { getBlocksForEmployee, addAvailabilityBlock, removeAvailabilityBlock } = useSchedulerContext();
  const blocks = getBlocksForEmployee(employee.id).sort((a, b) => a.startsOn.localeCompare(b.startsOn));

  // Today in YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (endsOn < startsOn) {
      setError('End date must be on or after start date.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addAvailabilityBlock({ employeeId: employee.id, startsOn, endsOn, reason: reason.trim() });
      setReason('');
      setStartsOn(today);
      setEndsOn(today);
      onToast('Availability block added');
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await removeAvailabilityBlock(id);
      onToast('Block removed');
    } finally {
      setRemoving(null);
    }
  };

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Availability — ${employee.name}`}
      width="max-w-md"
      footer={
        <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-text)] text-white hover:opacity-90 transition-all">
          Done
        </button>
      }
    >
      {/* Existing blocks */}
      {blocks.length > 0 && (
        <div className="mb-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">Existing blocks</div>
          <div className="space-y-1.5">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {b.startsOn === b.endsOn ? fmtDate(b.startsOn) : `${fmtDate(b.startsOn)} – ${fmtDate(b.endsOn)}`}
                  </div>
                  {b.reason && (
                    <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{b.reason}</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(b.id)}
                  disabled={removing === b.id}
                  className="text-[var(--color-muted)] hover:text-[var(--color-accent)] w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--color-accent-subtle)] transition-all flex-shrink-0 text-lg leading-none disabled:opacity-40"
                  aria-label="Remove block"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new block */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-3">Add block</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-[var(--color-muted)] mb-1">From</label>
            <input
              type="date"
              value={startsOn}
              onChange={e => {
                setStartsOn(e.target.value);
                if (e.target.value > endsOn) setEndsOn(e.target.value);
              }}
              className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--color-muted)] mb-1">To</label>
            <input
              type="date"
              value={endsOn}
              min={startsOn}
              onChange={e => setEndsOn(e.target.value)}
              className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-[11px] text-[var(--color-muted)] mb-1">Reason <span className="opacity-60">(optional)</span></label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Vacation, Doctor appointment"
            className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>
        {error && (
          <div className="mb-3 text-[12px] text-[var(--color-accent)]">{error}</div>
        )}
        <button
          onClick={handleAdd}
          disabled={saving}
          className="w-full text-[13px] font-medium px-4 py-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-border-strong)] border-t-[var(--color-text)] rounded-full animate-spin" />
          ) : (
            <span className="text-base leading-none -mt-px">+</span>
          )}
          {saving ? 'Saving…' : 'Add Block'}
        </button>
      </div>
    </Modal>
  );
}
