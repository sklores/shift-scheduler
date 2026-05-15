'use client';

import { useState, useEffect } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import Modal from './Modal';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function SaveTemplateModal({ isOpen, onClose, onToast }: SaveTemplateModalProps) {
  const { currentWeekShifts, saveTemplate, overwriteTemplate, templates, lastAppliedTemplateId } = useSchedulerContext();
  const [name, setName] = useState('');
  const [overwriting, setOverwriting] = useState(false);

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const appliedTemplate = lastAppliedTemplateId ? templates.find(t => t.id === lastAppliedTemplateId) : null;

  const handleOverwrite = async () => {
    if (!appliedTemplate) return;
    setOverwriting(true);
    try {
      await overwriteTemplate(appliedTemplate.id);
      onToast(`"${appliedTemplate.name}" updated`);
      onClose();
    } catch {
      onToast('Failed to update template');
    } finally {
      setOverwriting(false);
    }
  };

  const handleSaveNew = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (currentWeekShifts.length === 0) {
      onToast('No shifts to save as template');
      return;
    }
    await saveTemplate(trimmed);
    onToast('Template saved');
    onClose();
  };

  const inputCls = "w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-mono";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Template"
      width="max-w-sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all"
          >
            Cancel
          </button>
          {!appliedTemplate && (
            <button
              onClick={handleSaveNew}
              disabled={!name.trim() || currentWeekShifts.length === 0}
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Template
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── Update existing template ── */}
        {appliedTemplate && (
          <div className="rounded-lg border border-[var(--color-border-strong)] overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] font-mono">Loaded template</div>
            </div>
            <div className="px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text)] truncate">{appliedTemplate.name}</div>
                <div className="text-[11px] text-[var(--color-muted)] font-mono mt-0.5">
                  {appliedTemplate.items.length} shifts saved → {currentWeekShifts.length} shifts now
                </div>
              </div>
              <button
                onClick={handleOverwrite}
                disabled={overwriting || currentWeekShifts.length === 0}
                className="flex-shrink-0 text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {overwriting && (
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Update
              </button>
            </div>
          </div>
        )}

        {/* ── Save as new template ── */}
        <div>
          {appliedTemplate && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] font-mono mb-3">
              — or save as new —
            </div>
          )}
          <label className={labelCls}>Template Name</label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. Standard Week, Holiday Schedule"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNew(); }}
            autoFocus={!appliedTemplate}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[12px] text-[var(--color-muted)]">
              Saves {currentWeekShifts.length} shift{currentWeekShifts.length !== 1 ? 's' : ''} as a new template.
            </div>
            {appliedTemplate && (
              <button
                onClick={handleSaveNew}
                disabled={!name.trim() || currentWeekShifts.length === 0}
                className="text-[13px] font-medium px-3.5 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save New
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
