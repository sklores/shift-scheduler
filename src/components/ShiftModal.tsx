'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { DAYS } from '@/lib/data/types';
import { generateTimeOptions, calcHours } from '@/lib/utils/time';
import { getDateForCell, parseISODate, dayIndexForDate } from '@/lib/utils/week';
import Modal from './Modal';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  editShiftId: string | null;
  prefillEmpId: string | null;
  /** ISO date string (YYYY-MM-DD) for the cell being added. */
  prefillDate: string | null;
  onToast: (msg: string) => void;
  onDelete: (shiftId: string) => void | Promise<void>;
}

export default function ShiftModal({ isOpen, onClose, editShiftId, prefillEmpId, prefillDate, onToast, onDelete }: ShiftModalProps) {
  const { employees, shifts, weekOffset, weekDates, addShift, updateShift } = useSchedulerContext();
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const editShift = editShiftId ? shifts.find(s => s.id === editShiftId) : null;

  // Lazy initializers — parent remounts on every open via key=, so these run fresh.
  const [empId, setEmpId] = useState(() => editShift?.employeeId || prefillEmpId || employees[0]?.id || '');
  const [date, setDate] = useState<string>(() =>
    editShift?.date || prefillDate || getDateForCell(weekOffset, 0)
  );
  const [startTime, setStartTime] = useState(() => editShift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(() => editShift?.endTime || '17:00');
  const [note, setNote] = useState(() => editShift?.note || '');

  // Build day options for the Day dropdown:
  // - Current week's 7 dates, labeled "Mon Apr 13"
  // - If editing a shift on a different week, ADD that date to the list
  const dayOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = weekDates.map((d, i) => ({
      value: getDateForCell(weekOffset, i),
      label: `${DAYS[i]} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    }));
    if (date && !opts.some(o => o.value === date)) {
      const parsed = parseISODate(date);
      const di = dayIndexForDate(date);
      opts.push({
        value: date,
        label: `${DAYS[di]} ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (other week)`,
      });
    }
    return opts;
  }, [weekDates, weekOffset, date]);

  const handleSave = async () => {
    if (!empId) return;
    if (startTime >= endTime) {
      onToast('End time must be after start time');
      return;
    }
    if (editShiftId) {
      await updateShift(editShiftId, { employeeId: empId, date, startTime, endTime, note });
      onToast('Shift updated');
    } else {
      await addShift({ employeeId: empId, date, startTime, endTime, note });
      onToast('Shift added');
    }
    onClose();
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      handleSaveRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const hours = calcHours(startTime, endTime);
  const inputCls = "w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-mono";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editShiftId ? 'Edit Shift' : 'Add Shift'}
      width="max-w-md"
      footer={
        <div className="flex w-full items-center gap-2.5">
          {editShiftId && (
            <button
              onClick={() => { if (editShiftId) { onDelete(editShiftId); onClose(); } }}
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-accent)] border border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-subtle)] hover:border-[var(--color-accent)] transition-all"
            >
              Remove Shift
            </button>
          )}
          <div className="flex gap-2.5 ml-auto">
            <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all">
              Cancel
            </button>
            <button onClick={handleSave} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm">
              {editShiftId ? 'Save Changes' : 'Add Shift'}
            </button>
          </div>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      >
        <div>
          <label className={labelCls}>Employee</label>
          <select className={inputCls} value={empId} onChange={(e) => setEmpId(e.target.value)}>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Day</label>
          <select className={inputCls} value={date} onChange={(e) => setDate(e.target.value)}>
            {dayOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start</label>
            <select className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)}>
              {timeOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>End</label>
            <select className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              {timeOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hours > 0 && (
          <div className="text-[12px] font-mono text-[var(--color-muted)] text-center py-1.5 bg-[var(--color-surface-2)] rounded-md">
            Shift length: <strong className="text-[var(--color-text)]">{hours} {hours === 1 ? 'hour' : 'hours'}</strong>
          </div>
        )}

        <div>
          <label className={labelCls}>Note (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. opening, closing, training..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1}>Save</button>
      </form>
    </Modal>
  );
}
