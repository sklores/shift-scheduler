'use client';

import { useRef, useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { formatCurrency } from '@/lib/utils/cost';

interface ToolbarProps {
  onAddShift: () => void;
  onClearWeek: () => void;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  onCopyWeek: () => void;
  onPasteWeek: () => void;
  onToast: (msg: string) => void;
}

export default function Toolbar({ onAddShift, onClearWeek, onSaveTemplate, onApplyTemplate, onCopyWeek, onPasteWeek, onToast }: ToolbarProps) {
  const { weekStats, weekClipboard, currentWeekShifts, weekStart, employees, saveTemplateFromItems, isDraftMode, toggleDraftMode, applyDraftToWeek, draftShifts } = useSchedulerContext();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => {
    window.open(`/print?week=${weekStart}`, '_blank', 'noopener');
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('employees', JSON.stringify(employees.map(e => ({ id: e.id, name: e.name }))));
      const res = await fetch('/api/upload-schedule', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { onToast(data.error || 'Upload failed'); return; }
      const label = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      await saveTemplateFromItems(`Photo Schedule — ${label}`, data.items);
      onToast(`Saved ${data.items.length} shifts as template`);
    } catch {
      onToast('Upload failed — try again');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const hasClipboard = !!weekClipboard && weekClipboard.length > 0;
  const canCopy = currentWeekShifts.length > 0;

  const handleApplyDraft = async () => {
    const result = await applyDraftToWeek();
    onToast(`${result.added} shifts applied · ${result.skipped} skipped`);
    toggleDraftMode();
  };

  return (
    <div className={`px-4 sm:px-6 py-3 border-b border-[var(--color-border)] w-full min-w-0 transition-colors duration-200 ${isDraftMode ? 'bg-amber-50' : 'bg-[var(--color-surface)]'}`}>
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
        {isDraftMode ? (
          /* ── Draft mode actions ── */
          <>
            <button
              onClick={onAddShift}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-amber-700 text-white border border-amber-700 hover:bg-amber-800 transition-all flex-shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <span className="text-base leading-none -mt-px">+</span> Add Shift
            </button>
            <button
              onClick={handleApplyDraft}
              disabled={draftShifts.length === 0}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[var(--color-green)] text-white border border-[var(--color-green)] hover:bg-[var(--color-green-hover)] transition-all flex-shrink-0 flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7L5 10L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Apply to This Week
            </button>
            <button
              onClick={onSaveTemplate}
              disabled={draftShifts.length === 0}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save as Template
            </button>
            <button
              onClick={onClearWeek}
              className="text-[12.5px] font-medium px-2.5 py-2 rounded-lg bg-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-all flex-shrink-0"
            >
              Clear Draft
            </button>
          </>
        ) : (
          /* ── Normal mode actions ── */
          <>
        <button
          onClick={onAddShift}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all flex-shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <span className="text-base leading-none -mt-px">+</span> Add Shift
        </button>

        {/* Copy/Paste Week toggle */}
        {hasClipboard ? (
          <button
            onClick={onPasteWeek}
            className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[var(--color-green)] text-white border border-[var(--color-green)] hover:bg-[var(--color-green-hover)] transition-all flex-shrink-0 flex items-center gap-1.5 shadow-sm"
            title={`Paste ${weekClipboard!.length} shifts into this week`}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4V11H10V4M3 4V3C3 2.45 3.45 2 4 2H9C9.55 2 10 2.45 10 3V4M3 4H10M5 2V1.5C5 1.22 5.22 1 5.5 1H7.5C7.78 1 8 1.22 8 1.5V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Paste Week ({weekClipboard!.length})
          </button>
        ) : (
          <button
            onClick={onCopyWeek}
            disabled={!canCopy}
            className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all flex-shrink-0 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={canCopy ? `Copy ${currentWeekShifts.length} shifts — then paste into any week` : 'Nothing to copy — week is empty'}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="3" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 3V2C5 1.45 5.45 1 6 1H10C10.55 1 11 1.45 11 2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Copy Week
          </button>
        )}

        {/* Secondary actions — same border style, slightly muted text */}
        <button
          onClick={onApplyTemplate}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all flex-shrink-0"
        >
          Apply Template
        </button>
        <button
          onClick={onSaveTemplate}
          className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all flex-shrink-0"
        >
          Save Template
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border-strong)] flex-shrink-0 mx-0.5" />

        {/* Tertiary actions — no border, just text */}
        <button
          onClick={onClearWeek}
          className="text-[12.5px] font-medium px-2.5 py-2 rounded-lg bg-transparent text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all flex-shrink-0"
        >
          Clear
        </button>
        <button
          onClick={handlePrint}
          className="text-[12.5px] font-medium px-2.5 py-2 rounded-lg bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex-shrink-0 flex items-center gap-1.5"
          title="Open printable schedule in new tab"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4V2H10V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="4" width="11" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 10V11H10V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="9.5" cy="7" r="0.75" fill="currentColor"/></svg>
          <span className="hidden sm:inline">Print</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || employees.length === 0}
          className="text-[12.5px] font-medium px-2.5 py-2 rounded-lg bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex-shrink-0 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={employees.length === 0 ? 'Add employees first' : 'Upload a photo of a handwritten schedule to create a template'}
        >
          {uploading ? (
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-border-strong)] border-t-[var(--color-text)] rounded-full animate-spin" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="6.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 3V2.5C4.5 1.67 5.17 1 6 1H7C7.83 1 8.5 1.67 8.5 2.5V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          )}
          <span className="hidden sm:inline">{uploading ? 'Reading…' : 'Photo'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />

        {/* Draft mode entry */}
        <button
          onClick={toggleDraftMode}
          className="text-[12.5px] font-medium px-2.5 py-2 rounded-lg bg-transparent text-[var(--color-muted)] hover:text-amber-700 hover:bg-amber-50 transition-all flex-shrink-0 flex items-center gap-1.5"
          title="Open a sandbox to plan without affecting real schedules"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L4 2H8L10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span className="hidden sm:inline">Draft</span>
        </button>

        {/* Stats — desktop */}
        <div className="hidden md:flex ml-auto gap-2">
          <CostStat labor={weekStats.totalCost} />
          <Stat label="Hours" value={`${weekStats.totalHours.toFixed(0)}h`} />
          <Stat label="Shifts" value={String(weekStats.totalShifts)} />
        </div>
        </> /* end normal mode */
        )} {/* end isDraftMode ternary */}
      </div>

      {/* Stats — mobile (below buttons) */}
      <div className="flex md:hidden gap-2 mt-3">
        <CostStat labor={weekStats.totalCost} fill />
        <Stat label="Hours" value={`${weekStats.totalHours.toFixed(0)}h`} fill />
        <Stat label="Shifts" value={String(weekStats.totalShifts)} fill />
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false, fill = false }: { label: string; value: string; accent?: boolean; fill?: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] ${fill ? 'flex-1' : ''}`}>
      <div className={`font-mono text-[16px] font-semibold leading-tight ${accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
        {label}
      </div>
    </div>
  );
}

function CostStat({ labor, fill = false }: { labor: number; fill?: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] ${fill ? 'flex-1' : ''}`}>
      <div className="font-mono text-[16px] font-semibold leading-tight text-[var(--color-accent)]">
        {formatCurrency(labor)}
      </div>
      <div className="text-[11px] text-[var(--color-muted)] mt-0.5 whitespace-nowrap">
        Payroll
      </div>
    </div>
  );
}
