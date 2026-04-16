'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { DAY_FULL } from '@/lib/data/types';
import { generateTimeOptions } from '@/lib/utils/time';
import Modal from './Modal';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  editShiftId: string | null;
  prefillEmpId: string | null;
  prefillDay: number | null;
  onToast: (msg: string) => void;
}

export default function ShiftModal({ isOpen, onClose, editShiftId, prefillEmpId, prefillDay, onToast }: ShiftModalProps) {
  const { employees, shifts, addShift, updateShift } = useSchedulerContext();
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const editShift = editShiftId ? shifts.find(s => s.id === editShiftId) : null;

  const [empId, setEmpId] = useState('');
  const [day, setDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editShift) {
      setEmpId(editShift.employeeId);
      setDay(editShift.day);
      setStartTime(editShift.startTime);
      setEndTime(editShift.endTime);
      setNote(editShift.note);
    } else {
      setEmpId(prefillEmpId || employees[0]?.id || '');
      setDay(prefillDay ?? 0);
      setStartTime('09:00');
      setEndTime('17:00');
      setNote('');
    }
  }, [isOpen, editShift, prefillEmpId, prefillDay, employees]);

  const handleSave = async () => {
    if (!empId) return;
    if (startTime >= endTime) {
      alert('End time must be after start time.');
      return;
    }

    if (editShiftId) {
      await updateShift(editShiftId, { employeeId: empId, day, startTime, endTime, note });
      onToast('Shift updated');
    } else {
      await addShift({ employeeId: empId, day, startTime, endTime, note });
      onToast('Shift added');
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editShiftId ? 'Edit Shift' : 'Add Shift'}
      width="max-w-sm"
      footer={
        <>
          <button onClick={onClose} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button onClick={handleSave} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#b03f25] transition-all">
            Save Shift
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Employee</label>
          <select
            className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Day</label>
          <select
            className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            value={day}
            onChange={(e) => setDay(parseInt(e.target.value))}
          >
            {DAY_FULL.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Start</label>
            <select
              className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {timeOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">End</label>
            <select
              className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              {timeOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Note (optional)</label>
          <input
            type="text"
            className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            placeholder="e.g. opening, closing..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>
      </div>
    </Modal>
  );
}
